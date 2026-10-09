/**
 * Test « le bot n'agit pas de lui-même » : avec TOUS les modules désactivés sur un serveur, les gestionnaires automatiques
 * (messageCreate, guildMemberAdd/Remove, réactions, vocal, salons/rôles/bans, journaux, planificateurs) ne déclenchent AUCUN
 * effet de bord (aucun appel de suppression, timeout, ban, kick, envoi, changement de rôle) et n'appellent aucun service.
 * Chaque bloc a un CONTRÔLE : module réactivé => le même événement atteint bien le service (le test n'est donc pas vide).
 *
 * Fonctionne dans un dossier temporaire (les dépôts JSON écrivent dans ./data) :
 *   DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx tests/test_modules_passive_v1.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';

// Les dépôts résolvent process.cwd()/data à l'import : on se place dans un dossier jetable AVANT d'importer quoi que ce soit.
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'passive-modules-')));
process.on('unhandledRejection', () => undefined);

const { Events } = await import('discord.js');
const { MODULES, isModuleEnabled, setModuleEnabled, applyModuleSelection, CORE_MODULE_IDS } = await import('../src/services/moduleRegistry.js');
const { onMessageCreate } = await import('../src/events/messageCreate.js');
const { onGuildMemberAdd } = await import('../src/events/guildMemberAdd.js');
const { onGuildMemberRemove } = await import('../src/events/guildMemberRemove.js');
const { registerEvents } = await import('../src/handlers/eventHandler.js');

const { autoModService } = await import('../src/modules/automod/services/autoModService.js');
const { levelingService } = await import('../src/modules/leveling/services/levelingService.js');
const { raidDetectionService } = await import('../src/modules/antiRaid/services/raidDetectionService.js');
const { aiService } = await import('../src/modules/ai/services/aiService.js');
const { stickyService } = await import('../src/modules/stickyMessages/services/stickyService.js');
const { afkService } = await import('../src/modules/afk/services/afkService.js');
const { countingService } = await import('../src/modules/counting/services/countingService.js');
const { statsCollector } = await import('../src/modules/stats/services/statsCollector.js');
const { highlightService } = await import('../src/modules/highlights/services/highlightService.js');
const { economyService } = await import('../src/modules/economy/services/economyService.js');
const { starboardService } = await import('../src/modules/starboard/services/starboardService.js');
const { welcomeService } = await import('../src/modules/welcome/services/welcomeService.js');
const { autoRoleService } = await import('../src/modules/roles/services/autoRoleService.js');
const { inviteTrackingService } = await import('../src/modules/invites/services/inviteTrackingService.js');
const { inviteSnapshotService } = await import('../src/modules/invites/services/inviteSnapshotService.js');
const { voiceService } = await import('../src/modules/voice/services/voiceService.js');
const { voiceRepository } = await import('../src/modules/voice/storage/voiceRepository.js');
const { voiceStayService } = await import('../src/modules/music/services/voiceStayService.js');
const { logService } = await import('../src/modules/logs/services/logService.js');
const { logQueue } = await import('../src/modules/logs/services/logQueue.js');
const { DiscordLogService } = await import('../src/modules/logs/services/discordLogService.js');
const { DiscordAuditAdapter } = await import('../src/modules/logs/services/discordAuditAdapter.js');
const { analyticsService } = await import('../src/modules/analytics/services/analyticsService.js');
const { birthdayService } = await import('../src/modules/birthdays/services/birthdayService.js');
const { birthdayStorage } = await import('../src/modules/birthdays/storage/birthdayStorage.js');
const { serverStatsService } = await import('../src/modules/serverStats/services/serverStatsService.js');
const { serverStatsStorage } = await import('../src/modules/serverStats/storage/serverStatsStorage.js');
const { nativePollService } = await import('../src/modules/polls/services/nativePollService.js');
const { pollRepository } = await import('../src/modules/polls/storage/pollRepository.js');
const { TicketScheduler } = await import('../src/modules/tickets/services/ticketScheduler.js');
const { ticketRepository } = await import('../src/modules/tickets/storage/ticketRepository.js');

const GUILD = '900000000000000001';
let passed = 0;
const check = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  passed += 1;
  console.log(`  ✅ PASS: ${name}`);
};

/** Espionne une méthode d'un singleton : renvoie le compteur d'appels (la méthode réelle n'est pas exécutée). */
function spy(target: any, method: string, result?: any): { calls: number; restore: () => void } {
  const original = target[method];
  const s = { calls: 0, restore: () => { target[method] = original; } };
  target[method] = (..._args: any[]) => {
    s.calls += 1;
    return result;
  };
  return s;
}

