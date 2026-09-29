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

// Bannissement de l'owner : le bot ne doit plus se débannir lui-même — juste signaler + attendre le bouton.
let bansRemoveCalled = false;
let banDmPayload: unknown = null;
const banGuild = {
  id: 'guild_ban',
  name: 'Serveur ban',
  members: { me: { id: 'bot_1', user: { tag: 'Bot#0001' }, permissions: botPermissions } },
  bans: { remove: async () => { bansRemoveCalled = true; } },
  fetchOwner: async () => ({ id: 'real_guild_owner', send: async () => null }),
} as any;
const banOwnerUser = { id: OWNER_ID, tag: 'Owner#0001', send: async (payload: unknown) => { banDmPayload = payload; } } as any;

await ownerShieldService.handleGuildBanAdd({ guild: banGuild, user: banOwnerUser } as any);

assert.equal(bansRemoveCalled, false, 'le bot ne doit PAS avoir rappelé guild.bans.remove() tout seul');
assert.ok(banDmPayload, 'le bot doit quand même avoir envoyé un MP de signalement pour le bannissement');
console.log('  ✅ bannissement de l’owner : aucun débannissement automatique, juste un signalement MP');

// Mute/assourdissement vocal de l'owner : le bot ne doit plus se démuter/dé-sourdir lui-même.
let setMuteCalled = false;
let setDeafCalled = false;
let voiceDmPayload: unknown = null;
const voiceGuild = {
  id: 'guild_voice',
  name: 'Serveur vocal',
  members: { me: { roles: { highest: { position: 10 } }, permissions: botPermissions } },
  fetchOwner: async () => ({ id: 'real_guild_owner', send: async () => null }),
} as any;
const voiceMember = { id: OWNER_ID, guild: voiceGuild, send: async (payload: unknown) => { voiceDmPayload = payload; } } as any;
const oldVoiceState = { channelId: null, channel: null, guild: voiceGuild, member: voiceMember } as any;
const newVoiceState = {
  channelId: 'vc_1',
  channel: { name: 'Vocal 1' },
  guild: voiceGuild,
  member: voiceMember,
  serverMute: true,
  serverDeaf: true,
  setMute: async () => { setMuteCalled = true; },
  setDeaf: async () => { setDeafCalled = true; },
} as any;

await ownerShieldService.handleVoiceStateUpdate(oldVoiceState, newVoiceState);

assert.equal(setMuteCalled, false, 'le bot ne doit PAS avoir rappelé setMute(false) tout seul');
assert.equal(setDeafCalled, false, 'le bot ne doit PAS avoir rappelé setDeaf(false) tout seul');
assert.ok(voiceDmPayload, 'le bot doit quand même avoir envoyé un MP de signalement pour la sourdine vocale');
console.log('  ✅ mise en sourdine vocale de l’owner : aucun démutage/dé-sourding automatique, juste un signalement MP');

console.log('\nTout est bon');
