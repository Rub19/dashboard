/**
 * Giveaway de longue durée : setTimeout plafonne à ~24,8 jours (2^31-1 ms) et déclenche sinon le timer aussitôt.
 * Le test se place dans un dossier temporaire (le stockage écrit dans ./data).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-gw-test-')));
const { giveawayScheduler } = await import('../src/modules/giveaways/services/giveawayScheduler.js');
const { giveawayService } = await import('../src/modules/giveaways/services/giveawayService.js');
const { giveawayStorage } = await import('../src/modules/giveaways/storage/giveawayStorage.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

let draws = 0;
(giveawayService as any).drawWinners = async () => {
  draws++;
  return [];
};

const realSetTimeout = globalThis.setTimeout;
const delays: number[] = [];
(globalThis as any).setTimeout = (fn: any, ms?: number, ...rest: any[]) => {
  delays.push(ms ?? 0);
  return realSetTimeout(fn, ms, ...rest);
};

const in40Days = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString();
const gw = giveawayStorage.create({
  guildId: 'g',
  channelId: 'c',
  prize: 'Test',
  description: '',
  winnerCount: 1,
  rewardRoleId: null,
  bannerUrl: null,
  endsAt: in40Days,
  hostedById: 'h',
  hostedByTag: 'h#0',
  requirements: { requiredRoleIds: [], roleMode: 'any', excludedRoleIds: [], minAccountAgeDays: 0, minLevel: 0 },
  requireClaim: false,
  claimTimeoutHours: 24,
  status: 'active',
} as any);

console.log('\nGiveaway à 40 jours');
giveawayScheduler.schedule(gw, {} as any);
ok(delays.length > 0 && Math.max(...delays) <= 2_147_483_647, `le délai du timer est plafonné (${Math.max(...delays)} ms)`);
await new Promise((r) => realSetTimeout(r, 50));
ok(draws === 0, 'aucun tirage immédiat');
giveawayScheduler.cancel(gw.id);

console.log('\nGiveaway déjà expiré');
const expired = giveawayStorage.create({ ...(gw as any), endsAt: new Date(Date.now() - 1000).toISOString() });
giveawayScheduler.schedule(expired, {} as any);
await new Promise((r) => realSetTimeout(r, 50));
ok(draws === 1, 'un giveaway expiré est tiré aussitôt');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
