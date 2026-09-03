import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';

export const pingCommand: Command = {
  name: 'ping',
  description: 'Vérifie la latence du bot',
  category: 'Général',
  aliases: ['latency', 'p'],
  slashData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifie la latence du bot'),
  execute: async (ctx: CommandContext) => {
    const start = Date.now();
    await ctx.deferReply();
    const latency = Date.now() - start;
    const wsLatency = ctx.client.ws.ping;

    const embed = ctx
      .createEmbed('default')
      .setTitle('🏓 Pong !')
      .addFields(
        { name: 'Latence API', value: `\`${latency}ms\``, inline: true },
        { name: 'WebSocket', value: `\`${wsLatency}ms\``, inline: true }
      );

    await ctx.editReply({ embeds: [embed] });
  },
};
