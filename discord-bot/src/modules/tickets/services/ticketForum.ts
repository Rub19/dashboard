import { ChannelFlags, ChannelType, Guild } from 'discord.js';
import { logger } from '../../../utils/logger.js';
import { Ticket } from '../types/ticket.js';
import { TicketGlobalConfig } from '../types/panel.js';

/** Mode forum des tickets : un post de forum par ticket, statut porté par un tag. */
export type TicketStatusTagKey = 'open' | 'inProgress' | 'resolved' | 'closed';
export type TicketForumTagIds = NonNullable<TicketGlobalConfig['forumTagIds']>;

const MAX_FORUM_TAGS = 20; // limite Discord
const MAX_APPLIED_TAGS = 5; // limite Discord par post

const STATUS_TAGS: Array<{ key: TicketStatusTagKey; name: string; emoji: string }> = [
  { key: 'open', name: 'Ouvert', emoji: '🟢' },
  { key: 'inProgress', name: 'En cours', emoji: '🟡' },
  { key: 'resolved', name: 'Résolu', emoji: '✅' },
  { key: 'closed', name: 'Fermé', emoji: '🔒' },
];

export function isForumTicket(ticket: Pick<Ticket, 'mode'>): boolean {
  return ticket.mode === 'forum';
}

/** Statut de ticket -> tag de statut du forum. */
export function statusToTagKey(status: Ticket['status']): TicketStatusTagKey {
  if (status === 'OPEN') return 'open';
  if (status === 'RESOLVED') return 'resolved';
  if (status === 'CLOSED') return 'closed';
  return 'inProgress';
}

/** Tag d'ouverture à appliquer à la création, uniquement s'il existe dans le forum. */
export function pickOpenTagIds(forum: any, tagIds?: TicketForumTagIds): string[] {
  const available: Array<{ id: string }> = forum?.availableTags ?? [];
  const open = tagIds?.open;
  if (open && available.some((t) => t.id === open)) return [open];
  // Forum "tag obligatoire" : Discord refuse un post sans tag, on prend le premier disponible.
  if (available.length && forum?.flags?.has?.(ChannelFlags.RequireTag)) return [available[0]!.id];
  return [];
}

/**
 * Crée (si absents) les 4 tags de statut dans le forum, dans la limite de 20 tags Discord.
 * Un tag existant (même nom, casse ignorée) est réutilisé. Retourne les ids résolus ;
 * `skipped` liste les clés qui n'ont pas pu être créées (forum plein).
 */
export async function ensureTicketForumTags(
  forum: any
): Promise<{ ids: TicketForumTagIds; created: TicketStatusTagKey[]; skipped: TicketStatusTagKey[] }> {
  const existing: any[] = [...(forum.availableTags ?? [])];
  const missing = STATUS_TAGS.filter(
    (d) => !existing.some((t) => String(t.name).toLowerCase() === d.name.toLowerCase())
  );
  const room = Math.max(0, MAX_FORUM_TAGS - existing.length);
  const toCreate = missing.slice(0, room);
  const skipped = missing.slice(room).map((d) => d.key);

  let tags: any[] = existing;
  if (toCreate.length) {
    const updated = await forum.setAvailableTags([
      ...existing.map((t) => ({ id: t.id, name: t.name, moderated: t.moderated, emoji: t.emoji ?? null })),
      ...toCreate.map((d) => ({ name: d.name, emoji: { id: null, name: d.emoji } })),
    ]);
    tags = [...(updated?.availableTags ?? forum.availableTags ?? [])];
  }

  const ids: TicketForumTagIds = {};
  for (const d of STATUS_TAGS) {
    const found = tags.find((t) => String(t.name).toLowerCase() === d.name.toLowerCase());
    if (found) ids[d.key] = found.id;
  }
  const created = toCreate.map((d) => d.key).filter((k) => ids[k]);
  return { ids, created, skipped: [...skipped, ...toCreate.map((d) => d.key).filter((k) => !ids[k])] };
}

/**
 * Remplace le tag de statut d'un post par celui de `key` (les autres tags sont conservés).
 * No-op silencieux si le tag n'est pas configuré ou n'existe plus dans le forum.
 */
export async function applyTicketStatusTag(
  thread: any,
  tagIds: TicketForumTagIds | undefined,
  key: TicketStatusTagKey
): Promise<void> {
  const target = tagIds?.[key];
  const available: Array<{ id: string }> = thread?.parent?.availableTags ?? [];
  if (!target || !available.some((t) => t.id === target)) return;

  const statusIds = new Set(Object.values(tagIds ?? {}).filter(Boolean) as string[]);
  const current: string[] = thread.appliedTags ?? [];
  const next = [...current.filter((id) => !statusIds.has(id)), target].slice(-MAX_APPLIED_TAGS);
  if (next.length === current.length && next.every((id) => current.includes(id))) return;
  await thread.setAppliedTags(next);
}

/**
 * Salon d'un ticket. Salon privé : cache uniquement (comportement historique).
 * Forum : un post archivé n'est pas en cache -> fetch.
 */
export async function resolveTicketChannel(guild: Guild | undefined, ticket: Ticket): Promise<any | null> {
  if (!guild) return null;
  const cached = guild.channels.cache.get(ticket.channelId);
  if (cached || !isForumTicket(ticket)) return cached ?? null;
  return (await guild.channels.fetch(ticket.channelId).catch(() => null)) ?? null;
}

/** Nom du post : "<numéro> · <sujet ou catégorie>", 100 caractères max. */
export function buildForumPostName(ticketId: string, answers: Record<string, any>, categoryName: string): string {
  const subjectKey = Object.keys(answers ?? {}).find((k) => /sujet|objet|titre|subject|title/i.test(k));
  const raw = (subjectKey && String(answers[subjectKey] ?? '').trim()) || categoryName;
  return `${ticketId} · ${raw.replace(/\s+/g, ' ')}`.slice(0, 100);
}

/** Vérifie et retourne le forum configuré (type 15), sinon lève une erreur lisible. */
export async function resolveConfiguredForum(guild: Guild, forumChannelId?: string | null): Promise<any> {
  if (!forumChannelId) throw new Error('Le mode forum des tickets est activé mais aucun forum n’est configuré.');
  const forum: any =
    guild.channels.cache.get(forumChannelId) ?? (await guild.channels.fetch(forumChannelId).catch(() => null));
  if (!forum || forum.type !== ChannelType.GuildForum) {
    throw new Error('Le forum de tickets configuré est introuvable ou n’est pas un salon forum.');
  }
  return forum;
}

/** Ferme un post : lock puis archive. Erreurs loguées, jamais propagées (le ticket est déjà enregistré). */
export async function archiveForumPost(thread: any, reason: string): Promise<void> {
  try {
    await thread.setLocked(true, reason);
    await thread.setArchived(true, reason);
  } catch (err) {
    logger.warn(`[TicketForum] Archivage du post impossible (permission Gérer les fils ?) : ${(err as Error)?.message}`);
  }
}

/** Réouvre un post : désarchive puis déverrouille. */
export async function reopenForumPost(thread: any, reason: string): Promise<void> {
  try {
    if (thread.archived) await thread.setArchived(false, reason);
    if (thread.locked) await thread.setLocked(false, reason);
  } catch (err) {
    logger.warn(`[TicketForum] Réouverture du post impossible (permission Gérer les fils ?) : ${(err as Error)?.message}`);
  }
}
