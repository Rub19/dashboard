// Scénarios d'attaque de bout en bout sur le moteur de protections : journal d'audit simulé, messages, arrivées.
// Chaque scénario vient d'un membre NON protégé (le propriétaire du serveur et celui du bot sont toujours ignorés).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AuditLogEvent, ChannelType, Collection, PermissionFlagsBits, PermissionsBitField } from 'discord.js';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'etho-prot-scn-')));

const { protectionStore } = await import('../src/modules/protections/protectionStore.js');
const { protectionEngine } = await import('../src/modules/protections/protectionEngine.js');

const G = '100000000000000009';
const OWNER = '999999999999999990';
const BOT = '888888888888888880';
const log: string[] = [];
const did = (s: string) => log.push(s);
const has = (s: string) => log.some((l) => l.startsWith(s));
const reset = () => (log.length = 0);

const mkMember = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  user: { id, tag: `user${id.slice(-2)}`, bot: false, createdTimestamp: Date.now() - 400 * 86400_000 },
  roles: { cache: Object.assign(new Map(), { has: () => false, filter: () => ({ size: 1 }), some: () => false }), remove: async () => did(`derank:${id}`), add: async () => {} },
  moderatable: true,
  kickable: true,
  timeout: async () => did(`timeout:${id}`),
  kick: async () => did(`kick:${id}`),
  send: async () => did(`dm:${id}`),
  ...extra,
});
const members = new Map<string, any>();
const roles = new Map<string, any>();
const channels = new Map<string, any>();
const meRole = { position: 100, comparePositionTo: (r: any) => 100 - r.position };
const me = { id: BOT, permissions: new PermissionsBitField([PermissionFlagsBits.Administrator]), roles: { highest: meRole } };
const hooks = new Map<string, any>();

const guild: any = {
  id: G,
  name: 'Serveur de test',
  ownerId: OWNER,
  client: { user: { id: BOT }, users: { fetch: async (id: string) => ({ id, tag: `user${id.slice(-2)}`, send: async () => did(`dm:${id}`) }) } },
  members: {
    me,
    cache: new Map(),
    fetch: async (id: string) => members.get(id) ?? null,
    ban: async (id: string) => did(`ban:${id}`),
    unban: async (id: string) => did(`unban:${id}`),
  },
  channels: {
    cache: channels,
    create: async (o: any) => {
      did(`channel.create:${o.name}:${o.topic ?? ''}`);
      return { id: '7', setPosition: async () => {} };
    },
  },
  roles: {
    cache: roles,
    create: async (o: any) => {
      did(`role.create:${o.name}:${String(o.permissions)}`);
      return { id: '8', setPosition: async () => {} };
    },
  },
  fetchWebhooks: async () => hooks,
  fetchOwner: async () => ({ send: async () => did('dm:owner') }),
  iconURL: () => null,
};
const entry = (action: AuditLogEvent, executorId: string, targetId: string, changes: { key: string; old?: unknown; new?: unknown }[] = []) =>
  ({ action, executorId, targetId, changes, extra: null }) as any;

const enable = (key: string, extra: Record<string, unknown> = {}) => protectionStore.update(G, key, { enabled: true, punish: 'derank', ...extra });
let ok = 0;
const step = async (label: string, fn: () => Promise<void>) => {
  reset();
  await fn();
  ok += 1;
  console.log(`  ✅ ${label}`);
};

// 1. Suppression de salon : recréé à l'identique (nom, sujet), auteur dérangé.
await step('anti-suppression de salon : salon recréé, auteur sanctionné', async () => {
  const raider = '200000000000000011';
  members.set(raider, mkMember(raider));
  enable('antiChannelDelete', { quotaMax: 1 });
  protectionEngine.snapChannel({ id: '501', name: 'regles', type: ChannelType.GuildText, topic: 'À lire', nsfw: false, parentId: null, position: 2, rateLimitPerUser: 0, isThread: () => false, permissionOverwrites: { cache: new Collection() } } as any);
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.ChannelDelete, raider, '501', [{ key: 'name', old: 'regles' }]));
  assert.ok(has('channel.create:regles:À lire'), 'salon recréé avec son nom et son sujet');
  assert.ok(has(`derank:${raider}`), 'auteur dérangé');
});

