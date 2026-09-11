import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { AIToolService } from '../../modules/ai/services/aiToolService.js';
import { baseEmbed } from '../../utils/embeds.js';

export const summarizeCommand: Command = {
  name: 'summarize',
  description: 'Résume les derniers échanges du salon actuel',
  category: 'Général',
  // NOTE: "resume" was previously listed here, but it collides with the real,
  // unrelated /resume command (music/musicShortcuts.ts, unpause playback) and
  // always resolved to this handler instead of the music one. Removed; use
  // !recap or /summarize.
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
    try {
      const count =
        (ctx.isSlash && ctx.interaction ? (ctx.interaction.options.getInteger('nombre') || ctx.interaction.options.getInteger('count')) : null) ||
        (ctx.args[0] ? parseInt(ctx.args[0], 10) : null) ||
        20;

      await ctx.deferReply({ ephemeral: true });

      const channel = ctx.channel;
      if (!channel || !('messages' in channel)) {
        await ctx.editReply({ embeds: [baseEmbed('error').setDescription('Ce salon ne supporte pas la récupération de messages.')] });
        return;
      }

      const messages = await channel.messages.fetch({ limit: Math.min(Math.max(count, 5), 50) }).catch(() => null);
      if (!messages || messages.size === 0) {
        await ctx.editReply({ embeds: [baseEmbed('info').setDescription('Aucun message récent trouvé dans ce salon.')] });
        return;
      }

      const list = Array.from(messages.values())
        .reverse()
        .map((m) => ({ author: m.author.username, content: m.content }));

      const summary = AIToolService.summarizeMessages(list);

      await ctx.editReply({
        embeds: [baseEmbed('info').setTitle('📝 Résumé du salon').setDescription(summary.slice(0, 4096))],
      });
    } catch (err: any) {
      if (ctx.interaction?.deferred || ctx.interaction?.replied) {
        await ctx.editReply({ embeds: [baseEmbed('error').setDescription(`❌ Erreur lors du résumé : ${err?.message || 'Erreur inattendue'}`)] }).catch(() => {});
      } else {
        await ctx.reply({ embeds: [baseEmbed('error').setDescription(`❌ Erreur lors du résumé : ${err?.message || 'Erreur inattendue'}`)], ephemeral: true }).catch(() => {});
      }
    }
  },
};
