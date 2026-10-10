import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildArchive, readArchive } from '../src/services/offsiteBackupService.js';

let ok = 0;
let ko = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
  cond ? ok++ : ko++;
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-backup-'));
fs.mkdirSync(path.join(dir, 'sub'));
fs.writeFileSync(path.join(dir, 'a.json'), '{"x":1}');
fs.writeFileSync(path.join(dir, 'sub', 'img.png'), Buffer.from([0, 255, 10, 13]));
const archive = readArchive(buildArchive(dir, new Date('2026-10-10T00:00:00Z')));
check('date conservée', archive.createdAt === '2026-10-10T00:00:00.000Z');
check('fichier texte relu à l’identique', Buffer.from(archive.files['a.json'], 'base64').toString() === '{"x":1}');
check('fichier binaire dans un sous-dossier relu à l’identique', Buffer.from(archive.files['sub/img.png'], 'base64').equals(Buffer.from([0, 255, 10, 13])));
check('chemins relatifs avec /', Object.keys(archive.files).sort().join(',') === 'a.json,sub/img.png');
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} réussis, ${ko} échoués`);
if (ko) process.exit(1);
