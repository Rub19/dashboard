import { syncEngine } from './syncEngine.js';

export type DiscordStateKind = 'roles' | 'channels' | 'members' | 'guild';

/** Événements discord.js qui changent l'état d'un serveur visible dans le dashboard, et la famille de données touchée. */
export const LIVE_DISCORD_EVENTS: Record<string, DiscordStateKind> = {
  roleCreate: 'roles',
  roleDelete: 'roles',
  roleUpdate: 'roles',
  channelCreate: 'channels',
  channelDelete: 'channels',
  channelUpdate: 'channels',
  guildMemberAdd: 'members',
  guildMemberRemove: 'members',
  guildUpdate: 'guild',
};

const pending = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 400;

/** Identifiant du serveur concerné par un événement discord.js (selon la forme de son premier argument). */
export function guildIdOfEvent(event: string, firstArg: unknown): string | undefined {
  const a = firstArg as { guild?: { id?: string }; guildId?: string; id?: string } | undefined;
  if (!a) return undefined;
  if (event === 'guildUpdate') return a.id;
  return a.guild?.id ?? a.guildId;
}

/**
 * Prévient les dashboards ouverts sur ce serveur qu'une famille de données a changé côté Discord (rôle créé, salon
 * renommé, membre arrivé…). Les rafales sont regroupées (400 ms) : créer 20 salons d'un coup n'envoie qu'un événement.
 * Le dashboard recharge alors ses listes ; aucune donnée sensible ne transite dans l'événement.
 */
export function notifyDiscordState(guildId: string, kind: DiscordStateKind, action: string): void {
  const key = `${guildId}:${kind}`;
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pending.delete(key);
    syncEngine.emit('DISCORD_EVENT', { kind, action, at: Date.now() }, guildId, 'DISCORD_EVENT');
  }, DEBOUNCE_MS);
  timer.unref?.();
  pending.set(key, timer);
}
