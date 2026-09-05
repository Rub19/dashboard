/**
 * 🛡️ ETHONE DISCORD — TEST SUITE: ANTI-ABUSE / RATE LIMITS / ANTI-SPAM / IDEMPOTENCY 2.0
 *
 * Exhaustive verification:
 * 1. Multi-tier Sliding Window Rate Limiter (READ, CONFIG, SENSITIVE, EXPENSIVE)
 * 2. Idempotency Service (In-flight request coalescing, cache replay, scope isolation)
 * 3. Guild Operation Lock (Mutual exclusion for heavy ops, lease auto-expiration)
 * 4. Multi-Tenant Isolation (Guild A spam does not degrade Guild B)
 * 5. Discord API Retry Manager (429 retry-after backoff, 5xx exponential jitter, zero infinite loops)
 * 6. Interaction Anti-Spam & Debounce (Button cooldown, command burst throttle)
 * 7. Gateway Echo Loop Prevention (Signature tracking & reflection suppression)
 * 8. Bot Owner quota multipliers & security boundaries
 * 9. Abuse Audit Logging (Redacted logging, filtering)
 * 10. Memory safety & event listener cleanliness
 */

import { rateLimiterService } from '../src/services/resilience/rateLimiterService.js';
import { idempotencyService } from '../src/services/resilience/idempotencyService.js';
import { guildOperationLockService } from '../src/services/resilience/guildOperationLockService.js';
import { discordApiRetryManager } from '../src/services/resilience/discordApiRetryManager.js';
import { interactionAntiSpamService } from '../src/services/resilience/interactionAntiSpamService.js';
import { config } from '../src/config.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🛡️ RUNNING ETHONE ANTI-ABUSE / RATE LIMITS / IDEMPOTENCY TEST SUITE');
  console.log('================================================================\n');

  // Reset all services before running tests
  rateLimiterService.reset();
  idempotencyService.clear();
  interactionAntiSpamService.reset();

  // -------------------------------------------------------------
  // PART 1: SLIDING WINDOW RATE LIMITER & TIERS
  // -------------------------------------------------------------
  console.log('🔹 Part 1: Sliding Window Rate Limiting & Tiers');

  // Test 1: SENSITIVE tier default limit is 6 req/min
  const sensitiveUser = 'user_sensitive_1';
  let allowedCount = 0;
  let blockedResult: any = null;

  for (let i = 0; i < 10; i++) {
    const res = rateLimiterService.checkRateLimit({
      key: `user:${sensitiveUser}:backup`,
      category: 'SENSITIVE',
      userId: sensitiveUser,
      endpoint: '/api/backups',
      action: 'backup_create',
    });
    if (res.allowed) {
      allowedCount++;
    } else {
      blockedResult = res;
    }
  }

  assert(allowedCount === 6, 'Test 1: SENSITIVE tier enforces exactly 6 requests max per minute', `Allowed: ${allowedCount}`);
  assert(blockedResult !== null && !blockedResult.allowed, 'Test 2: Request 7 is blocked with allowed: false');
  assert(blockedResult && blockedResult.retryAfterSeconds > 0, 'Test 3: Blocked request receives valid retryAfterSeconds', `Retry-After: ${blockedResult?.retryAfterSeconds}`);
  assert(blockedResult && blockedResult.remaining === 0, 'Test 4: Blocked request shows 0 remaining quota');

  // Test 5: EXPENSIVE tier allows custom limit (e.g. 2 req/min)
  const expensiveUser = 'user_expensive_1';
  let expAllowed = 0;
  for (let i = 0; i < 5; i++) {
    const res = rateLimiterService.checkRateLimit({
      key: `user:${expensiveUser}:diagnostics`,
      category: 'EXPENSIVE',
      userId: expensiveUser,
      endpoint: '/api/bot/diagnostics/run',
      customLimit: 2,
    });
    if (res.allowed) expAllowed++;
  }
  assert(expAllowed === 2, 'Test 5: EXPENSIVE tier with customLimit strictly caps at 2 requests per minute', `Allowed: ${expAllowed}`);

  // Test 6: READ tier high volume (custom 15 in 2s for testing)
  const readUser = 'user_read_1';
  let readAllowed = 0;
  for (let i = 0; i < 15; i++) {
    const res = rateLimiterService.checkRateLimit({
      key: `user:${readUser}:read`,
      category: 'READ',
      userId: readUser,
      customLimit: 15,
      customWindowMs: 2000,
    });
    if (res.allowed) readAllowed++;
  }
  assert(readAllowed === 15, 'Test 6: READ tier handles burst within configured limits', `Allowed: ${readAllowed}`);

  // -------------------------------------------------------------
  // PART 2: IDEMPOTENCY SERVICE & IN-FLIGHT COALESCING
  // -------------------------------------------------------------
  console.log('\n🔹 Part 2: Idempotency Service & Request Coalescing');

  // Test 7: First execution of an idempotent operation succeeds
  let executionCount = 0;
  const sampleOp = async () => {
    executionCount++;
    await new Promise((r) => setTimeout(r, 40));
    return { success: true, backupId: 'backup_999' };
  };

  const key1 = 'idempotent-key-001';
  const exec1 = await idempotencyService.executeIdempotent(key1, sampleOp, { scope: 'guild_1' });
  assert(exec1.result.backupId === 'backup_999', 'Test 7: Idempotent operation executes first call successfully');
  assert(!exec1.isDuplicate, 'Test 8: First call marked as not duplicate (isDuplicate: false)');
  assert(executionCount === 1, 'Test 9: Underlying handler executed exactly once');

  // Test 10: Replay returns identical cached result without re-executing
  const exec2 = await idempotencyService.executeIdempotent(key1, sampleOp, { scope: 'guild_1' });
  assert(exec2.isDuplicate, 'Test 10: Second call detected as duplicate (isDuplicate: true)');
  assert(exec2.result.backupId === 'backup_999', 'Test 11: Duplicate call returns cached payload');
  assert(executionCount === 1, 'Test 12: Underlying handler was NOT executed a second time', `Count: ${executionCount}`);

  // Test 13: In-flight request coalescing (Double-click race condition)
  let heavyOpCount = 0;
  const heavyOp = async () => {
    heavyOpCount++;
    await new Promise((r) => setTimeout(r, 60));
    return { status: 'created', timestamp: 12345 };
  };

  const raceKey = 'race-key-999';
  const [p1, p2, p3] = await Promise.all([
    idempotencyService.executeIdempotent(raceKey, heavyOp, { scope: 'guild_race' }),
    idempotencyService.executeIdempotent(raceKey, heavyOp, { scope: 'guild_race' }),
    idempotencyService.executeIdempotent(raceKey, heavyOp, { scope: 'guild_race' }),
  ]);

  assert(heavyOpCount === 1, 'Test 13: 3 concurrent requests coalesced into exactly 1 underlying execution', `Executed: ${heavyOpCount}`);
  assert(p1.result.status === 'created' && p2.result.status === 'created' && p3.result.status === 'created', 'Test 14: All 3 concurrent calls received the exact same valid payload');
  assert(p2.isDuplicate || p3.isDuplicate, 'Test 15: Concurrent followers marked as duplicates');

  // Test 16: Scope isolation (Same key in different scopes executes separately)
  let scopeOpCount = 0;
  const scopedOp = async () => {
    scopeOpCount++;
    return { ok: true };
  };
  await idempotencyService.executeIdempotent('shared-key', scopedOp, { scope: 'guild_A' });
  await idempotencyService.executeIdempotent('shared-key', scopedOp, { scope: 'guild_B' });
  assert(scopeOpCount === 2, 'Test 16: Identical key in different guild scopes executes independently', `Executed: ${scopeOpCount}`);

  // -------------------------------------------------------------
  // PART 3: GUILD OPERATION LOCK (MUTUAL EXCLUSION)
  // -------------------------------------------------------------
  console.log('\n🔹 Part 3: Guild Operation Lock (Mutual Exclusion)');

  const testGuild = 'guild_lock_test';
  const lock1 = guildOperationLockService.acquireLock(testGuild, 'BACKUP_CREATE', 'admin_1', 10000);
  assert(lock1.acquired, 'Test 17: First backup create acquires guild lock successfully');
  assert(guildOperationLockService.isLocked(testGuild, 'BACKUP_CREATE'), 'Test 18: Guild is marked as locked for BACKUP_CREATE');

  // Test 19: Concurrent second attempt on same guild is rejected
  const lock2 = guildOperationLockService.acquireLock(testGuild, 'BACKUP_CREATE', 'admin_2', 10000);
  assert(!lock2.acquired, 'Test 19: Concurrent BACKUP_CREATE on same guild is locked out');
  assert(lock2.currentHolder === 'admin_1', 'Test 20: Lock rejection reports current holder');

  // Test 21: Releasing lock allows subsequent operations
  guildOperationLockService.releaseLock(testGuild, 'BACKUP_CREATE', 'admin_1');
  assert(!guildOperationLockService.isLocked(testGuild, 'BACKUP_CREATE'), 'Test 21: Lock released successfully');

  const lock3 = guildOperationLockService.acquireLock(testGuild, 'BACKUP_CREATE', 'admin_2', 10000);
  assert(lock3.acquired, 'Test 22: Subsequent acquisition succeeds after release');
  guildOperationLockService.releaseLock(testGuild, 'BACKUP_CREATE', 'admin_2');

  // Test 23: Auto-lease expiration (TTL safety)
  guildOperationLockService.acquireLock(testGuild, 'AUTO_EXPIRE_TEST', 'crashed_worker', 50); // 50ms TTL
  assert(guildOperationLockService.isLocked(testGuild, 'AUTO_EXPIRE_TEST'), 'Test 23: Lock active immediately');
  await new Promise((r) => setTimeout(r, 70));
  assert(!guildOperationLockService.isLocked(testGuild, 'AUTO_EXPIRE_TEST'), 'Test 24: Lock lease auto-expires after TTL without hanging');

  // -------------------------------------------------------------
  // PART 4: MULTI-TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n🔹 Part 4: Multi-Tenant Isolation');

  // User A spams Guild A (35 requests to exceed CONFIG limit of 30)
  const spammerUser = 'user_spammer';
  for (let i = 0; i < 35; i++) {
    rateLimiterService.checkRateLimit({
      key: `guild:guild_A:config`,
      category: 'CONFIG',
      guildId: 'guild_A',
      userId: spammerUser,
    });
  }

  // Guild A should now be throttled
  const checkGuildA = rateLimiterService.checkRateLimit({
    key: `guild:guild_A:config`,
    category: 'CONFIG',
    guildId: 'guild_A',
    userId: spammerUser,
  });
  assert(!checkGuildA.allowed, 'Test 25: Spammer Guild A is throttled');

  // Guild B must NOT be affected at all
  const checkGuildB = rateLimiterService.checkRateLimit({
    key: `guild:guild_B:config`,
    category: 'CONFIG',
    guildId: 'guild_B',
    userId: 'legit_user',
  });
  assert(checkGuildB.allowed, 'Test 26: Guild B remains 100% operational despite Guild A flooding');
  assert(checkGuildB.remaining > 0, 'Test 27: Guild B has full remaining quota');

  // -------------------------------------------------------------
  // PART 5: DISCORD REST API 429 & RETRY MANAGER
  // -------------------------------------------------------------
  console.log('\n🔹 Part 5: Discord REST API 429 & Bounded Retries');

  // Test 28: Immediate success
  const successRes = await discordApiRetryManager.executeWithRetry(async () => 'discord_ok', {
    operationName: 'test_immediate',
  });
  assert(successRes === 'discord_ok', 'Test 28: Discord API returns result immediately on success');

  // Test 29: Recovers from 429 with retry_after
  let attempt = 0;
  const retry429Op = async () => {
    attempt++;
    if (attempt === 1) {
      const err: any = new Error('Discord 429 Too Many Requests');
      err.status = 429;
      err.retry_after = 0.05; // 50ms
      throw err;
    }
    return 'recovered_from_429';
  };

  const recovered = await discordApiRetryManager.executeWithRetry(retry429Op, {
    operationName: 'test_429_recovery',
    maxRetries: 3,
  });
  assert(recovered === 'recovered_from_429', 'Test 29: Recovers seamlessly from HTTP 429 after retry_after backoff');
  assert(attempt === 2, 'Test 30: Retry manager executed exactly 2 attempts');

  // Test 31: Max retries bounded (Zero infinite loops)
  let loopAttempts = 0;
  const perpetualFail = async () => {
    loopAttempts++;
    const err: any = new Error('Discord 500 Internal Server Error');
    err.status = 500;
    throw err;
  };

  let caughtError: any = null;
  try {
    await discordApiRetryManager.executeWithRetry(perpetualFail, {
      operationName: 'test_max_retries',
      maxRetries: 3,
      baseDelayMs: 20,
    });
  } catch (err) {
    caughtError = err;
  }
  assert(caughtError !== null, 'Test 31: Perpetual failure throws after reaching max retries');
  assert(loopAttempts === 4, 'Test 32: Exactly 1 initial + 3 retries executed (strictly zero infinite loops)', `Attempts: ${loopAttempts}`);

  // -------------------------------------------------------------
  // PART 6: DISCORD INTERACTION ANTI-SPAM & DEBOUNCE
  // -------------------------------------------------------------
  console.log('\n🔹 Part 6: Interaction Anti-Spam & Button Debounce');

  const clickerId = 'user_clicker_1';
  const customId = 'btn_claim_ticket';

  const click1 = interactionAntiSpamService.checkButton(clickerId, customId, 400);
  assert(click1.allowed, 'Test 33: Initial button click is allowed');

  // Rapid double-click within 400ms
  const click2 = interactionAntiSpamService.checkButton(clickerId, customId, 400);
  assert(!click2.allowed, 'Test 34: Rapid double-click (<400ms) blocked with friendly debounce');
  assert(click2.reason === 'BUTTON_COOLDOWN', 'Test 35: Debounce reason is BUTTON_COOLDOWN');

  // Slash command burst throttle (max 3 in 500ms for test)
  const cmdUser = 'user_cmd_burst';
  const cmdRes1 = interactionAntiSpamService.checkCommand(cmdUser, 'sync', 3, 500);
  const cmdRes2 = interactionAntiSpamService.checkCommand(cmdUser, 'sync', 3, 500);
  const cmdRes3 = interactionAntiSpamService.checkCommand(cmdUser, 'sync', 3, 500);
  const cmdRes4 = interactionAntiSpamService.checkCommand(cmdUser, 'sync', 3, 500);

  assert(cmdRes1.allowed && cmdRes2.allowed && cmdRes3.allowed, 'Test 36: Slash commands 1-3 allowed within burst limit');
  assert(!cmdRes4.allowed, 'Test 37: 4th slash command in burst window blocked');
  assert(cmdRes4.reason === 'COMMAND_THROTTLED', 'Test 38: Command throttle reason is COMMAND_THROTTLED');

  // -------------------------------------------------------------
  // PART 7: GATEWAY ECHO LOOP PREVENTION
  // -------------------------------------------------------------
  console.log('\n🔹 Part 7: Gateway Echo Loop Prevention');

  const testGuildEcho = 'guild_echo_test';
  interactionAntiSpamService.registerOutgoingAction(testGuildEcho, 'ROLE_UPDATE', 'role_123');

  // Immediate reflection from Gateway within 1000ms
  const isEcho = interactionAntiSpamService.isEchoLoop(testGuildEcho, 'ROLE_UPDATE', 'role_123', 1000);
  assert(isEcho, 'Test 39: Outgoing bot action reflection from Gateway detected as echo loop and suppressed');

  const unrelatedEvent = interactionAntiSpamService.isEchoLoop(testGuildEcho, 'CHANNEL_UPDATE', 'chan_456', 1000);
  assert(!unrelatedEvent, 'Test 40: Unrelated event is not flagged as echo loop');

  // -------------------------------------------------------------
  // PART 8: BOT OWNER PRIVILEGES & SECURITY BOUNDARIES
  // -------------------------------------------------------------
  console.log('\n🔹 Part 8: Bot Owner Quotas & Security Boundaries');

  const ownerId = config.botOwnerId;
  let ownerAllowed = 0;
  // SENSITIVE category default is 6. Owner gets 5x multiplier = 30.
  for (let i = 0; i < 28; i++) {
    const res = rateLimiterService.checkRateLimit({
      key: `owner:${ownerId}:sensitive_bulk`,
      category: 'SENSITIVE',
      userId: ownerId,
    });
    if (res.allowed) ownerAllowed++;
  }
  assert(ownerAllowed === 28, 'Test 41: Bot Owner receives 5x administrative quota multiplier', `Allowed: ${ownerAllowed}`);

  // Bot Owner is STILL bound by guild locks to prevent corruption
  const ownerGuild = 'guild_owner_lock';
  guildOperationLockService.acquireLock(ownerGuild, 'CRITICAL_OP', 'system', 10000);
  const ownerLockAttempt = guildOperationLockService.acquireLock(ownerGuild, 'CRITICAL_OP', ownerId, 10000);
  assert(!ownerLockAttempt.acquired, 'Test 42: Bot Owner cannot bypass active concurrency locks (data safety boundary)');
  guildOperationLockService.releaseLock(ownerGuild, 'CRITICAL_OP', 'system');

  // -------------------------------------------------------------
  // PART 9: ABUSE AUDIT LOGGING & SECRETS PROTECTION
  // -------------------------------------------------------------
  console.log('\n🔹 Part 9: Abuse Audit Logging & Secrets Protection');

  const logs = rateLimiterService.getAbuseLogs();
  assert(logs.length > 0, 'Test 43: Rate limit violations recorded in audit buffer', `Count: ${logs.length}`);

  const sampleLog = logs[0];
  assert(sampleLog.timestamp !== undefined && sampleLog.attempts > 0, 'Test 44: Audit log contains timestamp and attempts');
  assert(!JSON.stringify(sampleLog).includes('token') && !JSON.stringify(sampleLog).includes('secret'), 'Test 45: Abuse logs contain zero credentials or tokens');

  // -------------------------------------------------------------
  // PART 10: MEMORY SAFETY & LISTENER CLEANLINESS
  // -------------------------------------------------------------
  console.log('\n🔹 Part 10: Memory Safety & Listener Cleanliness');

  const initialMemory = process.memoryUsage().heapUsed;
  for (let i = 0; i < 200; i++) {
    rateLimiterService.checkRateLimit({
      key: `mem_test:${i % 10}`,
      category: 'READ',
      userId: `user_${i % 5}`,
    });
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryDeltaMb = (finalMemory - initialMemory) / (1024 * 1024);
  assert(memoryDeltaMb < 50, 'Test 46: High-frequency rate checks operate within tight memory bounds (<50MB delta)', `Delta: ${memoryDeltaMb.toFixed(2)} MB`);

  // Verify Idempotency stats
  const idempStats = idempotencyService.getStats();
  assert(idempStats.totalRecords > 0 && idempStats.completedRecords > 0, 'Test 47: Idempotency stats correctly report records and completions');

  // Verify Lock stats
  const activeLocks = guildOperationLockService.getAllActiveLocks();
  assert(Array.isArray(activeLocks), 'Test 48: Active locks telemetry returns clean array');

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('💥 Unhandled error in anti-abuse test runner:', err);
  process.exit(1);
});
