import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-cmdrules-'));
process.chdir(tmpDir);

const { checkCommandRule } = await import('../src/services/commandRulesService.js');
const { guildConfigService } = await import('../src/services/guildConfigService.js');

const G = '900000000000000003';
const base = { guildId: G, guildOwnerId: '100000000000000001', commandName: 'ban', userId: '200000000000000002', channelIds: ['300000000000000003'], roleIds: ['400000000000000004'] };
const setRule = (rule: object) => guildConfigService.updateConfig(G, { commandRules: { ban: rule as any } });

assert.equal(checkCommandRule(base), null, 'sans règle : fonctionnement d\'origine');

setRule({ enabled: false });
assert.match(checkCommandRule(base)!, /désactivée/);
assert.equal(checkCommandRule({ ...base, userId: base.guildOwnerId }), null, 'le propriétaire ignore les règles');
setRule({ enabled: false, ownersBypass: false });
assert.match(checkCommandRule({ ...base, userId: base.guildOwnerId })!, /désactivée/, 'sauf si « owners » est coupé');

setRule({ deniedRoles: ['400000000000000004'] });
assert.match(checkCommandRule(base)!, /rôles/);

setRule({ access: 'roles', allowedRoles: ['500000000000000005'] });
assert.match(checkCommandRule(base)!, /réservée/);
assert.equal(checkCommandRule({ ...base, roleIds: ['500000000000000005'] }), null);

setRule({ allowedChannels: ['600000000000000006'] });
assert.match(checkCommandRule(base)!, /<#600000000000000006>/);
assert.equal(checkCommandRule({ ...base, channelIds: ['700000000000000007', '600000000000000006'] }), null, 'fil d\'un salon autorisé');

setRule({ cooldownSeconds: 10 });
assert.equal(checkCommandRule({ ...base, now: 1_000_000 }), null);
assert.match(checkCommandRule({ ...base, now: 1_004_000 })!, /6 s/);
assert.equal(checkCommandRule({ ...base, now: 1_011_000 }), null);

setRule({ maxUses: 2, maxUsesWindowMinutes: 60 });
const u = { ...base, userId: '800000000000000008' };
assert.equal(checkCommandRule({ ...u, now: 0 }), null);
assert.equal(checkCommandRule({ ...u, now: 1000 }), null);
assert.match(checkCommandRule({ ...u, now: 2000 })!, /Limite atteinte/);
assert.equal(checkCommandRule({ ...u, now: 3_600_001 }), null, 'la fenêtre glisse');

console.log('✅ règles de commandes : désactivation, rôles, salons, délai, limite OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
