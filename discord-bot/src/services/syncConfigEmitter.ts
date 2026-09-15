import { syncEngine, SyncSource } from './syncEngine.js';

/**
 * Notifie le dashboard (et tout autre client SSE) qu'une config de module a changé,
 * quelle que soit l'origine de la mutation (commande Discord ou route du dashboard).
 * Les deux écrivent déjà dans le même repository ; ceci ajoute juste la notification
 * temps réel manquante.
 */
export function emitConfigUpdated(
  module: string,
  guildId: string,
  config: unknown,
  source: SyncSource,
  actorId?: string
): void {
  syncEngine.emit('CONFIG_UPDATED', { module, config }, guildId, source, actorId);
}
