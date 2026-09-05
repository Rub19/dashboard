import { Client, Message, TextChannel } from 'discord.js';
import {
  AIAnalytics,
  AIChannelRule,
  AIPersonality,
  AISettings,
  AIToolPermissions,
} from '../types/index.js';
import { aiRepository } from '../storage/aiRepository.js';
import { AISafetyService } from './aiSafetyService.js';
import { AIKnowledgeService } from './aiKnowledgeService.js';
import { AIMemoryService } from './aiMemoryService.js';
import { AIProviderService } from './aiProviderService.js';
import { AIToolService } from './aiToolService.js';
import { DiscordAiPanel } from '../ui/discordAiPanel.js';
import { logService } from '../../logs/services/logService.js';
import { AIImageService } from './aiImageService.js';
import { logger } from '../../../utils/logger.js';

export class AIService {
  private client: Client | null = null;

  public async initialize(client: Client): Promise<void> {
    this.client = client;
    logger.info('[AIService] Module AI Assistant 2.0 initialisé.');
  }

  /**
   * Traite les messages entrants dans Discord pour déclencher une réponse de l'IA
   */
  public async handleMessage(message: Message): Promise<boolean> {
    if (message.author.bot || !message.guild || !message.content) return false;

    const guildId = message.guild.id;
    const settings = aiRepository.getSettings(guildId);
    if (!settings.enabled) return false;

    // Détection du salon IA dédié public (où tous les membres peuvent échanger)
    const isDedicatedChannel = Boolean(
      settings.dedicatedChannelId && message.channelId === settings.dedicatedChannelId
    );

    // 1. Détermination du mode de réponse pour ce salon (Hiérarchie : Salon Dédié -> Channel -> Category -> Global)
    let channelRule = settings.channelRules[message.channelId];
    if (!channelRule && message.channel.isTextBased() && 'parentId' in message.channel && message.channel.parentId) {
      channelRule = settings.channelRules[message.channel.parentId];
    }

    const mode = channelRule ? channelRule.mode : settings.defaultMode;
    if (!isDedicatedChannel && mode === 'DISABLED') return false;

    // Vérification des rôles autorisés / bloqués (Dans le salon dédié, accès public par défaut)
    const memberRoles = Array.from(message.member?.roles.cache.keys() || []);
    if (settings.blockedRoleIds.some((r) => memberRoles.includes(r))) return false;
    if (!isDedicatedChannel && settings.allowedRoleIds.length > 0 && !settings.allowedRoleIds.some((r) => memberRoles.includes(r))) {
      return false;
    }

    // Condition de déclenchement
    const isBotMentioned = this.client?.user ? message.mentions.has(this.client.user) : false;
    const isThread = message.channel.isThread();

    let shouldRespond = false;
    if (isDedicatedChannel) shouldRespond = true;
    else if (mode === 'AUTOMATIC') shouldRespond = true;
    else if (mode === 'MENTION_ONLY' && isBotMentioned) shouldRespond = true;
    else if (mode === 'HYBRID' && (isBotMentioned || isThread)) shouldRespond = true;

    if (!shouldRespond) return false;

    // Nettoyage de la mention dans le texte
    let promptText = message.content;
    if (this.client?.user) {
      promptText = promptText.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
    }
    if (!promptText) return false;

    // 2. Vérification de Sécurité (Anti-Injection, Jailbreak & Mots Bannis AutoMod)
    const safetyCheck = AISafetyService.inspectPrompt(promptText, settings.bannedWords);
    if (safetyCheck.flagged) {
      if (safetyCheck.bannedWordDetected) {
        await message.reply({
          content: `🚫 **AutoMod** : Votre message a été bloqué car il contient un terme interdit (\`${safetyCheck.bannedWordDetected}\`).`,
        });
      } else {
        await message.reply({
          content: '⚠️ Désolé, cette demande ne respecte pas les consignes de sécurité et directives de l\'assistant.',
        });
      }
      return true;
    }

    // 2.5 Détection automatique de demande de génération d'image
    const imagePattern = /^(g[ée]n[èe]re|dessine|cr[ée][ée]|fais|draw|imagine|generate|create)\s+(une?\s+)?image\s+(de\s+|d'|du\s+|des\s+)?/i;
    if (imagePattern.test(promptText) && settings.allowImageGeneration !== false) {
      const cleanImagePrompt = promptText.replace(imagePattern, '').trim();
      if (cleanImagePrompt.length >= 3) {
        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping().catch(() => {});
        }
        const imgResult = await AIImageService.generateImage({ prompt: cleanImagePrompt });
        if (imgResult.success && imgResult.imageUrl) {
          const embed = AIImageService.buildImageEmbed({
            prompt: imgResult.revisedPrompt || cleanImagePrompt,
            imageUrl: imgResult.imageUrl,
            authorTag: message.author.username,
          });
          await message.reply({ embeds: [embed] });
          return true;
        }
      }
    }

    // 3. Indicateur de frappe
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping().catch(() => {});
    }

