import { commandRegistry } from '../src/handlers/commandHandler.js';
const cmds = commandRegistry.getAllCommands();
const bad: string[] = [];
const names = new Map<string, string>();
let total = 0;
const checkOpts = (path: string, opts: any[] = [], depth = 0) => {
  let seenOptional = false;
  const seen = new Set<string>();
  for (const o of opts) {
    if (!/^[\p{Ll}\p{N}_-]{1,32}$/u.test(o.name)) bad.push(`${path}.${o.name}: nom d'option invalide`);
    if (!o.description || o.description.length > 100) bad.push(`${path}.${o.name}: description vide ou > 100 (${o.description?.length})`);
    if (seen.has(o.name)) bad.push(`${path}.${o.name}: option en double`);
    seen.add(o.name);
    if (o.type > 2) {
      if (o.required && seenOptional) bad.push(`${path}.${o.name}: option obligatoire après une option facultative`);
      if (!o.required) seenOptional = true;
      if (o.choices && o.choices.length > 25) bad.push(`${path}.${o.name}: > 25 choix`);
      for (const ch of o.choices ?? []) {
        if (String(ch.name).length > 100 || (typeof ch.value === 'string' && ch.value.length > 100)) bad.push(`${path}.${o.name}: choix trop long ${ch.name}`);
      }
    } else if (o.options) checkOpts(`${path}.${o.name}`, o.options, depth + 1);
    if (o.options && o.options.length > 25) bad.push(`${path}.${o.name}: > 25 options`);
  }
  if (opts.length > 25) bad.push(`${path}: > 25 options`);
};
for (const c of cmds) {
  if (!c.slashData) continue;
  total++;
  const j: any = c.slashData.toJSON();
  if (names.has(j.name)) bad.push(`${j.name}: commande en double (${names.get(j.name)} / ${c.name})`);
  names.set(j.name, c.name);
  if (!/^[\p{Ll}\p{N}_-]{1,32}$/u.test(j.name)) bad.push(`${j.name}: nom invalide`);
  if (!j.description || j.description.length > 100) bad.push(`${j.name}: description vide ou > 100`);
  checkOpts(j.name, j.options);
}
console.log(`${total} commandes slash vérifiées (limite Discord : 100 globales)`);
if (total > 100) bad.push(`${total} commandes > 100`);
console.log(bad.length ? bad.join('\n') : 'Aucun problème de définition');
process.exit(0);
