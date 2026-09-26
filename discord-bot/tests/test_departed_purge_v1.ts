/** Purge des serveurs quittés depuis plus de 30 jours : données retirées de tous les fichiers, archive restaurable, autres serveurs intacts. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.ETHONE_SKIP_PURGE = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-purge-'));
process.chdir(dir);
const data = path.join(dir, 'data');
fs.mkdirSync(data);
const { purgeDepartedGuilds, scrubJson } = await import('../src/bootstrap/purgeDeparted.js');
const { recordDeparture, clearDeparture, loadDeparted } = await import('../src/services/departedGuilds.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const write = (n: string, v: unknown) => fs.writeFileSync(path.join(data, n), JSON.stringify(v));
const read = (n: string) => JSON.parse(fs.readFileSync(path.join(data, n), 'utf-8'));

const OLD = '111111111111111111';
const NEW = '222222222222222222';
const STAY = '333333333333333333';
write('a_keyed.json', { [OLD]: { x: 1 }, [STAY]: { x: 2 } });
write('b_array.json', [{ guildId: OLD, v: 1 }, { guildId: STAY, v: 2 }, { guildId: NEW, v: 3 }]);
write('c_composite.json', { [`${OLD}:chan1`]: 1, [`${STAY}:chan1`]: 2 });
write('d_nested_id.json', { one: { guildId: OLD, a: 1 }, two: { guildId: STAY, a: 2 } });
write('e_untouched.json', { hello: 'world' });

// Départ récent (10 jours) et ancien (40 jours)
const now = Date.now();
recordDeparture(OLD, 'Ancien serveur', new Date(now - 40 * 86_400_000));
recordDeparture(NEW, 'Serveur récent', new Date(now - 10 * 86_400_000));
ok(Object.keys(loadDeparted()).length === 2, 'deux départs enregistrés');
recordDeparture(OLD, 'autre nom', new Date(now));
ok(loadDeparted()[OLD].name === 'Ancien serveur', 'un départ déjà noté n’est pas réécrit');

const r = purgeDepartedGuilds(data, now);
ok(r.purged.length === 1 && r.purged[0] === OLD, 'seul le serveur parti depuis plus de 30 jours est purgé');
ok(!(OLD in read('a_keyed.json')) && STAY in read('a_keyed.json'), 'objet indexé par serveur : entrée retirée, les autres gardées');
ok(read('b_array.json').length === 2 && !read('b_array.json').some((i: any) => i.guildId === OLD), 'tableau : éléments du serveur retirés, ceux du serveur récent gardés');
ok(!(`${OLD}:chan1` in read('c_composite.json')) && `${STAY}:chan1` in read('c_composite.json'), 'clés composées « serveur:salon » retirées');
ok(!('one' in read('d_nested_id.json')) && 'two' in read('d_nested_id.json'), 'entrées portant un guildId retirées');
ok(read('e_untouched.json').hello === 'world', 'fichier sans rapport inchangé');
const arch = fs.readdirSync(path.join(data, 'departed'));
ok(arch.length === 1 && arch[0].startsWith(OLD), 'archive écrite');
const archived = JSON.parse(fs.readFileSync(path.join(data, 'departed', arch[0]), 'utf-8'));
ok(archived.removed['b_array.json'].length === 1 && archived.removed['a_keyed.json'].length === 1, 'l’archive contient ce qui a été retiré (restaurable)');
ok(!(OLD in loadDeparted()) && NEW in loadDeparted(), 'le serveur purgé sort de la liste, le récent y reste');

clearDeparture(NEW);
ok(!(NEW in loadDeparted()), 'le retour du bot annule la purge');
ok(purgeDepartedGuilds(data, now).purged.length === 0, 'rien à purger ensuite');
ok(scrubJson('texte', new Set([OLD])).value === 'texte', 'contenu non JSON-objet : inchangé');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
