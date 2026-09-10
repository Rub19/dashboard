import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { buildSanctionDmEmbed } from '../utils/sanctionDmEmbed.js';

export const banCommand: Command = {
  name: 'ban',
  description: 'Bannit définitivement un utilisateur du serveur (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.BanMembers],
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un utilisateur du serveur')
    .addUserOption((opt) => opt.setName('utilisateur').setDescription('Utilisateur à bannir').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison du bannissement').setRequired(false))
    .addIntegerOption((opt) =>
      opt
        .setName('supprimer_messages_jours')
        .setDescription('Nombre de jours de messages à purger (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(ctx: CommandContext): Promise<void> {
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    // Différer immédiatement : le fetch membre/utilisateur + le DM + le log de modération
    // ci-dessous peuvent dépasser la fenêtre de 3s de Discord et invalider le token
    // d'interaction ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    let targetId: string | undefined;
    let reason = 'Bannissement par un modérateur';
    let deleteDays = 0;

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('utilisateur', true).id;
      reason = ctx.interaction.options.getString('raison') || reason;
      deleteDays = ctx.interaction.options.getInteger('supprimer_messages_jours') || 0;
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
      if (ctx.args.length > 1) {
        reason = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_usage, { emoji: conf.emojis.error, usage: `${ctx.prefix}ban @utilisateur [raison]` }))] });
      return;
    }

    // Si le membre est présent sur le serveur, vérification de la hiérarchie
    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    let dryRun = false;
    if (targetMember) {
      const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
      if (!check.allowed) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${conf.emojis.error} ${check.reason}`)] });
        return;
      }
      dryRun = Boolean(check.dryRun);

      await targetMember.send({
        embeds: [buildSanctionDmEmbed('ban', t, { guildName: ctx.guild.name, reason, moderatorTag: ctx.author.tag })],
      }).catch(() => {});
    }

    try {
      const targetUser = await ctx.client.users.fetch(targetId).catch(() => null);
      const userTag = targetUser?.tag || targetId;

      // Mode test (Bot Owner qui s'auto-cible) : on simule tout (log, DM, embed)
      // SANS jamais bannir réellement — voir HierarchyCheckResult.dryRun.
      if (!dryRun) {
        await ctx.guild.bans.create(targetId, {
          reason,
          deleteMessageSeconds: deleteDays * 86400,
        });
      }

      const { sanction } = sanctionService.createSanction({
        guildId: ctx.guild.id,
        userId: targetId,
        userTag,
        moderatorId: ctx.author.id,
        moderatorTag: ctx.author.tag,
        type: 'ban',
        reason,
      });

      await ModLogger.logSanction(ctx.guild, sanction);

      const embed = ctx
        .createEmbed('error')
        .setTitle(formatString(t.ban_title, { id: sanction.id }))
        .setDescription(
          formatString(t.ban_desc, { userTag, reason, moderator: ctx.author.toString() }) +
            (dryRun ? '\n\n🧪 **Mode test (God Mode)** : aucun bannissement réel n\'a été appliqué.' : '')
        );

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.ban_fail)] });
    }
  },
};
