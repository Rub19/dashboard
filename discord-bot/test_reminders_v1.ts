import { reminderStorage } from './src/modules/reminders/storage/reminderStorage.js';
import { parseDuration } from './src/modules/reminders/services/reminderService.js';

let passed = 0;
let failed = 0;
function assert(c: boolean, m: string) {
  if (c) { console.log(`  ✅ ${m}`); passed++; }
  else { console.error(`  ❌ ${m}`); failed++; }
}

async function run() {
  console.log('🧪 ETHONE Reminders Test Suite\n');

  console.log('⏱️  1. parseDuration:');
  assert(parseDuration('10m') === 600_000, '10m → 600000ms');
  assert(parseDuration('2h') === 7_200_000, '2h → 7200000ms');
  assert(parseDuration('1d') === 86_400_000, '1d → 1 day');
  assert(parseDuration('3j') === 3 * 86_400_000, '3j (French) → 3 days');
  assert(parseDuration('1w') === 604_800_000, '1w → 1 week');
  assert(parseDuration('1h30m') === 5_400_000, '1h30m → 5400000ms (combined)');
  assert(parseDuration('') === null, 'empty → null');
  assert(parseDuration('soon') === null, 'garbage → null');
  assert(parseDuration('0m') === null, 'zero → null');
  assert(parseDuration('400d') === null, '> 1 year → null');

  console.log('\n📦 2. Storage CRUD:');
  const g = '111', c = '222', u = '333';
  const r1 = reminderStorage.create({ guildId: g, channelId: c, userId: u, message: 'boire de l eau', remindAt: new Date(Date.now() + 60_000).toISOString(), recurrence: 'none' });
  assert(!!r1.id && r1.id.startsWith('rem_'), 'create returns id');
  assert(r1.delivered === false && r1.deliveredCount === 0, 'defaults');
  assert(reminderStorage.get(r1.id)?.message === 'boire de l eau', 'get by id');

  console.log('\n📦 3. Due detection:');
  const past = reminderStorage.create({ guildId: g, channelId: c, userId: u, message: 'passé', remindAt: new Date(Date.now() - 1000).toISOString() });
  const future = reminderStorage.create({ guildId: g, channelId: c, userId: u, message: 'futur', remindAt: new Date(Date.now() + 3_600_000).toISOString() });
  const due = reminderStorage.getDue();
  assert(due.some((r) => r.id === past.id), 'past reminder is due');
  assert(!due.some((r) => r.id === future.id), 'future reminder is not due');

  console.log('\n📦 4. listForUser filters delivered + other users:');
  reminderStorage.update(past.id, { delivered: true, deliveredCount: 1 });
  const mine = reminderStorage.listForUser(g, u);
  assert(!mine.some((r) => r.id === past.id), 'delivered excluded from listForUser');
  assert(mine.some((r) => r.id === r1.id && r.id === r1.id), 'pending included');
  const other = reminderStorage.listForUser(g, '999');
  assert(other.length === 0, 'other user sees nothing');

  console.log('\n📦 5. Overview:');
  const rec = reminderStorage.create({ guildId: g, channelId: c, userId: u, message: 'daily', remindAt: new Date(Date.now() + 120_000).toISOString(), recurrence: 'daily' });
  const ov = reminderStorage.getOverview(g);
  assert(ov.recurring === 1, `overview.recurring = ${ov.recurring}`);
  assert(ov.pending >= 2, `overview.pending = ${ov.pending}`);
  assert(ov.nextDueAt !== null, 'nextDueAt set');

  console.log('\n📦 6. Validation:');
  let threw = false;
  try { reminderStorage.create({ guildId: g, channelId: c, userId: u, message: '', remindAt: new Date().toISOString() }); } catch { threw = true; }
  assert(threw, 'empty message rejected by zod');

  console.log('\n📦 7. Cleanup:');
  [r1.id, past.id, future.id, rec.id].forEach((id) => reminderStorage.delete(id));
  assert(reminderStorage.getGuild(g).length === 0, 'all test reminders removed');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
