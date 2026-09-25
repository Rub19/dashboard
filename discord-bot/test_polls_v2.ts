import { pollRepository } from './src/modules/polls/storage/pollRepository.js';
import { pollEligibilityService } from './src/modules/polls/services/pollEligibilityService.js';
import { pollVotingService } from './src/modules/polls/services/pollVotingService.js';
import { pollResultService } from './src/modules/polls/services/pollResultService.js';
import { pollService } from './src/modules/polls/services/pollService.js';
import { discordPollPanel } from './src/modules/polls/ui/discordPollPanel.js';
import { DiscordPoll, PollVote } from './src/modules/polls/types/index.js';

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

function setupTestFixtures(guildId: string) {
  const demoPolls: DiscordPoll[] = [
    {
      id: 'community-game-night',
      guildId,
      title: 'Soirée Gaming Communautaire — Choix du Jeu',
      description: 'Votez pour le jeu principal de notre stream communautaire de vendredi soir !',
      category: 'Événements & Jeux',
      type: 'SINGLE_CHOICE',
      status: 'ACTIVE',
      creatorId: '123456789012345678',
      creatorTag: 'Admin#0001',
      anonymity: 'PUBLIC',
      resultsVisibility: 'LIVE',
      allowVoteChange: true,
      allowVoteRetract: false,
      questions: [
        {
          id: 'q-game',
          title: 'À quel jeu souhaitez-vous jouer ce vendredi ?',
          description: 'Une seule réponse possible',
          type: 'SINGLE_CHOICE',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          order: 0,
          options: [
            { id: 'opt-valo', label: 'Valorant (Custom 5v5)', emoji: '🎯', description: 'Tournoi amical inter-membres', color: '#f43f5e', imageUrl: '', weight: 1, votesCount: 52, points: 52 },
            { id: 'opt-mc', label: 'Minecraft (Mini-jeux Bedwars)', emoji: '⛏️', description: 'Serveur privé dédié', color: '#10b981', imageUrl: '', weight: 1, votesCount: 41, points: 41 },
            { id: 'opt-lethal', label: 'Lethal Company', emoji: '👽', description: 'Escouades vocales de 4', color: '#f59e0b', imageUrl: '', weight: 1, votesCount: 22, points: 22 },
            { id: 'opt-rocket', label: 'Rocket League (Tournoi 2v2)', emoji: '⚽', description: 'Matches à élimination directe', color: '#3b82f6', imageUrl: '', weight: 1, votesCount: 13, points: 13 },
          ],
        },
      ],
      eligibility: {
        allowedRoleIds: [],
        forbiddenRoleIds: [],
        minAccountAgeDays: 0,
        minGuildMembershipDays: 0,
        specificUserIds: [],
        logicGate: 'ANY',
      },
      roleWeights: [
        { roleId: 'role-vip', roleName: 'VIP', weightMultiplier: 2 },
        { roleId: 'role-booster', roleName: 'Server Booster', weightMultiplier: 2 },
      ],
      quorum: {
        enabled: false,
        minParticipantsCount: 0,
        minParticipationPercentage: 0,
        approvalThresholdPercentage: 50,
      },
      automations: [
        {
          id: 'auto-winner-announce',
          name: 'Annonce automatique du jeu gagnant',
          enabled: true,
          trigger: 'POLL_ENDED',
          actions: [
            {
              type: 'ANNOUNCE_WINNER',
              messageTemplate: '🏆 **Le vote est terminé !** Le jeu retenu pour ce soir est **{winner}** avec {votes} votes ! Rendez-vous en vocal à 21h.',
            },
          ],
        },
      ],
      panelConfig: {
        channelId: '123456789012345688',
        embedTitle: '🎮 Choix du Jeu — Vendredi Soir',
        embedDescription: 'Quel titre préférez-vous pour notre soirée communautaire ? Votez avec les boutons ci-dessous.',
        embedColor: '#8b5cf6',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'ETHONE Community Poll • Fin des votes vendredi à 18h',
        buttonText: 'Voter',
        showLiveResultsButton: true,
      },
      startsAt: new Date(Date.now() - 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'staff-decision-01',
      guildId,
      title: 'Décision Staff : Révision des Sanctions AutoMod',
      description: "Vote interne de l'équipe de modération pour adopter le nouveau barème de sanctions progressives.",
      category: 'Décisions Staff',
      type: 'APPROVAL',
      status: 'ACTIVE',
      creatorId: '123456789012345678',
      creatorTag: 'Admin#0001',
      anonymity: 'ANONYMOUS',
      resultsVisibility: 'STAFF_ONLY',
      allowVoteChange: false,
      allowVoteRetract: false,
      questions: [
        {
          id: 'q-approval',
          title: 'Approuvez-vous la mise en place du barème AutoMod 2.0 ?',
          description: 'Quorum requis de 60% et majorité qualifiée de 66% pour adoption.',
          type: 'APPROVAL',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          order: 0,
          options: [
            { id: 'opt-approve', label: 'Approuver (Pour)', emoji: '✅', description: 'Adopter la réforme immédiatement', color: '#10b981', imageUrl: '', weight: 1, votesCount: 8, points: 8 },
            { id: 'opt-reject', label: 'Rejeter (Contre)', emoji: '❌', description: "Conserver l'ancien barème", color: '#f43f5e', imageUrl: '', weight: 1, votesCount: 2, points: 2 },
            { id: 'opt-abstain', label: 'Abstention', emoji: '⚪', description: 'Ne prend pas parti', color: '#71717a', imageUrl: '', weight: 1, votesCount: 1, points: 1 },
          ],
        },
      ],
      eligibility: {
        allowedRoleIds: ['role-staff', 'role-mod', 'role-admin'],
        forbiddenRoleIds: [],
        minAccountAgeDays: 30,
        minGuildMembershipDays: 14,
        specificUserIds: [],
        logicGate: 'ANY',
      },
      roleWeights: [],
      quorum: {
        enabled: true,
        minParticipantsCount: 10,
        minParticipationPercentage: 60,
        approvalThresholdPercentage: 66,
      },
      automations: [],
      panelConfig: {
        channelId: '123456789012345689',
        embedTitle: '⚖️ Vote Staff Privé — AutoMod 2.0',
        embedDescription: "Vote anonyme à bulletin secret réservé à l'équipe de modération.",
        embedColor: '#6366f1',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'ETHONE Staff Governance • Quorum 60%',
        buttonText: 'Voter à bulletin secret',
        showLiveResultsButton: false,
      },
      startsAt: new Date(Date.now() - 172800000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'feedback-event-01',
      guildId,
      title: 'Note & Feedback Tournoi Printemps',
      description: 'Sondage de satisfaction après la clôture de notre tournoi communautaire.',
      category: 'Satisfaction & Feedback',
      type: 'RATING',
      status: 'ENDED',
      creatorId: '123456789012345678',
      creatorTag: 'Admin#0001',
      anonymity: 'PUBLIC',
      resultsVisibility: 'LIVE',
      allowVoteChange: false,
      allowVoteRetract: false,
      questions: [
        {
          id: 'q-rating',
          title: "Comment notez-vous l'organisation globale du tournoi ?",
          description: 'De 1 (très décevant) à 5 (excellent)',
          type: 'RATING',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          order: 0,
          options: [
            { id: 'star-5', label: '⭐⭐⭐⭐⭐ 5 étoiles (Excellent)', emoji: '⭐', description: '', imageUrl: '', color: '#f59e0b', weight: 1, votesCount: 38, points: 190 },
            { id: 'star-4', label: '⭐⭐⭐⭐ 4 étoiles (Très bon)', emoji: '⭐', description: '', imageUrl: '', color: '#10b981', weight: 1, votesCount: 24, points: 96 },
            { id: 'star-3', label: '⭐⭐⭐ 3 étoiles (Correct)', emoji: '⭐', description: '', imageUrl: '', color: '#3b82f6', weight: 1, votesCount: 8, points: 24 },
            { id: 'star-2', label: '⭐⭐ 2 étoiles (Moyen)', emoji: '⭐', description: '', imageUrl: '', color: '#f97316', weight: 1, votesCount: 2, points: 4 },
            { id: 'star-1', label: '⭐ 1 étoile (À améliorer)', emoji: '⭐', description: '', imageUrl: '', color: '#ef4444', weight: 1, votesCount: 1, points: 1 },
          ],
        },
      ],
      eligibility: {
        allowedRoleIds: [],
        forbiddenRoleIds: [],
        minAccountAgeDays: 0,
        minGuildMembershipDays: 0,
        specificUserIds: [],
        logicGate: 'ANY',
      },
      roleWeights: [],
      quorum: { enabled: false, minParticipantsCount: 0, minParticipationPercentage: 0, approvalThresholdPercentage: 50 },
      automations: [],
      panelConfig: {
        channelId: '123456789012345688',
        embedTitle: '📊 Bilan Tournoi — Résultats',
        embedDescription: 'Merci à tous les participants ! Découvrez les retours de la communauté.',
        embedColor: '#f59e0b',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'Sondage clos • Score moyen : 4.4 / 5',
        buttonText: 'Voir les résultats',
        showLiveResultsButton: true,
      },
      startsAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      endsAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      endedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const p of demoPolls) {
    pollRepository.savePoll(p);
  }

  const demoVotes: PollVote[] = [
    {
      id: 'vote-1',
      pollId: 'community-game-night',
      guildId,
      userId: 'user-alpha-1',
      userTag: 'SkyWalker#0001',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      questionId: 'q-game',
      selectedOptionIds: ['opt-valo'],
      weight: 1,
      votedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'vote-2',
      pollId: 'community-game-night',
      guildId,
      userId: 'user-alpha-2',
      userTag: 'VIP_Gamer#7777',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
      questionId: 'q-game',
      selectedOptionIds: ['opt-valo'],
      weight: 2,
      votedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'vote-3',
      pollId: 'community-game-night',
      guildId,
      userId: 'user-alpha-3',
      userTag: 'CraftBuilder#4040',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/2.png',
      questionId: 'q-game',
      selectedOptionIds: ['opt-mc'],
      weight: 1,
      votedAt: new Date(Date.now() - 10800000).toISOString(),
    },
  ];

  for (const v of demoVotes) {
    pollRepository.saveVote(v);
  }
}

async function runTests() {
  console.log('🧪 Starting ETHONE Polls & Voting 2.0 Test Suite...\n');
  const testGuildId = '123456789012345678';
  const otherGuildId = '999999999999999999';
  setupTestFixtures(testGuildId);

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

  // Options : inconnues refusées, doublons comptés une seule fois
  const unknownOpt = pollVotingService.castVote(testGuildId, testLimitPoll.id, `voter-unknown-${Date.now()}`, 'U#1', undefined, [], 10, 10, { 'ql': ['zzz'] });
  assert(unknownOpt.success === false, 'Rejected vote on an option id that does not exist');
  const dupVote = pollVotingService.castVote(testGuildId, testLimitPoll.id, `voter-dup-${Date.now()}`, 'D#1', undefined, [], 10, 10, { 'ql': ['o1', 'o1'] });
  assert(dupVote.success === true, 'Duplicate option ids are collapsed instead of rejected');
  const dupPoll = pollRepository.getPollById(testGuildId, testLimitPoll.id)!;
  assert(dupPoll.questions[0].options.find((o) => o.id === 'o1')!.votesCount === 1, 'Duplicate option ids count once (no vote stuffing)');

  // 4. Results & Quorum Calculation Tests
  console.log('\n📊 4. Results & Quorum Calculation Service:');
  // The seed data's `endsAt` is computed relative to whenever this poll was
  // first written to disk (the repository only seeds once — see
  // pollRepository.seedDefaultData()'s `if (this.polls.length === 0)` guard —
  // so it never gets a fresh "+24h from now" on subsequent runs). Once that
  // original 24h window elapses, castVote's own expiry check flips the poll
  // to ENDED and every vote below silently fails with 0 voters. Reset it
  // defensively so this section doesn't depend on when the repo happened to
  // be seeded.
  const staffPollForVoting = pollRepository.getPollById(testGuildId, 'staff-decision-01');
  if (staffPollForVoting) {
    staffPollForVoting.status = 'ACTIVE';
    staffPollForVoting.endsAt = new Date(Date.now() + 86400000).toISOString();
    delete staffPollForVoting.endedAt;
    pollRepository.savePoll(staffPollForVoting);
  }
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

  // Cleanup — duplicatePoll() and the standalone testLimitPoll (section 3)
  // above both create real, permanently-persisted polls on every run
  // (data/discord_polls.json has no test isolation of its own), so repeated
  // runs of this suite would otherwise leave an ever-growing pile of
  // "(Copie)" drafts and "poll-limit-*" fixtures behind. Remove exactly what
  // this run created; nothing else in this file persists new top-level polls.
  if (dupRes.poll) {
    pollRepository.deletePoll(testGuildId, dupRes.poll.id);
  }
  pollRepository.deletePoll(testGuildId, testLimitPoll.id);

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
