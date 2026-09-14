import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { listPickableChannels } from './src/server/routes/sharedSpaceRoutes.js';
import { validateNotifyPayload } from './src/server/routes/internalSharedSpaceRoutes.js';
import { requireSharedSpacesKey } from './src/server/middleware/internalAuth.js';
import { SharedSpaceNotifyService } from './src/modules/sharedSpaces/services/sharedSpaceNotifyService.js';
import { config } from './src/config.js';

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

// Minimal stand-ins for the discord.js shapes the shared-spaces module
// actually reads — same spirit as test_giveaways_v1.ts's mockMember.
function mockChannel(id: string, name: string, type: number, opts: Partial<{
  canSend: boolean;
  canManageWebhooks: boolean;
  existingWebhook: { id: string; owner: { id: string }; name: string; send: (...a: any[]) => Promise<any> } | null;
  sendFails: boolean;
  webhookSendFails: boolean;
}> = {}) {
  const { canSend = true, canManageWebhooks = true, existingWebhook = null, sendFails = false, webhookSendFails = false } = opts;
  const sendCalls: any[] = [];
  const createWebhookCalls: any[] = [];
  const channel: any = {
    id,
    name,
    type,
    client: { user: { id: 'bot-1', displayAvatarURL: () => 'avatar-url' } },
    permissionsFor: () => ({
      has: (flag: bigint) => (flag === PermissionFlagsBits.SendMessages ? canSend : flag === PermissionFlagsBits.ManageWebhooks ? canManageWebhooks : false),
    }),
    fetchWebhooks: async () => {
      // discord.js's Collection extends Map but also has .find (Array-like);
      // a plain Map doesn't, so bolt one on for this mock.
      const map: any = new Map<string, any>();
      if (existingWebhook) map.set(existingWebhook.id, existingWebhook);
      map.find = (fn: (w: any) => boolean) => [...map.values()].find(fn);
      return map;
    },
    createWebhook: async (opts: any) => {
      createWebhookCalls.push(opts);
      const created = { id: 'wh-created', owner: { id: 'bot-1' }, name: opts.name, send: async (payload: any) => (sendCalls.push(payload), undefined) };
      return created;
    },
    send: async (payload: any) => {
      sendCalls.push(payload);
      if (sendFails) throw new Error('send failed');
    },
  };
  channel.__sendCalls = sendCalls;
  channel.__createWebhookCalls = createWebhookCalls;
  if (existingWebhook && webhookSendFails) {
    existingWebhook.send = async () => {
      throw new Error('webhook send failed');
    };
  }
  return channel;
}

function mockGuild(id: string, channels: any[] = [], hasMe = true) {
  // A real discord.js Collection extends Map (supports .get) while also
  // having Array-like .filter/.map/.sort -- a plain array with .get bolted
  // on covers both call sites (listPickableChannels and notifyService).
  const cache: any = [...channels];
  cache.get = (channelId: string) => channels.find((c) => c.id === channelId) || undefined;
  return {
    id,
    channels: { cache },
    members: { me: hasMe ? { id: 'bot-member-1' } : null },
  };
}

function mockClient(guilds: any[] = []) {
  return {
    user: { id: 'bot-1', displayAvatarURL: () => 'avatar-url' },
    guilds: { cache: new Map(guilds.map((g) => [g.id, g])) },
  } as any;
}

