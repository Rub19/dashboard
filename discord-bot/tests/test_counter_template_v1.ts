/** Salons compteurs : moteur de modèles (jetons, horloge, compte à rebours, activité, classements). Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Collection } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-counter-test-')));
const { renderTemplate, nextMilestone, needsMemberFetch, TOKEN_DOCS } = await import('../src/modules/serverStats/services/counterTemplate.js');
const { statsStorage } = await import('../src/modules/stats/storage/statsStorage.js');
const { statsCollector } = await import('../src/modules/stats/services/statsCollector.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = 'g-counter';
const members = new Collection<string, any>();
members.set('u1', { id: 'u1', displayName: 'Lando', user: { bot: false } });
members.set('u2', { id: 'u2', displayName: 'Rub19', user: { bot: false } });
members.set('b1', { id: 'b1', displayName: 'Bot', user: { bot: true } });
const roles = new Collection<string, any>();
roles.set(G, { id: G, members: new Collection() });
roles.set('12345', { id: '12345', members: new Collection([['u1', 1], ['u2', 2]]) });
const channels = new Collection<string, any>();
channels.set('c1', { id: 'c1', name: 'general', type: 0 });
channels.set('v1', { id: 'v1', name: 'Meetings', type: 2 });
const guild = { id: G, memberCount: 13_855, members: { cache: members }, roles: { cache: roles }, channels: { cache: channels }, voiceStates: { cache: new Collection([['u1', { channelId: 'v1' }], ['u2', { channelId: null }]]) }, premiumSubscriptionCount: 14, premiumTier: 2 } as any;
const r = (t: string, now?: Date) => renderTemplate(guild, t, now);

console.log('\nServeur');
ok(r('Users: {members}').text === 'Users: 13855', '« Users: {members} » → Users: 13855');
ok(r('{humans} / {bots}').text === '2 / 1', 'humains / bots (2 / 1)');
ok(r('{boosts} boosts, niveau {boost_tier}').text === '14 boosts, niveau 2', 'boosts et niveau');
ok(r('{role:12345}').text === '2', '{role:ID} compte les membres du rôle');
ok(r('{voice_now}').text === '1', 'membres en vocal maintenant (1)');
ok(r('{channels} salons').text === '2 salons', 'nombre de salons');

console.log('\nHorloge');
const at = new Date('2026-09-25T09:07:30Z');
ok(r('🕐 {time12:UTC} UTC', at).text === '🕐 9:00am UTC', '9:07 UTC → « 9:00am » (au dixième d’heure près)');
ok(r('{time:UTC}', new Date('2026-09-25T14:39:00Z')).text === '14:30', 'format 24 h : 14:39 → 14:30');
ok(r('{time12:UTC}', new Date('2026-09-25T00:12:00Z')).text === '12:10am', 'minuit → 12:10am (pas 0:10am)');
ok(r('{time:Europe/Paris}', new Date('2026-07-01T10:00:00Z')).text === '12:00', 'fuseau Europe/Paris (été : UTC+2)');
ok(r('{date:UTC}', at).text === '25/09/2026', 'date au format français');
const badTz = r('{time:Mars/Olympus}');
ok(badTz.text === '{time:Mars/Olympus}' && badTz.warnings.length === 1, 'fuseau inconnu : jeton laissé tel quel et signalé');

console.log('\nCompte à rebours');
ok(r('{members_until:15000}').text === '1145', '15 000 − 13 855 = 1145 (comme l’exemple Statbot)');
ok(r('{members_until:next}').text === '1145' && r('{members_next}').text === '15000', 'prochain palier rond : 15 000');
ok(r('{members_until:100}').text === '0', 'objectif atteint : 0 (jamais négatif)');
ok(nextMilestone(0) === 50 && nextMilestone(999) === 1000 && nextMilestone(1_000_000) === 2_000_000, 'paliers : 0→50, 999→1000, 1M→2M');
ok(r('{days_until:2026-12-31}', at).text === '97', 'jours avant le 31/12/2026 depuis le 25/09 : 97');
ok(r('{days_until:2020-01-01}', at).text === '0', 'date passée : 0');
ok(r('{days_until:demain}').warnings.length === 1, 'date mal formée : signalée');

console.log('\nActivité et classements (module Statistiques)');
const before = r('{msg:7d}');
ok(before.text === '0' && before.warnings.some((w) => /désactivé/.test(w)), 'module Statistiques désactivé : 0 + avertissement');
statsStorage.updateConfig(G, { enabled: true });
for (let i = 0; i < 6; i++) statsCollector.recordMessage({ guild: { id: G }, author: { id: 'u1', bot: false }, channelId: 'c1' } as any);
for (let i = 0; i < 2; i++) statsCollector.recordMessage({ guild: { id: G }, author: { id: 'u2', bot: false }, channelId: 'c1' } as any);
statsCollector.recordVoiceSeconds(G, 'v1', 'u2', 5400);
statsCollector.recordJoin(G, 13_856);
ok(r('Msg 7 jours : {msg:7d}').text === 'Msg 7 jours : 8', '« Msg 7 jours : {msg:7d} » → 8');
ok(r('{voice:30d} h').text === '1.5 h', 'vocal : 1,5 h');
ok(r('{joins:7d}+ {leaves:7d}-').text === '1+ 0-', 'arrivées / départs');
ok(r('{active:7d}').text === '2', '2 membres actifs');
ok(r('Top : {top_member:7d}').text === 'Top : Lando', 'membre le plus actif : Lando');
ok(r('{top_voice_member:7d}').text === 'Rub19', 'membre le plus actif en vocal : Rub19');
ok(r('#{top_channel:7d}').text === '#general' && r('{top_voice_channel:7d}').text === 'Meetings', 'salons les plus actifs');
ok(r('{msg:0d}').warnings.length === 1 && r('{msg:999d}').warnings.length === 1 && r('{msg:semaine}').warnings.length === 1, 'périodes invalides (0d, 999d, semaine) refusées');

console.log('\nSolidité');
ok(r('{inconnu}').text === '{inconnu}' && r('{inconnu}').warnings.length === 1, 'jeton inconnu : laissé tel quel et signalé');
ok(r('a'.repeat(300)).text.length === 100, 'résultat limité à 100 caractères (limite Discord)');
ok(r('  A   B  ').text === 'A B', 'espaces superflus supprimés');
ok(needsMemberFetch('{humans}') && needsMemberFetch('{top_member:7d}') && !needsMemberFetch('{members}'), 'chargement des membres seulement si nécessaire');
ok(TOKEN_DOCS.every((d) => renderTemplate(guild, d.token.replace('ID', '12345')).warnings.filter((w) => !/désactivé/.test(w)).length === 0), 'chaque jeton du catalogue se rend sans avertissement');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