/** Faux salon / faux membre dont TOUTE méthode à effet de bord est enregistrée dans `effects`. */
const effects: string[] = [];
const fx = (label: string, value: any = undefined) => async (..._a: any[]) => { effects.push(label); return value; };

function fakeGuild() {
  const me = { permissions: { has: () => true }, roles: { highest: { position: 99 } }, voice: { channelId: null } };
  return {
    id: GUILD,
    name: 'Serveur passif',
    ownerId: 'owner-x',
    memberCount: 10,
    members: { me, fetch: fx('guild.members.fetch', null), cache: new Map() },
    channels: { cache: new Map(), fetch: fx('guild.channels.fetch', null), create: fx('guild.channels.create') },
    roles: { cache: new Map(), everyone: { id: GUILD } },
    systemChannel: null,
    invites: { fetch: fx('guild.invites.fetch', null) },
    bans: { create: fx('guild.bans.create'), remove: fx('guild.bans.remove') },
    fetchAuditLogs: fx('guild.fetchAuditLogs', { entries: new Map() }),
    client: { user: { id: 'bot-1' } },
  };
}

function fakeMember(guild: any, id = 'member-1') {
  return {
    id,
    guild,
    user: { id, tag: 'user#0001', username: 'user', bot: false, createdTimestamp: Date.now() - 1000, createdAt: new Date(), displayAvatarURL: () => 'https://x/a.png' },
    displayName: 'user',
    manageable: true,
    roles: { cache: new Map(), add: fx('member.roles.add'), remove: fx('member.roles.remove') },
    timeout: fx('member.timeout'),
    ban: fx('member.ban'),
    kick: fx('member.kick'),
    setNickname: fx('member.setNickname'),
    send: fx('member.send'),
    permissions: { has: () => false },
    voice: {},
  };
}

function fakeMessage(guild: any, content = 'salut @everyone https://discord.gg/abc') {
  const channel: any = { id: 'chan-1', isTextBased: () => true, isThread: () => false, send: fx('channel.send'), sendTyping: fx('channel.sendTyping'), permissionsFor: () => ({ has: () => true }) };
  const message: any = {
    id: 'msg-1',
    author: { id: 'member-1', bot: false, tag: 'user#0001', username: 'user', displayAvatarURL: () => 'https://x/a.png' },
    content,
    cleanContent: content,
    guildId: GUILD,
    channelId: 'chan-1',
    channel,
    guild,
    member: { permissions: { has: () => false }, roles: { cache: new Map() } },
    mentions: { has: () => false, users: new Map(), roles: new Map(), everyone: true },
    client: { user: { id: 'bot-1' } },
    attachments: new Map(),
    embeds: [],
    reference: null,
    deletable: true,
    delete: fx('message.delete'),
    reply: fx('message.reply', { delete: fx('reply.delete') }),
    react: fx('message.react'),
    pin: fx('message.pin'),
  };
  return message;
}

const allOff = () => applyModuleSelection(GUILD, [], 'DISCORD_COMMAND');
const only = (...ids: string[]) => applyModuleSelection(GUILD, ids, 'DISCORD_COMMAND');

console.log('🧊 MODULES PASSIFS : aucun effet de bord quand tout est désactivé');

await check('état initial : tout désactivé => aucun module actif ; socle seul => 4 modules', () => {
  allOff();
  assert.deepEqual(MODULES.filter((m) => isModuleEnabled(GUILD, m.id)).map((m) => m.id), []);
  applyModuleSelection(GUILD, CORE_MODULE_IDS, 'DISCORD_COMMAND');
  assert.deepEqual(MODULES.filter((m) => isModuleEnabled(GUILD, m.id)).map((m) => m.id).sort(), [...CORE_MODULE_IDS].sort());
  allOff();
});

