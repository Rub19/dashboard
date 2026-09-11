import { highlightStorage, MAX_KEYWORDS_PER_USER } from './src/modules/highlights/storage/highlightStorage.js';
import { matchesKeyword, boldKeyword } from './src/modules/highlights/services/matching.js';
import { highlightService } from './src/modules/highlights/services/highlightService.js';
import { HIGHLIGHT_KEYWORD_MAX_LENGTH, HIGHLIGHT_KEYWORD_MIN_LENGTH } from './src/modules/highlights/types/highlight.js';

let passed = 0;
let failed = 0;
function assert(c: boolean, m: string) {
  if (c) { console.log(`  ✅ ${m}`); passed++; }
  else { console.error(`  ❌ ${m}`); failed++; }
}

function fakeMessage(opts: {
  guildId: string;
  authorId: string;
  authorBot?: boolean;
  content: string;
  channelId?: string;
}): any {
  return {
    guild: { id: opts.guildId, name: 'Test Guild' },
    guildId: opts.guildId,
    channelId: opts.channelId ?? 'chan-1',
    content: opts.content,
    createdAt: new Date(),
    url: 'https://discord.com/channels/x/y/z',
    author: {
      id: opts.authorId,
      bot: opts.authorBot ?? false,
      tag: `user#${opts.authorId}`,
      displayAvatarURL: () => 'https://example.com/avatar.png',
    },
    client: {
      users: {
        fetch: async (id: string) => ({
          id,
          send: async (_payload: unknown) => {
            (globalThis as any).__dmLog = (globalThis as any).__dmLog || [];
            (globalThis as any).__dmLog.push(id);
            return {};
          },
        }),
      },
    },
  };
}

