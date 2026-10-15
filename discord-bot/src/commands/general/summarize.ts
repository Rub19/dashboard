import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { AIToolService } from '../../modules/ai/services/aiToolService.js';
import { AIProviderService } from '../../modules/ai/services/aiProviderService.js';
import { aiRepository } from '../../modules/ai/storage/aiRepository.js';
import { baseEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

export const summarizeCommand: Command = {
  name: 'summarize',
  description: 'Résume les derniers échanges du salon actuel',
  category: 'Général',
  aliases: ['recap'],
  slashData: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Résume les derniers messages échangés dans le salon')
    .addIntegerOption((opt) =>
      opt
        .setName('nombre')
        .setDescription('Nombre de messages récents à analyser (5 à 50)')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)
    ),
  execute: async (ctx: CommandContext) => {
    const t = getTranslation(ctx.guildConfig.language);
    try {
      const count =
        (ctx.isSlash && ctx.interaction ? (ctx.interaction.options.getInteger('nombre') || ctx.interaction.options.getInteger('count')) : null) ||
        (ctx.args[0] ? parseInt(ctx.args[0], 10) : null) ||
        20;

      // Pas d'ephemeral forcé ici : comme /ask et /imagine, le résumé respecte la visibilité
      // choisie par le serveur (responseVisibility) au lieu d'être toujours privé.
      await ctx.deferReply();

      const channel = ctx.channel;
      if (!channel || !('messages' in channel)) {
        await ctx.editReply({ embeds: [baseEmbed('error').setDescription(t.summarize_channel_unsupported)] });
        return;
      }

      const messages = await channel.messages.fetch({ limit: Math.min(Math.max(count, 5), 50) }).catch(() => null);
      if (!messages || messages.size === 0) {
        await ctx.editReply({ embeds: [baseEmbed('info').setDescription(t.summarize_no_messages)] });
        return;
      }

      const list = Array.from(messages.values())
        .reverse()
        .map((m) => ({ author: m.author.username, content: m.content }));

      const transcript = list.filter((m) => m.content.trim()).map((m) => `${m.author}: ${m.content}`).join('\n').slice(0, 8000);
      const ai = transcript
        ? await AIProviderService.generate({
            settings: aiRepository.getSettings(ctx.guildId ?? ''),
            systemPrompt: 'Tu résumes une conversation Discord en français, en 3 à 6 puces courtes : sujets abordés, décisions, questions restées ouvertes. N\'invente rien.',
            messages: [{ role: 'user', content: transcript, timestamp: new Date().toISOString() }],
          }).catch(() => null)
        : null;
      const summary = ai && !ai.model.startsWith('builtin') ? ai.text : AIToolService.summarizeMessages(list);

      await ctx.editReply({
        embeds: [baseEmbed('info').setTitle(t.summarize_title).setDescription(summary.slice(0, 4096))],
      });
    } catch (err: any) {
      if (ctx.interaction?.deferred || ctx.interaction?.replied) {
        await ctx.editReply({ embeds: [baseEmbed('error').setDescription(formatString(t.summarize_error, { error: err?.message || t.summarize_unexpected_error }))] }).catch(() => {});
      } else {
        await ctx.reply({ embeds: [baseEmbed('error').setDescription(formatString(t.summarize_error, { error: err?.message || t.summarize_unexpected_error }))], ephemeral: true }).catch(() => {});
      }
    }
  },
};
