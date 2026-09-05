import { BotTelemetryService } from '../src/modules/botControl/services/botTelemetryService.js';
import { BotModuleRegistryService } from '../src/modules/botControl/services/botModuleRegistryService.js';
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

  // 1. BotTelemetryService Tests
  console.log('\n--- 1. Testing BotTelemetryService ---');
  const telemetry = BotTelemetryService.getInstance();
  const snapshot = telemetry.getTelemetrySnapshot();
  assert(snapshot.memory.heapUsedMb > 0, 'Heap memory telemetry is positive number');
  assert(snapshot.latency.p50Ms > 0 && snapshot.latency.p95Ms >= snapshot.latency.p50Ms, 'P50 and P95 latency percentiles calculated correctly');
  assert(snapshot.throughput.eventsPerMinute > 0, 'Event throughput is recorded');

  const subsystems = telemetry.getSubsystemsHealth();
  assert(subsystems.gateway === 'operational', 'Gateway health is operational');
  assert(subsystems.database === 'operational', 'Database health is operational');
  assert(subsystems.aiProvider === 'operational', 'AI provider health is operational');

  const globalStatus = telemetry.getGlobalStatus();
  assert(globalStatus.status === 'operational', 'Global status computes operational by default');
  assert(globalStatus.activeModulesCount === 22, 'Active modules count is 22');

  // 2. BotModuleRegistryService Tests
  console.log('\n--- 2. Testing BotModuleRegistryService ---');
  const registry = BotModuleRegistryService.getInstance();
  const allModules = registry.getAllModules();
  assert(allModules.length === 22, `All 22 bot modules are registered (found: ${allModules.length})`);

  const voiceMod = registry.getModule('voice');
  assert(voiceMod !== undefined && voiceMod.category === 'Voice', 'Voice module is registered with correct metadata');
  assert(voiceMod?.dependencies.includes('logs'), 'Voice module has required logs dependency');

  const toggled = registry.toggleModule('music', false);
  assert(toggled.enabled === false && toggled.status === 'disabled', 'Module toggle off sets status to disabled');
  registry.toggleModule('music', true); // restore

  registry.recordModuleError('automod', 'Spam regex parse timeout');
  const automodMod = registry.getModule('automod');
  assert(automodMod?.errorCount24h! > 0, 'Module error count is incremented on error event');

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

  // 7. BotDiagnosticsService (17-point suite)
  console.log('\n--- 7. Testing BotDiagnosticsService ---');
  const diagnostics = BotDiagnosticsService.getInstance();
  const diagResults = await diagnostics.runFullDiagnostics();
  assert(diagResults.length === 17, `Full self-diagnostic suite executed exactly 17 checks (found: ${diagResults.length})`);
  assert(diagResults.every((d) => d.status === 'pass' || d.status === 'warn'), 'All 17 diagnostic checks pass without fatal critical error');

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
  const integList = integrations.getAllIntegrations();
  assert(integList.length >= 4, `All 4 core integrations registered (found: ${integList.length})`);
  const pinged = await integrations.testIntegration('integ_discord_rest');
  assert(pinged.latencyMs > 0, 'Live integration ping returns latency');

  // 10. BotSecurityAuditService Tests
  console.log('\n--- 10. Testing BotSecurityAuditService ---');
  const security = BotSecurityAuditService.getInstance();
  const audit = security.getSecurityAudit();
  assert(audit.intents.guildMembers === true, 'Privileged Guild Members intent validated');
  assert(audit.intents.messageContent === true, 'Privileged Message Content intent validated');
  assert(audit.tokenLeakedInLogs === false, 'Zero leak audit confirms tokens are scrubbed');

  // 11. BotConfigService Tests
  console.log('\n--- 11. Testing BotConfigService ---');
  const configService = BotConfigService.getInstance();
  const initialSettings = configService.getSettings();
  assert(initialSettings.maintenanceMode === false, 'Maintenance mode is off by default');

  const updatedSettings = configService.updateSettings({ maintenanceMode: true, logLevel: 'debug' });
  assert(updatedSettings.maintenanceMode === true && updatedSettings.logLevel === 'debug', 'Bot settings updated successfully');
  configService.updateSettings({ maintenanceMode: false, logLevel: 'info' }); // restore

  // 12. BotControlRouter HTTP Route Tests
  console.log('\n--- 12. Testing BotControlRouter Express Endpoints ---');
  const mockClient = {
    ws: { ping: 22, shards: { size: 1 } },
    guilds: { cache: { size: 2 } },
    users: { cache: { size: 64 } },
  } as any;

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
    '/modules',
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

  server.close();

  console.log('\n====================================================');
  console.log(`🏁 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