await check('messageCreate : automod / anti-raid / XP / IA / sticky / comptage / AFK / stats / highlights / économie muets', async () => {
  const S = {
    sticky: spy(stickyService, 'handleMessage'),
    afk: spy(afkService, 'handleMessage', Promise.resolve()),
    counting: spy(countingService, 'handleMessage', Promise.resolve()),
    stats: spy(statsCollector, 'recordMessage'),
    highlights: spy(highlightService, 'handleMessage', Promise.resolve()),
    raid: spy(raidDetectionService, 'handleMessage', Promise.resolve()),
    automod: spy(autoModService, 'processMessage', Promise.resolve(false)),
    leveling: spy(levelingService, 'handleMessage', Promise.resolve()),
    economy: spy(economyService, 'earnPassive'),
    ai: spy(aiService, 'handleMessage', Promise.resolve(false)),
  };
  try {
    const guild = fakeGuild();
    allOff();
    effects.length = 0;
    const msg = fakeMessage(guild);
    await onMessageCreate(msg);
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 0, `${name} appelé alors que son module est désactivé`);
    assert.deepEqual(effects, [], `effets de bord inattendus : ${effects.join(', ')}`);

    // Contrôle : tous les modules réactivés => chaque service est atteint une fois.
    applyModuleSelection(GUILD, MODULES.map((m) => m.id), 'DISCORD_COMMAND');
    await onMessageCreate(fakeMessage(guild, 'bonjour'));
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 1, `${name} devrait être atteint quand le module est actif`);
  } finally {
    Object.values(S).forEach((s) => s.restore());
    allOff();
  }
});

await check('messageCreate : configuration interne restée « active » mais module coupé => toujours muet (le registre prime)', async () => {
  const { autoModRepository } = await import('../src/modules/automod/storage/autoModRepository.js');
  const { levelingStorage } = await import('../src/modules/leveling/storage/levelingStorage.js');
  const { countingStorage } = await import('../src/modules/counting/storage/countingStorage.js');
  const { raidRepository } = await import('../src/modules/antiRaid/storage/raidRepository.js');
  allOff();
  // Divergence volontaire : les interrupteurs propres sont rallumés SANS passer par le registre.
  autoModRepository.updateConfig(GUILD, { enabled: true });
  levelingStorage.updateConfig(GUILD, { enabled: true });
  countingStorage.updateConfig(GUILD, { enabled: true });
  raidRepository.updateConfig(GUILD, { enabled: true });
  assert.equal(isModuleEnabled(GUILD, 'automod'), false);
  assert.equal(isModuleEnabled(GUILD, 'security'), false);
  const S = {
    automod: spy(autoModService, 'processMessage', Promise.resolve(true)),
    leveling: spy(levelingService, 'handleMessage', Promise.resolve()),
    counting: spy(countingService, 'handleMessage', Promise.resolve()),
    raid: spy(raidDetectionService, 'handleMessage', Promise.resolve()),
  };
  try {
    effects.length = 0;
    await onMessageCreate(fakeMessage(fakeGuild()));
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 0, name);
    assert.deepEqual(effects, []);
  } finally {
    Object.values(S).forEach((s) => s.restore());
    allOff();
  }
});

await check('guildMemberAdd : accueil / auto-rôles / anti-raid / invitations / automod / stats muets', async () => {
  const S = {
    invites: spy(inviteTrackingService, 'handleMemberJoin', Promise.resolve()),
    raid: spy(raidDetectionService, 'handleMemberJoin', Promise.resolve()),
    automod: spy(autoModService, 'handleMemberProfile', Promise.resolve()),
    roles: spy(autoRoleService, 'assignOnJoin', Promise.resolve()),
    welcome: spy(welcomeService, 'handleMemberAdd', Promise.resolve()),
    stats: spy(statsCollector, 'recordJoin'),
  };
  const emit = spy(logService, 'emit');
  try {
    const guild = fakeGuild();
    allOff();
    effects.length = 0;
    await onGuildMemberAdd(fakeMember(guild) as any);
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 0, `${name} appelé alors que son module est désactivé`);
    assert.deepEqual(effects, [], effects.join(', '));

    applyModuleSelection(GUILD, MODULES.map((m) => m.id), 'DISCORD_COMMAND');
    await onGuildMemberAdd(fakeMember(guild) as any);
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 1, `${name} devrait être atteint quand le module est actif`);
  } finally {
    Object.values(S).forEach((s) => s.restore());
    emit.restore();
    allOff();
  }
});

