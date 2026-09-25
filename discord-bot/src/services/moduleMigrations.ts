import fs from 'fs';
import path from 'path';
import type { Client } from 'discord.js';
import { setModuleEnabled } from './moduleRegistry.js';
import { logger } from '../utils/logger.js';

/**
 * Migrations de modules exécutées UNE SEULE FOIS au démarrage, sur tous les serveurs où le bot est déjà présent.
 * Une fois appliquée (registre data/module_migrations.json), une migration ne se rejoue jamais : le module peut ensuite être
 * réactivé librement (dashboard, /module, /setup) sans être recoupé au redémarrage suivant.
 */
interface ModuleMigration {
  id: string;
  /** Modules à désactiver sur tous les serveurs existants. */
  disable: string[];
}

const MIGRATIONS: ModuleMigration[] = [
  // Demande du propriétaire : le système d'XP / niveaux est désactivé partout (message « Progression de niveau » compris).
  { id: '2026-09-25-disable-leveling-everywhere', disable: ['leveling'] },
];

const FILE = path.resolve(process.cwd(), 'data', 'module_migrations.json');

function loadApplied(): string[] {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as { applied?: string[] };
      return Array.isArray(parsed.applied) ? parsed.applied : [];
    }
  } catch (err) {
    logger.warn('[Migrations] Lecture de module_migrations.json impossible :', err);
  }
  return [];
}

function saveApplied(applied: string[]): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ applied }, null, 2));
  } catch (err) {
    logger.error('[Migrations] Écriture de module_migrations.json impossible :', err);
  }
}

/** Applique les migrations en attente à tous les serveurs actuellement connectés. Renvoie les identifiants appliqués. */
export function runModuleMigrations(client: Pick<Client, 'guilds'>): string[] {
  const applied = loadApplied();
  const done: string[] = [];
  for (const migration of MIGRATIONS) {
    if (applied.includes(migration.id)) continue;
    let touched = 0;
    for (const guild of client.guilds.cache.values()) {
      for (const moduleId of migration.disable) {
        if (setModuleEnabled(guild.id, moduleId, false, 'DISCORD_COMMAND')) touched++;
      }
    }
    applied.push(migration.id);
    done.push(migration.id);
    logger.success(`[Migrations] « ${migration.id} » appliquée (${touched} interrupteur(s) sur ${client.guilds.cache.size} serveur(s)).`);
  }
  if (done.length > 0) saveApplied(applied);
  return done;
}
