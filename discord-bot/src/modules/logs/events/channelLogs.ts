import {
  AuditLogEvent,
  DMChannel,
  GuildChannel,
  NonThreadGuildBasedChannel,
} from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleChannelCreate(channel: GuildChannel): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    channel.guild,
    AuditLogEvent.ChannelCreate,
    channel.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: channel.guild.id,
    module: 'CHANNELS',
    type: 'CHANNEL_CREATE',
    actor,
    target: {
      id: channel.id,
      type: 'CHANNEL',
      name: channel.name,
    },
    channel: {
      id: channel.id,
      name: channel.name,
      type: `${channel.type}`,
    },
    reason: auditRes.reason || `Création du salon #${channel.name}`,
    after: {
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
    },
    metadata: {
      channelId: channel.id,
      name: channel.name,
    },
  });
}

export async function handleChannelDelete(
  channel: DMChannel | NonThreadGuildBasedChannel
): Promise<void> {
  if (!('guild' in channel) || !channel.guild) return;

  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    channel.guild,
    AuditLogEvent.ChannelDelete,
    channel.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: channel.guild.id,
    module: 'CHANNELS',
    type: 'CHANNEL_DELETE',
    actor,
    target: {
      id: channel.id,
      type: 'CHANNEL',
      name: channel.name,
    },
    reason: auditRes.reason || `Suppression du salon #${channel.name}`,
    before: {
      name: channel.name,
      id: channel.id,
    },
    metadata: {
      channelId: channel.id,
      name: channel.name,
    },
  });
}

export async function handleChannelUpdate(
  oldChannel: DMChannel | NonThreadGuildBasedChannel,
  newChannel: DMChannel | NonThreadGuildBasedChannel
): Promise<void> {
  if (!('guild' in newChannel) || !newChannel.guild || !('name' in oldChannel) || !('name' in newChannel)) return;

  const diffs: { field: string; before: any; after: any }[] = [];

  if (oldChannel.name !== newChannel.name) {
    diffs.push({ field: 'name', before: oldChannel.name, after: newChannel.name });
  }

  if ('topic' in oldChannel && 'topic' in newChannel && oldChannel.topic !== newChannel.topic) {
    diffs.push({ field: 'topic', before: oldChannel.topic || null, after: newChannel.topic || null });
  }

  if (diffs.length === 0) return;

  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    newChannel.guild,
    AuditLogEvent.ChannelUpdate,
    newChannel.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: newChannel.guild.id,
    module: 'CHANNELS',
    type: 'CHANNEL_UPDATE',
    actor,
    target: {
      id: newChannel.id,
      type: 'CHANNEL',
      name: newChannel.name,
    },
    channel: {
      id: newChannel.id,
      name: newChannel.name,
    },
    reason: auditRes.reason || `Mise à jour du salon #${newChannel.name}`,
    diff: diffs,
    before: {
      name: oldChannel.name,
      topic: 'topic' in oldChannel ? oldChannel.topic : null,
    },
    after: {
      name: newChannel.name,
      topic: 'topic' in newChannel ? newChannel.topic : null,
    },
    metadata: {
      channelId: newChannel.id,
    },
  });
}
