import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Purge des données des serveurs quittés depuis plus de 30 jours. Exécutée à l'IMPORT de ce module, donc avant que les
 * dépôts JSON ne chargent leurs fichiers (index.ts l'importe en premier) : sinon un dépôt en mémoire réécrirait les
 * entrées supprimées à sa prochaine sauvegarde. Les entrées retirées sont archivées dans data/departed/<serveur>-<date>.json
 * (restaurables à la main).
 */
export const DEPARTED_RETENTION_DAYS = 30;
const SKIP_FILES = new Set(['departed_guilds.json', 'module_migrations.json']);

type Json = unknown;

function belongs(item: unknown, ids: Set<string>): boolean {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (typeof o.guildId === 'string' && ids.has(o.guildId)) || (typeof o.guild_id === 'string' && ids.has(o.guild_id));
}

/** Retire d'un contenu JSON tout ce qui appartient aux serveurs donnés. Renvoie le contenu nettoyé et ce qui a été retiré par serveur. */
export function scrubJson(value: Json, ids: Set<string>): { value: Json; removed: Record<string, Json[]> } {
  const removed: Record<string, Json[]> = {};
  const note = (id: string, what: Json) => {
    (removed[id] ??= []).push(what);
  };
  const owner = (item: unknown): string | null => {
    const o = item as Record<string, unknown>;
    for (const k of ['guildId', 'guild_id']) if (typeof o?.[k] === 'string' && ids.has(o[k] as string)) return o[k] as string;
    return null;
  };

  if (Array.isArray(value)) {
    const kept: unknown[] = [];
    for (const item of value) {
      if (belongs(item, ids)) note(owner(item)!, item);
      else kept.push(item);
    }
    return { value: kept, removed };
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const byKey = [...ids].find((id) => key === id || key.startsWith(`${id}:`));
      if (byKey) {
        note(byKey, { [key]: val });
      } else if (belongs(val, ids)) {
        note(owner(val)!, { [key]: val });
      } else {
        out[key] = val;
      }
    }
    return { value: out, removed };
  }
  return { value, removed };
}

export interface PurgeResult {
  purged: string[];
  files: number;
}

export function purgeDepartedGuilds(dataDir: string, now: number = Date.now(), retentionDays: number = DEPARTED_RETENTION_DAYS): PurgeResult {
  const listFile = path.join(dataDir, 'departed_guilds.json');
  if (!fs.existsSync(listFile)) return { purged: [], files: 0 };
  let list: Record<string, { name: string; departedAt: string }> = {};
  try {
    list = (JSON.parse(fs.readFileSync(listFile, 'utf-8')) as { guilds?: typeof list }).guilds ?? {};
  } catch {
    return { purged: [], files: 0 };
  }
  const due = Object.entries(list).filter(([, g]) => now - new Date(g.departedAt).getTime() >= retentionDays * 86_400_000).map(([id]) => id);
  if (due.length === 0) return { purged: [], files: 0 };

  const ids = new Set(due);
  const archive: Record<string, Record<string, Json[]>> = Object.fromEntries(due.map((id) => [id, {}]));
  let files = 0;
  for (const name of fs.readdirSync(dataDir)) {
    if (!name.endsWith('.json') || SKIP_FILES.has(name)) continue;
    const full = path.join(dataDir, name);
    try {
      if (!fs.statSync(full).isFile()) continue;
      const parsed = JSON.parse(fs.readFileSync(full, 'utf-8')) as Json;
      const { value, removed } = scrubJson(parsed, ids);
      const touched = Object.keys(removed);
      if (touched.length === 0) continue;
      for (const id of touched) archive[id][name] = removed[id];
      fs.writeFileSync(full, JSON.stringify(value, null, 2));
      files++;
    } catch (err) {
      logger.warn(`[Departed] ${name} ignoré pendant la purge :`, err);
    }
  }

  const stamp = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  fs.mkdirSync(path.join(dataDir, 'departed'), { recursive: true });
  for (const id of due) {
    fs.writeFileSync(path.join(dataDir, 'departed', `${id}-${stamp}.json`), JSON.stringify({ guildId: id, name: list[id].name, departedAt: list[id].departedAt, purgedAt: new Date(now).toISOString(), removed: archive[id] }, null, 2));
    delete list[id];
  }
  fs.writeFileSync(listFile, JSON.stringify({ guilds: list }, null, 2));
  logger.warn(`[Departed] Purge des données de ${due.length} serveur(s) quitté(s) depuis plus de ${retentionDays} jours (${files} fichier(s) ; archive dans data/departed/).`);
  return { purged: due, files };
}

// Exécution au chargement (sauf tests qui importent uniquement les fonctions : ils passent ETHONE_SKIP_PURGE=1).
if (process.env.ETHONE_SKIP_PURGE !== '1') {
  try {
    purgeDepartedGuilds(path.resolve(process.cwd(), 'data'));
  } catch (err) {
    logger.error('[Departed] Purge impossible :', err);
  }
}
