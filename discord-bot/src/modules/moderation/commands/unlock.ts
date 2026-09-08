import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { getTranslation } from '../../../utils/i18n.js';

export const unlockCommand: Command = {
  name: 'unlock',
  description: 'Déverrouille le salon pour autoriser à nouveau les messages (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouille le salon textuel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    const channel = ctx.channel as TextChannel;
    if (!channel || !('permissionOverwrites' in channel)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.unlock_no_channel)] });
      return;
    }

    await ctx.deferReply();

    try {
      await channel.permissionOverwrites.edit(ctx.guild.id, {
        SendMessages: null, // Réinitialise pour hériter des permissions normales
      });

      const embed = ctx
        .createEmbed('success')
        .setTitle(t.unlock_title)
        .setDescription(t.unlock_desc);

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.unlock_fail)] });
    }
  },
};
