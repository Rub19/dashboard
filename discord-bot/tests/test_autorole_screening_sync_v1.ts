/**
 * Auto-Role : "attendre le filtrage des règles" (ne pas attribuer un membre encore `pending`, reprendre au
 * moment où guildMemberUpdate le voit passer à false) et "Sync now" (rattrape les membres existants qui
 * n'ont pas le rôle).
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_autorole_screening_sync_v1.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'autorole-')));
process.on('unhandledRejection', () => undefined);

const { PermissionFlagsBits } = await import('discord.js');
const { autoRoleService } = await import('../src/modules/roles/services/autoRoleService.js');

const GUILD_ID = 'guild_1';
const ROLE_ID = 'role_member';

const botPermissions = { has: () => true };
const role = { id: ROLE_ID, name: 'Membre', managed: false, position: 1 };

class RoleCache {
  constructor(private roles: (typeof role)[]) {}
  get size() { return this.roles.length; }
  has(id: string) { return this.roles.some((r) => r.id === id); }
  values() { return this.roles.values(); }
}

function makeMember(id: string, { pending = false, bot = false, hasRole = false } = {}) {
  const added: unknown[] = [];
  return {
    id,
    user: { bot, tag: `${id}#0000` },
    guild,
    pending,
    roles: {
      cache: new RoleCache(hasRole ? [role] : []),
      add: async (r: unknown) => { added.push(r); },
    },
    _added: added,
  } as any;
}

const guild = {
  id: GUILD_ID,
  name: 'Serveur de test',
  members: {
    me: { permissions: botPermissions, roles: { highest: { position: 10 } } },
    fetch: async () => new Map(),
  },
  roles: { cache: new Map([[ROLE_ID, role]]) },
} as any;

autoRoleService.updateConfig(GUILD_ID, {
  enabled: true,
  roleIds: [ROLE_ID],
  applyToHumans: true,
  applyToBots: false,
  waitForScreening: true,
});

// 1. Membre encore en filtrage des règles : pas d'attribution tout de suite.
const pendingMember = makeMember('u_pending', { pending: true });
await autoRoleService.assignOnJoin(pendingMember);
assert.equal(pendingMember._added.length, 0, "pending: true -> aucun rôle attribué à l'arrivée");
console.log('  ✅ membre en filtrage des règles : rôle non attribué tout de suite');

// 2. Le filtrage passe (pending: true -> false) : le rôle est attribué.
pendingMember.pending = false;
await autoRoleService.handleScreeningPassed(pendingMember);
assert.equal(pendingMember._added.length, 1, 'filtrage validé -> rôle attribué');
console.log('  ✅ filtrage des règles validé : rôle attribué automatiquement');

// 3. Sync now : rattrape un membre déjà présent qui n'a pas le rôle, laisse ceux qui l'ont déjà.
const memberMissing = makeMember('u_missing', { hasRole: false });
const memberHasIt = makeMember('u_has_it', { hasRole: true });
guild.members.fetch = async () => new Map([[memberMissing.id, memberMissing], [memberHasIt.id, memberHasIt]]);

const result = await autoRoleService.syncGuild(guild);
assert.equal(result.updated, 1, 'sync : un seul membre mis à jour (celui qui manquait le rôle)');
assert.equal(memberMissing._added.length, 1, 'le membre sans le rôle le reçoit via sync');
assert.equal(memberHasIt._added.length, 0, "le membre qui l'avait déjà n'est pas retouché");
console.log('  ✅ synchronisation manuelle : rattrape uniquement les membres qui manquent le rôle');

console.log('\nTout est bon');
