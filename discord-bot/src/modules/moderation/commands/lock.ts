import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const lockCommand: Command = {
  name: 'lock',
  description: 'Verrouille le salon pour empêcher les membres d’écrire (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouille le salon textuel')
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison du verrouillage').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    const channel = ctx.channel as TextChannel;
    if (!channel || !('permissionOverwrites' in channel)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.lock_no_channel)] });
      return;
    }

    const reason = ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('raison') || t.lock_default_reason
      : ctx.args.join(' ') || t.lock_default_reason;

    await ctx.deferReply();

    try {
      await channel.permissionOverwrites.edit(ctx.guild.id, {
        SendMessages: false,
      });

      const embed = ctx
        .createEmbed('error')
        .setTitle(t.lock_title)
        .setDescription(formatString(t.lock_desc, { reason }));

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.lock_fail)] });
    }
  },
};
