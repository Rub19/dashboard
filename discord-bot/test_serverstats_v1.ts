import { serverStatsStorage } from './src/modules/serverStats/storage/serverStatsStorage.js';
import { renderName } from './src/modules/serverStats/services/serverStatsService.js';
import type { StatChannel } from './src/modules/serverStats/types/serverStats.js';

let passed = 0, failed = 0;
const assert = (c: boolean, m: string) => { c ? (console.log(`  ✅ ${m}`), passed++) : (console.error(`  ❌ ${m}`), failed++); };

async function run() {
  console.log('🧪 ETHONE Server Stats Test Suite\n');
  const g = 'g1', c1 = 'c1', c2 = 'c2';

  console.log('🎨 1. renderName:');
  const mk = (tpl: string): StatChannel => ({ guildId: g, channelId: c1, type: 'members', template: tpl, roleId: null, lastValue: null, createdAt: '' });
  assert(renderName(mk('👥 {count} membres'), 1234) === '👥 1234 membres', '{count} substituted');
  assert(renderName(mk('Membres'), 42) === 'Membres 42', 'template without {count} → appended');
  assert(renderName(mk('{count}'.repeat(60)), 5).length <= 100, 'name capped at 100 chars');

  console.log('\n📦 2. Config defaults + validation:');
  const cfg = serverStatsStorage.getConfig(g);
  assert(cfg.enabled === true && cfg.updateIntervalMinutes === 15, 'defaults enabled / 15 min');
  let threw = false;
  try { serverStatsStorage.updateConfig(g, { updateIntervalMinutes: 5 } as never); } catch { threw = true; }
  assert(threw, 'interval < 10 rejected');
  threw = false;
  try { serverStatsStorage.updateConfig(g, { updateIntervalMinutes: 500 } as never); } catch { threw = true; }
  assert(threw, 'interval > 360 rejected');

  console.log('\n📦 3. upsert / get:');
  const s = serverStatsStorage.upsert({ guildId: g, channelId: c1, type: 'members', template: '{count} membres', roleId: null, lastValue: null });
  assert(s.type === 'members' && s.lastValue === null, 'stat channel stored');
  assert(serverStatsStorage.get(g, c1)?.template === '{count} membres', 'get by channelId');
  threw = false;
  try { serverStatsStorage.upsert({ guildId: g, channelId: c2, type: 'nope' as never, template: '{count}', roleId: null, lastValue: null }); } catch { threw = true; }
  assert(threw, 'invalid type rejected by zod');

  console.log('\n📦 4. setLastValue avoids redundant work:');
  serverStatsStorage.setLastValue(g, c1, 100);
  assert(serverStatsStorage.get(g, c1)!.lastValue === 100, 'lastValue persisted');

  console.log('\n📦 5. roleMembers needs a role + limit:');
  serverStatsStorage.upsert({ guildId: g, channelId: c2, type: 'roleMembers', template: '{count}', roleId: 'r1', lastValue: null });
  assert(serverStatsStorage.get(g, c2)?.roleId === 'r1', 'roleId stored');
  assert(serverStatsStorage.getGuild(g).length === 2, '2 stat channels');
  assert(serverStatsStorage.canAddMore(g) === true, 'under the 10 limit');

  console.log('\n📦 6. Overview + isolation:');
  serverStatsStorage.upsert({ guildId: 'other', channelId: c1, type: 'boosts', template: '{count}', roleId: null, lastValue: null });
  const ov = serverStatsStorage.getOverview(g);
  assert(ov.channels.length === 2, `overview.channels = ${ov.channels.length}`);
  assert(serverStatsStorage.getGuild('other').length === 1, 'other guild isolated');

  console.log('\n📦 7. delete:');
  assert(serverStatsStorage.delete(g, c1) === true, 'delete ok');
  assert(serverStatsStorage.delete(g, c1) === false, 'second delete false');
  serverStatsStorage.delete(g, c2); serverStatsStorage.delete('other', c1);
  serverStatsStorage.updateConfig(g, { updateIntervalMinutes: 15, enabled: true });
  assert(serverStatsStorage.getGuild(g).length === 0, 'cleaned up');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
