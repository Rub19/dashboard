import { ChannelType, Client, EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { AuditEvent, AuditModule, AuditSeverity, ChannelLogThreshold } from '../types/auditEvent.js';
import { auditRepository } from '../storage/auditRepository.js';
import { logger } from '../../../utils/logger.js';

export class DiscordLogService {
  private static discordClient: Client | null = null;

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
      if (!targetChannel.permissionsFor(me!)?.has('SendMessages')) {
        return;
      }

      const embed = this.createEmbed(event);
      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Erreur dans DiscordLogService.dispatchToDiscord :', err);
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
      // Fallback sur le salon général s'il existe
      channelId = routing.generalChannelId;
      threshold = routing.generalThreshold;
    }

    // Vérifier si le seuil autorise l'envoi
    if (!this.shouldSend(event.severity, threshold)) {
      return null;
    }

    if (!channelId) return null;

    const channel = guild.channels.cache.get(channelId);
    if (channel && channel.type === ChannelType.GuildText) {
      return channel as TextChannel;
    }

    return null;
  }

  private static shouldSend(severity: AuditSeverity, threshold: ChannelLogThreshold): boolean {
    if (threshold === 'OFF') return false;
    if (threshold === 'ALL') return true;

    if (threshold === 'IMPORTANT') {
      return severity === 'MEDIUM' || severity === 'HIGH' || severity === 'CRITICAL';
    }

    if (threshold === 'CRITICAL_ONLY') {
      return severity === 'CRITICAL';
    }

    return true;
  }

  private static createEmbed(event: AuditEvent): EmbedBuilder {
    const colorMap: Record<AuditSeverity, number> = {
      CRITICAL: 0xef4444, // Rouge vif
      HIGH: 0xf97316, // Orange
      MEDIUM: 0xeab308, // Jaune
      LOW: 0x3b82f6, // Bleu
      INFO: 0x10b981, // Émeraude
    };

    const iconMap: Record<AuditModule, string> = {
      MEMBERS: '👤',
      MESSAGES: '💬',
      ROLES: '🎭',
      CHANNELS: '📁',
      SERVER: '🌐',
      VOICE: '🔊',
      WEBHOOKS: '🔗',
      BOTS: '🤖',
      MODERATION: '👮',
      AUTOMOD: '⚡',
      SECURITY: '🛡️',
      SYSTEM: '⚙️',
    };

    const icon = iconMap[event.module] || '📜';
    const embed = new EmbedBuilder()
      .setColor(colorMap[event.severity] || 0x6366f1)
      .setTitle(`${icon} ${event.type.replace(/_/g, ' ')} [${event.severity}]`)
      .setTimestamp(new Date(event.timestamp))
      .setFooter({ text: `ID: ${event.id} • Module: ${event.module}` });

    if (event.actor.tag) {
      embed.addFields({
        name: '👤 Acteur',
        value: `${event.actor.tag} (<@${event.actor.id}>)`,
        inline: true,
      });
    }

    if (event.target) {
      embed.addFields({
        name: `🎯 Cible (${event.target.type})`,
        value: `${event.target.name || event.target.id} ${event.target.type === 'USER' ? `(<@${event.target.id}>)` : ''}`,
        inline: true,
      });
    }

    if (event.channel) {
      embed.addFields({
        name: '📍 Salon',
        value: `#${event.channel.name} (<#${event.channel.id}>)`,
        inline: true,
      });
    }

    if (event.reason) {
      embed.addFields({
        name: '📋 Raison / Détail',
        value: event.reason.slice(0, 1024),
        inline: false,
      });
    }

    if (event.caseId) {
      embed.addFields({
        name: '⚖️ Dossier Modération',
        value: `Case #${event.caseId}`,
        inline: true,
      });
    }

    if (event.incidentId) {
      embed.addFields({
        name: '🚨 Incident Sécurité',
        value: `${event.incidentId}`,
        inline: true,
      });
    }

    return embed;
  }
}
