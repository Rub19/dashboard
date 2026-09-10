import { birthdayStorage, daysUntil } from './src/modules/birthdays/storage/birthdayStorage.js';

let passed = 0;
let failed = 0;
function assert(c: boolean, m: string) {
  if (c) { console.log(`  ✅ ${m}`); passed++; }
  else { console.error(`  ❌ ${m}`); failed++; }
}

async function run() {
  console.log('🧪 ETHONE Birthdays Test Suite\n');
  const g = 'g1', u = 'u1', u2 = 'u2';
  const now = new Date();
  const today = { day: now.getDate(), month: now.getMonth() + 1 };

  console.log('📆 1. daysUntil:');
  assert(daysUntil(today.day, today.month, now) === 0, 'today → 0 days');
  const tomorrow = new Date(now.getTime() + 86_400_000);
  assert(daysUntil(tomorrow.getDate(), tomorrow.getMonth() + 1, now) === 1, 'tomorrow → 1 day');

  console.log('\n📦 2. Config defaults + validation:');
  const c = birthdayStorage.getConfig(g);
  assert(c.enabled === false, 'disabled by default');
  assert(c.announceHour === 9, 'announceHour default 9');
  assert(c.message.includes('{user}'), 'message has {user} placeholder');
  let threw = false;
  try { birthdayStorage.updateConfig(g, { announceHour: 25 } as never); } catch { threw = true; }
  assert(threw, 'announceHour > 23 rejected');

  console.log('\n📦 3. Entry set / validation:');
  birthdayStorage.set({ guildId: g, userId: u, day: 14, month: 7, year: 2000 });
  const e = birthdayStorage.get(g, u)!;
  assert(e.day === 14 && e.month === 7 && e.year === 2000, 'entry stored');
  threw = false;
  try { birthdayStorage.set({ guildId: g, userId: u, day: 32, month: 1, year: null } as never); } catch { threw = true; }
  assert(threw, 'day 32 rejected by zod');
  threw = false;
  try { birthdayStorage.set({ guildId: g, userId: u, day: 1, month: 13, year: null } as never); } catch { threw = true; }
  assert(threw, 'month 13 rejected by zod');

  console.log('\n📦 4. getTodays:');
  birthdayStorage.set({ guildId: g, userId: u2, day: today.day, month: today.month, year: 1990 });
  const todays = birthdayStorage.getTodays(g, now);
  assert(todays.some((t) => t.userId === u2), "today's birthday found");
  assert(!todays.some((t) => t.userId === u), 'non-today excluded');

  console.log('\n📦 5. Overview:');
  const ov = birthdayStorage.getOverview(g, now);
  assert(ov.total === 2, `overview.total = ${ov.total}`);
  assert(ov.today.length === 1, `overview.today = ${ov.today.length}`);
  assert(ov.today[0].age === now.getFullYear() - 1990, `age computed = ${ov.today[0].age}`);
  assert(Array.isArray(ov.upcoming), 'upcoming is an array');

  console.log('\n📦 6. Guild isolation:');
  birthdayStorage.set({ guildId: 'other', userId: u, day: 1, month: 1, year: null });
  assert(birthdayStorage.getGuildEntries(g).length === 2, 'guild g has 2');
  assert(birthdayStorage.getGuildEntries('other').length === 1, 'other guild isolated');

  console.log('\n📦 7. Cleanup:');
  assert(birthdayStorage.delete(g, u) === true, 'delete returns true');
  assert(birthdayStorage.delete(g, u) === false, 'second delete false');
  birthdayStorage.delete(g, u2);
  birthdayStorage.delete('other', u);
  birthdayStorage.updateConfig(g, { announceHour: 9, enabled: false });
  assert(birthdayStorage.getGuildEntries(g).length === 0, 'all cleared');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
