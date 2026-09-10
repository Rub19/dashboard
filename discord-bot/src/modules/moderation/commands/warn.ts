import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { buildSanctionDmEmbed } from '../utils/sanctionDmEmbed.js';

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
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    if (!conf.modules.moderation) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_module_disabled, { emoji: conf.emojis.error }))] });
      return;
    }

    // Discord invalide le token d'interaction après 3s : différer la réponse tout de suite,
    // avant les opérations lentes ci-dessous (fetch membre, log de modération, DM), pour éviter
    // un crash "Unknown interaction" (10062) qui empêchait toute confirmation de s'afficher —
    // ce qui poussait les modérateurs à relancer la commande et à avertir la cible deux fois.
    await ctx.deferReply();

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
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_usage, { emoji: conf.emojis.error, usage: `${ctx.prefix}warn @membre [raison]` }))] });
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.mod_member_not_found)] });
      return;
    }

    // Hiérarchie
    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${conf.emojis.error} ${check.reason}`)] });
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

    // Tentative de notification en MP (embed — même rendu que le pipeline
    // automatique de sanctionService).
    await targetMember.send({
      embeds: [buildSanctionDmEmbed('warn', t, { guildName: ctx.guild.name, reason, moderatorTag: ctx.author.tag })],
    }).catch(() => {});

    // Réponse
    const embed = ctx
      .createEmbed('info')
      .setTitle(formatString(t.warn_title, { id: sanction.id }))
      .setDescription(
        formatString(t.warn_desc, { target: targetMember.toString(), reason, moderator: ctx.author.toString() })
      );

    // Auto-escalade
    if (escalationTriggered && escalationAction) {
      embed.addFields([
        {
          name: t.warn_escalation_field_name,
          value: formatString(t.warn_escalation_field_value, { action: escalationAction }),
        },
      ]);
    }

    // Mode test (Bot Owner qui s'auto-cible) : un avertissement n'a aucun effet
    // punitif réel (pas de mute/kick/ban), donc rien à sauter ici — juste un
    // rappel visuel que c'est un auto-test.
    if (check.dryRun) {
      embed.addFields([{ name: '🧪 Mode Test (God Mode)', value: 'Auto-ciblage détecté : ceci est un aperçu, sans conséquence réelle.' }]);
    }

    await ctx.reply({ embeds: [embed] });
  },
};