// 2. Suppression de rôle : recréé avec ses permissions.
await step('anti-suppression de rôle : rôle recréé avec ses permissions', async () => {
  const raider = '200000000000000012';
  members.set(raider, mkMember(raider));
  enable('antiRoleDelete', { quotaMax: 1 });
  protectionEngine.snapRole({ id: '601', name: 'Modérateur', color: 0, hoist: true, mentionable: false, permissions: { bitfield: 8192n }, position: 5, unicodeEmoji: null, guild: { members: { cache: { filter: () => ({ map: () => [] }) } } } } as any);
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.RoleDelete, raider, '601', [{ key: 'name', old: 'Modérateur' }]));
  assert.ok(has('role.create:Modérateur:8192'), 'rôle recréé avec ses permissions');
  assert.ok(has(`derank:${raider}`));
});

// 3. Ajout d'un bot : le bot est banni.
await step('anti-bot : bot ajouté banni, auteur sanctionné', async () => {
  const raider = '200000000000000013';
  members.set(raider, mkMember(raider));
  enable('antiBot', { quotaMax: 1 });
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.BotAdd, raider, '700000000000000001'));
  assert.ok(has('ban:700000000000000001'), 'bot banni');
  assert.ok(has(`derank:${raider}`));
});

// 4. Création de webhook : supprimé.
await step('anti-webhook : webhook supprimé', async () => {
  const raider = '200000000000000014';
  members.set(raider, mkMember(raider));
  hooks.set('801', { delete: async () => did('webhook.delete:801') });
  enable('antiWebhook', { quotaMax: 1, webhookAction: 'delete' });
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.WebhookCreate, raider, '801', [{ key: 'channel_id', new: '501' }]));
  assert.ok(has('webhook.delete:801'));
  assert.ok(has(`derank:${raider}`));
});

// 5. Rafale de bans : sous le seuil rien, au seuil tous débannis.
await step('anti-ban : la rafale entière est annulée au seuil', async () => {
  const raider = '200000000000000015';
  members.set(raider, mkMember(raider));
  enable('antiBan', { quotaMax: 3, quotaSeconds: 60, punish: 'timeout' });
  for (const t of ['31', '32']) await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.MemberBanAdd, raider, `3000000000000000${t}`));
  assert.ok(!has('unban:'), 'rien sous le seuil');
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.MemberBanAdd, raider, '300000000000000033'));
  assert.equal(log.filter((l) => l.startsWith('unban:')).length, 3, 'trois débannissements');
  assert.ok(has(`timeout:${raider}`));
});

// 6. Le propriétaire du serveur n'est jamais compté.
await step('propriétaire du serveur ignoré', async () => {
  enable('antiChannelDelete', { quotaMax: 1 });
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.ChannelDelete, OWNER, '502', [{ key: 'name', old: 'x' }]));
  assert.equal(log.length, 0);
});

const mkMessage = (author: string, content: string, extra: Record<string, unknown> = {}) => {
  const m: any = {
    id: `${Date.now()}${Math.random()}`,
    content,
    author: { id: author, bot: false },
    member: members.get(author),
    channelId: '501',
    guild,
    client: { user: { id: BOT } },
    webhookId: null,
    system: false,
    deletable: true,
    createdTimestamp: Date.now(),
    stickers: new Map(),
    mentions: { everyone: false, users: Object.assign(new Map(), { filter: () => ({ size: 0 }) }), roles: new Map() },
    inGuild: () => true,
    delete: async () => did(`msg.delete:${author}`),
    channel: { isSendable: () => true, send: async () => did('channel.send') },
    ...extra,
  };
  return m;
};

// 7. Lien interdit : supprimé tout de suite.
// (type « lien » : pas de seuil, chaque lien interdit est supprimé et sanctionné ; l'interface n'affiche pas de seuil.)
await step('anti-lien : message supprimé et auteur sanctionné au premier lien', async () => {
  const raider = '200000000000000016';
  members.set(raider, mkMember(raider));
  enable('antiLink', { linkTypes: ['general', 'discord'], punish: 'timeout' });
  await protectionEngine.onMessage(mkMessage(raider, 'rejoins discord.gg/arnaque'));
  assert.ok(has(`msg.delete:${raider}`));
  assert.ok(has(`timeout:${raider}`));
  protectionStore.update(G, 'antiLink', { enabled: false });
});

