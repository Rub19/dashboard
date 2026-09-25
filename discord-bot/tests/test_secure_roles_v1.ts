/** Rôles sécurisés : TOTP, sécurisation/restauration, élévation, blocage après erreurs, expiration, garde-fou. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Collection, PermissionFlagsBits as P } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-secureroles-test-')));
const totp = await import('../src/modules/secureroles/services/totp.js');
const svc = await import('../src/modules/secureroles/services/secureRolesService.js');
const { secureRolesStorage: store } = await import('../src/modules/secureroles/storage/secureRolesStorage.js');
const reg = await import('../src/services/moduleRegistry.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

console.log('\nTOTP');
const rfcSecret = totp.base32Encode(Buffer.from('12345678901234567890'));
ok(totp.codeAtStep(rfcSecret, 1) === '287082', 'vecteur de test RFC 6238 (T=59 → 287082)');
const s0 = totp.generateSecret();
const t0 = 1_700_000_000_000;
const code = totp.codeAtStep(s0, totp.stepAt(t0));
ok(totp.verifyCode(s0, code, t0, 0) === totp.stepAt(t0), 'code valide accepté');
ok(totp.verifyCode(s0, code, t0, totp.stepAt(t0)) === null, 'un code déjà utilisé n’est pas rejoué');
ok(totp.verifyCode(s0, totp.codeAtStep(s0, totp.stepAt(t0) - 1), t0, 0) !== null, 'tolérance d’un pas pour l’horloge');
ok(totp.verifyCode(s0, totp.codeAtStep(s0, totp.stepAt(t0) - 5), t0, 0) === null && totp.verifyCode(s0, '12ab56', t0, 0) === null, 'code trop ancien ou mal formé refusé');
const enc = totp.encryptSecret(s0);
ok(!enc.includes(s0) && totp.decryptSecret(enc) === s0, 'secret chiffré au repos, déchiffrable');

// --- Faux serveur ---
const G = '100000000000000001';
const OWNER = '300000000000000001';
let seq = 500000000000000000n;
const nextId = () => String(++seq);
const roles = new Collection<string, any>();
const members = new Collection<string, any>();
const guild: any = {
  id: G,
  roles: {
    cache: roles,
    everyone: { id: G },
    create: async (o: any) => {
      const r = mkRole(o.name, o.permissions);
      return r;
    },
  },
  members: { cache: members, fetch: async (id?: string) => (id ? members.get(id) ?? null : members), me: { permissions: { has: () => true, bitfield: 0n } } },
};
function mkRole(name: string, perms: bigint, extra: any = {}) {
  const id = nextId();
  const r: any = {
    id, name, managed: false, editable: true, position: 5, permissions: { bitfield: perms },
    get members() { return new Collection([...members].filter(([, m]) => m.roles.cache.has(id))); },
    setPermissions: async (p: bigint) => { if (r.failSet) throw new Error('boom'); r.permissions = { bitfield: p }; return r; },
    delete: async () => { roles.delete(id); r.deleted = true; },
    ...extra,
  };
  roles.set(id, r);
  return r;
}
function mkMember(username: string, roleIds: string[] = [], bot = false) {
  const id = nextId();
  const cache = new Collection<string, any>();
  const m: any = {
    id, guild, displayName: username, user: { id, username, bot },
    roles: {
      cache,
      add: async (ids: string | string[]) => { for (const i of [].concat(ids as any)) cache.set(i, roles.get(i)); },
      remove: async (ids: string | string[]) => { for (const i of [].concat(ids as any)) cache.delete(i); },
    },
  };
  for (const r of roleIds) cache.set(r, roles.get(r));
  members.set(id, m);
  return m;
}
const client: any = { guilds: { cache: new Collection([[G, guild]]) } };

const mod = mkRole('Modérateur', P.KickMembers | P.BanMembers | P.ManageMessages | P.SendMessages | P.ViewChannel);
const harmless = mkRole('Membre', P.SendMessages | P.ViewChannel);
const locked = mkRole('Verrouillé', P.BanMembers, { editable: false });
const alice = mkMember('alice', [mod.id]);
mkMember('robot', [mod.id], true);
const bob = mkMember('bob', []);

console.log('\nSécurisation');
let err = '';
await svc.secureRole(guild, mod.id, OWNER).catch((e) => (err = e.message));
ok(/Activez d’abord/.test(err), 'refusé tant que le module n’est pas activé');
ok(!reg.isModuleEnabled(G, 'secureroles'), 'désactivé par défaut dans le registre');
store.updateConfig(G, { enabled: true });
for (const [r, re, label] of [[harmless, /aucune permission sensible/, 'rôle sans permission sensible refusé'], [locked, /ne peut pas modifier/, 'rôle au-dessus du bot refusé']] as const) {
  err = '';
  await svc.secureRole(guild, r.id, OWNER).catch((e) => (err = e.message));
  ok(re.test(err), label);
}
err = '';
await svc.secureRole(guild, G, OWNER).catch((e) => (err = e.message));
ok(/Rôle introuvable|everyone/.test(err), '@everyone ne peut pas être sécurisé');

mod.failSet = true;
const rolesBefore = roles.size;
err = '';
await svc.secureRole(guild, mod.id, OWNER).catch((e) => (err = e.message));
ok(/Modification du rôle impossible/.test(err) && roles.size === rolesBefore && store.getConfig(G).roles.length === 0, 'échec de la modification : le rôle caché est supprimé, rien n’est enregistré');
mod.failSet = false;

const originalPerms = mod.permissions.bitfield;
const out = await svc.secureRole(guild, mod.id, OWNER);
const hidden = roles.get(out.permissionsRoleId);
ok((mod.permissions.bitfield & svc.SENSITIVE_MASK) === 0n && (mod.permissions.bitfield & P.SendMessages) === P.SendMessages, 'le rôle visible perd ses permissions sensibles et garde les autres');
ok(hidden && (hidden.permissions.bitfield & P.BanMembers) === P.BanMembers && hidden.name.startsWith('🔐'), 'le rôle caché porte les permissions sensibles');
ok(out.invited === 1 && store.getMember(G, alice.id)?.status === 'invited' && !store.getMember(G, members.find((m) => m.user.bot)!.id), 'les détenteurs humains sont invités, pas les bots');
ok(reg.isModuleEnabled(G, 'secureroles'), 'module actif');
reg.setModuleEnabled?.(G, 'secureroles', false, 'test');
ok(reg.isModuleEnabled(G, 'secureroles'), 'impossible de désactiver le module tant que des rôles sont sécurisés');

console.log('\nÉlévation');
let now = 1_700_000_000_000;
ok((await svc.elevate(bob, null, now)).kind === 'error', 'sans rôle sécurisé : refusé');
ok((await svc.elevate(alice, null, now)).kind === 'setup' && store.getMember(G, alice.id)?.status === 'pending', 'première utilisation : clé de configuration');
const setup = await svc.elevate(alice, null, now);
const secret = (setup as any).secret as string;
ok(setup.kind === 'setup' && /^[A-Z2-7]{32}$/.test(secret), 'la clé reste affichable tant que non activée');
ok(!fs.readFileSync(path.join(process.cwd(), 'data', 'secure_roles.json'), 'utf8').includes(secret), 'la clé n’est jamais écrite en clair sur le disque');

let res: any = await svc.elevate(alice, '000000', now);
ok(res.kind === 'wrong_code' && res.remaining === 4, 'mauvais code : essais restants');
for (let i = 0; i < 3; i++) await svc.elevate(alice, '000000', now);
res = await svc.elevate(alice, '000000', now);
ok(res.kind === 'locked', '5 mauvais codes : blocage temporaire');
res = await svc.elevate(alice, totp.codeAtStep(secret, totp.stepAt(now)), now);
ok(res.kind === 'locked', 'même le bon code est refusé pendant le blocage');
now += 11 * 60_000;
const good = totp.codeAtStep(secret, totp.stepAt(now));
res = await svc.elevate(alice, good, now);
ok(res.kind === 'granted' && alice.roles.cache.has(hidden.id), 'bon code : rôle caché attribué');
ok(store.getMember(G, alice.id)?.status === 'active' && !!store.activeSessionFor(G, alice.id), 'compte activé, session enregistrée');
ok(Math.round((res.expiresAt.getTime() - now) / 60_000) === 30, 'durée de session par défaut : 30 minutes');
await svc.endMemberSession(alice);
ok(!alice.roles.cache.has(hidden.id), 'fin de session manuelle : rôle caché retiré');
res = await svc.elevate(alice, good, now);
ok(res.kind === 'wrong_code', 'le même code ne peut pas être rejoué');

console.log('\nExpiration et garde-fous');
now += 60_000;
res = await svc.elevate(alice, totp.codeAtStep(secret, totp.stepAt(now)), now);
ok(res.kind === 'granted', 'nouvelle session avec un nouveau code');
await svc.sweep(client, now + 10 * 60_000);
ok(alice.roles.cache.has(hidden.id), 'session encore valide après 10 min');
await svc.sweep(client, now + 31 * 60_000);
ok(!alice.roles.cache.has(hidden.id) && !store.activeSessionFor(G, alice.id), 'expirée après 30 min : rôle caché retiré');

now += 40 * 60_000;
await svc.elevate(alice, totp.codeAtStep(secret, totp.stepAt(now)), now);
alice.roles.cache.delete(mod.id);
await svc.sweep(client, now + 60_000);
ok(!alice.roles.cache.has(hidden.id), 'perte du rôle du personnel : session fermée, permissions retirées');
alice.roles.cache.set(mod.id, mod);

const old = { roles: { cache: new Collection() } } as any;
bob.roles.cache.set(hidden.id, hidden);
await svc.guardMemberUpdate(old, bob);
ok(!bob.roles.cache.has(hidden.id), 'rôle caché donné à la main sans code : retiré aussitôt');
ok(store.getAudit(G).some((a) => a.type === 'blocked' && a.userId === bob.id), '…et consigné dans le journal');
bob.roles.cache.set(hidden.id, hidden);
ok((await svc.enforceGuild(guild)) === 1 && !bob.roles.cache.has(hidden.id), 'balayage complet : porteur sans session nettoyé');

console.log('\nInvitations et restauration');
const carl = mkMember('carl', [mod.id]);
ok((await svc.elevate(carl, null, now)).kind === 'error', 'sans invitation : impossible de configurer sa propre authentification');
svc.inviteMember(G, carl.id, OWNER);
ok((await svc.elevate(carl, null, now)).kind === 'setup', 'avec invitation : configuration possible');
const dan = mkMember('dan', [mod.id]);
svc.inviteMember(G, dan.id, OWNER);
ok((await svc.elevate(dan, null, Date.now() + 25 * 3_600_000)).kind === 'error', 'invitation expirée après 24 h');
await svc.resetMember(guild, alice.id, OWNER);
ok(!store.getMember(G, alice.id), 'réinitialisation : le membre doit être réinvité');

await svc.restoreRole(guild, mod.id, OWNER);
ok(mod.permissions.bitfield === originalPerms && hidden.deleted === true && store.getConfig(G).roles.length === 0, 'restauration : permissions d’origine rendues, rôle caché supprimé');
ok(reg.isModuleEnabled(G, 'secureroles'), 'module toujours actif (activé explicitement)');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
