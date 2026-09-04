import {
  GuildTextBasedChannel,
  Message,
  PartialMessage,
} from 'discord.js';
import { logService } from '../services/logService.js';

export async function handleMessageDelete(message: Message | PartialMessage): Promise<void> {
  if (!message.guild || message.author?.bot) return;

  const content = message.cleanContent || message.content || '*Contenu non disponible ou média*';
  const attachments = Array.from(message.attachments.values())
    .map((a) => a.name)
    .join(', ');

  const channelName = 'name' in message.channel ? (message.channel.name as string) : 'salon';

  logService.emit({
    guildId: message.guild.id,
    module: 'MESSAGES',
    type: 'MESSAGE_DELETE',
    actor: {
      id: message.author?.id || 'unknown',
      tag: message.author?.tag || 'Membre Inconnu',
      avatar: message.author?.displayAvatarURL(),
    },
    target: {
      id: message.id,
      type: 'MESSAGE',
      name: `Message dans #${channelName}`,
    },
    channel: {
      id: message.channelId,
      name: channelName,
    },
    reason: `Message supprimé dans #${channelName}`,
    before: {
      content: content.slice(0, 1000),
      attachments: attachments || null,
    },
    metadata: {
      messageId: message.id,
      attachmentsCount: message.attachments.size,
    },
  });
}

export async function handleMessageDeleteBulk(
  messages: any,
  channel: GuildTextBasedChannel
): Promise<void> {
  if (!channel.guild) return;

  const authors = new Set<string>();
  messages.forEach((m: any) => {
    if (m.author?.tag) authors.add(m.author.tag);
  });

  logService.emit({
    guildId: channel.guild.id,
    module: 'MESSAGES',
    type: 'MESSAGE_DELETE_BULK',
    actor: {
      id: 'system',
      tag: 'Purge / Bot',
    },
    channel: {
      id: channel.id,
      name: channel.name,
    },
    reason: `Suppression en masse de ${messages.size} messages dans #${channel.name}`,
    metadata: {
      count: messages.size,
      affectedAuthors: Array.from(authors).slice(0, 10),
    },
  });
}

export async function handleMessageUpdate(
  oldMsg: Message | PartialMessage,
  newMsg: Message | PartialMessage
): Promise<void> {
  if (!newMsg.guild || !newMsg.author || newMsg.author.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const channelName = 'name' in newMsg.channel ? (newMsg.channel.name as string) : 'salon';

  logService.emit({
    guildId: newMsg.guild.id,
    module: 'MESSAGES',
    type: 'MESSAGE_EDIT',
    actor: {
      id: newMsg.author.id,
      tag: newMsg.author.tag,
      avatar: newMsg.author.displayAvatarURL(),
    },
    target: {
      id: newMsg.id,
      type: 'MESSAGE',
      name: `Message dans #${channelName}`,
    },
    channel: {
      id: newMsg.channelId,
      name: channelName,
    },
    reason: `Message modifié dans #${channelName}`,
    before: {
      content: (oldMsg.content || '*Non disponible*').slice(0, 1000),
    },
    after: {
      content: (newMsg.content || '*Vide*').slice(0, 1000),
    },
    diff: [
      {
        field: 'content',
        before: (oldMsg.content || '*Non disponible*').slice(0, 500),
        after: (newMsg.content || '*Vide*').slice(0, 500),
      },
    ],
    metadata: {
      messageId: newMsg.id,
      jumpUrl: newMsg.url,
    },
  });
}