    try {
      // 4. Connaissances RAG
      const knowledge = AIKnowledgeService.retrieveContext({
        guildId,
        query: promptText,
        channelId: message.channelId,
        roleIds: memberRoles,
      });

      // 5. Mémoire de Conversation
      const conversation = AIMemoryService.getOrCreateConversation({
        guildId,
        channelId: message.channelId,
        threadId: message.channel.isThread() ? message.channel.id : undefined,
        userId: message.author.id,
        userTag: message.author.tag,
      });

      AIMemoryService.appendMessage(conversation, 'user', promptText);

      // 6. Génération de la Réponse
      const systemPrompt = AISafetyService.buildShieldedSystemPrompt(settings, message.guild.name);
      const completion = await AIProviderService.generate({
        settings,
        systemPrompt,
        messages: conversation.messages,
        knowledgeContext: knowledge.contextText,
      });

      // 6.5 Filtrage hermétique DLP & Caviardage des secrets avant diffusion
      const sanitizedText = AISafetyService.sanitizeOutput(completion.text, settings.bannedWords);

      AIMemoryService.appendMessage(
        conversation,
        'assistant',
        sanitizedText,
        completion.sourcesUsed,
        settings.memory.contextLength
      );

      // 7. Construction et envoi de la réponse Discord
      const embed = DiscordAiPanel.buildResponseEmbed({
        settings,
        answer: sanitizedText,
        sourcesUsed: completion.sourcesUsed,
        userTag: message.author.username,
      });

      const actionRow = DiscordAiPanel.buildActionRow(message.id);

      // Si le mode thread est activé et que nous sommes dans un salon texte standard, créer le thread
      if (channelRule?.threadModeEnabled && !isThread && message.channel.isTextBased()) {
        const thread = await AIToolService.createThreadForUser(
          message.channel as TextChannel,
          message,
          settings.personality.name
        );
        if (thread) {
          await thread.send({ embeds: [embed], components: [actionRow] });
          await message.react('🤖').catch(() => {});
          return true;
        }
      }

      await message.reply({
        embeds: [embed],
        components: [actionRow],
      });

      // 8. Mise à jour Analytics
      const analytics = aiRepository.getAnalytics(guildId);
      analytics.requestsToday++;
      analytics.tokensConsumed += completion.tokensUsed;
      aiRepository.saveAnalytics(guildId, analytics);

      logService.emit({
        guildId,
        module: 'SYSTEM',
        type: 'ai.query.answered',
        actor: { id: message.author.id, tag: message.author.tag },
        metadata: {
          channelId: message.channelId,
          tokens: completion.tokensUsed,
          model: completion.model,
          sources: completion.sourcesUsed,
        },
      });

      return true;
    } catch (err: any) {
      logger.error('[AIService] Erreur génération réponse IA :', err);
      await message.reply({
        content: "L'assistant IA est temporairement indisponible. Veuillez réessayer dans un instant.",
      }).catch(() => {});
      return false;
    }
  }

  // --- MÉTHODES POUR L'API REST ET LE DASHBOARD ---

  public getOverview(guildId: string): {
    settings: AISettings;
    analytics: AIAnalytics;
    knowledgeCount: number;
    activeConversationsCount: number;
  } {
    const settings = aiRepository.getSettings(guildId);
    const analytics = aiRepository.getAnalytics(guildId);
    const knowledge = aiRepository.getKnowledgeSources(guildId);

    return {
      settings,
      analytics,
      knowledgeCount: knowledge.length,
      activeConversationsCount: analytics.activeConversations,
    };
  }

  public updatePersonality(guildId: string, personality: Partial<AIPersonality>): AISettings {
    const current = aiRepository.getSettings(guildId);
    return aiRepository.saveSettings(guildId, {
      personality: { ...current.personality, ...personality },
    });
  }

  public updateTools(guildId: string, tools: Partial<AIToolPermissions>): AISettings {
    const current = aiRepository.getSettings(guildId);
    return aiRepository.saveSettings(guildId, {
      tools: { ...current.tools, ...tools },
    });
  }

  public updateChannelRule(guildId: string, rule: AIChannelRule): AISettings {
    const current = aiRepository.getSettings(guildId);
    const updatedRules = { ...current.channelRules, [rule.channelId]: rule };
    return aiRepository.saveSettings(guildId, {
      channelRules: updatedRules,
    });
  }

  public async testPlayground(
    guildId: string,
    query: string
  ): Promise<{
    answer: string;
    sourcesUsed: string[];
    retrievedContext: string;
    tokensUsed: number;
    model: string;
  }> {
    const settings = aiRepository.getSettings(guildId);
    const guildName = this.client?.guilds.cache.get(guildId)?.name || 'Serveur Démo';

    const knowledge = AIKnowledgeService.retrieveContext({
      guildId,
      query,
    });

    const systemPrompt = AISafetyService.buildShieldedSystemPrompt(settings, guildName);
    const completion = await AIProviderService.generate({
      settings,
      systemPrompt,
      messages: [{ role: 'user', content: query, timestamp: new Date().toISOString() }],
      knowledgeContext: knowledge.contextText,
    });

    return {
      answer: completion.text,
      sourcesUsed: completion.sourcesUsed,
      retrievedContext: knowledge.contextText,
      tokensUsed: completion.tokensUsed,
      model: completion.model,
    };
  }

  public publishDraft(guildId: string): { version: number; publishedAt: string } {
    const current = aiRepository.getSettings(guildId);
    const newVersion = current.publishedVersion + 1;
    const now = new Date().toISOString();

    aiRepository.saveSettings(guildId, {
      publishedVersion: newVersion,
      lastPublishedAt: now,
    });

    logService.emit({
      guildId,
      module: 'SYSTEM',
      type: 'ai.config.published',
      actor: { id: 'admin', tag: 'DashboardAdmin' },
      metadata: { version: newVersion },
    });

    return { version: newVersion, publishedAt: now };
  }
}

export const aiService = new AIService();
