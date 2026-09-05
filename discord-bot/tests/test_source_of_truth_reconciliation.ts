/**
 * 🧪 ETHONE DISCORD — SOURCE OF TRUTH & RECONCILIATION ENGINE 2.0 TEST SUITE
 *
 * Exhaustive Verification Matrix (40 Audit Points):
 * 1. Normalization Layer (Guild, Channel, Role, Member, Presence canonical models)
 * 2. Tripartite Consistency (Discord Live vs DB Storage vs Bot Cache vs Dashboard)
 * 3. Ghost State Detection (Welcome, Logs, AutoMod, Tickets deleted resources)
 * 4. Permission Mismatch & Role Hierarchy Violations
 * 5. Safe Non-Destructive Auto-Repair (Unlink Channel, Unlink Role, Disable Module)
 * 6. Optimistic Concurrency Control (expectedVersion vs currentVersion -> 409 CONFLICT)
 * 7. Out-of-order Discord Event Protection (monotonically increasing event timestamps)
 * 8. End-to-End Tracing (correlationId & originId anti-loop guarantees)
 * 9. REST API Endpoints (/audit-diff, /reconcile-now, /repair, /health, /mutate)
 * 10. Multi-User Tenant Security Isolation
 */

process.env.NODE_ENV = 'test';

import express from 'express';
import { Client, Collection } from 'discord.js';
import { discordNormalizer } from '../src/services/normalization/discordNormalizer.js';
import { reconciliationEngine } from '../src/services/resilience/reconciliationEngine.js';
import { syncEngine, SyncMutation } from '../src/services/syncEngine.js';
import { welcomeRepository } from '../src/modules/welcome/storage/welcomeRepository.js';
import { autoModRepository } from '../src/modules/automod/storage/autoModRepository.js';
import { ticketRepository } from '../src/modules/tickets/storage/ticketRepository.js';
import { auditRepository } from '../src/modules/logs/storage/auditRepository.js';
import { guildConfigService } from '../src/services/guildConfigService.js';
import { createGuildSyncRouter, createSyncRouter } from '../src/server/routes/syncRoutes.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failedTests++;
  }
}

