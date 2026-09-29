/**
 * Auto-Role : rôles séparés pour les bots, exclusion de rôles de la synchro, et rôles supplémentaires par
 * utilisateur (avec retrait de la liste après attribution).
 *
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_autorole_bot_roles_overrides_v1.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'autorole-2-')));
process.on('unhandledRejection', () => undefined);

const { autoRoleService } = await import('../src/modules/roles/services/autoRoleService.js');

const GUILD_ID = 'guild_1';
const HUMAN_ROLE_ID = 'role_member';
const BOT_ROLE_ID = 'role_bot';
const VIP_ROLE_ID = 'role_vip';

const botPermissions = { has: () => true };
const roles = {
  [HUMAN_ROLE_ID]: { id: HUMAN_ROLE_ID, name: 'Membre', managed: false, position: 1 },
  [BOT_ROLE_ID]: { id: BOT_ROLE_ID, name: 'Bot', managed: false, position: 1 },
  [VIP_ROLE_ID]: { id: VIP_ROLE_ID, name: 'VIP', managed: false, position: 1 },
};

class RoleCache {
  constructor(private ids: string[]) {}
  get size() { return this.ids.length; }
  has(id: string) { return this.ids.includes(id); }
  filter(fn: (r: any) => boolean) { return new RoleCache(this.ids.filter((id) => fn(roles[id]))); }
  map<T>(fn: (r: any) => T) { return this.ids.map((id) => fn(roles[id])); }
}

function makeMember(id: string, { bot = false, roleIds = [] as string[] } = {}) {
  const added: string[] = [];
  return {
    id,
    user: { bot, tag: `${id}#0000` },
    guild,
    pending: false,
    roles: { cache: new RoleCache(roleIds), add: async (r: any) => { added.push(...(Array.isArray(r) ? r : [r]).map((x) => (typeof x === 'string' ? x : x.id))); } },
    _added: added,
  } as any;
}

const guild = {
  id: GUILD_ID,
  name: 'Serveur de test',
  members: { me: { permissions: botPermissions, roles: { highest: { position: 10 } } }, fetch: async () => new Map() },
  roles: { cache: new Map(Object.entries(roles)) },
} as any;

// 1. Rôles séparés pour les bots : un membre humain reçoit HUMAN_ROLE_ID, un bot reçoit BOT_ROLE_ID (pas le même).
autoRoleService.updateConfig(GUILD_ID, {
  enabled: true,
  roleIds: [HUMAN_ROLE_ID],
  applyToHumans: true,
  applyToBots: true,
  useSeparateBotRoles: true,
  botRoleIds: [BOT_ROLE_ID],
});

const human = makeMember('u_human');
await autoRoleService.assignOnJoin(human);
assert.deepEqual(human._added, [HUMAN_ROLE_ID], "un humain reçoit roleIds, pas botRoleIds");

const bot = makeMember('u_bot', { bot: true });
await autoRoleService.assignOnJoin(bot);
assert.deepEqual(bot._added, [BOT_ROLE_ID], "un bot reçoit botRoleIds séparément, pas roleIds");
console.log('  ✅ rôles séparés pour les bots : chacun reçoit le bon rôle');

// 2. Exclude from sync : VIP_ROLE_ID est dans roleIds mais exclu de la synchro -> jamais ajouté par sync.
autoRoleService.updateConfig(GUILD_ID, {
  roleIds: [HUMAN_ROLE_ID, VIP_ROLE_ID],
  useSeparateBotRoles: false,
  applyToBots: false,
  excludeFromSyncRoleIds: [VIP_ROLE_ID],
});
const existingMember = makeMember('u_existing');
guild.members.fetch = async () => new Map([[existingMember.id, existingMember]]);
const syncResult = await autoRoleService.syncGuild(guild);
assert.equal(syncResult.updated, 1, 'le membre existant est mis à jour');
assert.deepEqual(existingMember._added, [HUMAN_ROLE_ID], 'VIP_ROLE_ID exclu de la synchro : seul HUMAN_ROLE_ID est ajouté');
console.log('  ✅ un rôle exclu de la synchro (excludeFromSyncRoleIds) n’est jamais rattrapé par "Sync now"');

// 3. Override par utilisateur + retrait de la liste après attribution.
autoRoleService.updateConfig(GUILD_ID, {
  roleIds: [],
  excludeFromSyncRoleIds: [],
  userOverrides: [{ userId: 'u_special', roleIds: [VIP_ROLE_ID] }],
  removeUserFromListAfterAssignment: true,
});
const special = makeMember('u_special');
await autoRoleService.assignOnJoin(special);
assert.deepEqual(special._added, [VIP_ROLE_ID], "l'override personnel attribue bien son rôle supplémentaire");
assert.equal(autoRoleService.getConfig(GUILD_ID).userOverrides.length, 0, 'retiré de la liste après attribution (removeUserFromListAfterAssignment)');
console.log('  ✅ override par utilisateur appliqué puis retiré automatiquement de la liste');

console.log('\nTout est bon');
