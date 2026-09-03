import { z } from 'zod';

export const ThreatLevelSchema = z.enum([
  'SAFE',       // 0-19 🟢
  'SUSPICIOUS', // 20-39 🟡
  'ELEVATED',   // 40-59 🟠
  'DANGEROUS',  // 60-79 🔴
  'CRITICAL',   // 80-100 🔥
]);
export type ThreatLevel = z.infer<typeof ThreatLevelSchema>;

export const RaidTypeSchema = z.enum([
  'JOIN_RAID',
  'MESSAGE_RAID',
  'MENTION_RAID',
  'BOT_RAID',
  'SERVER_NUKE',
  'MASS_BAN_KICK',
  'ACCOUNT_AGE',
]);
export type RaidType = z.infer<typeof RaidTypeSchema>;

export const RaidActionSchema = z.enum([
  'WARN',
  'DELETE',
  'TIMEOUT',
  'KICK',
  'BAN',
  'QUARANTINE',
  'VERIFY',
  'LOCKDOWN',
  'ALERT_STAFF',
  'ENABLE_RAID_MODE',
]);
export type RaidAction = z.infer<typeof RaidActionSchema>;

// Configuration par vecteur d'attaque
export const JoinRaidConfigSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().min(3).max(100).default(10), // joins
  timeWindowSeconds: z.number().min(3).max(120).default(10), // seconds
  actions: z.array(RaidActionSchema).default(['QUARANTINE', 'ALERT_STAFF', 'ENABLE_RAID_MODE']),
  minAccountAgeDays: z.number().min(0).max(90).default(3),
  penalizeNoAvatar: z.boolean().default(true),
});
export type JoinRaidConfig = z.infer<typeof JoinRaidConfigSchema>;

export const MessageRaidConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxMessagesPerUser: z.number().min(3).max(30).default(5),
  timeWindowSeconds: z.number().min(2).max(60).default(5),
  duplicateMessageThreshold: z.number().min(2).max(10).default(3),
  actions: z.array(RaidActionSchema).default(['DELETE', 'TIMEOUT', 'ALERT_STAFF']),
  timeoutDurationSeconds: z.number().min(10).max(86400).default(600), // 10 min
});
export type MessageRaidConfig = z.infer<typeof MessageRaidConfigSchema>;

export const MentionRaidConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxMentionsPerMessage: z.number().min(2).max(50).default(5),
  maxMentionsPerUserInWindow: z.number().min(3).max(100).default(10),
  timeWindowSeconds: z.number().min(3).max(60).default(10),
  blockEveryoneHere: z.boolean().default(true),
  actions: z.array(RaidActionSchema).default(['DELETE', 'TIMEOUT', 'ALERT_STAFF']),
});
export type MentionRaidConfig = z.infer<typeof MentionRaidConfigSchema>;

export const BotRaidConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxBotsInWindow: z.number().min(1).max(20).default(2),
  timeWindowSeconds: z.number().min(5).max(300).default(60),
  blockUnwhitelistedBots: z.boolean().default(true),
  allowedInviterRoleIds: z.array(z.string()).default([]),
  actions: z.array(RaidActionSchema).default(['KICK', 'ALERT_STAFF']),
});
export type BotRaidConfig = z.infer<typeof BotRaidConfigSchema>;

export const ServerNukeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxChannelDeletes: z.number().min(1).max(20).default(3),
  maxChannelCreates: z.number().min(2).max(30).default(5),
  maxRoleDeletes: z.number().min(1).max(20).default(3),
  maxRoleCreates: z.number().min(2).max(30).default(5),
  maxWebhookCreates: z.number().min(1).max(20).default(3),
  timeWindowSeconds: z.number().min(5).max(120).default(10),
  guardDangerousPermissions: z.boolean().default(true),
  actions: z.array(RaidActionSchema).default(['LOCKDOWN', 'ALERT_STAFF']),
});
export type ServerNukeConfig = z.infer<typeof ServerNukeConfigSchema>;

export const MassModConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxBans: z.number().min(2).max(30).default(4),
  maxKicks: z.number().min(2).max(30).default(4),
  maxTimeouts: z.number().min(3).max(50).default(6),
  timeWindowSeconds: z.number().min(5).max(120).default(15),
  actions: z.array(RaidActionSchema).default(['ALERT_STAFF', 'LOCKDOWN']),
});
export type MassModConfig = z.infer<typeof MassModConfigSchema>;

