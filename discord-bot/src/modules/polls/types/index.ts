import { z } from 'zod';

export const PollTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'YES_NO',
  'RATING',
  'RANKING',
  'APPROVAL',
  'WEIGHTED_VOTE',
  'ELECTION',
  'ANONYMOUS_POLL',
]);
export type PollType = z.infer<typeof PollTypeSchema>;

export const PollStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'ENDED',
  'ARCHIVED',
]);
export type PollStatus = z.infer<typeof PollStatusSchema>;

export const ResultsVisibilitySchema = z.enum([
  'LIVE',
  'AFTER_VOTE',
  'AT_END',
  'STAFF_ONLY',
]);
export type ResultsVisibility = z.infer<typeof ResultsVisibilitySchema>;

export const AnonymityLevelSchema = z.enum([
  'PUBLIC',
  'ANONYMOUS',
  'FULLY_ANONYMOUS',
]);
export type AnonymityLevel = z.infer<typeof AnonymityLevelSchema>;

export const PollOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  description: z.string().default(''),
  emoji: z.string().default(''),
  imageUrl: z.string().default(''),
  color: z.string().default('#6366f1'),
  weight: z.number().default(1),
  votesCount: z.number().default(0),
  points: z.number().default(0),
});
export type PollOption = z.infer<typeof PollOptionSchema>;

export const PollQuestionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  type: PollTypeSchema.default('SINGLE_CHOICE'),
  options: z.array(PollOptionSchema).default([]),
  required: z.boolean().default(true),
  minSelections: z.number().default(1),
  maxSelections: z.number().default(1),
  order: z.number().default(0),
});
export type PollQuestion = z.infer<typeof PollQuestionSchema>;

export const PollEligibilitySchema = z.object({
  allowedRoleIds: z.array(z.string()).default([]),
  forbiddenRoleIds: z.array(z.string()).default([]),
  minAccountAgeDays: z.number().default(0),
  minGuildMembershipDays: z.number().default(0),
  specificUserIds: z.array(z.string()).default([]),
  logicGate: z.enum(['ALL', 'ANY']).default('ANY'),
});
export type PollEligibility = z.infer<typeof PollEligibilitySchema>;

export const PollRoleWeightSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  weightMultiplier: z.number().default(1),
});
export type PollRoleWeight = z.infer<typeof PollRoleWeightSchema>;

export const PollQuorumConfigSchema = z.object({
  enabled: z.boolean().default(false),
  minParticipantsCount: z.number().default(0),
  minParticipationPercentage: z.number().default(0),
  approvalThresholdPercentage: z.number().default(50), // 50% majority or 66% supermajority
});
export type PollQuorumConfig = z.infer<typeof PollQuorumConfigSchema>;

export const DiscordPollPanelConfigSchema = z.object({
  channelId: z.string().default(''),
  messageId: z.string().optional(),
  embedTitle: z.string().default('🗳️ Sondage Communautaire'),
  embedDescription: z.string().default('Participez au vote dès maintenant ci-dessous.'),
  embedColor: z.string().default('#8b5cf6'),
  thumbnailUrl: z.string().default(''),
  imageUrl: z.string().default(''),
  footerText: z.string().default('ETHONE Polls & Decisions 2.0'),
  buttonText: z.string().default('Voter'),
  showLiveResultsButton: z.boolean().default(true),
});
export type DiscordPollPanelConfig = z.infer<typeof DiscordPollPanelConfigSchema>;

export const AutomationTriggerPollSchema = z.enum([
  'POLL_ENDED',
  'WINNER_DETERMINED',
  'QUORUM_REACHED',
  'THRESHOLD_PASSED',
]);
export type AutomationTriggerPoll = z.infer<typeof AutomationTriggerPollSchema>;

export const PollAutomationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  trigger: AutomationTriggerPollSchema,
  actions: z.array(
    z.object({
      type: z.enum([
        'ANNOUNCE_WINNER',
        'SEND_DM',
        'ADD_ROLE',
        'REMOVE_ROLE',
        'CREATE_THREAD',
        'CREATE_TICKET',
        'NOTIFY_STAFF',
      ]),
      targetChannelId: z.string().optional(),
      targetRoleId: z.string().optional(),
      messageTemplate: z.string().optional(),
      ticketCategoryId: z.string().optional(),
    })
  ).default([]),
});
export type PollAutomationRule = z.infer<typeof PollAutomationRuleSchema>;

export const DiscordPollSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('Communauté'),
  type: PollTypeSchema.default('SINGLE_CHOICE'),
  status: PollStatusSchema.default('DRAFT'),
  creatorId: z.string(),
  creatorTag: z.string(),
  anonymity: AnonymityLevelSchema.default('PUBLIC'),
  resultsVisibility: ResultsVisibilitySchema.default('LIVE'),
  allowVoteChange: z.boolean().default(true),
  allowVoteRetract: z.boolean().default(false),
  questions: z.array(PollQuestionSchema).default([]),
  eligibility: PollEligibilitySchema.default({
    allowedRoleIds: [],
    forbiddenRoleIds: [],
    minAccountAgeDays: 0,
    minGuildMembershipDays: 0,
    specificUserIds: [],
    logicGate: 'ANY',
  }),
  roleWeights: z.array(PollRoleWeightSchema).default([]),
  quorum: PollQuorumConfigSchema.default({
    enabled: false,
    minParticipantsCount: 0,
    minParticipationPercentage: 0,
    approvalThresholdPercentage: 50,
  }),
  automations: z.array(PollAutomationRuleSchema).default([]),
  panelConfig: DiscordPollPanelConfigSchema.default({
    channelId: '',
    embedTitle: '🗳️ Sondage Communautaire',
    embedDescription: 'Participez au vote dès maintenant ci-dessous.',
    embedColor: '#8b5cf6',
    thumbnailUrl: '',
    imageUrl: '',
    footerText: 'ETHONE Polls & Decisions 2.0',
    buttonText: 'Voter',
    showLiveResultsButton: true,
  }),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  endedAt: z.string().optional(),
});
export type DiscordPoll = z.infer<typeof DiscordPollSchema>;

export const PollVoteSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  guildId: z.string(),
  userId: z.string(),
  userTag: z.string(),
  userAvatar: z.string().default(''),
  questionId: z.string(),
  selectedOptionIds: z.array(z.string()),
  weight: z.number().default(1),
  votedAt: z.string(),
});
export type PollVote = z.infer<typeof PollVoteSchema>;

export interface PollOptionResult {
  optionId: string;
  label: string;
  emoji?: string;
  color?: string;
  votesCount: number;
  weightedPoints: number;
  percentage: number;
}

export interface PollQuestionResult {
  questionId: string;
  title: string;
  totalVotes: number;
  options: PollOptionResult[];
  winningOption?: PollOptionResult;
}

export interface PollResultsSummary {
  pollId: string;
  title: string;
  status: PollStatus;
  totalVotes: number;
  uniqueParticipants: number;
  serverMemberCount: number;
  participationRate: number;
  quorumStatus: 'PASSED' | 'REJECTED' | 'QUORUM_NOT_REACHED' | 'NOT_APPLICABLE';
  approvalPercentage: number;
  questionsResults: PollQuestionResult[];
  winningOption?: PollOptionResult;
  endsAt?: string;
}

export interface PollOverviewKPIs {
  activePolls: number;
  totalVotes: number;
  participationRate: number;
  completedPolls: number;
  averageParticipation: number;
}
