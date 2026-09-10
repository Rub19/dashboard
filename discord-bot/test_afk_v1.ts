import { afkStorage } from './src/modules/afk/storage/afkStorage.js';

let passed = 0;
let failed = 0;
function assert(c: boolean, m: string) {
  if (c) { console.log(`  ✅ ${m}`); passed++; }
  else { console.error(`  ❌ ${m}`); failed++; }
}

async function run() {
  console.log('🧪 ETHONE AFK Test Suite\n');
  const g = 'g1', u = 'u1', u2 = 'u2';

  console.log('📦 1. Config defaults:');
  const c = afkStorage.getConfig(g);
  assert(c.enabled === true, 'enabled default true');
  assert(c.clearOnMessage === true && c.notifyOnMention === true, 'clearOnMessage + notifyOnMention default true');
  assert(c.prefixNickname === false, 'prefixNickname default false');
  assert(c.autoDeleteSeconds === 10, 'autoDeleteSeconds default 10');

  console.log('\n📦 2. Config update + validation:');
  const c2 = afkStorage.updateConfig(g, { notifyOnMention: false, autoDeleteSeconds: 30 });
  assert(c2.notifyOnMention === false && c2.autoDeleteSeconds === 30, 'patch applied');
  assert(afkStorage.getConfig(g).enabled === true, 'untouched field preserved');
  let threw = false;
  try { afkStorage.updateConfig(g, { autoDeleteSeconds: 999 } as never); } catch { threw = true; }
  assert(threw, 'autoDeleteSeconds > 60 rejected');

  console.log('\n📦 3. Entry set / get / mention bump:');
  afkStorage.set({ guildId: g, userId: u, reason: 'déjeuner', previousNickname: null });
  const e = afkStorage.get(g, u)!;
  assert(e.reason === 'déjeuner' && e.mentionCount === 0, 'entry stored');
  afkStorage.bumpMention(g, u);
  afkStorage.bumpMention(g, u);
  assert(afkStorage.get(g, u)!.mentionCount === 2, 'mentionCount bumped to 2');
  assert(afkStorage.bumpMention(g, 'nobody') === undefined, 'bump on missing entry → undefined');

  console.log('\n📦 4. Clear:');
  const cleared = afkStorage.clear(g, u);
  assert(cleared?.reason === 'déjeuner', 'clear returns the removed entry');
  assert(afkStorage.get(g, u) === undefined, 'entry gone');
  assert(afkStorage.clear(g, u) === undefined, 'second clear → undefined');

  console.log('\n📦 5. Guild isolation + overview:');
  afkStorage.set({ guildId: g, userId: u, reason: 'a', previousNickname: null });
  afkStorage.set({ guildId: g, userId: u2, reason: 'b', previousNickname: null });
  afkStorage.set({ guildId: 'other', userId: u, reason: 'c', previousNickname: null });
  afkStorage.bumpMention(g, u);
  const ov = afkStorage.getOverview(g);
  assert(ov.activeCount === 2, `overview.activeCount = ${ov.activeCount}`);
  assert(ov.totalMentionsWhileAway === 1, `overview.totalMentionsWhileAway = ${ov.totalMentionsWhileAway}`);
  assert(ov.members.every((m) => m.userId === u || m.userId === u2), 'overview only this guild');

  console.log('\n📦 6. Cleanup:');
  afkStorage.clear(g, u);
  afkStorage.clear(g, u2);
  afkStorage.clear('other', u);
  afkStorage.updateConfig(g, { notifyOnMention: true, autoDeleteSeconds: 10 });
  assert(afkStorage.getGuildEntries(g).length === 0, 'all cleared');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
