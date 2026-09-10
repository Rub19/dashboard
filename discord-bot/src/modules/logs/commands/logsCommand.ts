import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { auditRepository } from '../storage/auditRepository.js';
import type { AuditChannelRouting, ChannelLogThreshold } from '../types/auditEvent.js';
import {
  buildLogsPanel,
  patchLogRouting,
  LOG_BUCKETS,
  THRESHOLD_LABELS,
  type LogBucket,
} from '../interactions/logsInteractionHandler.js';

const BUCKET_CHOICES = (Object.keys(LOG_BUCKETS) as LogBucket[]).map((b) => ({
  name: `${LOG_BUCKETS[b].emoji} ${LOG_BUCKETS[b].label}`,
  value: b,
}));

const LEVEL_CHOICES: { name: string; value: ChannelLogThreshold }[] = [
  { name: 'Tout', value: 'ALL' },
  { name: 'Important', value: 'IMPORTANT' },
  { name: 'Critique uniquement', value: 'CRITICAL_ONLY' },
  { name: 'Désactivé', value: 'OFF' },
];

const RETENTION_CHOICES = [
  { name: '7 jours', value: 7 },
  { name: '30 jours', value: 30 },
  { name: '90 jours', value: 90 },
  { name: '180 jours', value: 180 },
  { name: '1 an', value: 365 },
  { name: 'Illimité', value: 0 },
];

function key(bucket: LogBucket): keyof AuditChannelRouting {
  return `${bucket}ChannelId` as keyof AuditChannelRouting;
}
function thrKey(bucket: LogBucket): keyof AuditChannelRouting {
  return `${bucket}Threshold` as keyof AuditChannelRouting;
}

