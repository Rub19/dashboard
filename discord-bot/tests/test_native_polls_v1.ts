/** Sondages natifs Discord : payload `poll`, refus des combinaisons impossibles, décompte / fin, routes du dashboard. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import type { AddressInfo } from 'net';
import { ChannelType } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-native-polls-')));
const { nativePollService, buildNativePollPayload, validateNativeInput, nativeIncompatibilityError, toPollEmoji } = await import(
  '../src/modules/polls/services/nativePollService.js'
);
const { pollRepository } = await import('../src/modules/polls/storage/pollRepository.js');
const { pollService } = await import('../src/modules/polls/services/pollService.js');
const { parseSlashAnswers } = await import('../src/modules/polls/commands/pollCommand.js');
const { createPollRouter } = await import('../src/server/routes/pollRoutes.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const GUILD = '100000000000000031';
const HOUR = 3600_000;

// --- Faux Discord ---------------------------------------------------------------------------------
let endCalls = 0;
function fakePollMessage(id: string, channelId: string, counts: number[], expires: number, finalized = false) {
  const msg: any = { id, channelId, guildId: GUILD };
  msg.poll = {
    answers: new Map(counts.map((c, i) => [i + 1, { voteCount: c }])),
    expiresTimestamp: expires,
    resultsFinalized: finalized,
    async end() {
      endCalls++;
      this.resultsFinalized = true;
      this.answers.forEach((a: any) => (a.voteCount += 1)); // le décompte final peut encore bouger
      return msg;
    },
  };
  return msg;
}

const messages = new Map<string, any>(); // messageId -> message
const sent: any[] = []; // payloads passés à channel.send
const forumPosts: any[] = []; // options passées à threads.create

const textChannel: any = {
  id: '200000000000000001',
  type: ChannelType.GuildText,
  isTextBased: () => true,
  send: async (payload: any) => {
    sent.push(payload);
    const m = fakePollMessage(`m-${sent.length}`, textChannel.id, payload.poll.answers.map(() => 0), Date.now() + payload.poll.duration * HOUR);
    messages.set(m.id, m);
    return m;
  },
  messages: { fetch: async (id: string) => messages.get(id) ?? Promise.reject(Object.assign(new Error('Unknown Message'), { code: 10008 })) },
};
const forum: any = {
  id: '200000000000000002',
  type: ChannelType.GuildForum,
  availableTags: [],
  threads: {
    create: async (opts: any) => {
      forumPosts.push(opts);
      const m = fakePollMessage('m-forum', 'thread-1', opts.message.poll.answers.map(() => 0), Date.now() + opts.message.poll.duration * HOUR);
      messages.set(m.id, m);
      return { id: 'thread-1', guildId: GUILD, fetchStarterMessage: async () => m };
    },
  },
};
const channels: Record<string, any> = { [textChannel.id]: textChannel, [forum.id]: forum, 'thread-1': { messages: textChannel.messages } };
const fakeClient: any = {
  on() {},
  once() {},
  guilds: { cache: new Map() },
  channels: { fetch: async (id: string) => channels[id] ?? null },
};

const base = {
  guildId: GUILD,
  channelId: textChannel.id,
  question: 'Quelle pizza ?',
  answers: [{ text: 'Margherita', emoji: '🍕' }, { text: 'Reine' }, { text: 'Custom', emoji: '<:yes:123456789012345678>' }],
  durationHours: 48,
  multiselect: true,
  creatorId: '1',
  creatorTag: 'tester',
};

// --- 1. Payload -----------------------------------------------------------------------------------
console.log('Payload natif');
const payload = buildNativePollPayload(base);
ok(payload.poll.question.text === 'Quelle pizza ?' && payload.poll.answers.length === 3, 'question + 3 réponses');
ok(payload.poll.answers[0]!.emoji === '🍕', 'emoji Unicode conservé');
ok(!('emoji' in payload.poll.answers[1]!), 'réponse sans emoji : pas de clé emoji');
ok(JSON.stringify(payload.poll.answers[2]!.emoji) === JSON.stringify({ id: '123456789012345678', name: 'yes', animated: false }), 'emoji personnalisé converti');
ok(payload.poll.duration === 48 && payload.poll.allowMultiselect === true, 'durée 48 h + choix multiple');
ok(buildNativePollPayload({ ...base, durationHours: undefined, multiselect: undefined }).poll.duration === 24, 'durée par défaut 24 h, choix unique');
ok(toPollEmoji('abc') === undefined && toPollEmoji('1️⃣') === '1️⃣', 'texte ordinaire ignoré, keycap accepté');
ok(JSON.stringify(parseSlashAnswers('🍕 Pizza; Burger | Salade verte')) === JSON.stringify([{ emoji: '🍕', text: 'Pizza' }, { text: 'Burger' }, { text: 'Salade verte' }]), 'parsing des réponses du slash');

// --- 2. Refus -------------------------------------------------------------------------------------
console.log('Combinaisons refusées');
const answers = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `R${i}` }));
ok(!!validateNativeInput({ question: 'Q', answers: answers(1) }), '1 réponse refusée');
ok(!!validateNativeInput({ question: 'Q', answers: answers(11) }), '11 réponses refusées');
ok(validateNativeInput({ question: 'Q', answers: answers(10), durationHours: 768 }) === null, '10 réponses / 768 h acceptées');
ok(!!validateNativeInput({ question: 'Q', answers: answers(2), durationHours: 769 }) && !!validateNativeInput({ question: 'Q', answers: answers(2), durationHours: 0 }), 'durée hors 1–768 refusée');
ok(!!validateNativeInput({ question: 'Q', answers: [{ text: 'x'.repeat(56) }, { text: 'y' }] }), 'réponse > 55 caractères refusée');
const err = nativeIncompatibilityError({ quorum: true, secret: true, weights: true });
ok(!!err && /quorum/.test(err) && /anonyme/.test(err) && /pondération/.test(err) && /natif/.test(err), 'message français listant quorum, secret, pondération');
ok(nativeIncompatibilityError({ type: 'RANKING' }) !== null && nativeIncompatibilityError({ type: 'MULTIPLE_CHOICE' }) === null, 'mode de scrutin non supporté refusé');
const bad = await nativePollService.create(fakeClient, { ...base, answers: answers(1) });
ok(!bad.success && sent.length === 0 && pollRepository.getPolls(GUILD).length === 0, 'création invalide : rien envoyé, rien stocké');

// --- 3. Création ----------------------------------------------------------------------------------
console.log('Création');
const created = await nativePollService.create(fakeClient, base);
ok(created.success && sent.length === 1 && sent[0].poll.answers.length === 3 && sent[0].poll.duration === 48 && sent[0].poll.allowMultiselect === true, 'channel.send reçoit le poll natif');
const rec = created.poll!;
ok(rec.native === true && rec.status === 'ACTIVE' && rec.messageId === 'm-1' && rec.channelId === textChannel.id && rec.guildId === GUILD, 'enregistrement natif (messageId, channelId, guildId)');
ok(rec.title === 'Quelle pizza ?' && rec.questions[0]!.options.map((o) => o.label).join() === 'Margherita,Reine,Custom' && rec.type === 'MULTIPLE_CHOICE', 'question, réponses, type multiple');
ok(Math.abs(new Date(rec.endsAt!).getTime() - (Date.now() + 48 * HOUR)) < 5000, 'endsAt = maintenant + 48 h');
ok(pollRepository.getPollById(GUILD, rec.id)?.native === true, 'présent dans le dépôt (donc dans la liste du dashboard)');

const forumCreated = await nativePollService.create(fakeClient, { ...base, channelId: forum.id, multiselect: false });
ok(forumCreated.success && !!forumPosts[0]?.message?.poll?.answers?.length && forumPosts[0].message.poll.allowMultiselect === false, 'forum : le poll est gardé dans le message de départ du post');
ok(forumCreated.poll?.channelId === 'thread-1' && forumCreated.poll?.messageId === 'm-forum', 'forum : channelId = post créé');

// --- 4. Décompte et fin ---------------------------------------------------------------------------
console.log('Décompte et fin');
messages.get('m-1').poll.answers = new Map([[1, { voteCount: 5 }], [2, { voteCount: 2 }], [3, { voteCount: 0 }]]);
let synced = await nativePollService.sync(fakeClient, pollRepository.getPollById(GUILD, rec.id)!);
ok(synced.status === 'ACTIVE' && synced.questions[0]!.options.map((o) => o.votesCount).join() === '5,2,0', 'sondage en cours : décompte mis à jour, toujours actif');
ok(synced.questions[0]!.options[0]!.points === 5, 'points alignés sur les votes (résultats du dashboard)');

// L'heure passe : le tick clôture le sondage et fige les scores
messages.get('m-1').poll.expiresTimestamp = Date.now() - 1000;
messages.get('m-1').poll.answers.get(1).voteCount = 7;
const ended = await nativePollService.tick(fakeClient);
const after = pollRepository.getPollById(GUILD, rec.id)!;
ok(ended === 1 && after.status === 'ENDED' && !!after.endedAt && after.questions[0]!.options[0]!.votesCount === 7, 'tick : sondage échu → ENDED avec décompte final');
ok(pollRepository.getPollById(GUILD, forumCreated.poll!.id)!.status === 'ACTIVE', 'tick : sondage encore en cours laissé actif');

// Clôture anticipée via pollService.endPoll (route /end et /poll end)
const early = await pollService.endPoll(GUILD, forumCreated.poll!.id, fakeClient);
ok(early.success && endCalls === 1 && early.poll?.status === 'ENDED', 'terminer : poll.end() appelé, statut ENDED');
ok(early.poll!.questions[0]!.options.every((o) => o.votesCount === 1), 'terminer : décompte final enregistré');
const gone = await nativePollService.create(fakeClient, base);
messages.delete(gone.poll!.messageId!);
await nativePollService.tick(fakeClient);
ok(pollRepository.getPollById(GUILD, gone.poll!.id)!.status === 'ENDED', 'message supprimé côté Discord : sondage clos au tick suivant');

// --- 5. Routes ------------------------------------------------------------------------------------
console.log('Routes');
const app = express();
app.use(express.json());
app.use('/api/guilds/:guildId/polls', createPollRouter(fakeClient));
const server = app.listen(0);
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/guilds/${GUILD}/polls`;
const post = (u: string, body: unknown) =>
  fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: (await r.json()) as any }));
const nativeBody = (over: any = {}) => ({
  native: true,
  title: 'Site ?',
  channelId: textChannel.id,
  durationHours: 12,
  allowMultiselect: false,
  questions: [{ title: 'Site ?', options: [{ label: 'Oui', emoji: '✅' }, { label: 'Non', emoji: '❌' }] }],
  ...over,
});

const before = sent.length;
const r1 = await post(url, nativeBody());
ok(r1.status === 200 && r1.json.poll?.native === true && r1.json.poll.status === 'ACTIVE' && sent.length === before + 1 && sent[before].poll.duration === 12, 'POST native:true : publié via poll natif, statut ACTIVE');
const r2 = await post(url, nativeBody({ quorum: { enabled: true, minParticipantsCount: 5 } }));
ok(r2.status === 400 && /quorum/.test(r2.json.error) && sent.length === before + 1, 'POST native + quorum : 400 français, rien envoyé');
const r3 = await post(url, nativeBody({ anonymity: 'ANONYMOUS' }));
ok(r3.status === 400 && /anonyme/.test(r3.json.error), 'POST native + anonymat : 400');
const r4 = await post(url, nativeBody({ questions: [{ title: 'Q', options: [{ label: 'A', weight: 3 }, { label: 'B' }] }] }));
ok(r4.status === 400 && /pondération/.test(r4.json.error), 'POST native + poids d’option : 400');
const r5 = await post(url, nativeBody({ channelId: '999' }));
ok(r5.status === 400 && /salon/i.test(r5.json.error), 'POST native : salon inconnu refusé');
const r6 = await post(url, { title: 'Classique', questions: [{ title: 'Q', options: [{ label: 'A' }, { label: 'B' }] }] });
ok(r6.status === 200 && r6.json.poll.native === false && r6.json.poll.status === 'DRAFT', 'sans native : moteur classique inchangé (brouillon)');

const nativeId = r1.json.poll.id;
const vote = await post(`${url}/${nativeId}/vote`, { selections: {} });
ok(vote.status !== 200, 'vote web sur un sondage natif refusé');
const deploy = await post(`${url}/${nativeId}/panel/deploy`, { channelId: textChannel.id });
ok(deploy.status === 400, 'déploiement de panneau refusé pour un natif');
const end = await post(`${url}/${nativeId}/end`, {});
ok(end.status === 200 && end.json.poll.status === 'ENDED' && endCalls === 2, 'POST /end sur un natif : poll.end() puis ENDED');
const list = await fetch(url).then((r) => r.json() as Promise<any>);
ok(list.polls.some((p: any) => p.id === nativeId && p.native === true), 'GET liste : le sondage natif est exposé avec native:true');

server.close();
console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
