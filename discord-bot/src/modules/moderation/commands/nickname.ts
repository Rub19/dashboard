import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const nicknameCommand: Command = {
  name: 'nickname',
  description: 'Modifie ou réinitialise le surnom d’un membre sur le serveur (Modération)',
  category: 'Modération',
  aliases: ['setnick', 'nick'],
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  slashData: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Modifie ou réinitialise le surnom d’un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
    .addStringOption((opt) => opt.setName('nouveau_nom').setDescription('Nouveau pseudo (laisser vide pour réinitialiser)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(ctx: CommandContext): Promise<void> {
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    let targetId: string | undefined;
    let newNick: string | null = null;

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
      newNick = ctx.interaction.options.getString('nouveau_nom');
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
      if (ctx.args.length > 1) {
        newNick = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_usage, { emoji: conf.emojis.error, usage: `${ctx.prefix}nickname @membre [nouveau_nom]` }))] });
      return;
    }

    await ctx.deferReply();

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.mod_member_not_found)] });
      return;
    }

    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${conf.emojis.error} ${check.reason}`)] });
      return;
    }

    try {
      await targetMember.setNickname(newNick);
      if (newNick) {
        const embed = ctx.createEmbed('success').setDescription(formatString(t.nickname_changed, { target: targetMember.toString(), nick: newNick }));
        await ctx.reply({ embeds: [embed] });
      } else {
        const embed = ctx.createEmbed('success').setDescription(formatString(t.nickname_reset, { target: targetMember.toString() }));
        await ctx.reply({ embeds: [embed] });
      }
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.nickname_fail)] });
    }
  },
};
