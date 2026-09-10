import { stickyStorage } from './src/modules/stickyMessages/storage/stickyStorage.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 ETHONE Sticky Messages Test Suite\n');
  const guildA = '111111111111111111';
  const guildB = '222222222222222222';
  const chan1 = '333333333333333333';
  const chan2 = '444444444444444444';

  console.log('📦 1. Upsert & defaults:');
  const created = stickyStorage.upsert({ guildId: guildA, channelId: chan1, content: 'Lis les règles !' });
  assert(created.content === 'Lis les règles !', 'content stored');
  assert(created.asEmbed === true, 'asEmbed defaults to true');
  assert(created.enabled === true, 'enabled defaults to true');
  assert(created.cooldownSeconds === 6, 'cooldownSeconds defaults to 6');
  assert(created.repostCount === 0, 'repostCount starts at 0');
  assert(created.lastMessageId === null, 'lastMessageId starts null');

  console.log('\n📦 2. Partial update keeps other fields:');
  const updated = stickyStorage.upsert({ guildId: guildA, channelId: chan1, enabled: false });
  assert(updated.enabled === false, 'enabled toggled off');
  assert(updated.content === 'Lis les règles !', 'content preserved through partial update');
  assert(updated.createdAt === created.createdAt, 'createdAt preserved');
  assert(updated.updatedAt !== created.updatedAt, 'updatedAt bumped');

  console.log('\n📦 3. repostCount increment (simulated repost):');
  const bumped = stickyStorage.upsert({ guildId: guildA, channelId: chan1, lastMessageId: '555', repostCount: updated.repostCount + 1 });
  assert(bumped.repostCount === 1, 'repostCount incremented');
  assert(bumped.lastMessageId === '555', 'lastMessageId set');

  console.log('\n📦 4. Multi-guild / multi-channel isolation:');
  stickyStorage.upsert({ guildId: guildA, channelId: chan2, content: 'Format candidature' });
  stickyStorage.upsert({ guildId: guildB, channelId: chan1, content: 'Autre serveur' });
  assert(stickyStorage.getGuild(guildA).length === 2, 'guild A has 2 stickies');
  assert(stickyStorage.getGuild(guildB).length === 1, 'guild B isolated (1 sticky)');
  assert(stickyStorage.get(guildB, chan1)?.content === 'Autre serveur', 'guild B chan1 is its own record');

  console.log('\n📦 5. Overview:');
  const ov = stickyStorage.getOverview(guildA);
  assert(ov.total === 2, `overview.total = ${ov.total}`);
  assert(ov.active === 1, `overview.active = ${ov.active} (one paused)`);
  assert(ov.paused === 1, `overview.paused = ${ov.paused}`);
  assert(ov.totalReposts === 1, `overview.totalReposts = ${ov.totalReposts}`);
  assert(ov.channels.every((c) => c.preview.length <= 121), 'previews are truncated');

  console.log('\n📦 6. Validation rejects bad input:');
  let threw = false;
  try {
    stickyStorage.upsert({ guildId: guildA, channelId: chan1, color: 'not-a-hex' as never });
  } catch {
    threw = true;
  }
  assert(threw, 'invalid color hex rejected by zod');

  threw = false;
  try {
    stickyStorage.upsert({ guildId: guildA, channelId: chan1, cooldownSeconds: 999 as never });
  } catch {
    threw = true;
  }
  assert(threw, 'cooldownSeconds > 120 rejected');

  console.log('\n📦 7. Delete:');
  assert(stickyStorage.delete(guildA, chan1) === true, 'delete returns true');
  assert(stickyStorage.get(guildA, chan1) === undefined, 'record gone');
  assert(stickyStorage.delete(guildA, chan1) === false, 'second delete returns false');

  // cleanup
  stickyStorage.delete(guildA, chan2);
  stickyStorage.delete(guildB, chan1);

  console.log(`\n${'='.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('='.repeat(40));
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
