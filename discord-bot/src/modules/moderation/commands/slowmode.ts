import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';

export const slowmodeCommand: Command = {
  name: 'slowmode',
  description: 'Définit le délai de mode lent dans le salon textuel (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Modifie le délai de mode lent du salon')
    .addIntegerOption((opt) =>
      opt
        .setName('secondes')
        .setDescription('Délai d’attente entre messages en secondes (0 pour désactiver)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(ctx: CommandContext): Promise<void> {
    const channel = ctx.channel as TextChannel;
    if (!channel || !('setRateLimitPerUser' in channel)) {
      await ctx.reply({ content: 'Le mode lent n’est pas disponible dans ce salon.' });
      return;
    }

    let seconds = 0;
    if (ctx.isSlash && ctx.interaction) {
      seconds = ctx.interaction.options.getInteger('secondes', true);
    } else {
      seconds = parseInt(ctx.args[0] || '0', 10);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
        await ctx.reply({ content: 'Veuillez spécifier un nombre de secondes entre 0 et 21600.' });
        return;
      }
    }

    try {
      await channel.setRateLimitPerUser(seconds);
      if (seconds === 0) {
        await ctx.reply({ content: `✅ Le mode lent a été **désactivé** dans ce salon.` });
      } else {
        await ctx.reply({ content: `⏱️ Mode lent configuré à **${seconds} seconde(s)** par message dans ce salon.` });
      }
    } catch {
      await ctx.reply({ content: `❌ Impossible de modifier le mode lent.` });
    }
  },
};
