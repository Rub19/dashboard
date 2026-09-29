import { AuditLogEvent, GuildEmoji } from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleEmojiCreate(emoji: GuildEmoji): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
  const actor = auditRes.actor || { id: 'unknown', tag: 'Admin Inconnu' };

  logService.emit({
    guildId: emoji.guild.id,
    module: 'EMOJIS',
    type: 'EMOJI_CREATE',
    actor,
    target: { id: emoji.id, type: 'EMOJI', name: emoji.name || emoji.id },
    reason: auditRes.reason || `Ajout de l'emoji :${emoji.name}:`,
    after: { name: emoji.name, animated: emoji.animated },
    metadata: { emojiId: emoji.id, name: emoji.name },
  });
}

export async function handleEmojiDelete(emoji: GuildEmoji): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
  const actor = auditRes.actor || { id: 'unknown', tag: 'Admin Inconnu' };

  logService.emit({
    guildId: emoji.guild.id,
    module: 'EMOJIS',
    type: 'EMOJI_DELETE',
    actor,
    target: { id: emoji.id, type: 'EMOJI', name: emoji.name || emoji.id },
    reason: auditRes.reason || `Suppression de l'emoji :${emoji.name}:`,
    before: { name: emoji.name },
    metadata: { emojiId: emoji.id, name: emoji.name },
  });
}