await check('guildMemberRemove : au revoir / suivi d\'invitation / effacement d\'XP / anti-raid / journal muets', async () => {
  const S = {
    invites: spy(inviteTrackingService, 'handleMemberLeave'),
    raid: spy(raidDetectionService, 'handleMemberRemove'),
    leveling: spy(levelingService, 'handleMemberLeave'),
    welcome: spy(welcomeService, 'handleMemberRemove', Promise.resolve()),
    stats: spy(statsCollector, 'recordLeave'),
    audit: spy(DiscordAuditAdapter, 'resolveExecutor', Promise.resolve({ actor: null })),
  };
  const emit = spy(logService, 'emit');
  try {
    const guild = fakeGuild();
    allOff();
    effects.length = 0;
    await onGuildMemberRemove(fakeMember(guild) as any);
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 0, `${name} appelé alors que son module est désactivé`);
    assert.equal(emit.calls, 0, 'journal alimenté alors que le module Journal est désactivé');
    assert.deepEqual(effects, [], effects.join(', '));

    applyModuleSelection(GUILD, MODULES.map((m) => m.id), 'DISCORD_COMMAND');
    await onGuildMemberRemove(fakeMember(guild) as any);
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 1, `${name} devrait être atteint quand le module est actif`);
  } finally {
    Object.values(S).forEach((s) => s.restore());
    emit.restore();
    allOff();
  }
});

await check('journal : logService.emit n\'enregistre ni n\'envoie rien quand le module Journal est désactivé', () => {
  const enqueue = spy(logQueue, 'enqueue');
  const dispatch = spy(DiscordLogService, 'dispatchToDiscord', Promise.resolve());
  try {
    const params = { guildId: GUILD, module: 'MESSAGES' as const, type: 'MESSAGE_DELETE', actor: { id: 'u', tag: 'u#1' } };
    allOff();
    logService.emit(params);
    assert.equal(enqueue.calls + dispatch.calls, 0);
    only('logs');
    logService.emit(params);
    assert.equal(enqueue.calls, 1);
    assert.equal(dispatch.calls, 1);
  } finally {
    enqueue.restore();
    dispatch.restore();
    allOff();
  }
});

