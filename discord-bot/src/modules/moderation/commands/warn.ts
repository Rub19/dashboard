import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';

export const warnCommand: Command = {
  name: 'warn',
  description: 'Avertit officiellement un membre pour infraction (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertit un membre pour infraction')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à avertir').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison du rappel à l’ordre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
    if (!conf.modules.moderation) {
      await ctx.reply({ content: `${conf.emojis.error} Le module Modération est désactivé sur ce serveur.` });
      return;
    }

    // Récupération de la cible
    let targetId: string | undefined;
    let reason = 'Infraction au règlement';

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
      reason = ctx.interaction.options.getString('raison', true);
    } else {
      const mention = ctx.args[0];
      targetId = mention?.replace(/[^0-9]/g, '');
      if (ctx.args.length > 1) {
        reason = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}warn @membre [raison]\`` });
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ content: `${conf.emojis.error} Membre introuvable sur ce serveur.` });
      return;
    }

    // Hiérarchie
    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ content: `${conf.emojis.error} ${check.reason}` });
      return;
    }

    // Création de la sanction
    const { sanction, escalationTriggered, escalationAction } = sanctionService.createSanction({
      guildId: ctx.guild.id,
      userId: targetMember.id,
      userTag: targetMember.user.tag,
      moderatorId: ctx.author.id,
      moderatorTag: ctx.author.tag,
      type: 'warn',
      reason,
    });

    // Envoi du log
    await ModLogger.logSanction(ctx.guild, sanction);

    // Tentative de notification en MP
    await targetMember.send({
      content: `⚠️ Vous avez reçu un avertissement sur **${ctx.guild.name}** pour la raison suivante : *${reason}*.`,
    }).catch(() => {});

    // Réponse
    const embed = ctx
      .createEmbed('info')
      .setTitle(`⚠️ Avertissement • #${sanction.id}`)
      .setDescription(
        `Le membre ${targetMember} a été averti avec succès.\n\n` +
        `**Raison :** ${reason}\n` +
        `**Modérateur :** ${ctx.author}`
      );

    // Auto-escalade
    if (escalationTriggered && escalationAction) {
      embed.addFields([
        {
          name: '🚨 Sanction Automatique Déclenchée',
          value: `Seuil d’avertissements atteint : action d’escalade requise (\`${escalationAction}\`).`,
        },
      ]);
    }

    await ctx.reply({ embeds: [embed] });
  },
};
