import {
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
  Webhook,
} from 'discord.js';
import { AuditEvent, AuditModule, AuditSeverity, ChannelLogThreshold } from '../types/auditEvent.js';
import { auditRepository } from '../storage/auditRepository.js';
import { logger } from '../../../utils/logger.js';

const WEBHOOK_NAME = 'ETHONE Logs';

/** Nom affiché (username du webhook) par catégorie de log — comme les gros bots. */
const CATEGORY_LABEL: Partial<Record<AuditModule, string>> = {
  MODERATION: 'Modération',
  SECURITY: 'Sécurité',
  AUTOMOD: 'AutoMod',
  VOICE: 'Vocal',
  MEMBERS: 'Membres',
  MESSAGES: 'Messages',
  ROLES: 'Rôles',
  CHANNELS: 'Salons',
  SERVER: 'Serveur',
  WEBHOOKS: 'Webhooks',
  BOTS: 'Bots',
  SYSTEM: 'Système',
};

function categoryLabel(event: AuditEvent): string {
  if (event.module === 'SECURITY' && event.type.includes('RAID')) return 'Anti-Raid';
  return CATEGORY_LABEL[event.module] || 'Journal';
}

export class DiscordLogService {
  private static discordClient: Client | null = null;
  /** Webhook « ETHONE Logs » par salon (recréé au besoin après un redémarrage). */
  private static webhookCache = new Map<string, Webhook>();

  public static initialize(client: Client): void {
    this.discordClient = client;
  }

  public static async dispatchToDiscord(event: AuditEvent): Promise<void> {
    if (!this.discordClient) return;

    try {
      const guild = this.discordClient.guilds.cache.get(event.guildId);
      if (!guild) return;

      const config = auditRepository.getConfig(event.guildId);
      if (!config.enabled) return;

      const targetChannel = this.resolveChannel(guild, event, config.routing);
      if (!targetChannel) return;

      const me = guild.members.me;
      if (!me || !targetChannel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) return;

      const embed = this.createEmbed(event);

      // Livraison via webhook (username = catégorie) sauf si explicitement désactivé.
      if (config.useWebhooks !== false) {
        const webhook = await this.getWebhook(targetChannel, me);
        if (webhook) {
          await webhook
            .send({
              username: `${categoryLabel(event)}`,
              avatarURL: guild.client.user?.displayAvatarURL(),
              embeds: [embed],
              allowedMentions: { parse: [] },
            })
            .catch(async (err) => {
              // Webhook invalide (supprimé côté Discord) → on purge et on retombe sur le bot.
              logger.warn('[Logs] Envoi webhook échoué, fallback bot :', err);
              this.webhookCache.delete(targetChannel.id);
              await targetChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
            });
          return;
        }
      }

      await targetChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (err) {
      logger.error('Erreur dans DiscordLogService.dispatchToDiscord :', err);
    }
  }

  /** Récupère (ou crée) le webhook « ETHONE Logs » du salon, appartenant au bot. */
  private static async getWebhook(
    channel: TextChannel,
    me: NonNullable<Guild['members']['me']>
  ): Promise<Webhook | null> {
    const cached = this.webhookCache.get(channel.id);
    if (cached) return cached;

    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageWebhooks)) return null;