// 8. Spam : la rafale est supprimée au seuil, puis sanction.
await step('anti-spam : rafale supprimée, auteur exclu, messages suivants supprimés', async () => {
  const raider = '200000000000000017';
  members.set(raider, mkMember(raider));
  enable('antiSpam', { quotaMax: 5, quotaSeconds: 10, punish: 'timeout' });
  for (let i = 0; i < 5; i++) await protectionEngine.onMessage(mkMessage(raider, `spam ${i}`));
  assert.equal(log.filter((l) => l === `msg.delete:${raider}`).length, 5, 'les 5 messages supprimés');
  assert.ok(has(`timeout:${raider}`));
  // Pendant la fenêtre, les messages suivants sont supprimés aussi (sans nouvelle sanction).
  await protectionEngine.onMessage(mkMessage(raider, 'spam après la rafale'));
  assert.equal(log.filter((l) => l === `msg.delete:${raider}`).length, 6, 'message suivant supprimé');
  protectionStore.update(G, 'antiSpam', { enabled: false });
});

// 9. Ghost ping : prévenu dans le salon.
await step('anti-ghost ping : alerte publiée dans le salon', async () => {
  const raider = '200000000000000018';
  members.set(raider, mkMember(raider));
  enable('antiGhostPing', { quotaMax: 3, ghostNotify: true, ghostMaxAgeSeconds: 60 });
  const victim = { id: '200000000000000099', bot: false };
  const users = Object.assign(new Map([[victim.id, victim]]), {
    filter: (fn: (u: any) => boolean) => {
      const out = [...new Map([[victim.id, victim]]).values()].filter(fn);
      return Object.assign(new Map(out.map((u) => [u.id, u])), { map: (f: (u: any) => string) => out.map(f) });
    },
  });
  const roleMentions = Object.assign(new Map(), { map: () => [] });
  await protectionEngine.onMessageDelete(mkMessage(raider, `<@${victim.id}> coucou`, { partial: false, mentions: { users, roles: roleMentions } }));
  assert.ok(has('channel.send'), 'alerte envoyée');
});

// 10. Compte récent : MP puis expulsion.
await step('anti-alt : compte récent prévenu et expulsé', async () => {
  const alt = '200000000000000019';
  const m = mkMember(alt);
  m.user.createdTimestamp = Date.now() - 86400_000;
  (m as any).guild = guild;
  members.set(alt, m);
  enable('antiAlt', { minAccountAgeDays: 7, punish: 'kick' });
  await protectionEngine.onMemberAdd(m as any);
  assert.ok(has(`dm:${alt}`), 'MP envoyé');
  assert.ok(has(`kick:${alt}`), 'expulsé');
});

// 11. Verrouillage : permissions sensibles retirées puis rendues.
await step('verrouillage : permissions retirées, puis restaurées à la levée', async () => {
  // Le scénario 1 a déjà verrouillé le serveur (l'anti-suppression de salon verrouille par défaut) : on repart déverrouillé.
  assert.ok(protectionStore.getLockdown(G), 'la suppression de salon a bien verrouillé le serveur');
  await protectionEngine.liftLockdown(guild);
  const raider = '200000000000000020';
  members.set(raider, mkMember(raider));
  let perms = new PermissionsBitField([PermissionFlagsBits.BanMembers, PermissionFlagsBits.SendMessages]);
  roles.set('901', {
    id: '901',
    managed: false,
    position: 10,
    get permissions() {
      return perms;
    },
    comparePositionTo: (r: any) => 10 - r.position,
    setPermissions: async (p: any) => {
      perms = new PermissionsBitField(p);
      did(`role.perms:${perms.has(PermissionFlagsBits.BanMembers)}`);
    },
  });
  enable('antiKick', { quotaMax: 1, lockdown: true });
  await protectionEngine.onAuditEntry(guild, entry(AuditLogEvent.MemberKick, raider, '300000000000000040'));
  assert.ok(has('role.perms:false'), 'Bannir retiré au rôle');
  assert.ok(protectionStore.getLockdown(G), 'état de verrouillage enregistré');
  const restored = await protectionEngine.liftLockdown(guild);
  assert.equal(restored, 1);
  assert.ok(perms.has(PermissionFlagsBits.BanMembers), 'Bannir rendu');
  assert.equal(protectionStore.getLockdown(G), null);
});

console.log(`\n${ok} réussis, 0 échoués`);
process.exit(0);
