import { z } from 'zod';

export const AutoModRiskLevelSchema = z.enum([
  'SAFE',     // 0-19 🟢
  'LOW',      // 20-39 🟡
  'MEDIUM',   // 40-59 🟠
  'HIGH',     // 60-79 🔴
  'CRITICAL', // 80-100 🔥
]);
export type AutoModRiskLevel = z.infer<typeof AutoModRiskLevelSchema>;

export const AutoModActionSchema = z.enum([
  'DELETE',
  'WARN',
  'STRIKE',
  'TIMEOUT',
  'KICK',
  'BAN',
  'QUARANTINE',
  'LOCK_CHANNEL',
  'ALERT_STAFF',
  'LOG',
  'ADD_ROLE',
  'REMOVE_ROLE',
]);
export type AutoModAction = z.infer<typeof AutoModActionSchema>;

export const ConditionTypeSchema = z.enum([
  'CONTAINS_WORD',
  'CONTAINS_LINK',
  'CONTAINS_INVITE',
  'STARTS_WITH',
  'LENGTH_GREATER_THAN',
  'CAPS_PERCENTAGE_GREATER_THAN',
  'MENTIONS_GREATER_THAN',
  'USER_ACCOUNT_AGE_HOURS_LESS_THAN',
  'USER_HAS_ROLE',
  'CHANNEL_IS',
  'USER_STRIKES_GREATER_THAN',
  'RISK_SCORE_GREATER_THAN',
  'RAID_MODE_ACTIVE',
]);
export type ConditionType = z.infer<typeof ConditionTypeSchema>;

export const RuleConditionSchema = z.object({
  type: ConditionTypeSchema,
  operator: z.enum(['EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'NOT_EQUALS']).default('EQUALS'),
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const CustomRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  priority: z.number().default(1),
  conditionOperator: z.enum(['ALL', 'ANY', 'NOT']).default('ALL'),
  conditions: z.array(RuleConditionSchema).default([]),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN']),
  timeoutSeconds: z.number().min(10).max(86400 * 28).default(300), // default 5m
  addStrikesCount: z.number().min(0).max(10).default(1),
  immediateActionBypassStrikes: z.boolean().default(false),
  exemptRoleIds: z.array(z.string()).default([]),
  exemptChannelIds: z.array(z.string()).default([]),
  targetRoleIds: z.array(z.string()).default([]),
  targetChannelIds: z.array(z.string()).default([]),
  alertStaffChannelId: z.string().nullable().default(null),
});
export type CustomRule = z.infer<typeof CustomRuleSchema>;

// Configurations des Détecteurs Spécifiques
export const SpamDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxMessages: z.number().min(3).max(30).default(5),
  timeWindowSeconds: z.number().min(2).max(60).default(5),
  similarityThreshold: z.number().min(0.5).max(1.0).default(0.85),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN', 'STRIKE']),
});

export const FloodDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxCharacterRepeats: z.number().min(3).max(50).default(8),
  maxWordRepeats: z.number().min(2).max(20).default(5),
  maxMessageLength: z.number().min(100).max(4000).default(1500),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN']),
});

export const LinkDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  blockAllLinks: z.boolean().default(false),
  blockShortenedLinks: z.boolean().default(true),
  blockIpAddresses: z.boolean().default(true),
  whitelistedDomains: z.array(z.string()).default(['youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'github.com', 'spotify.com']),
  blacklistedDomains: z.array(z.string()).default([]),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN']),
});

export const InviteDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  blockAllInvites: z.boolean().default(true),
  allowedGuildIds: z.array(z.string()).default([]),
  allowedChannelIds: z.array(z.string()).default([]),
  allowedRoleIds: z.array(z.string()).default([]),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN', 'STRIKE']),
});

export const MentionDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxUserMentions: z.number().min(2).max(50).default(5),
  maxRoleMentions: z.number().min(1).max(20).default(3),
  maxTotalMentions: z.number().min(2).max(50).default(6),
  blockEveryoneHere: z.boolean().default(true),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'TIMEOUT', 'ALERT_STAFF']),
});

export const GhostPingDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  timeWindowSeconds: z.number().min(3).max(60).default(15),
  actions: z.array(AutoModActionSchema).default(['LOG', 'WARN']),
});

export const CapsDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  minMessageLength: z.number().min(5).max(50).default(10),
  maxCapsPercentage: z.number().min(40).max(100).default(70),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN']),
});

export const KeywordDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  blacklist: z.array(z.string()).default([]),
  whitelist: z.array(z.string()).default([]),
  wildcardsEnabled: z.boolean().default(true),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN', 'STRIKE']),
});

export const RegexRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(),
  flags: z.string().default('i'),
  enabled: z.boolean().default(true),
  actions: z.array(AutoModActionSchema).default(['DELETE', 'WARN']),
});

