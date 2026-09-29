/**
 * Owner Shield : sur demande explicite du propriétaire, le bot ne doit plus restaurer les rôles retirés
 * de lui-même — il doit seulement le signaler (MP + bouton "Rétablir Tout") et attendre une confirmation.
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 BOT_OWNER_ID=owner_1 npx tsx tests/test_owner_shield_ask_first_v1.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.BOT_OWNER_ID ||= 'owner_1';
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'owner-shield-')));
process.on('unhandledRejection', () => undefined);

const { PermissionFlagsBits } = await import('discord.js');
const { ownerShieldService } = await import('../src/modules/security/services/ownerShieldService.js');

ownerShieldService.enableAll(); // enabled + autoRestoreRoles: true

const OWNER_ID = process.env.BOT_OWNER_ID!;
const GUILD_ID = 'guild_1';

// Permissions du bot : tout accordé sauf « Voir le journal d'audit » (fait sortir
// findModeratorFromAuditLogs en avance, sans avoir à simuler fetchAuditLogs).
const botPermissions = { has: (flag: bigint) => flag !== PermissionFlagsBits.ViewAuditLog };

const roleAdmin = { id: 'role_admin', name: 'Admin', position: 5, managed: false };

// Mini-Collection : juste les méthodes que handleGuildMemberUpdate appelle réellement sur roles.cache
// (une vraie discord.js Collection en a bien plus, mais .filter()/.map()/.has()/.size suffisent ici).
class RoleCache {
  constructor(private roles: (typeof roleAdmin)[]) {}
  get size() { return this.roles.length; }
  has(id: string) { return this.roles.some((r) => r.id === id); }
  filter(fn: (r: typeof roleAdmin) => boolean) { return new RoleCache(this.roles.filter(fn)); }
  map<T>(fn: (r: typeof roleAdmin) => T) { return this.roles.map(fn); }
}
function rolesCache(roles: (typeof roleAdmin)[]) { return new RoleCache(roles); }

let addedRoles: unknown = null;
let sentPayload: unknown = null;

const guild = {
  id: GUILD_ID,
  name: 'Serveur de test',
  members: { me: { roles: { highest: { position: 10 } }, permissions: botPermissions } },
  fetchOwner: async () => ({ id: 'real_guild_owner', send: async () => null }),
} as any;

const oldMember = { id: OWNER_ID, guild, roles: { cache: rolesCache([roleAdmin]) } } as any;
const newMember = {
  id: OWNER_ID,
  guild,
  roles: {
    cache: rolesCache([]),
    add: async (roles: unknown) => { addedRoles = roles; },
  },
  send: async (payload: unknown) => { sentPayload = payload; },
} as any;

await ownerShieldService.handleGuildMemberUpdate(oldMember, newMember);

assert.equal(addedRoles, null, 'le bot ne doit PAS avoir rappelé roles.add() tout seul');
assert.ok(sentPayload, "le bot doit quand même avoir envoyé un MP de signalement");
console.log('  ✅ rôle retiré de l’owner : aucune restauration automatique, juste un signalement MP');

console.log('\nTout est bon');
