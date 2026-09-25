/** Aperçu des messages du bot : le catalogue se construit, l'envoi en MP est complet, filtre par catégorie, MP fermés. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Collection } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-preview-test-')));
const svc = await import('../src/modules/preview/services/messagePreviewService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const sent: any[] = [];
let closed = false;
const user = { send: async (p: any) => { if (closed) throw new Error('Cannot send messages to this user'); sent.push(p); } };
const client: any = {
  ws: { ping: 30 }, uptime: 3_600_000, guilds: { cache: new Collection() }, users: { cache: new Collection(), fetch: async () => user },
  user: { displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/1.png' },
};
const guild: any = { id: '100000000000000041', name: 'Serveur test', client, members: { me: null }, channels: { cache: new Collection() }, roles: { cache: new Collection() } };

console.log('\nCatalogue');
const catalog = svc.buildCatalog(client, guild);
ok(catalog.length >= 20, `${catalog.length} messages dans le catalogue`);
ok(new Set(catalog.map((e) => e.id)).size === catalog.length, 'identifiants uniques');
ok(svc.PREVIEW_CATEGORIES.every(([k]) => catalog.some((e) => e.category === k)), 'chaque catégorie annoncée contient des messages');
ok(catalog.filter((e) => !e.v2).every((e) => (e.message.embeds?.length ?? 0) > 0 && !e.message.components), 'messages classiques : embeds seulement, boutons et menus retirés');
ok(catalog.filter((e) => e.v2).every((e) => e.message.flags !== undefined), 'messages « Components V2 » : drapeau présent');

console.log('\nEnvoi');
const res = await svc.sendPreview(client, guild, 'u1', null, 0);
ok(res.sent === catalog.length && res.failed === 0 && !res.dmClosed, 'tous les messages sont envoyés');
const labels = sent.map((m) => m.content).filter(Boolean);
ok(labels.some((l: string) => l.includes(`[1/${catalog.length}]`)) && labels.some((l: string) => l.includes(`[${catalog.length}/${catalog.length}]`)), 'chaque message est numéroté et titré');

sent.length = 0;
const one = await svc.sendPreview(client, guild, 'u1', 'niveaux', 0);
ok(one.total === catalog.filter((e) => e.category === 'niveaux').length && one.sent === one.total, 'filtre par catégorie');

sent.length = 0;
closed = true;
const closedRes = await svc.sendPreview(client, guild, 'u1', null, 0);
ok(closedRes.dmClosed && closedRes.sent === 0 && sent.length === 0, 'messages privés fermés : arrêt immédiat et signalé');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
