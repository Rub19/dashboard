import { Client, Events, AuditLogEvent } from 'discord.js';
import { logService } from '../modules/logs/services/logService.js';
import { onInteractionCreate } from '../events/interactionCreate.js';
import { onMessageCreate } from '../events/messageCreate.js';
import { onReady } from '../events/ready.js';
import { onGuildMemberAdd } from '../events/guildMemberAdd.js';
import { onGuildMemberRemove } from '../events/guildMemberRemove.js';
import {
  handleMessageDelete,
  handleMessageDeleteBulk,
  handleMessageUpdate,
} from '../modules/logs/events/messageLogs.js';
import {
  handleGuildBanAdd,
  handleGuildBanRemove,
  handleGuildMemberUpdate,
} from '../modules/logs/events/memberLogs.js';
import {
  handleRoleCreate,
  handleRoleDelete,
  handleRoleUpdate,
} from '../modules/logs/events/roleLogs.js';
import {
  handleChannelCreate,
  handleChannelDelete,
  handleChannelUpdate,
} from '../modules/logs/events/channelLogs.js';
import { handleVoiceStateUpdate } from '../modules/logs/events/voiceLogs.js';
import { handleGuildUpdate } from '../modules/logs/events/serverLogs.js';
import { antiNukeService } from '../modules/security/services/antiNukeService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { autoModService } from '../modules/automod/services/autoModService.js';
import { inviteSnapshotService } from '../modules/invites/services/inviteSnapshotService.js';
import { voiceService } from '../modules/voice/services/voiceService.js';
import { healthStatusService } from '../services/resilience/healthStatusService.js';
import { logger } from '../utils/logger.js';

let isEventsRegistered = false;

