import { pollRepository } from './src/modules/polls/storage/pollRepository.js';
import { pollEligibilityService } from './src/modules/polls/services/pollEligibilityService.js';
import { pollVotingService } from './src/modules/polls/services/pollVotingService.js';
import { pollResultService } from './src/modules/polls/services/pollResultService.js';
import { pollService } from './src/modules/polls/services/pollService.js';
import { discordPollPanel } from './src/modules/polls/ui/discordPollPanel.js';
import { DiscordPoll } from './src/modules/polls/types/index.js';

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

async function runTests() {
  console.log('🧪 Starting ETHONE Polls & Voting 2.0 Test Suite...\n');
  const testGuildId = '123456789012345678';
  const otherGuildId = '999999999999999999';

  // 1. Repository Tests
  console.log('📦 1. Poll Repository & Multi-Guild Isolation:');
  const polls = pollRepository.getPolls(testGuildId);
  assert(polls.length >= 3, `Retrieved ${polls.length} seed polls for guild`);

  const otherGuildPolls = pollRepository.getPolls(otherGuildId);
  assert(otherGuildPolls.length === 0, 'Multi-guild isolation verified (empty for other guild)');

  const gamePoll = pollRepository.getPollById(testGuildId, 'community-game-night');
  assert(gamePoll !== undefined, 'Found seed poll: community-game-night');
  assert(gamePoll?.status === 'ACTIVE', 'Seed poll status is ACTIVE');

  const overviewStats = pollRepository.getOverviewStats(testGuildId);
  assert(overviewStats.totalPolls >= 3, `Overview stats: totalPolls=${overviewStats.totalPolls}`);
  assert(overviewStats.totalVotes >= 5, `Overview stats: totalVotes=${overviewStats.totalVotes}`);

  // 2. Eligibility & Role Weighting Tests
  console.log('\n🛡️ 2. Eligibility & Role Weighting Service:');
  const staffPoll = pollRepository.getPollById(testGuildId, 'staff-decision-01')!;
  
  // Test staff required role (role-admin)
  const staffEligible = pollEligibilityService.checkEligibility(
    staffPoll,
    'user-admin-1',
    ['role-admin'],
    100,
    50
  );
  assert(staffEligible.eligible === true, 'Staff member with role-admin is eligible');

  const regularMemberEligible = pollEligibilityService.checkEligibility(
    staffPoll,
    'user-regular-1',
    ['role-member'],
    100,
    50
  );
  assert(regularMemberEligible.eligible === false, 'Regular member without staff role is rejected');

  // Test role weights on community poll
  const gamePollRef = pollRepository.getPollById(testGuildId, 'community-game-night')!;
  const vipWeight = pollEligibilityService.calculateUserWeight(gamePollRef, ['role-vip']);
  assert(vipWeight === 2, `VIP role weight correctly calculated (expected 2, got ${vipWeight})`);

  const boosterWeight = pollEligibilityService.calculateUserWeight(gamePollRef, ['role-booster']);
  assert(boosterWeight === 2, `Booster role weight correctly calculated (expected 2, got ${boosterWeight})`);

  const standardWeight = pollEligibilityService.calculateUserWeight(gamePollRef, ['role-unknown']);
  assert(standardWeight === 1, `Fallback weight is 1 for unweighted roles`);

  // 3. Voting & Deduplication Tests
  console.log('\n🗳️ 3. Voting Service & Business Rules:');
  const dynamicUserId = `test-voter-${Date.now()}`;
  
  // Cast single choice vote
  const voteRes1 = pollVotingService.castVote(
    testGuildId,
    'community-game-night',
    dynamicUserId,
    'TestUser#0001',
    undefined,
    ['role-vip'],
    100,
    50,
    { 'q-game': ['opt-valo'] }
  );
  assert(voteRes1.success === true, 'Vote successfully recorded for eligible user');
  assert(voteRes1.vote?.weight === 2, `Vote received VIP multiplier weight 2 (got ${voteRes1.vote?.weight})`);

  // Cast second vote (modification allowed)
  const voteRes2 = pollVotingService.castVote(
    testGuildId,
    'community-game-night',
    dynamicUserId,
    'TestUser#0001',
    undefined,
    ['role-vip'],
    100,
    50,
    { 'q-game': ['opt-mc'] }
  );
  assert(voteRes2.success === true, 'Vote modification allowed and updated selection');

  // Test invalid choices limit
  const testLimitPoll: DiscordPoll = {
    ...gamePoll,
    id: `poll-limit-${Date.now()}`,
    questions: [
      {
        id: 'ql',
        title: 'Choose max 1',
        type: 'SINGLE_CHOICE',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        order: 0,
        options: [
          { id: 'o1', label: 'One', weight: 1, votesCount: 0, points: 0 },
          { id: 'o2', label: 'Two', weight: 1, votesCount: 0, points: 0 },
        ],
      },
    ],
  };
  pollRepository.savePoll(testLimitPoll);

  const overflowVote = pollVotingService.castVote(
    testGuildId,
    testLimitPoll.id,
    `voter-overflow-${Date.now()}`,
    'OverflowUser#1234',
    undefined,
    [],
    10,
    10,
    { 'ql': ['o1', 'o2'] }
  );
  assert(overflowVote.success === false, 'Rejected vote exceeding maxSelections limit');

  // 4. Results & Quorum Calculation Tests
  console.log('\n📊 4. Results & Quorum Calculation Service:');
  pollVotingService.castVote(
    testGuildId,
    'staff-decision-01',
    `staff-voter-${Date.now()}`,
    'StaffAdmin#0001',
    undefined,
    ['role-admin'],
    100,
    50,
    { 'q-approval': ['opt-approve'] }
  );

  const staffResults = pollResultService.calculateResults(testGuildId, 'staff-decision-01');
  assert(staffResults !== null, 'Calculated results for staff-decision-01');
  assert(staffResults!.totalVoters >= 1, `Found ${staffResults!.totalVoters} voters`);
  assert(['PASSED', 'QUORUM_NOT_REACHED'].includes(staffResults!.quorumStatus), `Staff quorum status evaluated (${staffResults!.quorumStatus})`);
  assert(staffResults!.questionResults.length === 1, 'Question results present');
  const qRes = staffResults!.questionResults[0];
  assert(qRes.options.length > 0, `Options computed: ${qRes.options.map((o: any) => o.label).join(', ')}`);

  // 5. Poll Lifecycle & Management Tests
  console.log('\n⚙️ 5. Poll Lifecycle & Management Service:');
  const pauseRes = pollService.pausePoll(testGuildId, 'community-game-night');
  assert(pauseRes.success === true, 'Successfully paused active poll');

  const resumeRes = pollService.resumePoll(testGuildId, 'community-game-night');
  assert(resumeRes.success === true, 'Successfully resumed paused poll');

  const extendRes = pollService.extendPoll(testGuildId, 'community-game-night', 48);
  assert(extendRes.success === true, 'Extended poll duration by 48 hours');

  const dupRes = pollService.duplicatePoll(testGuildId, 'community-game-night');
  assert(dupRes.success === true && dupRes.poll !== undefined, 'Duplicated poll with draft status');

  const csvExport = pollService.exportVotesToCsv(testGuildId, 'community-game-night');
  assert(csvExport.includes('VoteId,GuildId,PollId'), 'CSV export generates valid headers');

  const jsonExport = pollService.exportVotesToJson(testGuildId, 'community-game-night');
  const parsedJson = JSON.parse(jsonExport);
  assert(Array.isArray(parsedJson), 'JSON export parses into an array of votes');

  // 6. Discord UI Embed & Components Tests
  console.log('\n🎨 6. Discord UI Embed & Components:');
  const panelEmbed = discordPollPanel.buildPanelEmbed(gamePoll);
  assert(panelEmbed.data.title !== undefined && panelEmbed.data.title.length > 0, `Embed title defined: "${panelEmbed.data.title}"`);

  const panelRows = discordPollPanel.buildPanelActionRows(gamePoll);
  assert(panelRows.length >= 1, `Generated ${panelRows.length} action rows for Discord panel`);

  // Summary
  console.log(`\n========================================`);
  console.log(`🏁 TESTS COMPLETED: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
