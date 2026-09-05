/**
 * 🛡️ ETHONE DISCORD — AUTOMATED MULTI-USER SECURITY & ISOLATION TEST SUITE
 *
 * Exhaustive Verification Matrix:
 * 1. Authentication & Token Security (No token, Malformed token, Tampered JWT)
 * 2. Cross-Guild Isolation / BOLA (User A cannot access Guild B)
 * 3. Role & Privilege Escalation Prevention (Simple member cannot manage server)
 * 4. Anti-IDOR Backup Protection:
 *    - Cross-guild backup ID tampering rejected (404)
 *    - Direct target guild ID tampering rejected (403)
 *    - Download, Restore, and Delete strictly isolated (403)
 * 5. Private Data Isolation (Tickets & Moderation logs inaccessible to non-admins)
 * 6. Bot Owner Boundary (Zero God-Mode over private user backups/tickets/logs)
 * 7. Realtime SSE Broadcast Isolation (Guild A events never leak to Guild B clients)
 * 8. Global SSE Stream Security (Restricted strictly to Bot Owner)
 * 9. Frontend Secret Scanning (Zero private keys/tokens exposed in client bundles)
 */

process.env.NODE_ENV = 'test';

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection } from 'discord.js';
import { config } from '../src/config.js';
import { authMiddleware } from '../src/server/middleware/auth.js';
import { createGuildAuthMiddleware } from '../src/server/middleware/guildAuth.js';
import { createGuildRouter } from '../src/server/routes/guildRoutes.js';
import { createBackupRouter } from '../src/server/routes/backupRoutes.js';
import { createTicketRouter } from '../src/server/routes/ticketRoutes.js';
import { createLogRouter } from '../src/server/routes/logRoutes.js';
import { createSyncRouter, createGuildSyncRouter } from '../src/server/routes/syncRoutes.js';
import { createBotControlRouter } from '../src/server/routes/botControlRoutes.js';
import { backupService } from '../src/modules/backup/services/backupService.js';
import { syncEngine } from '../src/services/syncEngine.js';

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