await check('événements Discord (réactions, salons, rôles, bans, invitations, suppression, vocal) : aucun service atteint', async () => {
  const client: any = new EventEmitter();
  client.guilds = { cache: new Map() };
  client.user = { id: 'bot-1' };
  registerEvents(client);
  const fire = (event: string, ...args: any[]) => {
    try {
      EventEmitter.prototype.emit.call(client, event, ...args);
    } catch {
      // un gestionnaire de journal peut se plaindre d'un faux objet incomplet : seul compte ce que les services reçoivent.
    }
  };
  const guild = fakeGuild();
  const member = fakeMember(guild);
  const S = {
    starAdd: spy(starboardService, 'handleReactionAdd'),
    starRemove: spy(starboardService, 'handleReactionRemove'),
    starClear: spy(starboardService, 'handleReactionClear'),
    starDelete: spy(starboardService, 'handleMessageDelete'),
    automodDelete: spy(autoModService, 'handleMessageDelete'),
    automodProfile: spy(autoModService, 'handleMemberProfile'),
    raidRole: spy(raidDetectionService, 'handleRoleEvent'),
    raidChannel: spy(raidDetectionService, 'handleChannelEvent'),
    raidAudit: spy(raidDetectionService, 'handleAuditLog'),
    inviteCreate: spy(inviteSnapshotService, 'handleInviteCreate'),
    inviteDelete: spy(inviteSnapshotService, 'handleInviteDelete'),
    voiceHub: spy(voiceService, 'handleVoiceStateUpdate'),
    statsVoice: spy(statsCollector, 'onVoiceStateUpdate'),
  };
  const message: any = { ...fakeMessage(guild), partial: false };
  const reaction: any = { partial: false, message, emoji: { name: '⭐' } };
  const role: any = { id: 'role-1', guild, name: 'r' };
  const channel: any = { id: 'chan-9', guild, name: 'c' };
  const voice: any = { guild, member, channelId: 'vc-1', id: member.id };
  const fireAll = () => {
    fire(Events.MessageReactionAdd, reaction, { bot: false });
    fire(Events.MessageReactionRemove, reaction, { bot: false });
    fire(Events.MessageReactionRemoveAll, message);
    fire(Events.MessageDelete, message);
    fire(Events.GuildMemberUpdate, member, member);
    fire(Events.GuildBanAdd, { guild, user: member.user });
    fire(Events.GuildRoleDelete, role);
    fire(Events.GuildRoleCreate, role);
    fire(Events.ChannelDelete, channel);
    fire(Events.ChannelCreate, channel);
    fire(Events.InviteCreate, { guild, code: 'abc' });
    fire(Events.InviteDelete, { guild, code: 'abc' });
    fire(Events.VoiceStateUpdate, voice, { ...voice, channelId: 'vc-2' });
    fire(Events.GuildAuditLogEntryCreate, { action: 22, executorId: 'x', targetId: 'y' }, guild);
  };
  try {
    allOff();
    fireAll();
    await new Promise((r) => setTimeout(r, 30));
    for (const [name, s] of Object.entries(S)) assert.equal(s.calls, 0, `${name} atteint alors que son module est désactivé`);

    applyModuleSelection(GUILD, MODULES.map((m) => m.id), 'DISCORD_COMMAND');
    fireAll();
    await new Promise((r) => setTimeout(r, 30));
    const unreached = Object.entries(S).filter(([, s]) => s.calls === 0).map(([n]) => n);
    assert.deepEqual(unreached, [], `contrôle : gestionnaires jamais atteints même module actif : ${unreached.join(', ')}`);
  } finally {
    Object.values(S).forEach((s) => s.restore());
    allOff();
  }
});

await check('vocal : le mode 24h/24 ne reconnecte pas le bot quand Musique est désactivé', async () => {
  allOff();
  const guild: any = fakeGuild();
  let looked = 0;
  guild.channels.cache = { get: () => { looked += 1; return undefined; } };
  assert.equal(await voiceStayService.ensure(guild, 'vc-1'), false);
  assert.equal(looked, 0, 'le salon n\'aurait même pas dû être consulté');
  only('music');
  await voiceStayService.ensure(guild, 'vc-1');
  assert.equal(looked, 1, 'contrôle : module actif => le salon est consulté');
  allOff();
});

