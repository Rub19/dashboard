/** Statistiques d'activité : collecte, requêtes (rangs, fenêtres, séries), rétention et images. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-stats-test-')));
const { statsStorage, dayKey } = await import('../src/modules/stats/storage/statsStorage.js');
const { statsCollector } = await import('../src/modules/stats/services/statsCollector.js');
const { statsQueries, lastDays } = await import('../src/modules/stats/services/statsQueries.js');
const { renderBarChart, renderMemberCard, niceScale } = await import('../src/modules/stats/images/statsImages.js');
const reg = await import('../src/services/moduleRegistry.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const G = 'g-stats';
const msg = (user: string, channel: string, guild = G) => ({ guild: { id: guild }, author: { id: user, bot: false }, channelId: channel }) as any;

console.log('\nDésactivé par défaut');
statsCollector.recordMessage(msg('a', 'c1'));
ok(statsQueries.summary(G, 30).totals.messages === 0, 'rien n’est compté tant que le module est désactivé');
ok(!reg.isModuleEnabled(G, 'stats'), 'le registre affiche « désactivé »');
statsStorage.updateConfig(G, { enabled: true });
ok(reg.isModuleEnabled(G, 'stats') && !!statsStorage.getConfig(G).startedAt, 'activé : le registre le voit et la date de départ est enregistrée');

console.log('\nMessages');
for (let i = 0; i < 5; i++) statsCollector.recordMessage(msg('a', 'c1'));
for (let i = 0; i < 3; i++) statsCollector.recordMessage(msg('b', 'c1'));
statsCollector.recordMessage(msg('b', 'c2'));
statsCollector.recordMessage({ guild: { id: G }, author: { id: 'bot', bot: true }, channelId: 'c1' } as any);
let s = statsQueries.summary(G, 7);
ok(s.totals.messages === 9, 'les messages des bots ne comptent pas (9 messages)');
ok(s.topMembersMessages[0].id === 'a' && s.topMembersMessages[0].value === 5, 'membre n°1 : a (5)');
ok(s.topChannelsMessages[0].id === 'c1' && s.topChannelsMessages[0].value === 8, 'salon n°1 : c1 (8)');
ok(s.totals.activeUsers === 2, '2 membres actifs');

console.log('\nVocal (sessions)');
const guild = { id: G, afkChannelId: 'afk' } as any;
const member = (id: string) => ({ id, user: { bot: false } }) as any;
const state = (id: string, channelId: string | null) => ({ member: member(id), guild, channelId }) as any;
const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;
statsCollector.onVoiceStateUpdate(state('a', null), state('a', 'v1')); // a rejoint v1
clock += 45 * 60_000;
statsCollector.onVoiceStateUpdate(state('a', 'v1'), state('a', 'v2')); // a passe à v2 après 45 min
clock += 15 * 60_000;
statsCollector.onVoiceStateUpdate(state('a', 'v2'), state('a', null)); // a quitte après 15 min
statsCollector.onVoiceStateUpdate(state('b', null), state('b', 'afk')); // salon AFK : ignoré
clock += 30 * 60_000;
statsCollector.onVoiceStateUpdate(state('b', 'afk'), state('b', null));
Date.now = realNow;
s = statsQueries.summary(G, 7);
ok(Math.abs(s.totals.voiceHours - 1) < 0.02, `1 h de vocal au total (${s.totals.voiceHours} h) : 45 + 15 min, le salon AFK ne compte pas`);
ok(s.topChannelsVoice[0].id === 'v1', 'salon vocal n°1 : v1 (45 min)');
ok(statsCollector.activeVoiceSessions() === 0, 'aucune session ouverte après la sortie');
statsCollector.onVoiceStateUpdate(state('c', null), state('c', 'v1'));
statsCollector.onVoiceStateUpdate(state('c', 'v1'), state('c', 'v1')); // mute / caméra : même salon, la session continue sans doublon
ok(statsCollector.activeVoiceSessions() === 1, 'un changement d’état dans le même salon n’ouvre pas de seconde session');
statsCollector.onVoiceStateUpdate(state('c', 'v1'), state('c', null));

console.log('\nFiche membre et rangs');
const m = statsQueries.member(G, 'a');
ok(m.windows['1'].messages === 5 && m.windows['60'].messages === 5, 'a : 5 messages sur 1 j et 60 j');
ok(Math.abs(m.windows['60'].voiceHours - 1) < 0.02, 'a : 1 h de vocal');
ok(m.rank.messages === 1 && m.rank.voice === 1, 'a : rang #1 en messages et en vocal');
ok(statsQueries.member(G, 'b').rank.messages === 2, 'b : rang #2 en messages');
ok(statsQueries.member(G, 'zzz').rank.messages === null, 'un inconnu n’a pas de rang');
ok(m.topChannels[0].id === 'c1' && m.series.length === 60, 'salon préféré et courbe de 60 jours');

console.log('\nSalon');
const ch = statsQueries.channel(G, 'c1', 30);
ok(ch.totals.messages === 8 && ch.topMembersMessages[0].id === 'a', 'salon c1 : 8 messages, a en tête');

console.log('\nMembres, arrivées et départs');
statsCollector.recordJoin(G, 101);
statsCollector.recordJoin(G, 102);
statsCollector.recordLeave(G, 101);
const series = statsQueries.serverSeries(G, 5);
ok(series.length === 5 && series[4].joins === 2 && series[4].leaves === 1 && series[4].members === 101, 'aujourd’hui : +2 / −1, 101 membres');
ok(series[0].members === null, 'avant le premier relevé : pas de valeur inventée');
const past = new Date(Date.now() - 3 * 86_400_000);
statsStorage.day(G, dayKey(past)).members = 90;
ok(statsQueries.serverSeries(G, 5)[3].members === 90 && statsQueries.serverSeries(G, 5)[4].members === 101, 'les jours sans relevé reprennent la dernière valeur connue');

console.log('\nRétention');
statsStorage.day(G, '2001-01-01').messages = 999;
statsStorage.prune();
ok(statsStorage.peekDay(G, '2001-01-01') === undefined, 'une journée de plus de 400 jours est supprimée');
ok(lastDays(30).length === 30 && lastDays(30)[29] === dayKey(), '30 jours, le dernier est aujourd’hui (UTC)');
statsStorage.flush();
ok(fs.existsSync(path.resolve(process.cwd(), 'data', 'stats_days.json')), 'les compteurs sont écrits sur disque');

console.log('\nImages');
const png = await renderBarChart({ title: 'T', data: lastDays(30).map((d, i) => ({ label: d.slice(5), value: i })) });
ok(png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && png.length > 3000, `graphique PNG valide (${png.length} octets)`);
const empty = await renderBarChart({ title: 'Vide', data: [] });
ok(empty.length > 500, 'un graphique sans donnée se dessine quand même');
const card = await renderMemberCard({ name: 'Test', avatarUrl: null, createdOn: null, joinedOn: null, rankMessages: null, rankVoice: null, windows: m.windows, topChannels: [], series: m.series });
ok(card.subarray(0, 4).toString('hex') === '89504e47', 'fiche membre PNG valide, même sans avatar ni rang');
const sc = niceScale(37);
ok(sc.top >= 37 && [10, 20, 50].includes(sc.step) && niceScale(0).top > 0, `graduation « ronde » de l’axe (37 → ${sc.top}, pas ${sc.step})`);

console.log('\nEffacement');
statsStorage.clearGuild(G);
ok(statsQueries.summary(G, 30).totals.messages === 0, 'effacer supprime toutes les données du serveur');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
