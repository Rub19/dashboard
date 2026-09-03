import { Client, Events } from 'discord.js';
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

export function registerEvents(client: Client): void {
  // Base Events
  client.once(Events.ClientReady, (c) => onReady(c));
  client.on(Events.InteractionCreate, (interaction) => onInteractionCreate(interaction));
  client.on(Events.MessageCreate, (message) => onMessageCreate(message));
  client.on(Events.GuildMemberAdd, (member) => onGuildMemberAdd(member));
  client.on(Events.GuildMemberRemove, (member) => onGuildMemberRemove(member));

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

  // Audit Logs (Mass ban/kick, webhooks)
  client.on(Events.GuildAuditLogEntryCreate, (entry, guild) => {
    raidDetectionService.handleAuditLog(guild, entry);
  });

  // Logs : Vocal
  client.on(Events.VoiceStateUpdate, (oldState, newState) =>
    handleVoiceStateUpdate(oldState, newState)
  );

  // Logs : Serveur
  client.on(Events.GuildUpdate, (oldGuild, newGuild) => handleGuildUpdate(oldGuild, newGuild));
}