export const logsCommand: Command = {
  name: 'logs',
  description: 'Configure les journaux du serveur (salons, catégories, verbosité, rétention)',
  category: 'Configuration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure les journaux du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s.setName('setup').setDescription('Ouvre le panneau de configuration guidé (salons, catégories, rétention)')
    )
    .addSubcommand((s) =>
      s
        .setName('channel')
        .setDescription('Envoie TOUS les logs dans un seul salon (mise en route rapide)')
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Le salon qui recevra tous les journaux')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('route')
        .setDescription("Envoie une catégorie de logs dans son propre salon")
        .addStringOption((o) =>
          o.setName('categorie').setDescription('Catégorie à router').setRequired(true).addChoices(...BUCKET_CHOICES)
        )
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Salon de destination (vide = retirer)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('verbosite')
        .setDescription("Règle le niveau de détail d'une catégorie")
        .addStringOption((o) =>
          o.setName('categorie').setDescription('Catégorie').setRequired(true).addChoices(...BUCKET_CHOICES)
        )
        .addStringOption((o) =>
          o.setName('niveau').setDescription('Niveau de détail').setRequired(true).addChoices(...LEVEL_CHOICES)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('retention')
        .setDescription("Durée de conservation de l'historique des logs")
        .addIntegerOption((o) =>
          o.setName('duree').setDescription('Durée').setRequired(true).addChoices(...RETENTION_CHOICES)
        )
    )
    .addSubcommand((s) => s.setName('status').setDescription('Affiche la configuration actuelle des logs'))
    .addSubcommand((s) => s.setName('disable').setDescription('Désactive les journaux (la config est conservée)')),

  execute: async (ctx: CommandContext) => {
    const guild = ctx.guild;
    if (!guild) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription('❌ Commande réservée aux serveurs.')],
        ephemeral: true,
      });
      return;
    }
    if (!ctx.isSlash || !ctx.interaction) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription('ℹ️ Utilise la commande slash `/logs`.')],
        ephemeral: true,
      });
      return;
    }

    const sub = ctx.interaction.options.getSubcommand();

    if (sub === 'setup') {
      const panel = buildLogsPanel(guild, 'general');
      await ctx.reply({ ...panel, ephemeral: true });
      return;
    }

    if (sub === 'channel') {
      const channel = ctx.interaction.options.getChannel('salon', true) as TextChannel;
      const me = guild.members.me;
      if (me && !channel.permissionsFor(me).has(['SendMessages', 'EmbedLinks'])) {
        await ctx.reply({
          embeds: [
            ctx
              .createEmbed('error')
              .setDescription(`❌ Il me manque **Envoyer des messages** ou **Intégrer des liens** dans <#${channel.id}>.`),
          ],
          ephemeral: true,
        });
        return;
      }
      patchLogRouting(
        guild.id,
        {
          generalChannelId: channel.id,
          moderationChannelId: channel.id,
          securityChannelId: channel.id,
          automodChannelId: channel.id,
          raidChannelId: channel.id,
        },
        { enabled: true }
      );
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setTitle('📋 Journaux activés')
            .setDescription(
              `Tous les événements (arrivées, messages supprimés, sanctions, sécurité…) seront envoyés dans <#${channel.id}>.\nUtilise \`/logs setup\` pour répartir les catégories dans des salons séparés.`
            ),
        ],
      });
      return;
    }

    if (sub === 'route') {
      const bucket = ctx.interaction.options.getString('categorie', true) as LogBucket;
      const channel = ctx.interaction.options.getChannel('salon') as TextChannel | null;
      patchLogRouting(guild.id, { [key(bucket)]: channel?.id ?? null }, channel ? { enabled: true } : {});
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(
              channel
                ? `${LOG_BUCKETS[bucket].emoji} **${LOG_BUCKETS[bucket].label}** → <#${channel.id}>.`
                : `${LOG_BUCKETS[bucket].emoji} **${LOG_BUCKETS[bucket].label}** ne sera plus envoyé dans un salon dédié.`
            ),
        ],
      });
      return;
    }

    if (sub === 'verbosite') {
      const bucket = ctx.interaction.options.getString('categorie', true) as LogBucket;
      const level = ctx.interaction.options.getString('niveau', true) as ChannelLogThreshold;
      patchLogRouting(guild.id, { [thrKey(bucket)]: level });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(
              `${LOG_BUCKETS[bucket].emoji} **${LOG_BUCKETS[bucket].label}** : verbosité réglée sur **${THRESHOLD_LABELS[level]}**.`
            ),
        ],
      });
      return;
    }

    if (sub === 'retention') {
      const days = ctx.interaction.options.getInteger('duree', true);
      auditRepository.updateConfig(guild.id, { retentionDays: days });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(
              days === 0
                ? "🗂️ L'historique des logs est désormais conservé **sans limite**."
                : `🗂️ L'historique des logs est conservé **${days} jours**.`
            ),
        ],
      });
      return;
    }

    if (sub === 'disable') {
      auditRepository.updateConfig(guild.id, { enabled: false });
      await ctx.reply({
        embeds: [
          ctx.createEmbed('neutral').setDescription('⏸️ Journaux désactivés. La configuration est conservée — `/logs setup` pour réactiver.'),
        ],
      });
      return;
    }

    // status
    const config = auditRepository.getConfig(guild.id);
    const rows = (Object.keys(LOG_BUCKETS) as LogBucket[]).map((b) => {
      const id = config.routing[key(b)] as string | null | undefined;
      const thr = THRESHOLD_LABELS[config.routing[thrKey(b)] as ChannelLogThreshold];
      return `${LOG_BUCKETS[b].emoji} **${LOG_BUCKETS[b].label}** → ${id ? `<#${id}>` : '—'}  ·  *${thr}*`;
    });
    const retention =
      RETENTION_CHOICES.find((r) => r.value === config.retentionDays)?.name ?? `${config.retentionDays} jours`;
    await ctx.reply({
      embeds: [
        ctx
          .createEmbed(config.enabled ? 'default' : 'neutral')
          .setTitle(`${config.enabled ? '🟢' : '⚪'} Journaux du serveur`)
          .setDescription(
            [
              config.enabled ? 'Module **actif**.' : 'Module **inactif** — `/logs setup` pour démarrer.',
              '',
              ...rows,
              '',
              `🗂️ Rétention : **${retention}**`,
            ].join('\n')
          ),
      ],
    });
  },
};
