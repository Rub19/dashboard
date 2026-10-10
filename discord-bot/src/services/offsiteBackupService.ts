import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Copie quotidienne du dossier data/ hors du VPS (stockage Supabase privé « bot-backups »).
 *
 * Pourquoi : les sauvegardes faites avant chaque déploiement restent sur le même VPS ; s'il tombe, tout est perdu.
 * Format : un JSON gzip { createdAt, files: { "chemin/relatif": base64 } }, relu par `scripts/restore-offsite-backup.ts`.
 */
const BUCKET = 'bot-backups';
const KEEP = 14;
const EVERY_MS = 24 * 3600_000;
const CHECK_MS = 3600_000;

export type OffsiteArchive = { createdAt: string; files: Record<string, string> };

let supabase: SupabaseClient | null = null;
if (config.supabaseUrl && config.supabaseServiceRoleKey) {
  supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function collect(dir: string, base = dir, out: Record<string, string> = {}): Record<string, string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p, base, out);
    else if (e.isFile()) out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p).toString('base64');
  }
  return out;
}

export function buildArchive(dataDir: string, now = new Date()): Buffer {
  const archive: OffsiteArchive = { createdAt: now.toISOString(), files: collect(dataDir) };
  return gzipSync(Buffer.from(JSON.stringify(archive)));
}

export function readArchive(buf: Buffer): OffsiteArchive {
  return JSON.parse(gunzipSync(buf).toString('utf8')) as OffsiteArchive;
}

async function listBackups(db: SupabaseClient) {
  const { data, error } = await db.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });
  if (error) throw error;
  return (data ?? []).filter((f) => f.name.endsWith('.json.gz'));
}

/** Envoie une copie maintenant puis ne garde que les KEEP plus récentes. Renvoie le nom du fichier envoyé. */
export async function runOffsiteBackup(dataDir = path.resolve(process.cwd(), 'data')): Promise<string> {
  if (!supabase) throw new Error('Supabase non configuré');
  const now = new Date();
  const name = `data-${now.toISOString().replace(/[:.]/g, '-')}.json.gz`;
  const body = buildArchive(dataDir, now);
  const { error } = await supabase.storage.from(BUCKET).upload(name, body, { contentType: 'application/gzip', upsert: false });
  if (error) throw error;
  const old = (await listBackups(supabase)).slice(KEEP).map((f) => f.name);
  if (old.length) await supabase.storage.from(BUCKET).remove(old);
  logger.info(`[OffsiteBackup] Copie envoyée : ${name} (${Math.round(body.length / 1024)} Ko), ${old.length} ancienne(s) retirée(s).`);
  return name;
}

/** Vérifie chaque heure ; envoie une copie si la dernière date de plus de 24 h. */
export function startOffsiteBackups(): void {
  if (!supabase) {
    logger.warn('[OffsiteBackup] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents : copie hors VPS désactivée.');
    return;
  }
  const db = supabase;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const last = (await listBackups(db))[0];
      const lastAt = last?.created_at ? Date.parse(last.created_at) : 0;
      if (Date.now() - lastAt >= EVERY_MS) await runOffsiteBackup();
    } catch (err) {
      logger.warn('[OffsiteBackup] Copie impossible :', (err as Error)?.message);
    } finally {
      running = false;
    }
  };
  setTimeout(() => void tick(), 5 * 60_000).unref();
  setInterval(() => void tick(), CHECK_MS).unref();
}