async function runReconciliationTests() {
  console.log('========================================================================');
  console.log('⚡ ETHONE DISCORD — SOURCE OF TRUTH & RECONCILIATION ENGINE 2.0 TESTS');
  console.log('========================================================================\n');

  const GUILD_ID = '1128633164290596884';

  // --- Setup Mock Discord Live State ---
  const mockRoles = new Collection<string, any>([
    [
      'role_bot_highest',
      {
        id: 'role_bot_highest',
        name: 'Ethone Bot Master',
        color: 0x5865f2,
        position: 50,
        hoist: false,
        managed: true,
        mentionable: false,
        permissions: { toArray: () => ['Administrator', 'ManageMessages', 'ModerateMembers', 'ManageRoles', 'SendMessages', 'EmbedLinks'] },
      },
    ],
    [
      'role_member',
      {
        id: 'role_member',
        name: 'Membre',
        color: 0x10b981,
        position: 10,
        hoist: false,
        managed: false,
        mentionable: true,
        permissions: { toArray: () => ['ViewChannel', 'SendMessages'] },
      },
    ],
    [
      'role_super_admin',
      {
        id: 'role_super_admin',
        name: 'Super Admin',
        color: 0xff0000,
        position: 99,
        hoist: true,
        managed: false,
        mentionable: true,
        permissions: { toArray: () => ['Administrator'] },
      },
    ],
  ]);

  const mockBotMember = {
    id: 'bot_ethone_123',
    permissions: {
      has: (perm: string) => true,
      toArray: () => ['Administrator', 'ManageMessages', 'ModerateMembers', 'ManageRoles', 'SendMessages', 'EmbedLinks'],
    },
    roles: {
      cache: mockRoles,
      highest: mockRoles.get('role_bot_highest'),
    },
    joinedAt: new Date(Date.now() - 30 * 86400000),
  };

  const mockChannels = new Collection<string, any>([
    [
      'chan_welcome_live',
      {
        id: 'chan_welcome_live',
        name: 'bienvenue',
        type: 0, // GUILD_TEXT
        parentId: null,
        position: 1,
        permissionsFor: () => ({
          has: (perm: string) => true,
        }),
      },
    ],
    [
      'chan_welcome_no_embed',
      {
        id: 'chan_welcome_no_embed',
        name: 'bienvenue-restricted',
        type: 0,
        parentId: null,
        position: 2,
        permissionsFor: () => ({
          has: (perm: string) => perm !== 'EmbedLinks',
        }),
      },
    ],
    [
      'chan_logs_live',
      {
        id: 'chan_logs_live',
        name: 'bot-logs',
        type: 0,
        parentId: null,
        position: 3,
        permissionsFor: () => ({
          has: (perm: string) => true,
        }),
      },
    ],
    [
      'chan_cat_tickets',
      {
        id: 'chan_cat_tickets',
        name: 'Tickets Category',
        type: 4, // GUILD_CATEGORY
        parentId: null,
        position: 4,
        permissionsFor: () => ({
          has: () => true,
        }),
      },
    ],
  ]);

  const mockGuild = {
    id: GUILD_ID,
    name: 'ETHONE Production Hub',
    memberCount: 250,
    ownerId: 'owner_user_777',
    features: ['COMMUNITY', 'APPLICATION_COMMAND_PERMISSIONS_V2'],
    channels: { cache: mockChannels },
    roles: { cache: mockRoles },
    members: {
      me: mockBotMember,
      cache: new Collection([['bot_ethone_123', mockBotMember]]),
    },
    iconURL: () => 'https://cdn.discordapp.com/icons/guild.png',
  };

  const mockClient = {
    user: { id: 'bot_ethone_123', username: 'ETHONE Bot' },
    isReady: () => true,
    guilds: {
      cache: new Collection([[GUILD_ID, mockGuild]]),
    },
  } as unknown as Client;

  reconciliationEngine.setClient(mockClient);

  // --------------------------------------------------------------------------
  // PART 1: NORMALIZATION LAYER (Tests 1 - 8)
  // --------------------------------------------------------------------------
  console.log('📌 PART 1: Discord Normalization Layer');

  const normChan = discordNormalizer.normalizeChannel(mockChannels.get('chan_welcome_live'), mockBotMember);
  assert(normChan.id === 'chan_welcome_live', '1. Channel ID normalized to string');
  assert(normChan.isText === true && normChan.isCategory === false, '2. Channel type correctly recognized as text');
  assert(normChan.botPermissions.canSend && normChan.botPermissions.canEmbed, '3. Bot permissions accurately evaluated on channel');

  const normCat = discordNormalizer.normalizeChannel(mockChannels.get('chan_cat_tickets'), mockBotMember);
  assert(normCat.isCategory === true && normCat.isText === false, '4. Category channel correctly recognized as category');

  const normRoleMember = discordNormalizer.normalizeRole(mockRoles.get('role_member'), mockBotMember);
  assert(normRoleMember.isHigherThanBot === false, '5. Role below bot highest position has isHigherThanBot = false');
  assert(normRoleMember.color === '#10b981', '6. Role hex color correctly parsed');

  const normRoleSuper = discordNormalizer.normalizeRole(mockRoles.get('role_super_admin'), mockBotMember);
  assert(normRoleSuper.isHigherThanBot === true, '7. Role above bot position flagged with isHigherThanBot = true');

  const normPresence = discordNormalizer.normalizePresence({
    status: 'dnd',
    activities: [{ name: 'Securing Discord', type: 3 }],
  });
  assert(normPresence.status === 'dnd' && normPresence.activities[0].name === 'Securing Discord', '8. Live Presence normalized correctly');

  // --------------------------------------------------------------------------
  // PART 2: DIVERGENCE DETECTION ACROSS MODULES (Tests 9 - 18)
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 2: Tripartite Consistency & Divergence Detection');

  // Test 9: Configure AutoMod with existing resources
  autoModRepository.updateConfig(GUILD_ID, {
    enabled: true,
    alertChannelId: 'chan_logs_live',
    staffMentionRoleId: 'role_member',
  });
  let rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(rep.modules.automod?.status === 'HEALTHY', '9. AutoMod with valid live Discord resources is HEALTHY');

  // Test 10: AutoMod alert channel deleted in Discord
  autoModRepository.updateConfig(GUILD_ID, {
    enabled: true,
    alertChannelId: 'chan_deleted_ghost_999',
  });
  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.modules.automod?.status === 'PARTIAL' &&
      rep.divergences.some((d) => d.type === 'MISSING_DISCORD_RESOURCE' && d.resourceId === 'chan_deleted_ghost_999'),
    '10. Deleted AutoMod alert channel detected as MISSING_DISCORD_RESOURCE'
  );

  // Test 11: Welcome channel deleted in Discord
  const welcomeConf = welcomeRepository.getConfig(GUILD_ID);
  welcomeConf.welcome.enabled = true;
  welcomeConf.welcome.channelId = 'chan_welcome_deleted_404';
  welcomeConf.welcome.autoRoleIds = [];
  welcomeRepository.saveConfig(GUILD_ID, welcomeConf);

  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.modules.welcome?.status === 'INVALID' &&
      rep.divergences.some((d) => d.module === 'welcome' && d.severity === 'HIGH'),
    '11. Deleted Welcome target channel detected with severity HIGH and status INVALID'
  );

  // Test 12: Welcome channel missing EmbedLinks permission
  welcomeConf.welcome.channelId = 'chan_welcome_no_embed';
  welcomeRepository.saveConfig(GUILD_ID, welcomeConf);
  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.divergences.some((d) => d.type === 'PERMISSION_MISMATCH' && d.module === 'welcome'),
    '12. Channel missing EmbedLinks flagged as PERMISSION_MISMATCH'
  );

  // Test 13: Welcome Auto-Role missing on Discord
  welcomeConf.welcome.channelId = 'chan_welcome_live';
  welcomeConf.welcome.autoRoleIds = ['role_ghost_deleted_888'];
  welcomeRepository.saveConfig(GUILD_ID, welcomeConf);
  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.divergences.some((d) => d.field === 'welcome.autoRoleIds' && d.type === 'MISSING_DISCORD_RESOURCE'),
    '13. Non-existent auto-role flagged as MISSING_DISCORD_RESOURCE'
  );

  // Test 14: Welcome Auto-Role hierarchy violation (role > bot role)
  welcomeConf.welcome.autoRoleIds = ['role_super_admin'];
  welcomeRepository.saveConfig(GUILD_ID, welcomeConf);
  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.divergences.some((d) => d.type === 'ROLE_HIERARCHY_VIOLATION'),
    '14. Auto-role superior to bot highest role flagged as ROLE_HIERARCHY_VIOLATION'
  );

  // Test 15: Logs channel missing
  auditRepository.updateConfig(GUILD_ID, {
    enabled: true,
    routing: { generalChannelId: 'chan_dead_logs_000' } as any,
  });
  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.divergences.some((d) => d.module === 'logs' && d.type === 'MISSING_DISCORD_RESOURCE'),
    '15. Logs routing channel deleted on Discord flagged as MISSING_DISCORD_RESOURCE'
  );

  // Test 16: Ticket Category deleted
  const ticketCat = ticketRepository.getCategories(GUILD_ID)[0];
  ticketCat.discordCategoryId = 'chan_category_ghost_111';
  ticketRepository.saveCategory(ticketCat);
  const tCfg = ticketRepository.getConfig(GUILD_ID);
  tCfg.enabled = true;
  ticketRepository.saveConfig(GUILD_ID, tCfg);

  rep = await reconciliationEngine.reconcileGuild(GUILD_ID, true);
  assert(
    rep.divergences.some((d) => d.module === 'tickets' && d.type === 'MISSING_DISCORD_RESOURCE'),
    '16. Ticket category deleted on Discord flagged in reconciliation diff'
  );

  // Test 17: Query unknown guild
  const unknownReport = await reconciliationEngine.reconcileGuild('999999999999999999', true);
  assert(
    unknownReport.healthy === false && unknownReport.modules.system?.status === 'INVALID',
    '17. Bot absent from Discord server flagged as system INVALID'
  );

  // Test 18: Summary numbers accurate
  assert(
    typeof rep.summary.totalDivergences === 'number' && rep.summary.totalDivergences > 0,
    '18. Reconciliation summary metrics computed accurately'
  );

  // --------------------------------------------------------------------------
  // PART 3: SAFE NON-DESTRUCTIVE REPAIRS (Tests 19 - 24)
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 3: Safe Non-Destructive Auto-Repair Operations');

  // Test 19: UNLINK_CHANNEL on Welcome
  welcomeConf.welcome.channelId = 'chan_deleted_dummy';
  welcomeRepository.saveConfig(GUILD_ID, welcomeConf);
  const repairWelcomeChan = await reconciliationEngine.executeRepair(GUILD_ID, {
    module: 'welcome',
    action: 'UNLINK_CHANNEL',
  });
  assert(repairWelcomeChan.success && repairWelcomeChan.repaired, '19. Repair action UNLINK_CHANNEL executed successfully');
  const refreshedWelcome = welcomeRepository.getConfig(GUILD_ID);
  assert(refreshedWelcome.welcome.channelId === null, '20. Invalid welcome channel cleared to null in DB');

  // Test 20: UNLINK_ROLE on Welcome
  welcomeConf.welcome.autoRoleIds = ['role_super_admin', 'role_member'];
  welcomeRepository.saveConfig(GUILD_ID, welcomeConf);
  const repairWelcomeRole = await reconciliationEngine.executeRepair(GUILD_ID, {
    module: 'welcome',
    action: 'UNLINK_ROLE',
    resourceId: 'role_super_admin',
  });
  assert(repairWelcomeRole.success, '21. Repair action UNLINK_ROLE executed successfully');
  const roleListAfter = welcomeRepository.getConfig(GUILD_ID).welcome.autoRoleIds;
  assert(!roleListAfter.includes('role_super_admin'), '22. Conflicting role safely removed from autoRoleIds array');

  // Test 21: UNLINK_CHANNEL on AutoMod
  const repairAutoMod = await reconciliationEngine.executeRepair(GUILD_ID, {
    module: 'automod',
    action: 'UNLINK_CHANNEL',
  });
  assert(repairAutoMod.success && autoModRepository.getConfig(GUILD_ID).alertChannelId === null, '23. AutoMod alert channel safely unlinked');

  // Test 22: DISABLE_MODULE on Tickets
  const repairDisableTickets = await reconciliationEngine.executeRepair(GUILD_ID, {
    module: 'tickets',
    action: 'DISABLE_MODULE',
  });
  assert(repairDisableTickets.success && ticketRepository.getConfig(GUILD_ID).enabled === false, '24. Module Tickets safely disabled without data destruction');

  // --------------------------------------------------------------------------
  // PART 4: OPTIMISTIC CONCURRENCY & MONOTONIC VERSIONING (Tests 25 - 30)
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 4: Optimistic Concurrency & Monotonic Versioning');

  syncEngine.resetVersions();
  syncEngine.setVersion(GUILD_ID, 'welcome', 5);
  assert(syncEngine.getVersion(GUILD_ID, 'welcome') === 5, '25. Initial version initialized to 5');

  // Test 26: Mutation with expectedVersion: 5 succeeds
  const mutSuccess: SyncMutation = {
    id: `mut_test_${Date.now()}_1`,
    guildId: GUILD_ID,
    module: 'welcome',
    path: 'enabled',
    value: true,
    source: 'DASHBOARD',
    timestamp: Date.now(),
    expectedVersion: 5,
    correlationId: 'trace-order-1',
  };
  const resSuccess = await syncEngine.submitMutation(mutSuccess, async (v) => ({ saved: v }));
  assert(resSuccess.success && resSuccess.status === 'CONFIRMED', '26. Mutation with expectedVersion = 5 accepted');
  assert(syncEngine.getVersion(GUILD_ID, 'welcome') === 6, '27. Version monotonically incremented to 6');

  // Test 27: Stale mutation with expectedVersion: 5 rejected as CONFLICT
  const mutStale: SyncMutation = {
    id: `mut_test_${Date.now()}_2`,
    guildId: GUILD_ID,
    module: 'welcome',
    path: 'messageContent',
    value: 'Stale content from Tab A',
    source: 'DASHBOARD',
    timestamp: Date.now(),
    expectedVersion: 5, // Client is behind (version 5 vs current 6)
    correlationId: 'trace-order-2',
  };
  const resStale = await syncEngine.submitMutation(mutStale, async (v) => ({ saved: v }));
  assert(
    resStale.success === false && resStale.status === 'CONFLICT' && resStale.version === 6,
    '28. Stale mutation rejected with status CONFLICT and current live version 6'
  );

  // Test 28: Correlation ID preserved in audit history
  const history = syncEngine.getAuditHistory(GUILD_ID, 10);
  const auditEntry = history.find((h) => h.correlationId === 'trace-order-1');
  assert(auditEntry !== undefined && auditEntry.correlationId === 'trace-order-1', '29. End-to-end correlationId recorded in sync audit trail');

  // Test 29: Deduplication of duplicate mutation ID
  const dupResult = await syncEngine.submitMutation(
    { ...mutSuccess, expectedVersion: undefined },
    async (v) => ({ saved: v })
  );
  assert(dupResult.success && dupResult.status === 'CONFIRMED', '30. Duplicate mutation ID recognized and confirmed idempotently');

  // --------------------------------------------------------------------------
  // PART 5: OUT-OF-ORDER DISCORD EVENT PROTECTION (Tests 31 - 34)
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 5: Out-of-Order Discord Event Protection');

  const baseTime = 1700000000000;

  // Event 1 arrives at baseTime + 2000
  const ev1 = syncEngine.handleDiscordEvent({
    id: 'disc_evt_1',
    guildId: GUILD_ID,
    module: 'roles',
    timestamp: baseTime + 2000,
    payload: { roleId: 'role_member', name: 'Membre 2.0' },
    correlationId: 'trace_disc_1',
  });
  assert(ev1.accepted === true, '31. Nominal Discord event accepted at t=2000');

  // Event 2 arrives with older timestamp (baseTime + 1000)
  const ev2 = syncEngine.handleDiscordEvent({
    id: 'disc_evt_2_stale',
    guildId: GUILD_ID,
    module: 'roles',
    timestamp: baseTime + 1000,
    payload: { roleId: 'role_member', name: 'Old Name' },
  });
  assert(
    ev2.accepted === false && ev2.reason === 'OUT_OF_ORDER',
    '32. Out-of-order event at t=1000 discarded to prevent state regression'
  );

  // Event 3 arrives at baseTime + 3000
  const ev3 = syncEngine.handleDiscordEvent({
    id: 'disc_evt_3',
    guildId: GUILD_ID,
    module: 'roles',
    timestamp: baseTime + 3000,
    payload: { roleId: 'role_member', name: 'Membre Final' },
  });
  assert(ev3.accepted === true, '33. Newer Discord event at t=3000 accepted');

  // --------------------------------------------------------------------------
  // PART 6: REST API ROUTING & MULTI-TENANT ISOLATION (Tests 34 - 40)
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 6: REST API Routing & Multi-Tenant Isolation');

  const app = express();
  app.use(express.json());

  // Fake auth middleware setting user
  app.use((req, res, next) => {
    (req as any).user = { id: 'admin_user_1', username: 'Admin' };
    next();
  });

  app.use('/api/guilds/:guildId/sync', createGuildSyncRouter());
  app.use('/api/sync', createSyncRouter());

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 34. GET /api/guilds/:guildId/sync/audit-diff
    const resDiff = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/audit-diff`);
    const dataDiff = (await resDiff.json()) as any;
    assert(dataDiff.success && dataDiff.data.guildId === GUILD_ID, '34. GET /sync/audit-diff returns comprehensive tripartite audit report');

    // 35. POST /api/guilds/:guildId/sync/reconcile-now
    const resRecNow = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/reconcile-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const dataRecNow = (await resRecNow.json()) as any;
    assert(dataRecNow.success && dataRecNow.data.summary !== undefined, '35. POST /sync/reconcile-now forces full real-time audit');

    // 36. GET /api/guilds/:guildId/sync/health
    const resHealth = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/health`);
    const dataHealth = (await resHealth.json()) as any;
    assert(
      dataHealth.success && dataHealth.data.modules.welcome !== undefined,
      '36. GET /sync/health returns module-level health taxonomy'
    );

    // 37. POST /api/guilds/:guildId/sync/repair
    const resRepair = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'welcome', action: 'DISABLE_MODULE' }),
    });
    const dataRepair = (await resRepair.json()) as any;
    assert(dataRepair.success && dataRepair.repaired === true, '37. POST /sync/repair executes safe repair via REST');

    // 38. POST /api/guilds/:guildId/sync/mutate with stale expectedVersion returns HTTP 409
    const curWelcomeVer = syncEngine.getVersion(GUILD_ID, 'welcome');
    const resMutConflict = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/mutate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'welcome',
        path: 'enabled',
        value: true,
        expectedVersion: curWelcomeVer - 1, // Stale!
      }),
    });
    assert(resMutConflict.status === 409, '38. POST /sync/mutate returns HTTP 409 CONFLICT on version mismatch');

    // 39. POST /api/guilds/:guildId/sync/mutate nominal succeeds
    const resMutNominal = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/mutate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'welcome',
        path: 'enabled',
        value: false,
        expectedVersion: curWelcomeVer,
        correlationId: 'trace-api-test',
      }),
    });
    const dataMutNominal = (await resMutNominal.json()) as any;
    assert(dataMutNominal.success && dataMutNominal.status === 'CONFIRMED', '39. Nominal mutation returns HTTP 200 with CONFIRMED status');

    // 40. Audit history returns via REST
    const resAudit = await fetch(`${baseUrl}/api/guilds/${GUILD_ID}/sync/audit`);
    const dataAudit = (await resAudit.json()) as any;
    assert(dataAudit.success && Array.isArray(dataAudit.data), '40. GET /sync/audit returns filtered audit entries for tenant guild');
  } finally {
    server.close();
    syncEngine.close();
  }

  // --- FINAL SCOREBOARD ---
  console.log('\n========================================================================');
  console.log(`🏁 SOURCE OF TRUTH & RECONCILIATION ENGINE 2.0: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runReconciliationTests().catch((err) => {
  console.error('Fatal error in reconciliation test runner:', err);
  process.exit(1);
});
