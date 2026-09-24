/**
 * Test d'intégration du filtre « module désactivé » dans les VRAIS gestionnaires d'événements (interactionCreate pour les
 * commandes slash, messageCreate pour les commandes à préfixe), avec de faux objets Discord.
 * À lancer depuis un dossier temporaire (le test écrit dans ./data) :
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_module_gate_handlers_v1.ts
 */
import assert from 'node:assert/strict';
import { onInteractionCreate } from '../src/events/interactionCreate.js';
import { onMessageCreate } from '../src/events/messageCreate.js';
import { setModuleEnabled } from '../src/services/moduleRegistry.js';
import { guildConfigService } from '../src/services/guildConfigService.js';

const GUILD = 'guild-gate-handlers';
let passed = 0;
const check = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed += 1;
  console.log(`  ✅ PASS: ${name}`);
};

function fakeSlash(commandName: string, opts: { staff: boolean }) {
  const replies: any[] = [];
  const noop = () => false;
  const interaction: any = {
    isChatInputCommand: () => true,
    isAutocomplete: noop, isAnySelectMenu: noop, isButton: noop, isModalSubmit: noop, isStringSelectMenu: noop,
    isUserContextMenuCommand: noop, isMessageContextMenuCommand: noop, isContextMenuCommand: noop,
    commandName,
    guildId: GUILD,
    guild: { id: GUILD, name: 'Serveur test', ownerId: 'someone-else' },
    user: { id: opts.staff ? 'staff-1' : 'member-1', tag: 'test#0001' },
    memberPermissions: { has: (p: string) => opts.staff && (p === 'ManageGuild' || p === 'Administrator') },
    member: { roles: { cache: new Map() } },
    options: { getString: () => null, getBoolean: () => null },
    client: { user: { id: 'bot' }, guilds: { cache: new Map() } },
    replied: false, deferred: false,
    reply: async (payload: any) => { replies.push(payload); interaction.replied = true; },
    deferReply: async () => { interaction.deferred = true; },
    editReply: async (payload: any) => { replies.push(payload); },
    followUp: async (payload: any) => { replies.push(payload); },
  };
  return { interaction, replies };
}

function fakeMessage(content: string, opts: { staff: boolean }) {
  const replies: any[] = [];
  const message: any = {
    author: { id: opts.staff ? 'staff-1' : 'member-1', bot: false, tag: 'test#0001' },
    content,
    guildId: GUILD,
    channelId: 'chan-1',
    guild: { id: GUILD, name: 'Serveur test', ownerId: 'someone-else', members: { me: {} } },
    member: {
      permissions: { has: (p: any) => opts.staff },
      roles: { cache: new Map() },
    },
    mentions: { has: () => false, users: new Map(), roles: new Map(), everyone: false },
    client: { user: { id: 'bot' } },
    reply: async (payload: any) => { replies.push(payload); return { delete: async () => undefined }; },
    channel: { send: async (p: any) => { replies.push(p); }, sendTyping: async () => undefined },
    deletable: false,
    attachments: new Map(),
    reference: null,
  };
  return { message, replies };
}

const descriptions = (replies: any[]) => replies.flatMap((r) => (r.embeds ?? []).map((e: any) => String(e.data?.description ?? e.description ?? '')));
const titles = (replies: any[]) => replies.flatMap((r) => (r.embeds ?? []).map((e: any) => String(e.data?.author?.name ?? '')));

console.log('🧩 MODULE GATE dans les vrais gestionnaires');
guildConfigService.getConfig(GUILD);
setModuleEnabled(GUILD, 'polls', false);

await check('slash /poll par un membre : un seul embed « Module désactivé », éphémère', async () => {
  const { interaction, replies } = fakeSlash('poll', { staff: false });
  await onInteractionCreate(interaction);
  assert.equal(replies.length, 1, JSON.stringify(replies).slice(0, 300));
  assert.equal(replies[0].embeds.length, 1);
  assert.ok(replies[0].ephemeral);
  assert.match(descriptions(replies)[0], /Sondages/);
  assert.ok(titles(replies).some((t) => /Module désactivé/.test(t)));
});

await check('slash /poll par le staff : deux embeds, le second donne la commande pour réactiver', async () => {
  const { interaction, replies } = fakeSlash('poll', { staff: true });
  await onInteractionCreate(interaction);
  assert.equal(replies[0].embeds.length, 2);
  assert.match(descriptions(replies)[1], /\/module nom:polls activer:True/);
});

await check('slash /help (commande de base) : jamais bloquée par le filtre', async () => {
  const { interaction, replies } = fakeSlash('help', { staff: false });
  await onInteractionCreate(interaction).catch(() => undefined);
  assert.ok(!titles(replies).some((t) => /Module désactivé/.test(t)));
});

await check('préfixe !poll par un membre : embed « Module désactivé » avec la syntaxe à préfixe pour le staff', async () => {
  const member = fakeMessage('!poll', { staff: false });
  await onMessageCreate(member.message);
  assert.ok(titles(member.replies).some((t) => /Module désactivé/.test(t)), JSON.stringify(member.replies).slice(0, 300));
  const staff = fakeMessage('!poll', { staff: true });
  await onMessageCreate(staff.message);
  assert.match(descriptions(staff.replies).join('\n'), /!module polls on/);
});

await check('module réactivé : la commande n\'est plus interceptée', async () => {
  setModuleEnabled(GUILD, 'polls', true);
  const { interaction, replies } = fakeSlash('poll', { staff: false });
  await onInteractionCreate(interaction).catch(() => undefined);
  assert.ok(!titles(replies).some((t) => /Module désactivé/.test(t)));
});

console.log(`\n🏁 ${passed} PASSED`);
process.exit(0);