async function run() {
  console.log('🧪 ETHONE Highlights Test Suite\n');
  const g = 'g1';
  const g2 = 'g2';
  const u1 = 'u1';
  const u2 = 'u2';

  console.log('📦 1. Keyword add / remove / list:');
  const k1 = highlightStorage.add({ guildId: g, userId: u1, keyword: 'ethone' });
  assert(k1.keyword === 'ethone', 'keyword stored');
  assert(highlightStorage.has(g, u1, 'ethone'), 'has() finds it');
  assert(highlightStorage.has(g, u1, 'ETHONE'), 'has() is case-insensitive on lookup key');
  const list1 = highlightStorage.listForUser(g, u1);
  assert(list1.length === 1, 'listForUser returns 1');
  assert(highlightStorage.remove(g, u1, 'ethone') === true, 'remove returns true');
  assert(highlightStorage.remove(g, u1, 'ethone') === false, 'second remove returns false');
  assert(highlightStorage.listForUser(g, u1).length === 0, 'list empty after remove');

  console.log('\n📦 2. Keyword length validation (zod):');
  let threw = false;
  try { highlightStorage.add({ guildId: g, userId: u1, keyword: 'a' }); } catch { threw = true; }
  assert(threw, `keyword shorter than ${HIGHLIGHT_KEYWORD_MIN_LENGTH} rejected`);
  threw = false;
  try { highlightStorage.add({ guildId: g, userId: u1, keyword: '' }); } catch { threw = true; }
  assert(threw, 'empty keyword rejected');
  threw = false;
  try { highlightStorage.add({ guildId: g, userId: u1, keyword: '   ' }); } catch { threw = true; }
  assert(threw, 'whitespace-only keyword rejected');
  threw = false;
  try { highlightStorage.add({ guildId: g, userId: u1, keyword: 'x'.repeat(HIGHLIGHT_KEYWORD_MAX_LENGTH + 1) }); } catch { threw = true; }
  assert(threw, `keyword longer than ${HIGHLIGHT_KEYWORD_MAX_LENGTH} rejected`);

  console.log('\n📦 3. Max keywords per user:');
  for (let i = 0; i < MAX_KEYWORDS_PER_USER; i++) {
    highlightStorage.add({ guildId: g, userId: u1, keyword: `kw${i}` });
  }
  assert(highlightStorage.listForUser(g, u1).length === MAX_KEYWORDS_PER_USER, `exactly ${MAX_KEYWORDS_PER_USER} stored`);
  assert(highlightStorage.canAddMore(g, u1) === false, 'canAddMore is false at the cap');
  for (let i = 0; i < MAX_KEYWORDS_PER_USER; i++) highlightStorage.remove(g, u1, `kw${i}`);
  assert(highlightStorage.canAddMore(g, u1) === true, 'canAddMore true again after cleanup');

  console.log('\n📦 4. Config toggle + ignored channels:');
  const defaultConf = highlightStorage.getConfig(g, u1);
  assert(defaultConf.enabled === true, 'enabled by default');
  assert(defaultConf.ignoredChannelIds.length === 0, 'no ignored channels by default');
  highlightStorage.updateConfig(g, u1, { enabled: false });
  assert(highlightStorage.getConfig(g, u1).enabled === false, 'toggle off persists');
  highlightStorage.updateConfig(g, u1, { enabled: true, ignoredChannelIds: ['chan-a'] });
  let conf = highlightStorage.getConfig(g, u1);
  assert(conf.enabled === true, 'toggle back on');
  assert(conf.ignoredChannelIds.includes('chan-a'), 'channel added to ignore list');
  highlightStorage.updateConfig(g, u1, { ignoredChannelIds: conf.ignoredChannelIds.filter((id) => id !== 'chan-a') });
  assert(highlightStorage.getConfig(g, u1).ignoredChannelIds.length === 0, 'channel removed from ignore list');

  console.log('\n📦 5. Guild isolation:');
  highlightStorage.add({ guildId: g, userId: u1, keyword: 'onlyg1' });
  highlightStorage.add({ guildId: g2, userId: u1, keyword: 'onlyg2' });
  assert(highlightStorage.listForUser(g, u1).some((k) => k.keyword === 'onlyg1'), 'guild g has its keyword');
  assert(!highlightStorage.listForUser(g, u1).some((k) => k.keyword === 'onlyg2'), 'guild g does not see guild g2 keyword');
  assert(highlightStorage.listForUser(g2, u1).length === 1, 'guild g2 isolated with its own keyword');
  assert(highlightStorage.getOverview(g).totalKeywords >= 1, 'overview counts only current guild keywords');
  highlightStorage.remove(g, u1, 'onlyg1');
  highlightStorage.remove(g2, u1, 'onlyg2');

  console.log('\n📦 6. matchesKeyword — pure matching logic:');
  assert(matchesKeyword('Hello ETHONE world', 'ethone') === true, 'case-insensitive match');
  assert(matchesKeyword('this is ethoneX not it', 'ethone') === false, 'word-boundary rejects substring-of-word') ;
  assert(matchesKeyword('say ethone!', 'ethone') === true, 'word boundary works with punctuation');
  assert(matchesKeyword('nothing relevant here', 'ethone') === false, 'no match returns false');
  assert(matchesKeyword('multi word phrase here', 'word phrase') === true, 'multi-word phrase matches');
  assert(boldKeyword('say Ethone now', 'ethone').includes('**Ethone**'), 'boldKeyword wraps matched segment preserving case');

  console.log('\n📦 7. handleMessage — guild-only, ignores bots and self:');
  (globalThis as any).__dmLog = [];
  highlightService._resetCooldownCacheForTests();
  highlightStorage.add({ guildId: g, userId: u2, keyword: 'anthropic' });

  // DM guild-less message: must be ignored entirely (no throw, no DM).
  const dmMessage = fakeMessage({ guildId: '', authorId: u1, content: 'anthropic is cool' });
  dmMessage.guild = null;
  dmMessage.guildId = null;
  await highlightService.handleMessage(dmMessage);
  assert((globalThis as any).__dmLog.length === 0, 'DM-context message (no guild) triggers no highlight');

  // Bot author: ignored.
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: 'bot-1', authorBot: true, content: 'anthropic ships' }));
  assert((globalThis as any).__dmLog.length === 0, 'bot author message triggers no highlight');

  // Watcher's own message mentioning their own keyword: ignored.
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: u2, content: 'anthropic is my own keyword' }));
  assert((globalThis as any).__dmLog.length === 0, "watcher's own message triggers no highlight");

  // Someone else mentions it: DM sent.
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: u1, content: 'I love anthropic models' }));
  assert((globalThis as any).__dmLog.includes(u2), 'another author mentioning the keyword triggers a DM to the watcher');

  console.log('\n📦 8. Cooldown — same (user, keyword) does not re-notify immediately:');
  (globalThis as any).__dmLog = [];
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: u1, content: 'anthropic again right away' }));
  assert((globalThis as any).__dmLog.length === 0, 'second trigger within cooldown window sends no DM');

  console.log('\n📦 9. Disabled config / ignored channel suppress DMs:');
  (globalThis as any).__dmLog = [];
  highlightService._resetCooldownCacheForTests();
  highlightStorage.updateConfig(g, u2, { enabled: false });
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: u1, content: 'anthropic while paused' }));
  assert((globalThis as any).__dmLog.length === 0, 'paused config suppresses DM');
  highlightStorage.updateConfig(g, u2, { enabled: true, ignoredChannelIds: ['muted-chan'] });
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: u1, content: 'anthropic in muted channel', channelId: 'muted-chan' }));
  assert((globalThis as any).__dmLog.length === 0, 'ignored channel suppresses DM');
  await highlightService.handleMessage(fakeMessage({ guildId: g, authorId: u1, content: 'anthropic in normal channel', channelId: 'chan-1' }));
  assert((globalThis as any).__dmLog.includes(u2), 'non-ignored channel still notifies');

  console.log('\n📦 10. Cleanup:');
  highlightStorage.remove(g, u2, 'anthropic');
  highlightStorage.updateConfig(g, u2, { enabled: true, ignoredChannelIds: [] });
  highlightStorage.updateConfig(g, u1, { enabled: true, ignoredChannelIds: [] });
  assert(highlightStorage.listForUser(g, u2).length === 0, 'all cleared');

  console.log(`\n${'='.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'='.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}
run();