await check('planificateurs : anniversaires, compteurs, sondages natifs, tickets, XP vocal, salons vocaux ne touchent à rien', async () => {
  effects.length = 0;
  const guild: any = fakeGuild();
  const channelsFetched: string[] = [];
  const client: any = { guilds: { cache: new Map([[GUILD, guild]]) }, channels: { fetch: async (id: string) => { channelsFetched.push(id); return null; } }, isReady: () => true };

  // Anniversaires : configuration interne active + heure atteinte, module coupé => rien n'est marqué comme annoncé.
  allOff();
  birthdayStorage.updateConfig(GUILD, { enabled: true, announceChannelId: 'chan-b', announceHour: 0 });
  birthdayService.initialize(client);
  await birthdayService.tick();
  assert.equal(birthdayStorage.getConfig(GUILD).lastAnnouncedDate ?? null, null, 'anniversaires : tick effectué alors que le module est désactivé');
  only('birthdays');
  await birthdayService.tick();
  assert.ok(birthdayStorage.getConfig(GUILD).lastAnnouncedDate, 'contrôle : module actif => le tick s\'exécute');
  birthdayService.destroy();

  // Salons compteurs.
  allOff();
  serverStatsStorage.updateConfig(GUILD, { enabled: true });
  serverStatsStorage.upsert({ guildId: GUILD, channelId: 'stat-1', type: 'members', template: 'Membres : {count}', roleId: null, lastValue: null } as any);
  serverStatsService.initialize(client);
  const refresh = spy(serverStatsService, 'refreshGuild', Promise.resolve(0));
  await serverStatsService.tick();
  assert.equal(refresh.calls, 0, 'compteurs rafraîchis alors que le module est désactivé');
  only('serverstats');
  await serverStatsService.tick();
  assert.equal(refresh.calls, 1, 'contrôle : module actif => rafraîchi');
  refresh.restore();
  serverStatsService.destroy();

  // Sondages natifs (lecture des messages Discord).
  const poll: any = { id: 'p1', guildId: GUILD, native: true, status: 'ACTIVE' };
  const getAll = spy(pollRepository, 'getAllPolls', [poll]);
  const sync = spy(nativePollService, 'sync', Promise.resolve(poll));
  allOff();
  await nativePollService.tick(client);
  assert.equal(sync.calls, 0, 'sondage consulté alors que le module est désactivé');
  only('polls');
  await nativePollService.tick(client);
  assert.equal(sync.calls, 1, 'contrôle : module actif => sondage suivi');
  getAll.restore();
  sync.restore();

  // Fermeture automatique des tickets inactifs.
  const tickets = spy(ticketRepository, 'getTickets', { tickets: [] });
  ticketRepository.saveConfig(GUILD, { ...ticketRepository.getConfig(GUILD), enabled: true });
  allOff();
  ticketRepository.saveConfig(GUILD, { ...ticketRepository.getConfig(GUILD), enabled: true }); // divergence : interrupteur propre rallumé
  await (TicketScheduler as any).checkInactivity(client);
  assert.equal(tickets.calls, 0, 'tickets inspectés alors que le module est désactivé');
  only('tickets');
  await (TicketScheduler as any).checkInactivity(client);
  assert.equal(tickets.calls, 1, 'contrôle : module actif => inspecté');
  tickets.restore();

  // XP vocal : le salon vocal n'est même pas parcouru.
  const { levelingStorage } = await import('../src/modules/leveling/storage/levelingStorage.js');
  let scanned = 0;
  guild.channels.cache = { values: () => { scanned += 1; return [][Symbol.iterator](); }, get: () => undefined };
  allOff();
  levelingStorage.updateConfig(GUILD, { enabled: true, voiceXpEnabled: true } as any);
  await levelingService.voiceTick(client);
  assert.equal(scanned, 0, 'XP vocal calculé alors que le module est désactivé');
  only('leveling');
  await levelingService.voiceTick(client);
  assert.equal(scanned, 1, 'contrôle : module actif => salons parcourus');

  // Salons vocaux temporaires : la récupération au démarrage ne lit ni ne supprime rien.
  const rooms = spy(voiceRepository, 'getRooms', []);
  allOff();
  await voiceService.initialize(client);
  assert.equal(rooms.calls, 0, 'récupération des salons vocaux alors que le module est désactivé');
  only('voice');
  await voiceService.initialize(client);
  assert.equal(rooms.calls, 1, 'contrôle : module actif => récupération effectuée');
  rooms.restore();

  assert.deepEqual(channelsFetched, [], 'aucun salon Discord ne devait être consulté');
  assert.deepEqual(effects.filter((e) => e !== 'guild.members.fetch' && e !== 'guild.channels.fetch'), [], 'effets de bord inattendus');
  allOff();
});

await check('analytics : compteurs anonymes toujours actifs (documenté) — aucun appel Discord', () => {
  // Décision produit ouverte : analyticsService n'a pas de module. On documente seulement qu'il n'a aucun effet Discord.
  analyticsService.recordJoin(GUILD, 'member-1');
  analyticsService.recordLeave(GUILD, 'member-1');
  assert.deepEqual(effects.filter((e) => e.startsWith('member.') || e.startsWith('message.') || e.startsWith('channel.')), []);
});

console.log(`\n🏁 ${passed} PASSED`);
process.exit(0);