async function runSecurityAuditTests() {
  console.log('================================================================');
  console.log('🛡️  ETHONE DISCORD — SECURITY, PRIVACY & MULTI-USER ISOLATION AUDIT');
  console.log('================================================================\n');

  const GUILD_A = '1128633164290596884'; // Server A (Owned by Alice)
  const GUILD_B = '999888777666555444'; // Server B (Managed by Bob)
  const BOT_OWNER_ID = '825124006209388616';

  // 1. Mock Discord Client with installed guilds
  const mockGuildA = {
    id: GUILD_A,
    name: 'Serveur A (Alice Corp)',
    icon: 'icon_a',
    memberCount: 250,
    channels: { cache: new Collection() },
    roles: { cache: new Collection() },
  };
  const mockGuildB = {
    id: GUILD_B,
    name: 'Serveur B (Bob Community)',
    icon: 'icon_b',
    memberCount: 520,
    channels: { cache: new Collection() },
    roles: { cache: new Collection() },
  };

  const guildsCollection = new Collection<string, any>();
  guildsCollection.set(GUILD_A, mockGuildA);
  guildsCollection.set(GUILD_B, mockGuildB);

  const mockClient = {
    user: { id: 'bot_ethone_id', tag: 'ETHONE#0001' },
    isReady: () => true,
    uptime: 1234567,
    ws: { ping: 12, shards: new Collection() },
    users: { cache: new Collection() },
    guilds: {
      cache: guildsCollection,
    },
  } as unknown as Client;

  // 2. Setup JWT Tokens for Test Personas
  // USER A: Owner of Guild A, not a member of Guild B
  const tokenUserA = jwt.sign(
    {
      id: 'user_alice_id',
      username: 'Alice',
      discriminator: '0001',
      avatar: 'alice_avatar',
      accessToken: 'discord_token_alice',
      _testGuilds: [
        { id: GUILD_A, name: 'Serveur A (Alice Corp)', owner: true, permissions: '8' },
      ],
    },
    config.jwtSecret
  );

  // USER B: ManageGuild on Guild B, simple member on Guild A (no admin/manage perms)
  const tokenUserB = jwt.sign(
    {
      id: 'user_bob_id',
      username: 'Bob',
      discriminator: '0002',
      avatar: 'bob_avatar',
      accessToken: 'discord_token_bob',
      _testGuilds: [
        { id: GUILD_B, name: 'Serveur B (Bob Community)', owner: false, permissions: '32' }, // ManageGuild
        { id: GUILD_A, name: 'Serveur A (Alice Corp)', owner: false, permissions: '0' }, // Simple member
      ],
    },
    config.jwtSecret
  );

  // USER C: External user, member of no servers
  const tokenUserC = jwt.sign(
    {
      id: 'user_charlie_id',
      username: 'Charlie',
      discriminator: '0003',
      avatar: null,
      accessToken: 'discord_token_charlie',
      _testGuilds: [],
    },
    config.jwtSecret
  );

  // BOT OWNER: Global bot maintainer (825124006209388616), not admin on Guild A or B
  const tokenBotOwner = jwt.sign(
    {
      id: BOT_OWNER_ID,
      username: 'EthoneOwner',
      discriminator: '0000',
      avatar: null,
      accessToken: 'discord_token_owner',
      _testGuilds: [],
    },
    config.jwtSecret
  );

  // TAMPERED TOKEN: Signed with wrong secret
  const tokenTampered = jwt.sign(
    { id: 'hacker', username: 'Attacker', accessToken: 'fake' },
    'wrong-malicious-secret'
  );

  // 3. Mount Full Express Application with Real Production Middleware
  const app = express();
  app.use(express.json());

  // Guilds Overview & List
  app.use('/api/guilds', createGuildRouter(mockClient));

  // Backups (Private: allowBotOwnerOverride = false)
  app.use(
    '/api/guilds/:guildId/backups',
    authMiddleware,
    createGuildAuthMiddleware(mockClient, { allowBotOwnerOverride: false }),
    createBackupRouter(mockClient)
  );

  // Tickets (Private: allowBotOwnerOverride = false)
  app.use(
    '/api/guilds/:guildId/tickets',
    authMiddleware,
    createGuildAuthMiddleware(mockClient, { allowBotOwnerOverride: false }),
    createTicketRouter(mockClient)
  );

  // Logs (Private: allowBotOwnerOverride = false)
  app.use(
    '/api/guilds/:guildId/logs',
    authMiddleware,
    createGuildAuthMiddleware(mockClient, { allowBotOwnerOverride: false }),
    createLogRouter(mockClient)
  );

  // Guild Sync (SSE)
  app.use(
    '/api/guilds/:guildId/sync',
    authMiddleware,
    createGuildAuthMiddleware(mockClient),
    createGuildSyncRouter()
  );

  // Global Sync (SSE)
  app.use('/api/sync', createSyncRouter());

  // Bot Management (Bot Owner & Guild Managers)
  app.use('/api/bot', createBotControlRouter(mockClient));

  // Start HTTP Test Server
  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // -------------------------------------------------------------
    // GROUP 1: AUTHENTICATION & TOKEN INTEGRITY
    // -------------------------------------------------------------
    console.log('--- 1. Testing Authentication & Token Security ---');

    // 1.1 Request with no token -> 401
    const resNoToken = await fetch(`${baseUrl}/api/guilds`);
    assert(resNoToken.status === 401, 'Request with missing token returns 401 Unauthorized');

    // 1.2 Request with tampered token -> 401
    const resTampered = await fetch(`${baseUrl}/api/guilds`, {
      headers: { Authorization: `Bearer ${tokenTampered}` },
    });
    assert(resTampered.status === 401, 'Request with tampered JWT returns 401 Unauthorized');

    // 1.3 Request with valid token for User A -> 200
    const resUserA = await fetch(`${baseUrl}/api/guilds`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(resUserA.status === 200, 'Valid User A token successfully authenticates (200 OK)');
    const bodyUserA = await resUserA.json();
    assert(
      bodyUserA.guilds.length === 1 && bodyUserA.guilds[0].id === GUILD_A,
      'User A only sees Guild A in manageable servers list'
    );

    // 1.4 Request with valid token for User B -> 200
    const resUserB = await fetch(`${baseUrl}/api/guilds`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    const bodyUserB = await resUserB.json();
    assert(
      bodyUserB.guilds.length === 1 && bodyUserB.guilds[0].id === GUILD_B,
      'User B only sees Guild B in manageable servers list (Guild A excluded due to lack of ManageGuild/Admin)'
    );

    // -------------------------------------------------------------
    // GROUP 2: CROSS-GUILD ACCESS CONTROL (BOLA / IDOR)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Cross-Guild Isolation (BOLA) ---');

    // 2.1 User A tries to access Guild B overview -> 403
    const resAonB = await fetch(`${baseUrl}/api/guilds/${GUILD_B}/overview`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(resAonB.status === 403, 'User A accessing Guild B overview returns 403 Forbidden');

    // 2.2 User C (external) tries to access Guild A overview -> 403
    const resConA = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/overview`, {
      headers: { Authorization: `Bearer ${tokenUserC}` },
    });
    assert(resConA.status === 403, 'External User C accessing Guild A overview returns 403 Forbidden');

    // 2.3 User A accesses own Guild A overview -> 200
    const resAonA = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/overview`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(resAonA.status === 200, 'User A accessing Guild A overview returns 200 OK');

    // 2.4 User B accesses own Guild B overview -> 200
    const resBonB = await fetch(`${baseUrl}/api/guilds/${GUILD_B}/overview`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(resBonB.status === 200, 'User B accessing Guild B overview returns 200 OK');

    // -------------------------------------------------------------
    // GROUP 3: PRIVILEGE ESCALATION PREVENTION (ROLE BOUNDARIES)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Privilege Escalation & Role Boundaries ---');

    // 3.1 User B is a simple member in Guild A (perms = 0) -> Accessing Guild A overview returns 403
    const resBonA = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/overview`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(
      resBonA.status === 403,
      'Simple member (User B in Guild A) without ManageGuild/Admin is blocked (403 Forbidden)'
    );

    // -------------------------------------------------------------
    // GROUP 4: STRICT BACKUP ISOLATION & ANTI-IDOR
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Backup Isolation & Anti-IDOR Protection ---');

    // Seed backups directly using real backupService
    const backupA = await backupService.createBackup({
      guildId: GUILD_A,
      name: 'Sauvegarde Securisee Serveur A',
      description: 'Snapshot ultra confidentiel de Alice',
      type: 'MANUAL',
      isProtected: true,
      creator: { id: 'user_alice_id', tag: 'Alice#0001' },
    });

    const backupB = await backupService.createBackup({
      guildId: GUILD_B,
      name: 'Sauvegarde Serveur B',
      description: 'Snapshot de Bob',
      type: 'MANUAL',
      isProtected: false,
      creator: { id: 'user_bob_id', tag: 'Bob#0002' },
    });

    assert(Boolean(backupA.backupId), `Backup A created with ID: ${backupA.backupId}`);
    assert(Boolean(backupB.backupId), `Backup B created with ID: ${backupB.backupId}`);

    // 4.1 IDOR Vector 1: User B tries cross-guild URL tampering:
    // User B specifies Guild B in URL, but asks for backup_A ID: GET /api/guilds/GUILD_B/backups/BACKUP_A_ID
    const resIdorUrl = await fetch(`${baseUrl}/api/guilds/${GUILD_B}/backups/${backupA.backupId}`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(
      resIdorUrl.status === 404,
      'Cross-guild backup ID tampering returns 404 Not Found (repository strictly scoped by guildId)'
    );

    // 4.2 IDOR Vector 2: User B tries direct guildId tampering:
    // User B calls GET /api/guilds/GUILD_A/backups/BACKUP_A_ID
    const resIdorDirect = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/backups/${backupA.backupId}`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(
      resIdorDirect.status === 403,
      'Direct Guild A backup endpoint tampering by User B returns 403 Forbidden'
    );

    // 4.3 IDOR Vector 3: User B tries to download User A's backup:
    const resIdorDownload = await fetch(
      `${baseUrl}/api/guilds/${GUILD_A}/backups/${backupA.backupId}/download`,
      { headers: { Authorization: `Bearer ${tokenUserB}` } }
    );
    assert(
      resIdorDownload.status === 403,
      'Unauthorized download attempt of User A backup returns 403 Forbidden'
    );

    // 4.4 IDOR Vector 4: User B tries to restore User A's backup:
    const resIdorRestore = await fetch(
      `${baseUrl}/api/guilds/${GUILD_A}/backups/${backupA.backupId}/restore`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserB}`,
        },
        body: JSON.stringify({ safetyLevel: 'SAFE' }),
      }
    );
    assert(
      resIdorRestore.status === 403,
      'Unauthorized restore attempt of User A backup returns 403 Forbidden'
    );

    // 4.5 IDOR Vector 5: User B tries to delete User A's backup:
    const resIdorDelete = await fetch(
      `${baseUrl}/api/guilds/${GUILD_A}/backups/${backupA.backupId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenUserB}` },
      }
    );
    assert(
      resIdorDelete.status === 403,
      'Unauthorized delete attempt of User A backup returns 403 Forbidden'
    );

    // 4.6 Legitimate Access: User A can read and list Guild A backups
    const resLegitA = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/backups`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(resLegitA.status === 200, 'User A legitimately retrieves Guild A backups (200 OK)');
    const bodyLegitA = await resLegitA.json();
    assert(
      bodyLegitA.backups.some((b: any) => b.backupId === backupA.backupId),
      'User A backup is present in User A backup list'
    );
    assert(
      !bodyLegitA.backups.some((b: any) => b.backupId === backupB.backupId),
      'User B backup is completely absent from User A backup list (Zero Leakage)'
    );

    // -------------------------------------------------------------
    // GROUP 5: PRIVATE DATA ISOLATION (TICKETS & LOGS)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Private Tickets & Logs Isolation ---');

    // 5.1 User B tries to access Guild A tickets overview -> 403
    const resTicketsB = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/tickets/overview`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(resTicketsB.status === 403, 'User B accessing Guild A tickets returns 403 Forbidden');

    // 5.2 User B tries to access Guild A logs -> 403
    const resLogsB = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/logs`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(resLogsB.status === 403, 'User B accessing Guild A moderation logs returns 403 Forbidden');

    // 5.3 User A accesses Guild A tickets overview -> 200
    const resTicketsA = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/tickets/overview`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(resTicketsA.status === 200, 'User A legitimately accesses Guild A tickets (200 OK)');

    // -------------------------------------------------------------
    // GROUP 6: BOT OWNER BOUNDARY (ZERO GOD-MODE ON PRIVATE DATA)
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Bot Owner Boundaries ---');

    // 6.1 Bot Owner can manage bot core controls
    const resOwnerBot = await fetch(`${baseUrl}/api/bot/overview`, {
      headers: { Authorization: `Bearer ${tokenBotOwner}` },
    });
    assert(resOwnerBot.status === 200, 'Bot Owner can access bot overview / status (200 OK)');

    // 6.2 Bot Owner CANNOT view private server backups without Discord admin rights on that server
    const resOwnerBackups = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/backups`, {
      headers: { Authorization: `Bearer ${tokenBotOwner}` },
    });
    assert(
      resOwnerBackups.status === 403,
      'Bot Owner CANNOT access private server backups (403 Forbidden - Zero God-Mode)'
    );

    // 6.3 Bot Owner CANNOT view private tickets
    const resOwnerTickets = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/tickets/overview`, {
      headers: { Authorization: `Bearer ${tokenBotOwner}` },
    });
    assert(
      resOwnerTickets.status === 403,
      'Bot Owner CANNOT access private server tickets (403 Forbidden - Zero God-Mode)'
    );

    // 6.4 Bot Owner CANNOT view private server moderation logs
    const resOwnerLogs = await fetch(`${baseUrl}/api/guilds/${GUILD_A}/logs`, {
      headers: { Authorization: `Bearer ${tokenBotOwner}` },
    });
    assert(
      resOwnerLogs.status === 403,
      'Bot Owner CANNOT access private server logs (403 Forbidden - Zero God-Mode)'
    );

    // -------------------------------------------------------------
    // GROUP 7: REALTIME SSE BROADCAST ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Realtime SSE Broadcast Isolation ---');

    // 7.1 Non-owner attempting to connect to global SSE stream -> 403
    const resGlobalStreamNonOwner = await fetch(`${baseUrl}/api/sync/stream`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(
      resGlobalStreamNonOwner.status === 403,
      'Standard user attempting global SSE stream returns 403 Forbidden'
    );

    // 7.2 Non-owner attempting to read global audit history -> 403
    const resGlobalAuditNonOwner = await fetch(`${baseUrl}/api/sync/audit`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(
      resGlobalAuditNonOwner.status === 403,
      'Standard user attempting global audit log returns 403 Forbidden'
    );

    // 7.3 Simulate SSE Client Isolation in SyncEngine
    let clientBReceivedEvent = false;
    let clientAReceivedEvent = false;

    // Fake response streams to catch writes
    const fakeResB: any = {
      writeHead: () => {},
      write: (chunk: string) => {
        if (chunk.includes('MUTATION_A_SECRET')) {
          clientBReceivedEvent = true;
        }
      },
      on: () => {},
    };

    const fakeResA: any = {
      writeHead: () => {},
      write: (chunk: string) => {
        if (chunk.includes('MUTATION_A_SECRET')) {
          clientAReceivedEvent = true;
        }
      },
      on: () => {},
    };

    // Register Client A on Guild A and Client B on Guild B
    syncEngine.registerClient('sse_client_test_a', fakeResA, GUILD_A, 'user_alice_id');
    syncEngine.registerClient('sse_client_test_b', fakeResB, GUILD_B, 'user_bob_id');

    // Broadcast an event strictly scoped to Guild A
    syncEngine.broadcast({
      id: 'evt_sec_test',
      type: 'SETTINGS_UPDATE',
      guildId: GUILD_A,
      source: 'DASHBOARD',
      actorId: 'user_alice_id',
      version: 2,
      timestamp: Date.now(),
      payload: { secretData: 'MUTATION_A_SECRET' },
    });

    assert(clientAReceivedEvent === true, 'Client A on Guild A receives the Guild A SSE event');
    assert(
      clientBReceivedEvent === false,
      'Client B on Guild B DOES NOT receive the Guild A SSE event (Zero Cross-Guild Leakage)'
    );

    // -------------------------------------------------------------
    // GROUP 8: FRONTEND STATIC SECRETS AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Frontend Secret Exposure ---');

    // Scan ethone-next repository for any leaked server secrets in client code
    const nextAppPath = path.resolve(process.cwd(), '../dashboard/ethone-next');
    let leakedSecretsCount = 0;

    if (fs.existsSync(nextAppPath)) {
      const searchForForbidden = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
              searchForForbidden(fullPath);
            }
          } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE') ||
                content.includes('NEXT_PUBLIC_DISCORD_BOT_TOKEN') ||
                (content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY') && !fullPath.includes('route.ts'))) {
              console.error(`  ⚠️ Leak found in: ${fullPath}`);
              leakedSecretsCount++;
            }
          }
        }
      };
      searchForForbidden(nextAppPath);
    }

    assert(leakedSecretsCount === 0, 'Zero private service role keys or bot tokens exposed in frontend client bundles');

  } finally {
    server.close();
  }

  // Final Summary
  console.log('\n================================================================');
  console.log(`🏁 SECURITY AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Fatal error during security audit test execution:', err);
  process.exit(1);
});
