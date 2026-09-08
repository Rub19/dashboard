import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

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
    const t = getTranslation(ctx.guildConfig.language);
    const channel = ctx.channel as TextChannel;
    if (!channel || !('setRateLimitPerUser' in channel)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.slowmode_unavailable)] });
      return;
    }

    let seconds = 0;
    if (ctx.isSlash && ctx.interaction) {
      seconds = ctx.interaction.options.getInteger('secondes', true);
    } else {
      seconds = parseInt(ctx.args[0] || '0', 10);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.slowmode_invalid)] });
        return;
      }
    }

    await ctx.deferReply();

    try {
      await channel.setRateLimitPerUser(seconds);
      if (seconds === 0) {
        await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(t.slowmode_disabled)] });
      } else {
        await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(formatString(t.slowmode_set, { seconds }))] });
      }
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.slowmode_fail)] });
    }
  },
};
