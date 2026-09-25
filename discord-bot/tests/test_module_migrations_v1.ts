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

ok(reg.isModuleEnabled('g1', 'leveling'), 'avant : l’XP est actif sur les serveurs existants');
const first = runModuleMigrations(client);
ok(first.includes('2026-09-25-disable-leveling-everywhere') && first.includes('2026-09-25-automod-everything-off') && first.includes('2026-09-25-automod-external-links-all-b'), 'les migrations (XP coupé, AutoMod coupé) sont appliquées au premier démarrage');
ok(['g1', 'g2', 'g3'].every((g) => !reg.isModuleEnabled(g, 'leveling')), 'l’XP est désactivé sur les 3 serveurs');
ok(['g1', 'g2', 'g3'].every((g) => reg.isModuleEnabled(g, 'music') && reg.isModuleEnabled(g, 'economy')), 'les autres modules ne sont pas touchés');

reg.setModuleEnabled('g1', 'leveling', true);
const second = runModuleMigrations(client);
ok(second.length === 0 && reg.isModuleEnabled('g1', 'leveling'), 'redémarrage suivant : rien n’est rejoué, un module réactivé le reste');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