export const AccountAgeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tiers: z
    .array(
      z.object({
        ageThresholdHours: z.number().min(1).max(2160), // up to 90 days
        actions: z.array(RaidActionSchema),
        tagRole: z.string().nullable().default(null),
      })
    )
    .default([
      { ageThresholdHours: 1, actions: ['QUARANTINE', 'ALERT_STAFF'], tagRole: null },
      { ageThresholdHours: 24, actions: ['VERIFY'], tagRole: null },
    ]),
});
export type AccountAgeConfig = z.infer<typeof AccountAgeConfigSchema>;

export const RaidModeConfigSchema = z.object({
  blockNewMembersWrite: z.boolean().default(true),
  autoQuarantineJoins: z.boolean().default(true),
  requireVerification: z.boolean().default(true),
  lockdownDesignatedChannels: z.boolean().default(true),
  blockAllInvites: z.boolean().default(true),
  blockUnverifiedBots: z.boolean().default(true),
  increaseDetectionSensitivity: z.boolean().default(true),
  designatedChannelIds: z.array(z.string()).default([]),
  quarantineRoleId: z.string().nullable().default(null),
  autoExitMinutesWithoutActivity: z.number().min(1).max(60).default(5),
  minDurationMinutes: z.number().min(1).max(180).default(10),
  cooldownMinutes: z.number().min(1).max(60).default(5),
});
export type RaidModeConfig = z.infer<typeof RaidModeConfigSchema>;

export const TrustWhitelistSchema = z.object({
  trustedUserIds: z.array(z.string()).default([]),
  trustedRoleIds: z.array(z.string()).default([]),
  trustedBotIds: z.array(z.string()).default([]),
  exemptChannelIds: z.array(z.string()).default([]),
});
export type TrustWhitelist = z.infer<typeof TrustWhitelistSchema>;

export const RaidAlertConfigSchema = z.object({
  channelId: z.string().nullable().default(null),
  mentionRoleId: z.string().nullable().default(null),
  enableStaffDm: z.boolean().default(false),
  webhookUrl: z.string().nullable().default(null),
  minThreatLevelToAlert: ThreatLevelSchema.default('SUSPICIOUS'),
});
export type RaidAlertConfig = z.infer<typeof RaidAlertConfigSchema>;

export const AntiRaidConfigSchema = z.object({
  enabled: z.boolean().default(true),
  adaptiveDetection: z.boolean().default(true),
  joinRaid: JoinRaidConfigSchema.default({}),
  messageRaid: MessageRaidConfigSchema.default({}),
  mentionRaid: MentionRaidConfigSchema.default({}),
  botRaid: BotRaidConfigSchema.default({}),
  serverNuke: ServerNukeConfigSchema.default({}),
  massMod: MassModConfigSchema.default({}),
  accountAge: AccountAgeConfigSchema.default({}),
  raidMode: RaidModeConfigSchema.default({}),
  whitelist: TrustWhitelistSchema.default({}),
  alerts: RaidAlertConfigSchema.default({}),
});
export type AntiRaidConfig = z.infer<typeof AntiRaidConfigSchema>;

// Données d'incident et d'investigation
export interface InvolvedMemberInfo {
  userId: string;
  userTag: string;
  joinedAt: string;
  accountCreatedAt: string;
  accountAgeDays: number;
  hasDefaultAvatar: boolean;
  isBot: boolean;
  actionTaken: string;
  riskContributions: string[];
}

export interface RaidIncident {
  id: string; // ex: "INC-101"
  guildId: string;
  type: RaidType;
  threatLevel: ThreatLevel;
  maxRiskScore: number;
  triggerReason: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number;
  affectedCount: number;
  actionsExecuted: RaidAction[];
  triggerSignals: string[];
  involvedMembers: InvolvedMemberInfo[];
  status: 'ACTIVE' | 'RESOLVED' | 'AUTO_RESOLVED';
  resolvedBy?: string;
}

export interface LiveRaidMetrics {
  joinsPerMinute: number;
  messagesPerMinute: number;
  mentionsPerMinute: number;
  bansPerMinute: number;
  kicksPerMinute: number;
  botsAddedPerMinute: number;
  channelsChangedPerMinute: number;
  rolesChangedPerMinute: number;
  webhooksChangedPerMinute: number;
  leavesPerMinute: number;
  currentRiskScore: number;
  threatLevel: ThreatLevel;
  raidModeActive: boolean;
  raidModeRemainingSeconds: number;
  lockdownActive: boolean;
  lockedChannelsCount: number;
  quarantinedMembersCount: number;
  lastSuspiciousActivityTimestamp: number;
}
