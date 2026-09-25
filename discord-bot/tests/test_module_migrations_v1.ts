/** Migration « XP désactivé partout » : appliquée une fois sur les serveurs existants, jamais rejouée. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-mig-test-')));
const reg = await import('../src/services/moduleRegistry.js');
const { runModuleMigrations } = await import('../src/services/moduleMigrations.js');
const { levelingStorage } = await import('../src/modules/leveling/storage/levelingStorage.js');
// Serveurs existants qui avaient activé l'XP (le défaut d'un nouveau serveur est désormais « désactivé »).
for (const g of ['g1', 'g2', 'g3']) levelingStorage.updateConfig(g, { enabled: true });

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const client = { guilds: { cache: new Map([['g1', { id: 'g1' }], ['g2', { id: 'g2' }], ['g3', { id: 'g3' }]]), } } as any;

// Serveurs existants avec des modules actifs (protections comprises)
const all = reg.MODULES.map((m) => m.id);
for (const g of ['g1', 'g2', 'g3']) for (const id of all) reg.setModuleEnabled(g, id, true, 'DISCORD_COMMAND', undefined, false);

ok(reg.isModuleEnabled('g1', 'leveling'), 'avant : l’XP est actif sur les serveurs existants');
const first = runModuleMigrations(client);
ok(['2026-09-25-disable-leveling-everywhere', '2026-09-25-automod-everything-off', '2026-09-25-automod-external-links-all-b', '2026-09-25-everything-off-except-music'].every((id) => first.includes(id)), 'les migrations sont appliquées au premier démarrage');
ok(['g1', 'g2', 'g3'].every((g) => !reg.isModuleEnabled(g, 'leveling')), 'l’XP est désactivé sur les 3 serveurs');
ok(['g1', 'g2', 'g3'].every((g) => reg.isModuleEnabled(g, 'music')), 'la musique reste active');
const stillOn = ['g1', 'g2', 'g3'].flatMap((g) => all.filter((id) => id !== 'music' && reg.isModuleEnabled(g, id)));
ok(stillOn.length === 0, `tous les autres modules (protections, modération, tags…) sont désactivés partout${stillOn.length ? ' — encore actifs : ' + [...new Set(stillOn)].join(', ') : ''}`);

reg.setModuleEnabled('g1', 'economy', true);
const second = runModuleMigrations(client);
ok(second.length === 0 && reg.isModuleEnabled('g1', 'economy'), 'redémarrage suivant : rien n’est rejoué, un module réactivé le reste');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