export function registerEvents(client: Client): void {
  if (isEventsRegistered) {
    logger.warn('[EventHandler] Events already registered. Skipping duplicate registration.');
    return;
  }
  isEventsRegistered = true;

  // Gateway Lifecycle & Resilience Events
  client.on(Events.ShardDisconnect, (event, shardId) => {
    logger.error(`[Gateway] Shard ${shardId} disconnected: ${event?.reason || 'Unknown reason'}`);
    healthStatusService.setSubsystemState('gateway', 'DOWN', 0, 'Gateway Shard disconnected');
    healthStatusService.recordIncident({
      service: 'Discord Gateway',
      incident: `Shard ${shardId} Disconnected`,
      severity: 'CRITICAL',
      status: 'RECOVERING',
      impact: 'Bot offline from Gateway',
      recoveryType: 'AUTOMATIC',
      retriesCount: 1,
      result: 'Awaiting automatic reconnect',
    });
  });

  client.on(Events.ShardReconnecting, (shardId) => {
    logger.warn(`[Gateway] Shard ${shardId} reconnecting...`);
    healthStatusService.setSubsystemState('gateway', 'DEGRADED', 0, 'Reconnecting');
    healthStatusService.setSystemState('RECOVERING', `Gateway shard ${shardId} reconnecting...`);
  });

  client.on(Events.ShardResume, (shardId, replayedEvents) => {
    logger.success(`[Gateway] Shard ${shardId} resumed successfully (${replayedEvents} replayed events)`);
    healthStatusService.setSubsystemState('gateway', 'UP', client.ws.ping || 15);
    healthStatusService.setSystemState('HEALTHY', 'Gateway connection resumed');
  });

  client.on(Events.Error, (err) => {
    logger.error('[Discord Client Error]:', err);
    healthStatusService.recordIncident({
      service: 'Discord Gateway',
      incident: err.message || 'Client Socket Error',
      severity: 'WARNING',
      status: 'INVESTIGATING',
      impact: 'Transient network failure',
      recoveryType: 'AUTOMATIC',
      retriesCount: 1,
      result: 'Handled by client',
    });
  });

  // Base Events
  client.once(Events.ClientReady, (c) => onReady(c));
  client.on(Events.InteractionCreate, (interaction) => onInteractionCreate(interaction));
  client.on(Events.MessageCreate, (message) => onMessageCreate(message));
  client.on(Events.GuildMemberAdd, (member) => onGuildMemberAdd(member));
  client.on(Events.GuildMemberRemove, (member) => onGuildMemberRemove(member));

  // Invite Tracker Events
  client.on(Events.InviteCreate, (invite) => inviteSnapshotService.handleInviteCreate(invite));
  client.on(Events.InviteDelete, (invite) => inviteSnapshotService.handleInviteDelete(invite));

  // Logs : Messages
  client.on(Events.MessageDelete, (message) => {
    handleMessageDelete(message);
    autoModService.handleMessageDelete(message);
  });
  client.on(Events.MessageBulkDelete, (messages, channel) =>
    handleMessageDeleteBulk(messages, channel)
  );
  client.on(Events.MessageUpdate, (oldMsg, newMsg) => handleMessageUpdate(oldMsg, newMsg));

  // Logs & Sécurité : Membres
  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    handleGuildMemberUpdate(oldMember, newMember);
    autoModService.handleMemberProfile(newMember);
  });
  client.on(Events.GuildBanAdd, (ban) => {
    handleGuildBanAdd(ban);
    antiNukeService.handleBanAdd(ban.guild);
  });
  client.on(Events.GuildBanRemove, (ban) => handleGuildBanRemove(ban));

  // Logs & Sécurité : Rôles
  client.on(Events.GuildRoleCreate, (role) => {
    handleRoleCreate(role);
    raidDetectionService.handleRoleEvent('ROLE_CREATE', role);
  });
  client.on(Events.GuildRoleDelete, (role) => {
    handleRoleDelete(role);
    antiNukeService.handleRoleDelete(role.guild);
    raidDetectionService.handleRoleEvent('ROLE_DELETE', role);
  });
  client.on(Events.GuildRoleUpdate, (oldRole, newRole) => handleRoleUpdate(oldRole, newRole));

  // Logs & Sécurité : Salons
  client.on(Events.ChannelCreate, (channel) => {
    handleChannelCreate(channel);
    if ('guild' in channel && channel.guild) {
      raidDetectionService.handleChannelEvent('CHANNEL_CREATE', channel as any);
    }
  });
  client.on(Events.ChannelDelete, (channel) => {
    handleChannelDelete(channel);
    if ('guild' in channel && channel.guild) {
      antiNukeService.handleChannelDelete(channel.guild);
      raidDetectionService.handleChannelEvent('CHANNEL_DELETE', channel as any);
    }
  });
  client.on(Events.ChannelUpdate, (oldChan, newChan) => handleChannelUpdate(oldChan, newChan));

  // Audit Logs (Mass ban/kick, webhooks, bots)
  client.on(Events.GuildAuditLogEntryCreate, (entry, guild) => {
    raidDetectionService.handleAuditLog(guild, entry);

    if (
      entry.action === AuditLogEvent.WebhookCreate ||
      entry.action === AuditLogEvent.WebhookDelete ||
      entry.action === AuditLogEvent.WebhookUpdate
    ) {
      const type =
        entry.action === AuditLogEvent.WebhookCreate
          ? 'WEBHOOK_CREATE'
          : entry.action === AuditLogEvent.WebhookDelete
          ? 'WEBHOOK_DELETE'
          : 'WEBHOOK_UPDATE';

      logService.emit({
        guildId: guild.id,
        module: 'WEBHOOKS',
        type,
        actor: {
          id: entry.executorId || 'unknown',
          tag: entry.executor?.tag || 'Inconnu',
          avatar: entry.executor?.displayAvatarURL(),
        },
        target: {
          id: entry.targetId || 'webhook',
          type: 'WEBHOOK',
          name: `Webhook ${entry.targetId || ''}`,
        },
        reason: entry.reason || 'Action sur un Webhook',
      });
    } else if (entry.action === AuditLogEvent.BotAdd) {
      logService.emit({
        guildId: guild.id,
        module: 'BOTS',
        type: 'BOT_ADD',
        actor: {
          id: entry.executorId || 'unknown',
          tag: entry.executor?.tag || 'Inconnu',
          avatar: entry.executor?.displayAvatarURL(),
        },
        target: {
          id: entry.targetId || 'bot',
          type: 'USER',
          name: `Bot ${entry.targetId || ''}`,
        },
        reason: entry.reason || "Ajout d'un bot sur le serveur",
      });
    }
  });

  // Logs & Gestion Salons : Vocal
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState);
    voiceService.handleVoiceStateUpdate(oldState, newState);
  });

  // Logs : Serveur
  client.on(Events.GuildUpdate, (oldGuild, newGuild) => handleGuildUpdate(oldGuild, newGuild));
}
