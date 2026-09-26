import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Serveurs que le bot a quittés (ou dont il a été expulsé). Leurs données sont conservées 30 jours (au cas où le bot revient),
 * puis purgées au démarrage suivant par `bootstrap/purgeDeparted.ts`, avec une archive restaurable.
 */
export interface DepartedGuild {
  name: string;
  departedAt: string;
}

const FILE = () => path.resolve(process.cwd(), 'data', 'departed_guilds.json');

export function loadDeparted(): Record<string, DepartedGuild> {
  try {
    if (fs.existsSync(FILE())) {
      const parsed = JSON.parse(fs.readFileSync(FILE(), 'utf-8')) as { guilds?: Record<string, DepartedGuild> };
      return parsed.guilds && typeof parsed.guilds === 'object' ? parsed.guilds : {};
    }
  } catch (err) {
    logger.warn('[Departed] Lecture de departed_guilds.json impossible :', err);
  }
  return {};
}

export function saveDeparted(guilds: Record<string, DepartedGuild>): void {
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify({ guilds }, null, 2));
  } catch (err) {
    logger.error('[Departed] Écriture de departed_guilds.json impossible :', err);
  }
}

/** Note le départ d'un serveur (ne remplace pas une date déjà enregistrée). */
export function recordDeparture(guildId: string, name: string, at: Date = new Date()): void {
  const all = loadDeparted();
  if (all[guildId]) return;
  all[guildId] = { name, departedAt: at.toISOString() };
  saveDeparted(all);
  logger.warn(`[Departed] Serveur quitté : « ${name} » (${guildId}). Ses données seront purgées dans 30 jours si le bot ne revient pas.`);
}

/** Le bot est revenu sur ce serveur : on annule la purge. */
export function clearDeparture(guildId: string): void {
  const all = loadDeparted();
  if (!all[guildId]) return;
  delete all[guildId];
  saveDeparted(all);
  logger.info(`[Departed] Le bot est de retour sur ${guildId} : purge annulée.`);
}
