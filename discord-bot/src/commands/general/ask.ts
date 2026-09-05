import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { AISafetyService } from '../../modules/ai/services/aiSafetyService.js';
import { AIKnowledgeService } from '../../modules/ai/services/aiKnowledgeService.js';
import { AIProviderService } from '../../modules/ai/services/aiProviderService.js';
import { DiscordAiPanel } from '../../modules/ai/ui/discordAiPanel.js';
import { logger } from '../../utils/logger.js';

export const askCommand: Command = {
  name: 'ask',
  description: 'Posez une question à l\'assistant IA officiel du serveur',
  category: 'Général',
  aliases: ['ia', 'ai'],
  slashData: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Posez une question à l\'assistant IA du serveur')
    .addStringOption((opt) =>
      opt
        .setName('question')
        .setDescription('Votre question ou demande')
        .setRequired(true)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('prive')
        .setDescription('Répondre de manière privée / éphémère (visible uniquement par vous)')
        .setRequired(false)
    ),
  execute: async (ctx: CommandContext) => {
    try {
      const question =
        (ctx.interaction ? ctx.interaction.options.getString('question') : null) ||
        ctx.getString('question', 0) ||
        ctx.args.join(' ');

      if (!question || !question.trim()) {
        await ctx.reply({
          content: '❌ Veuillez préciser votre question. Exemple : `/ask question:Comment obtenir le rôle VIP ?`',
          ephemeral: true,
        });
        return;
      }

      const isPrivate =
        (ctx.interaction ? (ctx.interaction.options.getBoolean('prive') ?? ctx.interaction.options.getBoolean('private')) : null);

      if (isPrivate !== null && isPrivate !== undefined) {
        await ctx.deferReply({ ephemeral: isPrivate });
      } else {
        await ctx.deferReply();
      }

      const guildId = ctx.guild?.id || ctx.interaction?.guildId || ctx.guildConfig.guildId || '123456789012345678';
      const settings = aiRepository.getSettings(guildId);

      if (!settings.enabled) {
        await ctx.editReply({
          content: "L'assistant IA est actuellement désactivé sur ce serveur par les administrateurs.",
        });
        return;
      }

      const safetyCheck = AISafetyService.inspectPrompt(question.trim());
      if (safetyCheck.flagged) {
        await ctx.editReply({
          content: '⚠️ Cette question ne respecte pas les consignes de sécurité de l\'assistant.',
        });
        return;
      }

      const memberRoles = Array.from(ctx.member?.roles.cache.keys() || []);
      const knowledge = AIKnowledgeService.retrieveContext({
        guildId,
        query: question.trim(),
        channelId: ctx.channel?.id || ctx.interaction?.channelId || undefined,
        roleIds: memberRoles,
      });

      const systemPrompt = AISafetyService.buildShieldedSystemPrompt(
        settings,
        ctx.guild?.name || 'Serveur Discord'
      );

      const completion = await AIProviderService.generate({
        settings,
        systemPrompt,
        messages: [{ role: 'user', content: question.trim(), timestamp: new Date().toISOString() }],
        knowledgeContext: knowledge.contextText,
      });

      const embed = DiscordAiPanel.buildResponseEmbed({
        settings,
        answer: completion.text,
        sourcesUsed: completion.sourcesUsed,
        userTag: ctx.author?.username || ctx.interaction?.user?.username || 'Membre',
      });

      const actionRow = DiscordAiPanel.buildActionRow(`cmd-${Date.now()}`);

      await ctx.editReply({
        embeds: [embed],
        components: [actionRow],
      });

      // Enregistrement des analytics
      try {
        const analytics = aiRepository.getAnalytics(guildId);
        analytics.requestsToday = (analytics.requestsToday || 0) + 1;
        analytics.tokensConsumed = (analytics.tokensConsumed || 0) + (completion.tokensUsed || 0);
        aiRepository.saveAnalytics(guildId, analytics);
      } catch (analyticsErr) {
        logger.warn('[askCommand] Impossible de mettre à jour les statistiques IA :', analyticsErr);
      }
    } catch (error: any) {
      logger.error('[askCommand] Erreur lors de l\'exécution de /ask :', error);
      const errorMsg = `❌ Une erreur est survenue lors du traitement par l'assistant IA.`;
      if (ctx.interaction?.deferred || ctx.interaction?.replied) {
        await ctx.editReply({ content: errorMsg }).catch(() => {});
      } else {
        await ctx.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
      }
    }
  },
};
