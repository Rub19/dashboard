import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { AIToolService } from '../../modules/ai/services/aiToolService.js';

export const summarizeCommand: Command = {
  name: 'summarize',
  description: 'Résume les derniers échanges du salon actuel',
  category: 'Général',
  aliases: ['resume', 'recap'],
  slashData: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Résume les derniers messages du salon')
    .addIntegerOption((opt) =>
      opt
        .setName('count')
        .setDescription('Nombre de messages récents à analyser (10 à 50)')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)
    ),
  execute: async (ctx: CommandContext) => {
    const count = ctx.options.getInteger('count') || 20;
    await ctx.deferReply({ ephemeral: true });

    const channel = ctx.channel;
    if (!channel || !('messages' in channel)) {
      await ctx.editReply({ content: 'Ce salon ne supporte pas la récupération de messages.' });
      return;
    }

    const messages = await channel.messages.fetch({ limit: count }).catch(() => null);
    if (!messages || messages.size === 0) {
      await ctx.editReply({ content: 'Aucun message récent trouvé dans ce salon.' });
      return;
    }

    const list = Array.from(messages.values())
      .reverse()
      .map((m) => ({ author: m.author.username, content: m.content }));

    const summary = AIToolService.summarizeMessages(list);

    await ctx.editReply({
      content: summary,
    });
  },
};