    try {
      const existing = await channel.fetchWebhooks();
      const mine = existing.find((w) => w.owner?.id === channel.client.user?.id && w.name === WEBHOOK_NAME);
      if (mine) {
        this.webhookCache.set(channel.id, mine);
        return mine;
      }
      const created = await channel.createWebhook({
        name: WEBHOOK_NAME,
        avatar: channel.client.user?.displayAvatarURL(),
        reason: 'Livraison des journaux ETHONE',
      });
      this.webhookCache.set(channel.id, created);
      return created;
    } catch (err) {
      logger.warn(`[Logs] Impossible de créer/récupérer le webhook dans #${channel.name} :`, err);
      return null;
    }
  }

  private static resolveChannel(
    guild: Guild,
    event: AuditEvent,
    routing: ReturnType<typeof auditRepository.getConfig>['routing']
  ): TextChannel | null {
    let channelId: string | null | undefined = null;
    let threshold: ChannelLogThreshold = 'IMPORTANT';

    if (event.module === 'SECURITY') {
      if (event.type.includes('RAID') && routing.raidChannelId) {
        channelId = routing.raidChannelId;
        threshold = routing.raidThreshold;
      } else {
        channelId = routing.securityChannelId;
        threshold = routing.securityThreshold;
      }
    } else if (event.module === 'AUTOMOD') {
      channelId = routing.automodChannelId;
      threshold = routing.automodThreshold;
    } else if (event.module === 'MODERATION') {
      channelId = routing.moderationChannelId;
      threshold = routing.moderationThreshold;
    } else {
      channelId = routing.generalChannelId;
      threshold = routing.generalThreshold;
    }

    if (!channelId) {
      channelId = routing.generalChannelId;
      threshold = routing.generalThreshold;
    }

    if (!this.shouldSend(event.severity, threshold)) return null;
    if (!channelId) return null;

    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.type === ChannelType.GuildText) return channel as TextChannel;
    return null;
  }

  private static shouldSend(severity: AuditSeverity, threshold: ChannelLogThreshold): boolean {
    if (threshold === 'OFF') return false;
    if (threshold === 'ALL') return true;
    if (threshold === 'IMPORTANT') return severity === 'MEDIUM' || severity === 'HIGH' || severity === 'CRITICAL';
    if (threshold === 'CRITICAL_ONLY') return severity === 'CRITICAL';
    return true;
  }

  private static createEmbed(event: AuditEvent): EmbedBuilder {
    const colorMap: Record<AuditSeverity, number> = {
      CRITICAL: 0xef4444,
      HIGH: 0xf97316,
      MEDIUM: 0xeab308,
      LOW: 0x3b82f6,
      INFO: 0x2b2d31,
    };

    const iconMap: Record<AuditModule, string> = {
      MEMBERS: '👤', MESSAGES: '💬', ROLES: '🎭', CHANNELS: '📁', SERVER: '🌐',
      VOICE: '🔊', WEBHOOKS: '🔗', BOTS: '🤖', MODERATION: '👮', AUTOMOD: '⚡',
      SECURITY: '🛡️', SYSTEM: '⚙️',
    };

    const prettyType = event.type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
    const targetName =
      event.target?.tag ||
      event.target?.name ||
      (event.target?.type === 'USER' ? `<@${event.target.id}>` : event.target?.id) ||
      '';

    const embed = new EmbedBuilder()
      .setColor(colorMap[event.severity] || 0x2b2d31)
      .setAuthor({
        name: targetName ? `${prettyType} — ${targetName}` : prettyType,
        iconURL: event.target?.avatar || undefined,
      })
      .setTimestamp(new Date(event.timestamp));

    // Corps narratif : cible + acteur + salon.
    const parts: string[] = [];
    if (event.target) {
      const t =
        event.target.type === 'USER'
          ? `<@${event.target.id}>`
          : event.target.type === 'CHANNEL'
          ? `<#${event.target.id}>`
          : event.target.type === 'ROLE'
          ? `<@&${event.target.id}>`
          : `**${event.target.name || event.target.id}**`;
      parts.push(t);
    }
    if (event.channel && event.target?.type !== 'CHANNEL') {
      parts.push(`dans <#${event.channel.id}>`);
    }
    if (event.actor?.id && event.actor.id !== event.target?.id && !/^dashboard|^system/i.test(event.actor.id)) {
      parts.push(`— par <@${event.actor.id}>`);
    } else if (event.actor?.tag && /dashboard|system/i.test(event.actor.id || '')) {
      parts.push(`— par ${event.actor.tag}`);
    }
    if (parts.length > 0) embed.setDescription(parts.join(' '));

    if (event.reason) {
      embed.addFields({ name: 'Raison', value: event.reason.slice(0, 1024) });
    }

    if (Array.isArray(event.diff) && event.diff.length > 0) {
      const lines = event.diff.slice(0, 6).map((d) => `**${d.field}** : \`${String(d.before ?? '—').slice(0, 40)}\` → \`${String(d.after ?? '—').slice(0, 40)}\``);
      embed.addFields({ name: 'Changements', value: lines.join('\n') });
    }

    if (event.caseId) embed.addFields({ name: 'Dossier', value: `Case #${event.caseId}`, inline: true });
    if (event.incidentId) embed.addFields({ name: 'Incident', value: `${event.incidentId}`, inline: true });

    const footerBits = [`${iconMap[event.module] || '📜'} ${event.module}`, event.severity];
    if (event.actor?.id && event.actor.id.length > 5) footerBits.push(`ID ${event.id}`);
    embed.setFooter({ text: footerBits.join(' • ') });

    return embed;
  }
}
