import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';

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
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
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
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}ban @utilisateur [raison]\`` });
      return;
    }

    // Si le membre est présent sur le serveur, vérification de la hiérarchie
    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (targetMember) {
      const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
      if (!check.allowed) {
        await ctx.reply({ content: `${conf.emojis.error} ${check.reason}` });
        return;
      }

      await targetMember.send({
        content: `🔨 Vous avez été banni du serveur **${ctx.guild.name}**.\n**Raison :** ${reason}`,
      }).catch(() => {});
    }

    try {
      const targetUser = await ctx.client.users.fetch(targetId).catch(() => null);
      const userTag = targetUser?.tag || targetId;

      await ctx.guild.bans.create(targetId, {
        reason,
        deleteMessageSeconds: deleteDays * 86400,
      });

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
        .setTitle(`🔨 Bannissement • #${sanction.id}`)
        .setDescription(
          `L'utilisateur **${userTag}** a été banni avec succès.\n\n` +
          `**Raison :** ${reason}\n` +
          `**Modérateur :** ${ctx.author}`
        );

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: `${conf.emojis.error} Impossible de bannir cet utilisateur.` });
    }
  },
};
