import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { securityStorage } from '../storage/securityStorage.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';

// This engine (antiNukeService.ts) was already live in production — wired
// into GuildBanAdd/GuildRoleDelete/ChannelDelete and capable of
// auto-banning or stripping roles from whoever trips its thresholds — with
// no Discord command or dashboard page to see it happen or adjust the
// defaults it was silently running with. This command is the first surface
// for it; the dashboard page under /discord/security/anti-nuke is the second.
const THRESHOLD_CHOICES = [
  { name: 'Bannissements max (fenêtre)', value: 'maxBans' },
  { name: 'Suppressions de salons max (fenêtre)', value: 'maxChannelDeletes' },
  { name: 'Suppressions de rôles max (fenêtre)', value: 'maxRoleDeletes' },
  { name: 'Fenêtre de temps (secondes)', value: 'timeWindowSeconds' },
] as const;

const THRESHOLD_LIMITS: Record<string, { min: number; max: number }> = {
  maxBans: { min: 2, max: 20 },
  maxChannelDeletes: { min: 2, max: 10 },
  maxRoleDeletes: { min: 2, max: 10 },
  timeWindowSeconds: { min: 5, max: 60 },
};

export const antinukeCommand: Command = {
  name: 'antinuke',
  description: 'Anti-Nuke : statut, activation, seuils de protection',
  category: 'Sécurité',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Centre Anti-Nuke')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription("Affiche l'état actuel de la protection Anti-Nuke")
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription("Active ou désactive complètement l'Anti-Nuke sur ce serveur")
        .addBooleanOption((opt) =>
          opt.setName('actif').setDescription('Activer (True) ou désactiver (False)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Définit la sanction appliquée à un auteur de nuke détecté')
        .addStringOption((opt) =>
          opt
            .setName('sanction')
            .setDescription('Sanction à appliquer')
            .setRequired(true)
            .addChoices(
              { name: '🔔 Alerte seulement', value: 'alert' },
              { name: '🎭 Retirer les rôles admin/modération', value: 'strip_roles' },
              { name: '🔨 Bannissement immédiat', value: 'ban' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('threshold')
        .setDescription('Ajuste un seuil de détection Anti-Nuke')
        .addStringOption((opt) =>
          opt
            .setName('seuil')
            .setDescription('Le seuil à ajuster')
            .setRequired(true)
            .addChoices(...THRESHOLD_CHOICES)
        )
        .addIntegerOption((opt) =>
          opt.setName('valeur').setDescription('Nouvelle valeur').setRequired(true)
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('Cette commande est réservée aux serveurs.')],
        ephemeral: true,
      });
      return;
    }

    const guildId = ctx.guild.id;
    const isSlash = ctx.isSlash;
    const sub = isSlash && ctx.interaction ? ctx.interaction.options.getSubcommand() : ctx.args[0] || 'status';

    if (sub === 'status') {
      const config = securityStorage.getConfig(guildId).antiNuke;
      const incidents = securityStorage
        .getIncidents(guildId)
        .filter((i) => ['MASS_BAN', 'MASS_CHANNEL_DELETE', 'MASS_ROLE_DELETE'].includes(i.type));
      const openCount = incidents.filter((i) => i.status === 'open').length;

      const actionLabels: Record<string, string> = {
        alert: '🔔 Alerte seulement',
        strip_roles: '🎭 Retrait des rôles admin/modération',
        ban: '🔨 Bannissement immédiat',
      };

      const embed = ctx
        .createEmbed(config.enabled ? 'success' : 'neutral')
        .setTitle('💣 Anti-Nuke — Statut')
        .setDescription(
          config.enabled
            ? '🟢 Protection active — surveille bannissements massifs, suppressions de salons et de rôles.'
            : '⚪ Protection désactivée — aucune détection ni sanction automatique en cours.'
        )
        .addFields(
          { name: 'Sanction configurée', value: actionLabels[config.action] || config.action, inline: true },
          { name: 'Fenêtre de temps', value: `${config.timeWindowSeconds}s`, inline: true },
          { name: 'Incidents ouverts', value: `${openCount}`, inline: true },
          { name: 'Seuil bannissements', value: `${config.maxBans} en ${config.timeWindowSeconds}s`, inline: true },
          { name: 'Seuil suppr. salons', value: `${config.maxChannelDeletes} en ${config.timeWindowSeconds}s`, inline: true },
          { name: 'Seuil suppr. rôles', value: `${config.maxRoleDeletes} en ${config.timeWindowSeconds}s`, inline: true }
        )
        .setFooter({ text: '/antinuke toggle · action · threshold' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'toggle') {
      const active = isSlash && ctx.interaction ? ctx.interaction.options.getBoolean('actif', true) : ctx.args[1] === 'true';
      const updated = securityStorage.updateConfig(guildId, {
        antiNuke: { ...securityStorage.getConfig(guildId).antiNuke, enabled: active },
      });
      emitConfigUpdated('antiNuke', guildId, updated.antiNuke, 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(active ? 'success' : 'neutral')
            .setDescription(active ? '🟢 Anti-Nuke **activé**.' : '⚪ Anti-Nuke **désactivé**.'),
        ],
      });
      return;
    }

    if (sub === 'action') {
      const sanction = isSlash && ctx.interaction ? ctx.interaction.options.getString('sanction', true) : ctx.args[1];
      const updated = securityStorage.updateConfig(guildId, {
        antiNuke: { ...securityStorage.getConfig(guildId).antiNuke, action: sanction as 'alert' | 'strip_roles' | 'ban' },
      });
      emitConfigUpdated('antiNuke', guildId, updated.antiNuke, 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(`✅ Sanction Anti-Nuke réglée sur **${sanction}**.`)],
      });
      return;
    }

    if (sub === 'threshold') {
      const key = isSlash && ctx.interaction ? ctx.interaction.options.getString('seuil', true) : ctx.args[1];
      const rawValue = isSlash && ctx.interaction ? ctx.interaction.options.getInteger('valeur', true) : Number(ctx.args[2]);
      const limits = THRESHOLD_LIMITS[key as string];
      if (!limits) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription('❌ Seuil inconnu.')],
          ephemeral: true,
        });
        return;
      }
      const value = Math.max(limits.min, Math.min(limits.max, rawValue));
      const current = securityStorage.getConfig(guildId).antiNuke;
      const updated = securityStorage.updateConfig(guildId, {
        antiNuke: { ...current, [key as string]: value },
      });
      emitConfigUpdated('antiNuke', guildId, updated.antiNuke, 'DISCORD_COMMAND', ctx.author.id);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(`✅ Seuil **${key}** réglé sur **${value}** (limites : ${limits.min}-${limits.max}).`),
        ],
      });
      return;
    }

    await ctx.reply({
      embeds: [ctx.createEmbed('info').setDescription('Utilisation : `/antinuke status | toggle | action | threshold`')],
      ephemeral: true,
    });
  },
};
