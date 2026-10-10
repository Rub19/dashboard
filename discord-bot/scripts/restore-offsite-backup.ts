/**
 * Restaure une copie hors VPS du dossier data/ (voir src/services/offsiteBackupService.ts).
 *
 *   npx tsx scripts/restore-offsite-backup.ts            → liste les copies disponibles
 *   npx tsx scripts/restore-offsite-backup.ts <fichier>  → écrit la copie dans data-restore/ (data/ n'est jamais écrasé)
 *
 * Ensuite, bot arrêté : sauvegarder data/, remplacer par data-restore/, redémarrer.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { readArchive } from '../src/services/offsiteBackupService.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
const db = createClient(url, key, { auth: { persistSession: false } });
const name = process.argv[2];

if (!name) {
  const { data, error } = await db.storage.from('bot-backups').list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
  if (error) throw error;
  for (const f of data ?? []) console.log(f.name, f.metadata?.size ?? '');
} else {
  const { data, error } = await db.storage.from('bot-backups').download(name);
  if (error || !data) throw error ?? new Error('Copie introuvable');
  const archive = readArchive(Buffer.from(await data.arrayBuffer()));
  const out = path.resolve(process.cwd(), 'data-restore');
  for (const [rel, b64] of Object.entries(archive.files)) {
    const target = path.resolve(out, rel);
    if (!target.startsWith(out + path.sep)) throw new Error(`Chemin refusé : ${rel}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(b64, 'base64'));
  }
  console.log(`${Object.keys(archive.files).length} fichiers (copie du ${archive.createdAt}) écrits dans ${out}`);
}
