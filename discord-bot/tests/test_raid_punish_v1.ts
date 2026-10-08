import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'etho-raidpunish-'));
process.chdir(tmpDir);

const { raidDetectionService } = await import('../src/modules/antiRaid/services/raidDetectionService.js');
const punish = (raidDetectionService as any).punishMessageAuthor.bind(raidDetectionService);

const make = () => {
  const done: string[] = [];
  const message: any = {
    deletable: true,
    delete: async () => done.push('delete'),
    member: {
      bannable: true,
      kickable: true,
      moderatable: true,
      ban: async () => done.push('ban'),
      kick: async () => done.push('kick'),
      timeout: async (ms: number) => done.push(`timeout:${ms}`),
    },
  };
  return { message, done };
};

let t = make();
assert.deepEqual(await punish(t.message, ['DELETE', 'TIMEOUT', 'ALERT_STAFF'], 600_000, 'r'), ['DELETE', 'TIMEOUT', 'ALERT_STAFF']);
assert.deepEqual(t.done, ['delete', 'timeout:600000'], 'comportement par défaut inchangé');

t = make();
assert.deepEqual(await punish(t.message, ['DELETE', 'KICK', 'TIMEOUT'], 1, 'r'), ['DELETE', 'KICK', 'ALERT_STAFF']);
assert.deepEqual(t.done, ['delete', 'kick'], 'une seule sanction : la plus forte');

t = make();
assert.deepEqual(await punish(t.message, ['ALERT_STAFF'], 1, 'r'), ['ALERT_STAFF']);
assert.deepEqual(t.done, [], 'alerte seulement : rien sur le membre ni le message');

t = make();
t.message.member.bannable = false;
assert.deepEqual(await punish(t.message, ['BAN'], 1, 'r'), ['ALERT_STAFF'], 'pas de repli silencieux si le ban est impossible');

console.log('✅ anti-raid : sanctions spam/mentions réglables OK');
process.chdir(os.tmpdir());
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
