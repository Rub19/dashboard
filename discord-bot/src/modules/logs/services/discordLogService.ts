import {
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
  Webhook,
} from 'discord.js';
import { AuditEvent, AuditModule, AuditSeverity, AuditSettings, ChannelLogThreshold, LogCategoryKey } from '../types/auditEvent.js';
import { DEFAULT_CATEGORY_NAME, categoryKeyOf, sanitizeWebhookName } from './logCategories.js';
import { auditRepository } from '../storage/auditRepository.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed } from '../../../utils/embeds.js';

const WEBHOOK_NAME = 'ETHONE Logs';

/** Résultat d'une livraison (utilisé par le message de test du dashboard). */
export interface DeliveryResult {
  ok: boolean;
  reason?: 'bot_offline' | 'guild_not_found' | 'disabled' | 'no_channel' | 'no_permission' | 'error';
  name: string;
  channelId?: string;
  via?: 'webhook' | 'bot';
}

export class DiscordLogService {
  private static discordClient: Client | null = null;
  /** Webhook « ETHONE Logs » par salon (recréé au besoin après un redémarrage). */
  private static webhookCache = new Map<string, Webhook>();

  public static initialize(client: Client): void {
    this.discordClient = client;
  }

  public static async dispatchToDiscord(event: AuditEvent): Promise<void> {
    await this.deliver(event, false);
  }

  /** Nom du webhook pour cet événement : celui choisi dans le dashboard, sinon « vocals », « mod »… */
  public static webhookNameFor(config: AuditSettings, key: LogCategoryKey): string {
    return sanitizeWebhookName(config.webhookNames?.[key], DEFAULT_CATEGORY_NAME[key]);
  }

  /**
   * Envoie un message de test pour une catégorie (ignore le seuil de sévérité) et dit précisément ce
   * qui a été fait, ou pourquoi rien n'est parti.
   */
  public static async sendTest(guildId: string, key: LogCategoryKey): Promise<DeliveryResult> {
    const event: AuditEvent = {
      id: 'AUD-TEST',
      guildId,
      module: key === 'RAID' ? 'SECURITY' : key,
      type: key === 'RAID' ? 'RAID_TEST' : 'LOG_TEST',
      severity: 'INFO',
      actor: { id: 'ETHONE_ADMIN', tag: 'Test depuis le dashboard' },
      reason: 'Message de test : si tu le vois, cette catégorie est bien branchée.',
      timestamp: new Date().toISOString(),
    };
    return this.deliver(event, true);
  }

  private static async deliver(event: AuditEvent, force: boolean): Promise<DeliveryResult> {
    const key = categoryKeyOf(event);
    if (!this.discordClient) return { ok: false, reason: 'bot_offline', name: DEFAULT_CATEGORY_NAME[key] };

    try {
      const guild = this.discordClient.guilds.cache.get(event.guildId);
      if (!guild) return { ok: false, reason: 'guild_not_found', name: DEFAULT_CATEGORY_NAME[key] };

      const config = auditRepository.getConfig(event.guildId);
      const name = this.webhookNameFor(config, key);
      if (!config.enabled && !force) return { ok: false, reason: 'disabled', name };

      const targetChannel = this.resolveChannel(guild, event, config, force);
      if (!targetChannel) return { ok: false, reason: 'no_channel', name };

      const me = guild.members.me;
      if (!me || !targetChannel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
        return { ok: false, reason: 'no_permission', name, channelId: targetChannel.id };
      }

      const embed = this.createEmbed(event);

      // Livraison via webhook (username = nom de la catégorie) sauf si explicitement désactivé.
      if (config.useWebhooks !== false) {
        const webhook = await this.getWebhook(targetChannel, me);
        if (webhook) {
          let fallback = false;
          await webhook
            .send({
              username: name,
              avatarURL: guild.client.user?.displayAvatarURL(),
              embeds: [embed],
              allowedMentions: { parse: [] },
            })
            .catch(async (err) => {
              // Webhook invalide (supprimé côté Discord) → on purge et on retombe sur le bot.
              logger.warn('[Logs] Envoi webhook échoué, fallback bot :', err);
              this.webhookCache.delete(targetChannel.id);
              fallback = true;
              await targetChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
            });
          return { ok: true, name, channelId: targetChannel.id, via: fallback ? 'bot' : 'webhook' };
        }
      }

      await targetChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
      return { ok: true, name, channelId: targetChannel.id, via: 'bot' };
    } catch (err) {
      logger.error('Erreur dans DiscordLogService.dispatchToDiscord :', err);
      return { ok: false, reason: 'error', name: DEFAULT_CATEGORY_NAME[key] };
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

  private static resolveChannel(guild: Guild, event: AuditEvent, config: AuditSettings, force = false): TextChannel | null {
    const routing = config.routing;
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

    // Salon dédié à cette catégorie (choisi dans le dashboard) : prioritaire sur le routage ci-dessus.
    const dedicated = config.categoryChannels?.[categoryKeyOf(event)];
    if (dedicated) channelId = dedicated;

    if (!channelId) {
      channelId = routing.generalChannelId;
      threshold = routing.generalThreshold;
    }

    if (!force && !this.shouldSend(event.severity, threshold)) return null;
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

    const footerBits = [`${iconMap[event.module] || '📜'} ${event.module}`, event.severity];
    if (event.actor?.id && event.actor.id.length > 5) footerBits.push(`ID ${event.id}`);

    const embed = baseEmbed('default', {
      color: colorMap[event.severity] || 0x2b2d31,
      footerText: footerBits.join(' • '),
      timestamp: new Date(event.timestamp),
    }).setAuthor({
      name: targetName ? `${prettyType} — ${targetName}` : prettyType,
      iconURL: event.target?.avatar || undefined,
    });

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

    return embed;
  }
}
