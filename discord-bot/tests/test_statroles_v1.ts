/** Statroles : conditions (ET / OU imbriqués), activité, ancienneté, ajout ET retrait automatiques, garde-fous. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Collection } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-statroles-test-')));
const { evaluate, makeContext, compare, roleIssue, statrolesEngine } = await import('../src/modules/statroles/services/statrolesEngine.js');
const { statrolesStorage } = await import('../src/modules/statroles/storage/statrolesStorage.js');
const { StatroleRuleSchema, treeStats } = await import('../src/modules/statroles/types/statroles.js');
const { statsStorage } = await import('../src/modules/stats/storage/statsStorage.js');
const { statsCollector } = await import('../src/modules/stats/services/statsCollector.js');
const reg = await import('../src/services/moduleRegistry.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

const G = 'g-statroles';
const DAY = 86_400_000;
const now = new Date();
statsStorage.updateConfig(G, { enabled: true });
const say = (u: string, n: number) => { for (let i = 0; i < n; i++) statsCollector.recordMessage({ guild: { id: G }, author: { id: u, bot: false }, channelId: 'c1' } as any); };
say('vet', 120); say('newbie', 3); say('lurker', 0); say('chatty', 90);
statsCollector.recordVoiceSeconds(G, 'v1', 'vet', 10 * 3600);
statsCollector.recordVoiceSeconds(G, 'v1', 'chatty', 3600);

const facts = (id: string, joinedDaysAgo: number, accountDaysAgo: number, roles: string[] = []) => ({ id, joinedAt: now.getTime() - joinedDaysAgo * DAY, createdAt: now.getTime() - accountDaysAgo * DAY, roleIds: new Set(roles) });
const ctx = makeContext(G, now);

console.log('\nOpérateurs');
ok(compare('>=', 5, 5) && !compare('>', 5, 5) && compare('<', 4, 5) && compare('<=', 5, 5) && compare('=', 3, 3) && !compare('=', 3, 4), 'les cinq opérateurs');

console.log('\nConditions simples');
const msg100 = { kind: 'messages', days: 30, op: '>=', value: 100 } as const;
ok(evaluate(msg100, facts('vet', 400, 800), ctx) && !evaluate(msg100, facts('newbie', 2, 30), ctx), '≥ 100 messages sur 30 j : vet oui, newbie non');
const voice5 = { kind: 'voice', days: 30, op: '>=', hours: 5 } as const;
ok(evaluate(voice5, facts('vet', 400, 800), ctx) && !evaluate(voice5, facts('chatty', 10, 100), ctx), '≥ 5 h de vocal : vet oui, chatty (1 h) non');
ok(evaluate({ kind: 'joinedAge', op: '>=', days: 90 }, facts('a', 100, 10), ctx) && !evaluate({ kind: 'joinedAge', op: '>=', days: 90 }, facts('a', 30, 10), ctx), 'ancienneté sur le serveur ≥ 90 j');
ok(evaluate({ kind: 'accountAge', op: '>=', days: 365 }, facts('a', 1, 500), ctx) && !evaluate({ kind: 'accountAge', op: '>=', days: 365 }, facts('a', 1, 20), ctx), 'ancienneté du compte ≥ 365 j (anti-comptes neufs)');
ok(evaluate({ kind: 'hasRole', roleId: '11111', not: false }, facts('a', 1, 1, ['11111']), ctx) && evaluate({ kind: 'hasRole', roleId: '11111', not: true }, facts('a', 1, 1, []), ctx), 'possède / ne possède pas un rôle');

console.log('\nArbres ET / OU imbriqués (comme le constructeur Statbot)');
const tree = {
  kind: 'group', match: 'ANY', children: [
    { kind: 'hasRole', roleId: '22222', not: false }, // « Veteran Member »
    { kind: 'group', match: 'ALL', children: [msg100, voice5, { kind: 'joinedAge', op: '>=', days: 30 }] },
  ],
} as any;
ok(evaluate(tree, facts('vet', 100, 900), ctx), 'ALL(messages, vocal, ancienneté) rempli → vet correspond');
ok(!evaluate(tree, facts('chatty', 100, 900), ctx), 'chatty (vocal insuffisant) ne correspond pas');
ok(evaluate(tree, facts('chatty', 100, 900, ['22222']), ctx), '…sauf s’il a le rôle « Veteran Member » (branche ANY)');
ok(!evaluate({ kind: 'group', match: 'ALL', children: [] } as any, facts('vet', 1, 1), ctx) && !evaluate({ kind: 'group', match: 'ANY', children: [] } as any, facts('vet', 1, 1), ctx), 'un groupe vide ne correspond à PERSONNE (jamais « tout le monde »)');

console.log('\nValidation');
const rule = (root: any) => ({ id: 'regle-1', name: 'Régulier', roleId: '33333', root });
ok(StatroleRuleSchema.safeParse(rule(tree)).success, 'une règle valide est acceptée');
ok(!StatroleRuleSchema.safeParse(rule({ kind: 'group', match: 'ALL', children: [{ kind: 'messages', days: 0, op: '>=', value: 5 }] })).success, 'une période de 0 jour est refusée');
ok(!StatroleRuleSchema.safeParse(rule({ kind: 'group', match: 'ALL', children: [{ kind: 'messages', days: 30, op: '~', value: 5 }] })).success, 'un opérateur inconnu est refusé');
ok(!StatroleRuleSchema.safeParse({ ...rule(tree), roleId: 'abc' }).success, 'un identifiant de rôle invalide est refusé');
let deep: any = { kind: 'messages', days: 7, op: '>=', value: 1 };
for (let i = 0; i < 6; i++) deep = { kind: 'group', match: 'ALL', children: [deep] };
ok(treeStats(deep).depth === 7, 'la profondeur d’un arbre est mesurée (7 niveaux) pour être bornée à l’enregistrement');

console.log('\nApplication : ajout ET retrait');
const roleCalls: string[] = [];
const mkMember = (id: string, joinedDaysAgo: number, roles: string[]) => {
  const m: any = { id, displayName: id, user: { bot: false, tag: `${id}#0`, createdTimestamp: now.getTime() - 900 * DAY }, joinedTimestamp: now.getTime() - joinedDaysAgo * DAY, roles: { cache: new Set(roles), add: async (r: string) => { m.roles.cache.add(r); roleCalls.push(`+${id}`); }, remove: async (r: string) => { m.roles.cache.delete(r); roleCalls.push(`-${id}`); } } };
  return m;
};
const members = new Collection<string, any>([
  ['vet', mkMember('vet', 100, [])], // remplit tout → doit recevoir le rôle
  ['lurker', mkMember('lurker', 100, ['33333'])], // a le rôle sans remplir les conditions → doit le perdre
  ['newbie', mkMember('newbie', 2, [])], // ne remplit pas, n'a pas le rôle → rien
]);
const guild: any = {
  id: G, name: 'Test',
  members: { cache: members, fetch: async () => members },
  roles: { cache: new Collection([['33333', { id: '33333', managed: false, editable: true }]]) },
};
const simple = { kind: 'group', match: 'ALL', children: [msg100, { kind: 'joinedAge', op: '>=', days: 30 }] } as any;
statrolesStorage.updateConfig(G, { enabled: true });
statrolesStorage.upsertRule(G, StatroleRuleSchema.parse(rule(simple)));
let s = await statrolesEngine.run(guild);
ok(s.added === 1 && s.removed === 1 && roleCalls.join(',') === '+vet,-lurker', 'vet reçoit le rôle, lurker le perd, newbie est laissé tranquille');
roleCalls.length = 0;
s = await statrolesEngine.run(guild);
ok(s.added === 0 && s.removed === 0 && roleCalls.length === 0, 'un deuxième passage ne change plus rien (aucun appel inutile)');
members.get('vet').roles.cache.delete('33333');
statrolesStorage.upsertRule(G, StatroleRuleSchema.parse({ ...rule(simple), removeWhenNotMatching: false }));
members.get('lurker').roles.cache.add('33333');
roleCalls.length = 0;
s = await statrolesEngine.run(guild);
ok(s.removed === 0 && roleCalls.join(',') === '+vet', 'sans « retirer si plus rempli » : le rôle déjà obtenu est conservé');

console.log('\nGarde-fous');
const locked: any = { id: G, roles: { cache: new Collection([['44444', { id: '44444', managed: false, editable: false }], ['55555', { id: '55555', managed: true, editable: true }]]) } };
ok(/au-dessus/.test(roleIssue(locked, '44444') ?? '') && /intégration/.test(roleIssue(locked, '55555') ?? '') && /introuvable/.test(roleIssue(locked, '66666') ?? ''), 'rôle trop haut, géré par une intégration ou inexistant : refusé avec la raison');
ok(roleIssue(locked, G) !== null, '@everyone ne peut pas être attribué');
statrolesStorage.updateConfig(G, { enabled: false });
s = await statrolesEngine.run(guild);
ok(s.added === 0 && s.removed === 0, 'module désactivé : aucun changement');
ok(!reg.isModuleEnabled(G, 'statroles') && (statrolesStorage.updateConfig(G, { enabled: true }), reg.isModuleEnabled(G, 'statroles')), 'interrupteur du registre synchronisé');
const prev = await statrolesEngine.preview(guild, StatroleRuleSchema.parse(rule(simple)));
ok(prev.matching === 1 && prev.sample[0]?.id === 'vet' && prev.toAdd === 0, 'aperçu : 1 membre correspond (vet, qui a déjà le rôle)');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
