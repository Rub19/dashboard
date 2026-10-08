import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { PermissionFlagsBits } from 'discord.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-blacklist-'));
process.chdir(tmpDir);

const { addToBlacklist, removeFromBlacklist, isBlacklisted, enforceBlacklistOnJoin } = await import('../src/services/blacklistService.js');

const bans = new Set<string>();
const guild: any = {
  id: '900000000000000002',
  name: 'Serveur test',
  members: {
    me: { permissions: { has: (f: bigint) => f === PermissionFlagsBits.BanMembers } },
    ban: async (id: string) => {
      bans.add(id);
    },
  },
  bans: { fetch: async (id: string) => (bans.has(id) ? { user: { id } } : null) },
  channels: { cache: new Map() },
};

const r = await addToBlacklist(guild, '111111111111111111', 'spam', '222222222222222222');
assert.equal(r.banned, true, 'ban immédiat à l\'ajout');
assert.ok(bans.has('111111111111111111'));
assert.ok(isBlacklisted(guild.id, '111111111111111111'), 'présent dans la blacklist');

// Débanni puis de retour : banni à nouveau.
bans.clear();
await enforceBlacklistOnJoin({ id: '111111111111111111', guild } as any);
assert.ok(bans.has('111111111111111111'), 'banni à son retour');

// Un membre non blacklisté n'est pas touché.
await enforceBlacklistOnJoin({ id: '333333333333333333', guild } as any);
assert.ok(!bans.has('333333333333333333'));

removeFromBlacklist(guild.id, '111111111111111111');
assert.equal(isBlacklisted(guild.id, '111111111111111111'), undefined, 'retiré');

// Sans la permission « Bannir », l'ajout est enregistré mais signalé.
guild.members.me.permissions.has = () => false;
const r2 = await addToBlacklist(guild, '444444444444444444', '', null);
assert.equal(r2.banned, false);
assert.ok(isBlacklisted(guild.id, '444444444444444444'));

console.log('✅ blacklist : ban à l\'ajout, au retour, retrait OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
