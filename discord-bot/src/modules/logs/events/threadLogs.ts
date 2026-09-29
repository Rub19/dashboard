import { AnyThreadChannel, AuditLogEvent } from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleThreadCreate(thread: AnyThreadChannel, newlyCreated: boolean): Promise<void> {
  if (!newlyCreated) return; // Discord ré-émet aussi cet événement pour les fils déjà existants au démarrage.
  const auditRes = await DiscordAuditAdapter.resolveExecutor(thread.guild, AuditLogEvent.ThreadCreate, thread.id);
  const actor = auditRes.actor || { id: thread.ownerId || 'unknown', tag: 'Membre Inconnu' };

  logService.emit({
    guildId: thread.guild.id,
    module: 'THREADS',
    type: 'THREAD_CREATE',
    actor,
    target: { id: thread.id, type: 'THREAD', name: thread.name },
    channel: thread.parentId ? { id: thread.parentId, name: thread.parent?.name || 'salon' } : undefined,
    reason: auditRes.reason || `Création du fil « ${thread.name} »`,
    after: { name: thread.name, parentId: thread.parentId },
    metadata: { threadId: thread.id, name: thread.name },
  });
}

export async function handleThreadDelete(thread: AnyThreadChannel): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(thread.guild, AuditLogEvent.ThreadDelete, thread.id);
  const actor = auditRes.actor || { id: 'unknown', tag: 'Admin Inconnu' };

  logService.emit({
    guildId: thread.guild.id,
    module: 'THREADS',
    type: 'THREAD_DELETE',
    actor,
    target: { id: thread.id, type: 'THREAD', name: thread.name },
    reason: auditRes.reason || `Suppression du fil « ${thread.name} »`,
    before: { name: thread.name },
    metadata: { threadId: thread.id, name: thread.name },
  });
}
