/** Création de sondage depuis le dashboard : le corps envoyé par le site est accepté, un corps invalide est refusé en 400. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import type { AddressInfo } from 'net';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-polls-route-')));
const { createPollRouter } = await import('../src/server/routes/pollRoutes.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const fakeClient: any = { on() {}, once() {}, guilds: { cache: new Map() }, channels: { fetch: async () => null } };
const app = express();
app.use(express.json());
app.use('/api/guilds/:guildId/polls', createPollRouter(fakeClient));
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/guilds/100000000000000021/polls`;
const post = (url: string, body: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: (await r.json()) as any }));

// Corps tel que l'envoie la page de création du site (avec identifiants, sans champs optionnels du bot)
const siteBody = {
  title: 'Test sondage', description: '', category: 'Communauté', type: 'SINGLE_CHOICE', anonymity: 'PUBLIC', resultsVisibility: 'LIVE', allowVoteChange: true,
  endsAt: new Date(Date.now() + 48 * 3600e3).toISOString(),
  questions: [{ id: 'q-1', title: 'Préférée ?', description: '', type: 'SINGLE_CHOICE', required: true, minSelections: 1, maxSelections: 1, order: 0,
    options: [{ id: 'opt-1', label: 'A', emoji: '🟢', color: '#10b981', description: '', weight: 1 }, { id: 'opt-2', label: 'B', emoji: '🔵', color: '#3b82f6', description: '', weight: 1 }] }],
  eligibility: { minAccountAgeDays: 0, minGuildMembershipDays: 0, logicGate: 'ANY' },
  roleWeights: [],
  quorum: { enabled: false, minParticipantsCount: 0, approvalThresholdPercentage: 50 },
  panelConfig: { channelId: '123', embedTitle: '📊 Test sondage', embedColor: '#6366f1' },
};
const created = await post(base, siteBody);
ok(created.status === 200 && created.json.poll?.id && created.json.poll.status === 'DRAFT', 'corps du site accepté : sondage créé en brouillon');
ok(created.json.poll?.questions?.[0]?.options?.length === 2 && created.json.poll.panelConfig.channelId === '123', 'questions, options et salon conservés');
ok(created.json.poll?.endsAt === siteBody.endsAt, 'date de fin conservée');

const noIds = await post(base, { title: 'Sans ids', questions: [{ title: 'Q', options: [{ label: 'Oui' }, { label: 'Non' }] }] });
ok(noIds.status === 200 && noIds.json.poll.questions[0].id && noIds.json.poll.questions[0].options[1].id, 'identifiants manquants générés par le bot');

const empty = await post(base, {});
ok(empty.status === 200 && empty.json.poll.questions[0].options.length === 2, 'corps vide : sondage par défaut valide');

const oneOption = await post(base, { title: 'x', questions: [{ title: 'Q', options: [{ label: 'Seule' }] }] });
ok(oneOption.status === 400 && /2 options/.test(oneOption.json.error), 'une seule option : refusé en 400');

const badType = await post(base, { title: 'x', type: 'WEIGHTED_VOTING' });
ok(badType.status === 400, 'type inconnu : refusé en 400 (plus d’erreur 500)');

const pollId = created.json.poll.id;
const put = await post(`${base}/${pollId}`, { resultsVisibility: 'AT_END', title: 'Renommé' }, 'PUT');
ok(put.status === 200 && put.json.poll.resultsVisibility === 'AT_END' && put.json.poll.title === 'Renommé', 'PUT valide appliqué');
const badPut = await post(`${base}/${pollId}`, { resultsVisibility: 'AFTER_END' }, 'PUT');
ok(badPut.status === 400, 'PUT avec valeur inconnue : refusé en 400');
const after = await fetch(`${base}/${pollId}`).then((r) => r.json() as Promise<any>);
ok(after.poll.resultsVisibility === 'AT_END', 'le PUT refusé n’a rien modifié');

const pub = await post(`${base}/${pollId}/publish`, {});
ok(pub.status === 200 && pub.json.poll.status === 'ACTIVE', 'publication : sondage actif');

server.close();
console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
