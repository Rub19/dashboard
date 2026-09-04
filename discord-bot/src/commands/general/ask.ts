import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { AISafetyService } from '../../modules/ai/services/aiSafetyService.js';
import { AIKnowledgeService } from '../../modules/ai/services/aiKnowledgeService.js';
import { AIProviderService } from '../../modules/ai/services/aiProviderService.js';
import { DiscordAiPanel } from '../../modules/ai/ui/discordAiPanel.js';

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
        .setName('private')
        .setDescription('Répondre de manière éphémère (visible uniquement par vous)')
        .setRequired(false)
    ),
  execute: async (ctx: CommandContext) => {
    const question = ctx.options.getString('question', true);
    const isPrivate = ctx.options.getBoolean('private') || false;

    await ctx.deferReply({ ephemeral: isPrivate });

    const guildId = ctx.guildId || '123456789012345678';
    const settings = aiRepository.getSettings(guildId);

    if (!settings.enabled) {
      await ctx.editReply({
        content: "L'assistant IA est actuellement désactivé sur ce serveur.",
      });
      return;
    }

    const safetyCheck = AISafetyService.inspectPrompt(question);
    if (safetyCheck.flagged) {
      await ctx.editReply({
        content: '⚠️ Cette question ne respecte pas les consignes de sécurité de l\'assistant.',
      });
      return;
    }

    const knowledge = AIKnowledgeService.retrieveContext({
      guildId,
      query: question,
      channelId: ctx.channelId,
    });

    const systemPrompt = AISafetyService.buildShieldedSystemPrompt(
      settings,
      ctx.guild?.name || 'Serveur Discord'
    );

    const completion = await AIProviderService.generate({
      settings,
      systemPrompt,
      messages: [{ role: 'user', content: question, timestamp: new Date().toISOString() }],
      knowledgeContext: knowledge.contextText,
    });

    const embed = DiscordAiPanel.buildResponseEmbed({
      settings,
      answer: completion.text,
      sourcesUsed: completion.sourcesUsed,
      userTag: ctx.user.username,
    });

    const actionRow = DiscordAiPanel.buildActionRow(`cmd-${Date.now()}`);

    await ctx.editReply({
      embeds: [embed],
      components: [actionRow],
    });
  },
};
