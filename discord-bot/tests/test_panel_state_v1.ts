/** Panneaux publiés : boutons grisés quand le module est coupé, réactivés au retour ; messages à composants V2 non touchés. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MessageFlags } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-panels-')));
const { setMessageComponentsDisabled } = await import('../src/services/panelStateService.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const row = () => ({ type: 1, components: [
  { type: 2, style: 1, label: 'Support', custom_id: 'ticket_open:a', disabled: false },
  { type: 2, style: 2, label: 'Facturation', custom_id: 'ticket_open:b', disabled: false },
] });
let edited: any = null;
const msg: any = { components: [row()], flags: { has: () => false }, edit: async (p: any) => { edited = p; } };

ok(await setMessageComponentsDisabled(msg, true) === true, 'module coupé : le panneau est modifié');
const json = edited.components.map((r: any) => r.toJSON());
ok(json[0].components.every((c: any) => c.disabled === true), 'tous les boutons sont grisés');
ok(json[0].components[0].custom_id === 'ticket_open:a' && json[0].components[0].label === 'Support', 'libellés et identifiants conservés');

// Panneau déjà grisé : rien à faire (pas de modification inutile de l'API)
const already: any = { components: [{ type: 1, components: [{ type: 2, style: 1, label: 'x', custom_id: 'c', disabled: true }] }], flags: { has: () => false }, edit: async () => { throw new Error('ne doit pas être appelé'); } };
ok(await setMessageComponentsDisabled(already, true) === false, 'déjà grisé : aucune modification');

// Réactivation
edited = null;
const off: any = { components: [{ type: 1, components: [{ type: 2, style: 1, label: 'x', custom_id: 'c', disabled: true }] }], flags: { has: () => false }, edit: async (p: any) => { edited = p; } };
ok(await setMessageComponentsDisabled(off, false) === true && edited.components[0].toJSON().components[0].disabled === false, 'module réactivé : boutons de nouveau utilisables');

// Composants V2 : non touchés
const v2: any = { components: [row()], flags: { has: (f: number) => f === MessageFlags.IsComponentsV2 }, edit: async () => { throw new Error('ne doit pas être appelé'); } };
ok(await setMessageComponentsDisabled(v2, true) === false, 'message à composants V2 : non modifié');
ok(await setMessageComponentsDisabled({ components: [], flags: { has: () => false }, edit: async () => {} } as any, true) === false, 'message sans composants : rien');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
