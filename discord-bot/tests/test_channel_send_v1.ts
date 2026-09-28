import { ChannelType, ChannelFlags } from 'discord.js';
import { sendToConfiguredChannel, isSendableTarget } from '../src/utils/channelSend.js';

let failed = 0;
function assert(cond: boolean, label: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${label}`);
  if (!cond) failed++;
}

const sent: any[] = [];
const text: any = { id: 't', type: ChannelType.GuildText, isTextBased: () => true, send: async (p: any) => (sent.push(p), { id: 'm' }) };
await sendToConfiguredChannel(text, { content: 'hi', reply: { messageReference: 'x' } });
assert(sent.length === 1 && sent[0].content === 'hi', 'text channel -> send()');

let created: any = null;
const forum: any = {
  id: 'f',
  type: ChannelType.GuildForum,
  isTextBased: () => false,
  availableTags: [{ id: 'a' }, { id: 'b' }],
  flags: { has: (f: number) => f === ChannelFlags.RequireTag },
  threads: { create: async (o: any) => ((created = o), { id: 'th', fetchStarterMessage: async () => ({ id: 'starter' }) }) },
};
assert(isSendableTarget(forum), 'forum is a sendable target');
const msg = await sendToConfiguredChannel(forum, { content: 'Bienvenue\nligne 2', tts: true, reply: {} });
assert((msg as any).id === 'starter', 'forum returns starter message');
assert(created.name === 'Bienvenue' && created.message.tts === undefined && created.message.reply === undefined, 'title derived, unsupported fields stripped');
assert(created.appliedTags.join() === 'a', 'required tag -> first available tag applied');
await sendToConfiguredChannel(forum, { embeds: [{ title: 'T'.repeat(200) }] }, { appliedTagIds: ['b', 'zzz'] });
assert(created.name.length === 100 && created.appliedTags.join() === 'b', 'title capped at 100, unknown tags filtered');

const voice: any = { id: 'v', type: ChannelType.GuildVoice, isTextBased: () => false };
let threw = false;
try { await sendToConfiguredChannel(voice, { content: 'x' }); } catch { threw = true; }
assert(threw, 'non-sendable channel throws');

process.exit(failed ? 1 : 0);
