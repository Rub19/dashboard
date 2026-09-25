/** Statistiques poussées : comparaison de périodes, records, rythme horaire, classement des membres. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-statsx-test-')));
const { statsStorage, dayKey } = await import('../src/modules/stats/storage/statsStorage.js');
const { statsQueries } = await import('../src/modules/stats/services/statsQueries.js');
const { statsCollector } = await import('../src/modules/stats/services/statsCollector.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = 'g-statsx';
const NOW = new Date('2026-09-25T12:00:00Z'); // vendredi
const dayAt = (offset: number) => dayKey(new Date(NOW.getTime() - offset * 86_400_000));
statsStorage.updateConfig(G, { enabled: true });

console.log('\nCollecte horaire');
const msg: any = { guild: { id: G }, author: { id: 'a', bot: false }, channelId: 'c1' };
statsCollector.recordMessage(msg);
const today = statsStorage.day(G);
ok(today.byHour.reduce((a, b) => a + b, 0) === 1 && today.byHour[new Date().getUTCHours()] === 1, 'un message est compté dans l’heure UTC courante');
statsCollector.recordVoiceSeconds(G, 'v1', 'a', 120, new Date('2026-09-25T15:30:00Z'));
ok(statsStorage.day(G, '2026-09-25').voiceByHour[15] === 120, 'le vocal est compté dans l’heure du crédit');
statsStorage.clearGuild(G);
statsStorage.updateConfig(G, { enabled: true });

// Données : période courante (7 j) plus riche que la précédente.
const put = (offset: number, patch: Record<string, any>) => Object.assign(statsStorage.day(G, dayAt(offset)), patch);
for (let i = 0; i < 7; i++) {
  const hourly = new Array(24).fill(0);
  hourly[20] = 10 + i; // pic à 20 h
  put(i, { messages: 10 + i, byUser: { a: 6 + i, b: 4 }, byHour: hourly, voiceSec: 3600, voiceByUser: { a: 3600 }, joins: i === 2 ? 5 : 1, leaves: 1 });
}
for (let i = 7; i < 14; i++) put(i, { messages: 5, byUser: { a: 5 }, voiceSec: 1800, voiceByUser: { a: 1800 }, joins: 1, leaves: 2 });

console.log('\nAnalyse');
const ins = statsQueries.insights(G, 7, NOW);
ok(ins.current.messages === [0, 1, 2, 3, 4, 5, 6].reduce((s, i) => s + 10 + i, 0) && ins.previous.messages === 35, 'totaux de la période et de la précédente');
ok(ins.change.messages === 160 && ins.change.voiceHours === 100, 'variation en % : messages +160 % (91 vs 35), vocal +100 % (7 h vs 3,5 h)');
ok(ins.change.leaves === -50, 'variation négative : départs −50 %');
ok(ins.averages.messagesPerDay === 13 && ins.averages.messagesPerActiveMember === 45.5, 'moyennes par jour et par membre actif');
ok(ins.records.bestMessageDay?.value === 16 && ins.records.bestJoinDay?.value === 5 && ins.records.bestJoinDay.day === dayAt(2), 'records : meilleur jour de messages et d’arrivées');
ok(ins.records.longestActiveStreak === 7, 'plus longue série de jours actifs');
ok(ins.hasHourly && ins.hours[20].messages === 91 && ins.hours.filter((h) => h.messages > 0).length === 1, 'rythme horaire : tout à 20 h UTC');
ok(ins.heatmap.length === 7 && ins.heatmap[4][20] > 0 && ins.heatmap.flat().reduce((a, b) => a + b, 0) === 91, 'carte de chaleur 7×24 cohérente (vendredi présent)');
ok(ins.weekday.reduce((s, w) => s + w.messages, 0) === ins.current.messages, 'répartition par jour de semaine = total');
ok(ins.concentration.membersCounted === 2 && (ins.concentration.topTenPercentShare ?? 0) > 50, 'concentration : le membre le plus actif écrit la majorité');
const empty = statsQueries.insights('vide', 7, NOW);
ok(empty.change.messages === null && !empty.hasHourly && empty.records.bestMessageDay === null && empty.averages.messagesPerActiveMember === 0, 'serveur sans donnée : aucune division par zéro, variations nulles');

console.log('\nClassement des membres');
const byMsg = statsQueries.leaderboard(G, 7, 'messages', NOW);
ok(byMsg.rows[0].id === 'a' && byMsg.rows[0].messages > byMsg.rows[1].messages && byMsg.members === 2, 'trié par messages, 2 membres');
ok(Math.abs(byMsg.rows.reduce((s, r) => s + r.messageShare, 0) - 100) < 0.5, 'les parts de messages font 100 %');
const byVoice = statsQueries.leaderboard(G, 7, 'voice', NOW);
ok(byVoice.rows[0].id === 'a' && byVoice.rows[0].voiceHours === 7 && byVoice.rows[1].voiceHours === 0, 'trié par vocal');
const byActive = statsQueries.leaderboard(G, 7, 'active', NOW);
ok(byActive.rows[0].activeDays === 7, 'jours actifs comptés');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