async function runTests() {
  console.log('📂 1. Channel picker (listPickableChannels):');

  const textCh = mockChannel('c1', 'general', ChannelType.GuildText);
  const annCh = mockChannel('c2', 'annonces', ChannelType.GuildAnnouncement);
  const voiceCh = mockChannel('c3', 'voice', ChannelType.GuildVoice);
  const guild = mockGuild('guild-1', [voiceCh, annCh, textCh]);
  const client = mockClient([guild]);

  const channels = listPickableChannels(client, 'guild-1');
  assert(channels.length === 2, 'Only text/announcement channels are returned (voice excluded)');
  assert(channels[0].name === 'annonces' && channels[1].name === 'general', 'Channels are sorted alphabetically by name');

  assert(listPickableChannels(client, 'unknown-guild').length === 0, 'A guild the bot is not in returns an empty list, not an error');

  console.log('\n🔐 2. Internal notify payload validation:');

  const valid = validateNotifyPayload({
    guildId: '123456789012345678',
    channelId: '987654321098765432',
    spaceName: 'Team',
    kind: 'task',
    action: 'created',
    title: 'Buy milk',
    actorName: 'Alex',
  });
  assert(valid !== null && valid.guildId === '123456789012345678', 'A fully valid payload is accepted');

  assert(validateNotifyPayload({ ...validPayloadBase(), guildId: 'not-a-snowflake' }) === null, 'A malformed guildId is rejected');
  assert(validateNotifyPayload({ ...validPayloadBase(), channelId: 'not-a-snowflake' }) === null, 'A malformed channelId is rejected');
  assert(validateNotifyPayload({ ...validPayloadBase(), kind: 'wat' }) === null, 'An unknown kind is rejected');
  assert(validateNotifyPayload({ ...validPayloadBase(), action: 'deleted' }) === null, 'An unknown action is rejected');
  assert(validateNotifyPayload(null) === null, 'A missing body is rejected, not thrown');
  assert(validateNotifyPayload({}) === null, 'An empty body is rejected');

  const withoutOptional = validateNotifyPayload({ guildId: '123456789012345678', channelId: '987654321098765432', kind: 'note', action: 'created' });
  assert(withoutOptional?.spaceName === 'Espace partagé' && withoutOptional?.actorName === "Quelqu'un", 'Missing optional fields fall back to safe defaults instead of failing validation');

  console.log('\n🔑 3. requireSharedSpacesKey middleware:');

  function mockReqRes(headerValue?: string) {
    let status = 200;
    let body: any = null;
    let nextCalled = false;
    const req = { headers: headerValue !== undefined ? { 'x-internal-key': headerValue } : {} } as any;
    const res = {
      status(code: number) { status = code; return this; },
      json(payload: any) { body = payload; },
    } as any;
    const next = () => { nextCalled = true; };
    return { req, res, next, get status() { return status; }, get body() { return body; }, get nextCalled() { return nextCalled; } };
  }

  config.sharedSpacesBotKey = '';
  {
    const ctx = mockReqRes('anything');
    requireSharedSpacesKey(ctx.req, ctx.res, ctx.next);
    assert(ctx.status === 503 && !ctx.nextCalled, 'No secret configured -> 503, next() never called');
  }

  config.sharedSpacesBotKey = 'k'.repeat(32);
  {
    const ctx = mockReqRes('wrong-key');
    requireSharedSpacesKey(ctx.req, ctx.res, ctx.next);
    assert(ctx.status === 401 && !ctx.nextCalled, 'A wrong key is rejected with 401, next() never called');
  }
  {
    const ctx = mockReqRes(undefined);
    requireSharedSpacesKey(ctx.req, ctx.res, ctx.next);
    assert(ctx.status === 401 && !ctx.nextCalled, 'A missing key header is rejected the same way as a wrong one');
  }
  {
    const ctx = mockReqRes('k'.repeat(32));
    requireSharedSpacesKey(ctx.req, ctx.res, ctx.next);
    assert(ctx.nextCalled, 'The correct key calls next() and proceeds');
  }

  console.log('\n📣 4. SharedSpaceNotifyService.notify webhook delivery:');

  const payloadFor = (guildId: string, channelId: string) => ({
    guildId, channelId, spaceName: 'Team', kind: 'task' as const, action: 'created' as const, title: 'Buy milk', actorName: 'Alex',
  });

  {
    const g = mockGuild('g-missing', []);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-does-not-exist', 'chan-1'));
    assert(ok === false, 'A guild the bot is not in returns false, never throws');
  }

  {
    const ch = mockChannel('chan-2', 'general', ChannelType.GuildVoice);
    const g = mockGuild('g-2', [ch]);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-2', 'chan-2'));
    assert(ok === false, 'A non-text channel (voice) is rejected');
  }

  {
    const ch = mockChannel('chan-3', 'general', ChannelType.GuildText, { canSend: false });
    const g = mockGuild('g-3', [ch]);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-3', 'chan-3'));
    assert(ok === false, 'Missing SendMessages permission is rejected before any webhook logic runs');
  }

  {
    const existing = { id: 'wh-existing', owner: { id: 'bot-1' }, name: 'ETHONE Espaces', send: async (p: any) => p };
    const ch = mockChannel('chan-4', 'general', ChannelType.GuildText, { existingWebhook: existing });
    const g = mockGuild('g-4', [ch]);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-4', 'chan-4'));
    assert(ok === true && ch.__createWebhookCalls.length === 0, 'An existing "ETHONE Espaces" webhook is reused, never recreated');
  }

  {
    const ch = mockChannel('chan-5', 'general', ChannelType.GuildText);
    const g = mockGuild('g-5', [ch]);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-5', 'chan-5'));
    assert(ok === true && ch.__createWebhookCalls.length === 1 && ch.__createWebhookCalls[0].name === 'ETHONE Espaces', 'No existing webhook -> one is created with the right name');
  }

  {
    const existing = { id: 'wh-broken', owner: { id: 'bot-1' }, name: 'ETHONE Espaces', send: async () => { throw new Error('webhook gone'); } };
    const ch = mockChannel('chan-6', 'general', ChannelType.GuildText, { existingWebhook: existing });
    const g = mockGuild('g-6', [ch]);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-6', 'chan-6'));
    assert(ok === true && ch.__sendCalls.length === 1, 'A failing webhook send falls back to a plain channel.send, and still reports success');
  }

  {
    const ch = mockChannel('chan-7', 'general', ChannelType.GuildText, { canManageWebhooks: false });
    const g = mockGuild('g-7', [ch]);
    const c = mockClient([g]);
    const ok = await SharedSpaceNotifyService.notify(c, payloadFor('g-7', 'chan-7'));
    assert(ok === true && ch.__sendCalls.length === 1 && ch.__createWebhookCalls.length === 0, 'No ManageWebhooks permission -> falls back to channel.send directly, no webhook attempted');
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

function validPayloadBase() {
  return { guildId: '123456789012345678', channelId: '987654321098765432', spaceName: 'Team', kind: 'task', action: 'created', title: 'Buy milk', actorName: 'Alex' };
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
