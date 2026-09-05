import { PresenceService } from '../src/modules/presence/services/presenceService.js';
import { ActivityRotationEngine } from '../src/modules/presence/services/activityRotationEngine.js';
import { PresenceSchedulerService } from '../src/modules/presence/services/presenceSchedulerService.js';
import { SmartPresenceEngine } from '../src/modules/presence/services/smartPresenceEngine.js';
import { BotIdentityService } from '../src/modules/presence/services/botIdentityService.js';
import { createPresenceRouter } from '../src/server/routes/presenceRoutes.js';
import { config } from '../src/config.js';
import express from 'express';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING BOT PRESENCE & IDENTITY 2.0 AUTOMATED TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Bot Owner Single Source of Truth
  console.log('\n--- 1. Testing Bot Owner Configuration ---');
  assert(config.botOwnerId === '825124006209388616', 'Bot Owner ID is 825124006209388616');

  // 2. PresenceService Tests
  console.log('\n--- 2. Testing PresenceService ---');
  const presenceService = PresenceService.getInstance();
  const initialState = presenceService.getCurrentState();
  assert(initialState.status === 'online', 'Initial status is online');
  assert(initialState.scope === 'global', 'Scope is correctly tagged as global');

  // Variable parsing
  const parsed = presenceService.parseDynamicVariables('{guildCount} serveurs et {uptime} en ligne');
  assert(!parsed.includes('{guildCount}'), 'Variable {guildCount} is substituted with real count');

  // Update presence
  const res1 = presenceService.updatePresence('idle', { type: 'Watching', name: 'ETHONE Stream' });
  assert(res1.state.status === 'idle', 'Status updated to idle');
  assert(res1.state.activity.type === 'Watching', 'Activity type set to Watching');

  // Streaming URL validation
  const resStream = presenceService.updatePresence('online', { type: 'Streaming', name: 'Live', url: 'https://twitch.tv/ethone' });
  assert(resStream.state.activity.type === 'Streaming' && resStream.state.activity.url?.startsWith('http'), 'Streaming activity accepts valid stream URL');

  // 3. ActivityRotationEngine Tests
  console.log('\n--- 3. Testing ActivityRotationEngine ---');
  const rotationEngine = ActivityRotationEngine.getInstance();
  rotationEngine.updateConfig({ enabled: true, intervalSeconds: 45, order: 'sequential' });
  const rotConfig = rotationEngine.getConfig();
  assert(rotConfig.intervalSeconds === 45, 'Rotation interval configured');
  assert(rotConfig.activities.length >= 4, 'Rotation items initialized');

  rotationEngine.executeNextRotation();
  const rotatedState = presenceService.getCurrentState();
  assert(rotatedState.source === 'rotation', 'Rotation sets presence source to rotation');

  // 4. PresenceSchedulerService Tests
  console.log('\n--- 4. Testing PresenceSchedulerService ---');
  const scheduler = PresenceSchedulerService.getInstance();
  const profiles = scheduler.getProfiles();
  assert(profiles.length >= 5, `Preset profiles loaded (found: ${profiles.length})`);

  const appliedGaming = scheduler.applyProfile('prof_gaming');
  assert(appliedGaming === true, 'Gaming preset profile applied successfully');
  const stateAfterProfile = presenceService.getCurrentState();
  assert(stateAfterProfile.activity.name === 'Valorant', 'Presence activity updated to profile value');

  // 5. SmartPresenceEngine Tests
  console.log('\n--- 5. Testing SmartPresenceEngine ---');
  presenceService.clearRateLimits();
  const smart = SmartPresenceEngine.getInstance();
  smart.setMaintenanceMode(true, 'Test Upgrade');
  const maintState = presenceService.getCurrentState();
  assert(maintState.status === 'dnd' && maintState.activity.name.includes('ETHONE'), 'Maintenance mode triggers DND presence');
  smart.setMaintenanceMode(false); // restore

  // 6. BotIdentityService Tests
  console.log('\n--- 6. Testing BotIdentityService ---');
  const identityService = BotIdentityService.getInstance();
  const identity = identityService.getIdentity();
  assert(identity.ownerId === '825124006209388616', 'Bot Identity confirms owner ID');
  assert(identity.avatarChangesRemaining > 0, 'Avatar rate limit cooldown tracked');
  assert(identity.usernameChangesRemaining > 0, 'Username rate limit cooldown tracked');

  // 7. Presence Router HTTP Endpoints
  console.log('\n--- 7. Testing Presence Express Router ---');
  presenceService.clearRateLimits();
  const mockClient = {
    isReady: () => true,
    on: () => mockClient,
    off: () => mockClient,
    emit: () => true,
    user: {
      id: '1545139931154878464',
      username: 'Ethone Bot',
      discriminator: '9861',
      tag: 'Ethone Bot#9861',
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
      setPresence: () => {},
      setUsername: async (u: string) => u,
      setAvatar: async (a: any) => a,
    },
    ws: { ping: 22, shards: { size: 1 } },
    guilds: {
      cache: new Map([
        ['1128633164290596884', { id: '1128633164290596884', name: 'ETHONE Server', iconURL: () => null }],
      ]),
    },
    users: { cache: new Map() },
  } as any;

  const app = express();
  app.use(express.json());
  app.use('/api/bot/presence', createPresenceRouter(mockClient));

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api/bot/presence`;

  // Test GET /
  const r1 = await fetch(`${baseUrl}/`).then((r) => r.json() as any);
  assert(r1.success === true && r1.data.state.status !== undefined, 'GET /api/bot/presence returns current state');

  // Test POST /
  const r2 = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'online', activity: { type: 'Playing', name: 'Minecraft' } }),
  }).then((r) => r.json() as any);
  assert(r2.success === true, 'POST /api/bot/presence updates status');

  // Test GET /rotation
  const rRot = await fetch(`${baseUrl}/rotation`).then((r) => r.json() as any);
  assert(rRot.success === true && rRot.data.intervalSeconds >= 30, 'GET /api/bot/presence/rotation returns config');

  // Test GET /profiles
  const rProf = await fetch(`${baseUrl}/profiles`).then((r) => r.json() as any);
  assert(rProf.success === true && rProf.data.length >= 5, 'GET /api/bot/presence/profiles returns presets');

  // Test GET /servers
  const rServ = await fetch(`${baseUrl}/servers`).then((r) => r.json() as any);
  assert(rServ.success === true && rServ.data.length >= 1, 'GET /api/bot/presence/servers returns installed guilds');

  // Test GET /identity
  const rIdent = await fetch(`${baseUrl}/identity`).then((r) => r.json() as any);
  assert(rIdent.success === true && rIdent.data.ownerId === '825124006209388616', 'GET /api/bot/presence/identity returns identity');

  // Test GET /history
  const rHist = await fetch(`${baseUrl}/history`).then((r) => r.json() as any);
  assert(rHist.success === true && rHist.data.length > 0, 'GET /api/bot/presence/history returns audit log');

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
