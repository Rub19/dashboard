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

    // 1. Détermination du mode de réponse pour ce salon (Hiérarchie : Channel -> Category -> Global)
    let channelRule = settings.channelRules[message.channelId];
    if (!channelRule && message.channel.isTextBased() && 'parentId' in message.channel && message.channel.parentId) {
      channelRule = settings.channelRules[message.channel.parentId];
    }

    const mode = channelRule ? channelRule.mode : settings.defaultMode;
    if (mode === 'DISABLED') return false;

    // Vérification des rôles autorisés / bloqués
    const memberRoles = Array.from(message.member?.roles.cache.keys() || []);
    if (settings.blockedRoleIds.some((r) => memberRoles.includes(r))) return false;
    if (settings.allowedRoleIds.length > 0 && !settings.allowedRoleIds.some((r) => memberRoles.includes(r))) {
      return false;
    }

    // Vérification de la condition de déclenchement
    const isBotMentioned = this.client?.user ? message.mentions.has(this.client.user) : false;
    const isThread = message.channel.isThread();

    let shouldRespond = false;
    if (mode === 'AUTOMATIC') shouldRespond = true;
    else if (mode === 'MENTION_ONLY' && isBotMentioned) shouldRespond = true;
    else if (mode === 'HYBRID' && (isBotMentioned || isThread)) shouldRespond = true;

    if (!shouldRespond) return false;

    // Nettoyage de la mention dans le texte
    let promptText = message.content;
    if (this.client?.user) {
      promptText = promptText.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
    }
    if (!promptText) return false;

    // 2. Vérification de Sécurité (Anti-Injection & Jailbreak)
    const safetyCheck = AISafetyService.inspectPrompt(promptText);
    if (safetyCheck.flagged) {
      await message.reply({
        content: '⚠️ Désolé, cette demande ne respecte pas les consignes de sécurité de l\'assistant.',
      });
      return true;
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

      AIMemoryService.appendMessage(
        conversation,
        'assistant',
        completion.text,
        completion.sourcesUsed,
        settings.memory.contextLength
      );

      // 7. Construction et envoi de la réponse Discord
      const embed = DiscordAiPanel.buildResponseEmbed({
        settings,
        answer: completion.text,
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
