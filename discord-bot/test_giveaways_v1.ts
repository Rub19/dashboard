import { giveawayStorage } from './src/modules/giveaways/storage/giveawayStorage.js';
import { giveawayService } from './src/modules/giveaways/services/giveawayService.js';
import { GiveawayRequirements } from './src/modules/giveaways/types/giveaway.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

// Minimal stand-in for a discord.js GuildMember — only the fields
// giveawayService.checkEligibility actually reads (member.roles.cache.has/some,
// member.user.createdTimestamp, member.guild.id, member.id). No real Discord
// client/session is needed for this, unlike drawWinners which needs a live guild.
function mockMember(roleIds: string[], accountAgeDays: number, opts: { guildId?: string; userId?: string } = {}) {
  const roleSet = new Set(roleIds);
  return {
    id: opts.userId || 'user-1',
    guild: { id: opts.guildId || 'guild-elig-test' },
    roles: {
      cache: {
        has: (id: string) => roleSet.has(id),
        some: (fn: (r: { id: string }) => boolean) => [...roleSet].some((id) => fn({ id })),
      },
    },
    user: { createdTimestamp: Date.now() - accountAgeDays * 24 * 60 * 60 * 1000 },
  } as any;
}

function noRequirements(overrides: Partial<GiveawayRequirements> = {}): GiveawayRequirements {
  return {
    requiredRoleIds: [],
    roleMode: 'any',
    excludedRoleIds: [],
    minAccountAgeDays: 0,
    minLevel: 0,
    ...overrides,
  };
}

const TEST_GUILD_ID = 'giveaway-test-guild-000000';
const createdIds: string[] = [];

function create(overrides: Record<string, unknown> = {}) {
  const gw = giveawayStorage.create({
    guildId: TEST_GUILD_ID,
    channelId: 'channel-1',
    prize: 'Test Prize',
    endsAt: new Date(Date.now() + 3600000).toISOString(),
    hostedById: 'host-1',
    hostedByTag: 'Host#0001',
    ...overrides,
  });
  createdIds.push(gw.id);
  return gw;
}

async function runTests() {
  console.log('🧪 Starting ETHONE Giveaways Test Suite...\n');

  // 1. Storage CRUD
  console.log('📦 1. Giveaway Storage CRUD:');
  const gw = create({ winnerCount: 2 });
  assert(!!gw.id, 'Giveaway created with an id');
  assert(gw.status === 'active', 'New giveaway defaults to active status');

  const fetched = giveawayStorage.getById(gw.id);
  assert(fetched?.id === gw.id, 'getById returns the created giveaway');

  const forGuild = giveawayStorage.getForGuild(TEST_GUILD_ID);
  assert(forGuild.some((g) => g.id === gw.id), 'getForGuild includes the created giveaway');

  const otherGuild = giveawayStorage.getForGuild('some-completely-different-guild');
  assert(otherGuild.length === 0, 'Multi-guild isolation verified (empty for an unrelated guild)');

  const updated = giveawayStorage.update(gw.id, { prize: 'Updated Prize' });
  assert(updated?.prize === 'Updated Prize', 'update() persists a field change');

  const added = giveawayStorage.addParticipant(gw.id, {
    userId: 'participant-1',
    username: 'Tester',
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
    isEligible: true,
  });
  assert(added === true, 'addParticipant adds a new entrant to an active giveaway');

  const dupe = giveawayStorage.addParticipant(gw.id, {
    userId: 'participant-1',
    username: 'Tester',
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
    isEligible: true,
  });
  assert(dupe === false, 'addParticipant rejects a duplicate entrant');

  // 2. Overview stats
  console.log('\n📊 2. Overview Stats:');
  const gwEnded = create({ status: 'ended', winnerIds: ['participant-1'] });
  const overview = giveawayStorage.getOverview(TEST_GUILD_ID);
  assert(overview.activeCount >= 1, `activeCount reflects real active giveaways (${overview.activeCount})`);
  assert(overview.endedCount >= 1, `endedCount reflects real ended giveaways (${overview.endedCount})`);
  assert(overview.totalParticipants >= 1, `totalParticipants counts real entrants (${overview.totalParticipants})`);
  assert(overview.totalWinners >= 1, `totalWinners counts real winnerIds (${overview.totalWinners})`);

  // 3. Participant removal
  console.log('\n🗑️  3. Participant Removal:');
  const removed = giveawayStorage.removeParticipant(gw.id, 'participant-1');
  assert(removed === true, 'removeParticipant removes an existing entrant');
  const removedAgain = giveawayStorage.removeParticipant(gw.id, 'participant-1');
  assert(removedAgain === false, 'removeParticipant is false for an already-removed entrant');

  // 4. Eligibility — no requirements
  console.log('\n🛡️  4. Eligibility Service:');
  const anyoneReq = noRequirements();
  const anyone = giveawayService.checkEligibility(mockMember([], 0), anyoneReq);
  assert(anyone.eligible === true, 'No requirements: everyone is eligible');

  // 5. Required role — "any" mode
  const anyRoleReq = noRequirements({ requiredRoleIds: ['role-vip', 'role-booster'], roleMode: 'any' });
  const hasOneRole = giveawayService.checkEligibility(mockMember(['role-vip'], 0), anyRoleReq);
  assert(hasOneRole.eligible === true, 'roleMode "any": having one of the required roles is enough');
  const hasNoRole = giveawayService.checkEligibility(mockMember(['role-unrelated'], 0), anyRoleReq);
  assert(hasNoRole.eligible === false, 'roleMode "any": missing every required role is rejected');

  // 6. Required role — "all" mode
  const allRoleReq = noRequirements({ requiredRoleIds: ['role-vip', 'role-booster'], roleMode: 'all' });
  const hasAllRoles = giveawayService.checkEligibility(mockMember(['role-vip', 'role-booster'], 0), allRoleReq);
  assert(hasAllRoles.eligible === true, 'roleMode "all": having every required role passes');
  const hasSomeRoles = giveawayService.checkEligibility(mockMember(['role-vip'], 0), allRoleReq);
  assert(hasSomeRoles.eligible === false, 'roleMode "all": having only some of the required roles is rejected');

  // 7. Excluded role
  const excludedReq = noRequirements({ excludedRoleIds: ['role-banned'] });
  const excluded = giveawayService.checkEligibility(mockMember(['role-banned'], 0), excludedReq);
  assert(excluded.eligible === false, 'A member with an excluded role is rejected regardless of other requirements');

  // 8. Minimum account age
  const ageReq = noRequirements({ minAccountAgeDays: 7 });
  const tooNew = giveawayService.checkEligibility(mockMember([], 1), ageReq);
  assert(tooNew.eligible === false, 'An account younger than minAccountAgeDays is rejected');
  const oldEnough = giveawayService.checkEligibility(mockMember([], 30), ageReq);
  assert(oldEnough.eligible === true, 'An account older than minAccountAgeDays passes');

  // 9. Minimum level (real xpWriteBuffer, unknown user defaults to level 0)
  const levelReq = noRequirements({ minLevel: 5 });
  const belowLevel = giveawayService.checkEligibility(mockMember([], 30, { userId: 'never-seen-user' }), levelReq);
  assert(belowLevel.eligible === false, 'A user below minLevel (default level 0) is rejected');

  // Cleanup — keep this suite idempotent across repeated runs.
  console.log('\n🧹 Cleanup:');
  for (const id of createdIds) giveawayStorage.delete(id);
  const remaining = giveawayStorage.getForGuild(TEST_GUILD_ID);
  assert(remaining.length === 0, 'Test guild has no leftover giveaways after cleanup');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
