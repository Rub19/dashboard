/** Comptage : règles du jeu, remise à zéro, records, classement. Dossier temporaire (le stockage écrit dans ./data). */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-counting-test-')));
const { countingService } = await import('../src/modules/counting/services/countingService.js');
const { countingStorage } = await import('../src/modules/counting/storage/countingStorage.js');
const reg = await import('../src/services/moduleRegistry.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const G = 'g-count';
const CH = 'ch-count';
const ev = (user: string, text: string, channel = CH) => countingService.evaluate(G, channel, user, text);

console.log('\nModule désactivé par défaut');
ok(ev('a', '1').kind === 'ignored', 'un nouveau serveur n’est pas concerné (désactivé)');
ok(!reg.isModuleEnabled(G, 'counting'), 'l’interrupteur du registre reflète « désactivé »');

countingStorage.updateConfig(G, { enabled: true, channelId: CH });
ok(reg.isModuleEnabled(G, 'counting'), 'activé : le registre le voit');

console.log('\nDéroulement normal');
ok(ev('a', '1').kind === 'ok', 'a : 1 → juste');
ok(ev('b', '2 bravo').kind === 'ok', 'b : « 2 bravo » → juste (le texte après le nombre est permis)');
ok(ev('c', 'salut tout le monde').kind === 'ignored', 'un message sans nombre est ignoré (on peut discuter)');
ok(ev('c', '3', 'autre-salon').kind === 'ignored', 'un autre salon est ignoré');
ok(ev('c', '3').kind === 'ok', 'c : 3 → juste');

console.log('\nErreurs');
const consec = ev('c', '4');
ok(consec.kind === 'mistake' && consec.reason === 'consecutive', 'c compte deux fois de suite → erreur « consécutif »');
ok(countingStorage.getConfig(G).count === 0, 'le compteur repart à 0 après une erreur');
countingStorage.updateConfig(G, { count: 10, lastUserId: 'x' });
const wrong = ev('a', '12');
ok(wrong.kind === 'mistake' && wrong.reason === 'wrong-number' && wrong.expected === 11 && wrong.previousCount === 10, 'a donne 12 au lieu de 11 → erreur, on était à 10');

console.log('\nRecord et classement');
ok(countingStorage.getConfig(G).highScore === 3, 'le record (3) survit à la remise à zéro');
ok(ev('a', '1').kind === 'ok' && ev('b', '2').kind === 'ok' && ev('a', '3').kind === 'ok', 'nouvelle partie 1-2-3');
const rec = ev('b', '4');
ok(rec.kind === 'ok' && rec.record, 'dépasser le record est signalé');
const board = countingStorage.getOverview(G).leaderboard;
ok(board[0].userId === 'a' && board[0].correct >= 3, `classement trié par nombre de « justes » (1er : ${board[0].userId})`);

console.log('\nRéglages');
countingStorage.updateConfig(G, { allowConsecutive: true, count: 20, lastUserId: 'a' });
ok(ev('a', '21').kind === 'ok', 'compter deux fois de suite autorisé si le réglage le permet');
countingStorage.updateConfig(G, { resetOnMistake: false });
const soft = ev('b', '99');
ok(soft.kind === 'mistake' && !soft.reset && countingStorage.getConfig(G).count === 21, 'sans remise à zéro, le compteur est conservé après une erreur');
ok(ev('b', '22').kind === 'ok', 'et le jeu continue');
countingStorage.resetCount(G);
ok(countingStorage.getConfig(G).count === 0 && countingStorage.getConfig(G).highScore >= 22, 'reset manuel : compteur à 0, record conservé');

console.log('\nGrands nombres et chaînes piégées');
countingStorage.updateConfig(G, { count: 999_999_999_998, lastUserId: null });
ok(ev('a', '999999999999').kind === 'ok', 'les grands nombres jusqu’à 15 chiffres passent');
ok(ev('b', '１２３').kind === 'ignored', 'des chiffres pleine largeur ne sont pas des nombres');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
