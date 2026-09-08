import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const kickCommand: Command = {
  name: 'kick',
  description: 'Expulse un membre du serveur (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.KickMembers],
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre du serveur')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison de l’expulsion').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(ctx: CommandContext): Promise<void> {
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    // Différer immédiatement : le fetch membre + le DM + le log de modération ci-dessous
    // peuvent dépasser la fenêtre de 3s de Discord et invalider le token d'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    let targetId: string | undefined;
    let reason = 'Expulsion par un modérateur';

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
      reason = ctx.interaction.options.getString('raison') || reason;
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
      if (ctx.args.length > 1) {
        reason = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_usage, { emoji: conf.emojis.error, usage: `${ctx.prefix}kick @membre [raison]` }))] });
      return;
    }

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
      // Message MP préventif
      await targetMember.send({
        content: formatString(t.kick_dm, { guild: ctx.guild.name, reason }),
      }).catch(() => {});

      // Mode test (Bot Owner qui s'auto-cible) : on simule tout SANS jamais
      // expulser réellement — voir HierarchyCheckResult.dryRun.
      if (!check.dryRun) {
        await targetMember.kick(reason);
      }

      const { sanction } = sanctionService.createSanction({
        guildId: ctx.guild.id,
        userId: targetMember.id,
        userTag: targetMember.user.tag,
        moderatorId: ctx.author.id,
        moderatorTag: ctx.author.tag,
        type: 'kick',
        reason,
      });

      await ModLogger.logSanction(ctx.guild, sanction);

      const embed = ctx
        .createEmbed('info')
        .setTitle(formatString(t.kick_title, { id: sanction.id }))
        .setDescription(
          formatString(t.kick_desc, { userTag: targetMember.user.tag, reason, moderator: ctx.author.toString() }) +
            (check.dryRun ? '\n\n🧪 **Mode test (God Mode)** : aucune expulsion réelle n\'a été appliquée.' : '')
        );

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.kick_fail)] });
    }
  },
};
