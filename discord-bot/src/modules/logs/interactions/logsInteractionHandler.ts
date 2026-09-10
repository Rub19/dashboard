import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  Guild,
  StringSelectMenuBuilder,
  type AnySelectMenuInteraction,
  type BaseMessageOptions,
  type ButtonInteraction,
} from 'discord.js';
import { auditRepository } from '../storage/auditRepository.js';
import type { AuditChannelRouting, AuditSettings, ChannelLogThreshold } from '../types/auditEvent.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

/**
 * `auditRepository.updateConfig` fusionne `routing` au runtime, mais son type
 * attend un `AuditChannelRouting` complet. Ce helper concentre le cast.
 */
export function patchLogRouting(guildId: string, patch: Partial<AuditChannelRouting>, extra: Partial<AuditSettings> = {}) {
  return auditRepository.updateConfig(guildId, {
    ...extra,
    routing: patch as AuditChannelRouting,
  });
}

/**
 * Panneau interactif de `/logs setup`.
 *
 * Écrit dans `auditRepository` — la config que `DiscordLogService.dispatchToDiscord`
 * lit réellement pour router chaque événement vers un salon. Le panneau est
 * sans état : le "bucket" en cours d'édition est encodé dans le customId du
 * menu de sélection de salon (`logs_pick:<bucket>`).
 */

export type LogBucket = 'general' | 'moderation' | 'security' | 'automod' | 'raid';

export const LOG_BUCKETS: Record<LogBucket, { label: string; emoji: string; desc: string }> = {
  general: {
    label: 'Général',
    emoji: '📋',
    desc: 'Arrivées / départs, messages supprimés & édités, rôles, salons, serveur, vocal',
  },
  moderation: { label: 'Modération', emoji: '🔨', desc: 'Avertissements, mutes, expulsions, bannissements' },
  security: { label: 'Sécurité', emoji: '🛡️', desc: 'Anti-nuke, suppressions massives, incidents' },
  automod: { label: 'AutoMod', emoji: '🤖', desc: 'Alertes du filtre automatique (spam, liens, mots)' },
  raid: { label: 'Raid', emoji: '🚨', desc: "Détection de raids et vagues d'arrivées suspectes" },
};

export const THRESHOLD_LABELS: Record<ChannelLogThreshold, string> = {
  ALL: 'Tout',
  IMPORTANT: 'Important',
  CRITICAL_ONLY: 'Critique uniquement',
  OFF: 'Désactivé',
};

const RETENTION_OPTIONS: { value: string; label: string }[] = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '180', label: '180 jours' },
  { value: '365', label: '1 an' },
  { value: '0', label: 'Illimité' },
];

function channelIdKey(bucket: LogBucket): keyof AuditChannelRouting {
  return `${bucket}ChannelId` as keyof AuditChannelRouting;
}

export function buildLogsPanel(guild: Guild, activeBucket: LogBucket = 'general'): BaseMessageOptions {
  const config = auditRepository.getConfig(guild.id);
  const routing = config.routing;

  const lines = (Object.keys(LOG_BUCKETS) as LogBucket[]).map((bucket) => {
    const id = routing[channelIdKey(bucket)] as string | null | undefined;
    const meta = LOG_BUCKETS[bucket];
    const target = id ? `<#${id}>` : '—';
    const thr = THRESHOLD_LABELS[routing[`${bucket}Threshold` as keyof AuditChannelRouting] as ChannelLogThreshold];
    return `${meta.emoji} **${meta.label}** → ${target}  ·  *${thr}*`;
  });

  const retentionLabel =
    RETENTION_OPTIONS.find((o) => Number(o.value) === config.retentionDays)?.label ?? `${config.retentionDays} jours`;

  const embed: EmbedBuilder = baseEmbed(config.enabled ? 'primary' : 'neutral', {
    color: config.enabled ? 0x5865f2 : 0x6b7280,
    footerText: 'ETHONE • Logs',
  })
    .setTitle(`${config.enabled ? '🟢' : '⚪'} Configuration des logs`)
    .setDescription(
      [
        config.enabled
          ? "Les événements du serveur sont enregistrés et envoyés dans les salons ci-dessous."
          : "Le module est **désactivé** : rien n'est envoyé pour l'instant. Choisis un salon puis active-le.",
        '',
        ...lines,
        '',
        `🗂️ Rétention de l'historique : **${retentionLabel}**`,
        '',
        `✏️ Salon en cours d'édition : **${LOG_BUCKETS[activeBucket].emoji} ${LOG_BUCKETS[activeBucket].label}** — ${LOG_BUCKETS[activeBucket].desc}`,
      ].join('\n')
    );

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`logs_pick:${activeBucket}`)
    .setPlaceholder(`Salon pour « ${LOG_BUCKETS[activeBucket].label} »`)
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(0)
    .setMaxValues(1);

  const bucketButtons = (Object.keys(LOG_BUCKETS) as LogBucket[]).map((bucket) =>
    new ButtonBuilder()
      .setCustomId(`logs_bucket:${bucket}`)
      .setEmoji(LOG_BUCKETS[bucket].emoji)
      .setLabel(LOG_BUCKETS[bucket].label)
      .setStyle(bucket === activeBucket ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const retentionSelect = new StringSelectMenuBuilder()
    .setCustomId('logs_retention')
    .setPlaceholder("Durée de rétention de l'historique")
    .addOptions(
      RETENTION_OPTIONS.map((o) => ({
        label: o.label,
        value: o.value,
        default: Number(o.value) === config.retentionDays,
      }))
    );

  const actionButtons = [
    new ButtonBuilder()
      .setCustomId('logs_toggle')
      .setLabel(config.enabled ? 'Désactiver' : 'Activer')
      .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`logs_clear:${activeBucket}`)
      .setLabel('Retirer ce salon')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!routing[channelIdKey(activeBucket)]),
    new ButtonBuilder()
      .setCustomId('logs_verbosity_cycle:' + activeBucket)
      .setLabel(
        `Verbosité : ${THRESHOLD_LABELS[routing[`${activeBucket}Threshold` as keyof AuditChannelRouting] as ChannelLogThreshold]}`
      )
      .setStyle(ButtonStyle.Secondary),
  ];

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect),
      new ActionRowBuilder<ButtonBuilder>().addComponents(bucketButtons.slice(0, 5)),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(retentionSelect),
      new ActionRowBuilder<ButtonBuilder>().addComponents(actionButtons),
    ],
  };
}

