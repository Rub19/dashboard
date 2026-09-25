/** Configuration rapide : socle actif / reste désactivé, préréglages, panneau valide pour Discord, droits. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-setup-test-')));
const reg = await import('../src/services/moduleRegistry.js');
const { guildSetupService } = await import('../src/services/guildSetupService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const G = 'g-setup-test';
const enabledIds = () => reg.MODULES.filter((m) => reg.isModuleEnabled(G, m.id)).map((m) => m.id).sort();

console.log('\nNouveau serveur');
reg.applyModuleSelection(G, reg.CORE_MODULE_IDS);
ok(JSON.stringify(enabledIds()) === JSON.stringify([...reg.CORE_MODULE_IDS].sort()), `seul le socle est actif (${enabledIds().join(', ')})`);
ok(!reg.isModuleEnabled(G, 'economy') && !reg.isModuleEnabled(G, 'ai') && !reg.isModuleEnabled(G, 'security'), 'économie, IA et Anti-Raid démarrent désactivés');
ok(reg.isModuleEnabled('serveur-existant', 'economy'), 'un serveur jamais initialisé garde le comportement actuel (rien n’est coupé)');

console.log('\nPréréglages');
for (const id of ['minimal', 'community', 'security', 'all'] as const) {
  reg.applyModuleSelection(G, reg.MODULE_PRESETS[id].ids());
  const on = enabledIds();
  ok(reg.CORE_MODULE_IDS.every((c) => on.includes(c)), `« ${id} » garde le socle (${on.length} modules actifs)`);
}
ok(enabledIds().length === reg.MODULES.length, '« tout activer » active les 29 modules');

console.log('\nPanneau Discord');
reg.applyModuleSelection(G, reg.CORE_MODULE_IDS);
const panel = guildSetupService.buildPanel(G, true) as any;
const rows = panel.components.map((r: any) => r.toJSON());
ok(rows.length <= 5, `au plus 5 rangées (${rows.length})`);
const selects = rows.flatMap((r: any) => r.components).filter((c: any) => c.type === 3);
ok(selects.length === 2 && selects.every((s: any) => s.options.length <= 25), `2 menus de 25 options maximum (${selects.map((s: any) => s.options.length).join(' + ')})`);
const total = selects.reduce((n: number, s: any) => n + s.options.length, 0);
ok(total === reg.MODULES.length, `tous les modules sont proposés une seule fois (${total})`);
const defaults = selects.flatMap((s: any) => s.options).filter((o: any) => o.default).map((o: any) => o.value).sort();
ok(JSON.stringify(defaults) === JSON.stringify([...reg.CORE_MODULE_IDS].sort()), 'les modules actifs sont pré-cochés');
const emb = panel.embeds[0].toJSON();
ok(emb.fields.every((f: any) => f.value.length <= 1024 && f.name.length <= 256), 'champs de l’embed dans les limites Discord');

console.log('\nDroits');
let replied: any = null;
await guildSetupService.handle({
  guildId: G,
  customId: 'qsetup:preset:all',
  memberPermissions: { has: () => false },
  isStringSelectMenu: () => false,
  isButton: () => true,
  reply: async (o: any) => { replied = o; },
} as any);
ok(replied !== null && enabledIds().length === reg.CORE_MODULE_IDS.length, 'un membre sans « Gérer le serveur » est refusé et rien ne change');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