export const RegexDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxExecutionTimeMs: z.number().default(20),
  rules: z.array(RegexRuleSchema).default([]),
});

export const ProfileDetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  scanUsername: z.boolean().default(true),
  scanNickname: z.boolean().default(true),
  blockedWords: z.array(z.string()).default([]),
  actions: z.array(AutoModActionSchema).default(['WARN', 'LOG']),
});

// Échelle de Sanctions Progressives
export const ProgressiveSanctionStepSchema = z.object({
  strikeCount: z.number().min(1).max(20),
  action: AutoModActionSchema,
  durationSeconds: z.number().default(300), // pour timeout
  reason: z.string(),
});
export type ProgressiveSanctionStep = z.infer<typeof ProgressiveSanctionStepSchema>;

export const StrikeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  expirationDays: z.number().min(1).max(90).default(7),
  progressiveSteps: z.array(ProgressiveSanctionStepSchema).default([
    { strikeCount: 1, action: 'WARN', durationSeconds: 0, reason: '1er avertissement' },
    { strikeCount: 2, action: 'TIMEOUT', durationSeconds: 300, reason: '2 strikes : Timeout 5 min' },
    { strikeCount: 3, action: 'TIMEOUT', durationSeconds: 3600, reason: '3 strikes : Timeout 1 heure' },
    { strikeCount: 4, action: 'KICK', durationSeconds: 0, reason: '4 strikes : Expulsion du serveur' },
    { strikeCount: 5, action: 'BAN', durationSeconds: 0, reason: '5 strikes : Bannissement définitif' },
  ]),
});
export type StrikeConfig = z.infer<typeof StrikeConfigSchema>;

export const AutoModConfigSchema = z.object({
  enabled: z.boolean().default(true),
  smartMode: z.boolean().default(true), // Adapts thresholds based on activity and Anti-Raid state
  trustLevels: z
    .object({
      unknownLevel: z.number().default(0),
      newMemberHours: z.number().default(24),
      trustedRoleIds: z.array(z.string()).default([]),
      staffRoleIds: z.array(z.string()).default([]),
    })
    .default({}),
  exemptRoleIds: z.array(z.string()).default([]),
  exemptChannelIds: z.array(z.string()).default([]),
  alertChannelId: z.string().nullable().default(null),
  staffMentionRoleId: z.string().nullable().default(null),
  spam: SpamDetectorConfigSchema.default({}),
  flood: FloodDetectorConfigSchema.default({}),
  links: LinkDetectorConfigSchema.default({}),
  invites: InviteDetectorConfigSchema.default({}),
  mentions: MentionDetectorConfigSchema.default({}),
  ghostPing: GhostPingDetectorConfigSchema.default({}),
  caps: CapsDetectorConfigSchema.default({}),
  keywords: KeywordDetectorConfigSchema.default({}),
  regex: RegexDetectorConfigSchema.default({}),
  profiles: ProfileDetectorConfigSchema.default({}),
  strikes: StrikeConfigSchema.default({}),
});
export type AutoModConfig = z.infer<typeof AutoModConfigSchema>;

// Incident & Détection Logging
export interface DetectionResult {
  detectorName: string;
  triggered: boolean;
  riskPoints: number;
  reason: string;
  matchedContent?: string;
  actions: AutoModAction[];
}

export interface AutoModIncident {
  id: string;
  guildId: string;
  userId: string;
  userTag: string;
  channelId: string;
  channelName: string;
  messageContent: string;
  triggeredDetectors: string[];
  matchedRules: string[];
  totalRiskScore: number;
  riskLevel: AutoModRiskLevel;
  actionsTaken: AutoModAction[];
  strikesAdded: number;
  currentStrikesTotal: number;
  timestamp: string;
}

export interface UserStrikeRecord {
  id: string;
  guildId: string;
  userId: string;
  reason: string;
  addedBy: string; // 'AUTOMOD' | staffId
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

export interface UserModerationProfile {
  userId: string;
  userTag: string;
  accountAgeDays: number;
  trustLevel: number;
  activeStrikes: number;
  totalStrikesHistory: number;
  warningsCount: number;
  timeoutsCount: number;
  kicksCount: number;
  bansCount: number;
  recentDetections: AutoModIncident[];
}

export interface RuleTestInput {
  guildId: string;
  messageContent: string;
  userId?: string;
  channelId?: string;
}

export interface RuleTestOutput {
  matchedDetectors: string[];
  matchedCustomRules: string[];
  totalRiskScore: number;
  riskLevel: AutoModRiskLevel;
  actionsToExecute: AutoModAction[];
  wouldAddStrikes: number;
  explanation: string[];
}
