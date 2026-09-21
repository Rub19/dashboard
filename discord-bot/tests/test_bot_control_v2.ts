import { BotTelemetryService } from '../src/modules/botControl/services/botTelemetryService.js';
import { BotCommandStatsService } from '../src/modules/botControl/services/botCommandStatsService.js';
import { BotEventBusService } from '../src/modules/botControl/services/botEventBusService.js';
import { BotJobSchedulerService } from '../src/modules/botControl/services/botJobSchedulerService.js';
import { BotErrorIncidentService } from '../src/modules/botControl/services/botErrorIncidentService.js';
import { BotDiagnosticsService } from '../src/modules/botControl/services/botDiagnosticsService.js';
import { BotAiMonitorService } from '../src/modules/botControl/services/botAiMonitorService.js';
import { BotIntegrationsService } from '../src/modules/botControl/services/botIntegrationsService.js';
import { BotSecurityAuditService } from '../src/modules/botControl/services/botSecurityAuditService.js';
import { BotConfigService } from '../src/modules/botControl/services/botConfigService.js';
import { createBotControlRouter } from '../src/server/routes/botControlRoutes.js';
import { GatewayIntentBits, IntentsBitField } from 'discord.js';
import express from 'express';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING BOT CONTROL CENTER 2.0 AUTOMATED TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Realistic mock Client — a real discord.js Client's guilds.cache is a
  // Collection (extends Map, has .keys()/.get()/.size) and options.intents
  // is an IntentsBitField (has .has()). Used across telemetry, diagnostics,
  // security audit, and router tests.
  const mockGuildsCache = new Map([
    ['111111111111111111', { id: '111111111111111111', name: 'Test Guild 1' }],
    ['222222222222222222', { id: '222222222222222222', name: 'Test Guild 2' }],
  ]);
  const mockClient = {
    ws: { ping: 22, shards: { size: 1 } },
    guilds: { cache: mockGuildsCache },
    users: { cache: { size: 64 } },
    isReady: () => true,
    rest: {
      get: async () => ({ id: '000000000000000000', username: 'TestBot' }),
    },
    options: {
      intents: new IntentsBitField([GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]),
    },
  } as any;

  // 1. BotTelemetryService Tests
  console.log('\n--- 1. Testing BotTelemetryService ---');
  const telemetry = BotTelemetryService.getInstance();
  telemetry.attachClient(mockClient);
  telemetry.recordPing(22);
  telemetry.recordPing(28);
  const snapshot = telemetry.getTelemetrySnapshot(mockClient);
  assert(snapshot.memory.heapUsedMb > 0, 'Heap memory telemetry is positive number');
  assert(snapshot.latency.p50Ms > 0 && snapshot.latency.p95Ms >= snapshot.latency.p50Ms, 'P50 and P95 latency percentiles calculated correctly');
  // Real throughput (no more fake floor) only refreshes on a 60s interval
  // (see botTelemetryService.ts's refreshThroughput), so a freshly started
  // instance legitimately reads 0 here rather than a synchronously-testable
  // positive number — asserting the field is a valid, well-formed reading is
  // what's actually testable without a 60s sleep.
  assert(snapshot.throughput.eventsPerMinute >= 0, 'Event throughput field is a valid non-negative reading');

  const subsystems = telemetry.getSubsystemsHealth(mockClient);
  assert(subsystems.gateway === 'operational', 'Gateway health is operational');
  assert(subsystems.database === 'operational', 'Database health is operational');
  assert(subsystems.aiProvider === 'operational', 'AI provider health is operational');

  const globalStatus = telemetry.getGlobalStatus(mockClient);
  assert(globalStatus.status === 'operational', 'Global status computes operational by default');
  assert(globalStatus.activeModulesCount > 0, 'Active modules count is positive');

  // 2. (Removed) BotModuleRegistryService was a hardcoded, in-memory, global module
  // toggle with fabricated stats and zero effect on real bot behavior. It has been
  // deleted in favor of the real, guild-scoped module system in moduleRoutes.ts
  // (backed by guildConfigService, shared with the /module Discord command).

  // 3. BotCommandStatsService Tests
  console.log('\n--- 3. Testing BotCommandStatsService ---');
  const commandStats = BotCommandStatsService.getInstance();
  const commands = commandStats.getAllCommands();
  assert(commands.length >= 20, `Command catalog contains at least 20 commands (found: ${commands.length})`);

  commandStats.recordCommandExecution('voice', 32, true);
  const voiceCmd = commands.find((c) => c.name === 'voice');
  assert(voiceCmd !== undefined && voiceCmd.totalExecutions > 0, 'Command execution count and latency updated');

  // 4. BotEventBusService Tests
  console.log('\n--- 4. Testing BotEventBusService ---');
  const eventBus = BotEventBusService.getInstance();
  eventBus.recordEvent('interactionCreate', 12, true);
  const eventBusStats = eventBus.getEventBusStats();
  assert(eventBusStats.totalProcessed > 0, 'Event bus total processed count is tracked');
  assert(eventBusStats.topEvents.length > 0, 'Event bus ranks top Discord event types');

  // 5. BotJobSchedulerService Tests
  console.log('\n--- 5. Testing BotJobSchedulerService ---');
  const jobScheduler = BotJobSchedulerService.getInstance();
  jobScheduler.track('analytics_buffer_flush', () => {});
  jobScheduler.track('xp_buffer_flush', () => {});
  jobScheduler.track('backup_scheduler', () => {});
  jobScheduler.track('birthdays_tick', () => {});
  jobScheduler.track('events_scheduler', () => {});
  jobScheduler.track('reminders_tick', () => {});

  const jobs = jobScheduler.getAllJobs();
  assert(jobs.length >= 6, `Job scheduler has registered background tasks (found: ${jobs.length})`);

  const ranJob = await jobScheduler.runJob('analytics_buffer_flush');
  assert(ranJob.totalRuns > 0 && ranJob.status === 'idle', 'Manual execution of idempotent job succeeds');

  // 6. BotErrorIncidentService Tests
  console.log('\n--- 6. Testing BotErrorIncidentService ---');
  const errorIncidents = BotErrorIncidentService.getInstance();
  const err1 = errorIncidents.recordError('DiscordAPIError[50001]: Missing Access', 'security', 'error');
  assert(err1.fingerprint.startsWith('security_'), 'Error fingerprint generated with module prefix');

  // Test deduplication
  const errDuplicate = errorIncidents.recordError('DiscordAPIError[50001]: Missing Access', 'security', 'error');
  assert(errDuplicate.fingerprint === err1.fingerprint && errDuplicate.occurrences >= 2, 'Duplicate error messages group into single fingerprint');

  const resolved = errorIncidents.resolveFingerprint(err1.fingerprint);
  assert(resolved === true, 'Error fingerprint marked resolved successfully');

  // 7. BotDiagnosticsService
  console.log('\n--- 7. Testing BotDiagnosticsService ---');
  const diagnostics = BotDiagnosticsService.getInstance();
  const diagResults = await diagnostics.runFullDiagnostics(mockClient);
  assert(diagResults.length >= 6, `Full self-diagnostic suite executed checks (found: ${diagResults.length})`);
  assert(diagResults.every((d) => d.status === 'pass' || d.status === 'warn'), 'All diagnostic checks pass without fatal critical error');

  // 8. BotAiMonitorService Tests
  console.log('\n--- 8. Testing BotAiMonitorService ---');
  const aiMonitor = BotAiMonitorService.getInstance();
  aiMonitor.recordAiUsage(1200, 350);
  const aiStats = aiMonitor.getAiStats();
  assert(aiStats.totalTokens24h > 0, 'AI total token usage is accumulated');
  assert(aiStats.estimatedCostTodayUsd >= 0, 'AI daily spend cost is calculated');
  assert(aiStats.dailyBudgetUsd > 0, 'Daily budget ceiling is enforced');

  // 9. BotIntegrationsService Tests
  console.log('\n--- 9. Testing BotIntegrationsService ---');
  const integrations = BotIntegrationsService.getInstance();
  const integList = await integrations.getAllIntegrations(mockClient);
  assert(integList.length >= 1, `Core integrations registered (found: ${integList.length})`);
  const pinged = await integrations.testIntegration('integ_discord_rest', mockClient);
  assert(pinged.latencyMs >= 0, 'Live integration ping returns latency');

  // 10. BotSecurityAuditService Tests
  console.log('\n--- 10. Testing BotSecurityAuditService ---');
  const security = BotSecurityAuditService.getInstance();
  const audit = security.getSecurityAudit(mockClient);
  assert(audit.intents.guildMembers === true, 'Privileged Guild Members intent validated');
  assert(audit.intents.messageContent === true, 'Privileged Message Content intent validated');
  assert(audit.intents.guildPresences === false, 'Non-granted Guild Presences intent correctly reported as false');
  assert(audit.adminGuildsCount === 2, 'Guild count reflects the real mock guilds.cache size');
  assert(audit.tokenLeakedInLogs === false, 'Zero leak audit confirms tokens are scrubbed');

  // getSecurityAudit() must also stay safe with no client at all (e.g. before
  // the gateway has connected) — defaults to the most-restrictive false
  // rather than throwing or fabricating true.
  const auditNoClient = security.getSecurityAudit();
  assert(
    auditNoClient.intents.guildMembers === false && auditNoClient.intents.messageContent === false,
    'getSecurityAudit() with no client defaults intents to false, not fabricated true'
  );

  // 11. BotConfigService Tests
  console.log('\n--- 11. Testing BotConfigService ---');
  const configService = BotConfigService.getInstance();
  const initialSettings = configService.getSettings();
  assert(initialSettings.maintenanceMode === false, 'Maintenance mode is off by default');

  const updatedSettings = configService.updateSettings({ maintenanceMode: true, logLevel: 'debug' });
  assert(updatedSettings.maintenanceMode === true && updatedSettings.logLevel === 'debug', 'Bot settings updated successfully');
  configService.updateSettings({ maintenanceMode: false, logLevel: 'info' }); // restore

  // 12. BotControlRouter HTTP Route Tests — reuses the same mockClient
  // constructed above (real Map-backed guilds.cache + a working
  // options.intents.has()) so the /security route exercises the exact same
  // shape the assertions above already validated.
  console.log('\n--- 12. Testing BotControlRouter Express Endpoints ---');
  const app = express();
  app.use(express.json());
  app.use('/api/bot', createBotControlRouter(mockClient));

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const routesToTest = [
    '/overview',
    '/telemetry',
    '/commands',
    '/events',
    '/jobs',
    '/errors',
    '/performance',
    '/ai',
    '/integrations',
    '/security',
    '/settings',
  ];

  for (const r of routesToTest) {
    const res = await fetch(`${baseUrl}/api/bot${r}`);
    const data = await res.json() as any;
    assert(res.status === 200 && data.success === true, `GET /api/bot${r} responds 200 OK with success=true`);
  }

  await new Promise<void>((resolve) => {
    (server as any).closeAllConnections?.();
    server.close(() => resolve());
  });

  console.log('\n====================================================');
  console.log(`🏁 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