const THRESHOLD_CYCLE: ChannelLogThreshold[] = ['ALL', 'IMPORTANT', 'CRITICAL_ONLY', 'OFF'];

export async function handleLogsInteraction(
  interaction: ButtonInteraction | AnySelectMenuInteraction
): Promise<void> {
  if (!interaction.guild) return;

  // Garde de permission : seuls ceux qui peuvent gérer le serveur touchent la config.
  const member = interaction.member;
  const perms =
    member && typeof member.permissions !== 'string' ? member.permissions : interaction.memberPermissions;
  if (!perms?.has('ManageGuild')) {
    await interaction.reply({ content: "❌ Il te faut la permission « Gérer le serveur ».", ephemeral: true });
    return;
  }

  const guildId = interaction.guild.id;
  const id = interaction.customId;

  try {
    // Menu de sélection de salon : `logs_pick:<bucket>`
    if (interaction.isChannelSelectMenu() && id.startsWith('logs_pick:')) {
      const bucket = id.split(':')[1] as LogBucket;
      const picked = interaction.values[0] ?? null;
      patchLogRouting(guildId, { [channelIdKey(bucket)]: picked }, picked ? { enabled: true } : {});
      await interaction.update(buildLogsPanel(interaction.guild, bucket));
      return;
    }

    // Sélecteur de rétention
    if (interaction.isStringSelectMenu() && id === 'logs_retention') {
      auditRepository.updateConfig(guildId, { retentionDays: Number(interaction.values[0]) });
      await interaction.update(buildLogsPanel(interaction.guild, 'general'));
      return;
    }

    if (interaction.isButton()) {
      if (id.startsWith('logs_bucket:')) {
        const bucket = id.split(':')[1] as LogBucket;
        await interaction.update(buildLogsPanel(interaction.guild, bucket));
        return;
      }
      if (id === 'logs_toggle') {
        const cur = auditRepository.getConfig(guildId);
        auditRepository.updateConfig(guildId, { enabled: !cur.enabled });
        await interaction.update(buildLogsPanel(interaction.guild, 'general'));
        return;
      }
      if (id.startsWith('logs_clear:')) {
        const bucket = id.split(':')[1] as LogBucket;
        patchLogRouting(guildId, { [channelIdKey(bucket)]: null });
        await interaction.update(buildLogsPanel(interaction.guild, bucket));
        return;
      }
      if (id.startsWith('logs_verbosity_cycle:')) {
        const bucket = id.split(':')[1] as LogBucket;
        const cur = auditRepository.getConfig(guildId);
        const key = `${bucket}Threshold` as keyof AuditChannelRouting;
        const currentThr = cur.routing[key] as ChannelLogThreshold;
        const next = THRESHOLD_CYCLE[(THRESHOLD_CYCLE.indexOf(currentThr) + 1) % THRESHOLD_CYCLE.length];
        patchLogRouting(guildId, { [key]: next });
        await interaction.update(buildLogsPanel(interaction.guild, bucket));
        return;
      }
    }
  } catch (err) {
    logger.error('[Logs] Échec du traitement de l\'interaction du panneau :', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "❌ Une erreur est survenue. Réessaie.", ephemeral: true })
        .catch(() => {});
    }
  }
}
