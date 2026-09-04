import { z } from 'zod';

export const CaseActionSchema = z.enum([
  'WARN',
  'TIMEOUT',
  'KICK',
  'BAN',
  'UNBAN',
  'SOFTBAN',
  'QUARANTINE',
]);

export type CaseAction = z.infer<typeof CaseActionSchema>;

export const CaseSourceSchema = z.enum([
  'MANUAL',
  'AUTOMOD',
  'ANTI_RAID',
  'SECURITY',
  'SYSTEM',
]);

export type CaseSource = z.infer<typeof CaseSourceSchema>;

export const CaseStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']);

export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const AppealStatusSchema = z.enum(['NONE', 'PENDING', 'ACCEPTED', 'REJECTED']);

export type AppealStatus = z.infer<typeof AppealStatusSchema>;

export const StandardReasonSchema = z.enum([
  'Spam',
  'Harassment',
  'Advertising',
  'Raid',
  'NSFW',
  'Scam',
  'Toxicity',
  'Rule violation',
  'Other',
]);

export type StandardReason = z.infer<typeof StandardReasonSchema>;

export const CaseEvidenceSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  type: z.enum(['MESSAGE_LINK', 'SCREENSHOT_URL', 'LOG_SNIPPET', 'NOTE']),
  url: z.string().optional(),
  content: z.string().optional(),
  messageId: z.string().optional(),
  channelId: z.string().optional(),
  addedBy: z.string(),
  createdAt: z.string(),
});

export type CaseEvidence = z.infer<typeof CaseEvidenceSchema>;

export const StaffNoteSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  userId: z.string(),
  caseId: z.string().optional(),
  authorId: z.string(),
  authorTag: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type StaffNote = z.infer<typeof StaffNoteSchema>;

export const ModerationCaseSchema = z.object({
  id: z.string(), // ID mondial unique e.g. CASE-guildId-1842
  caseNumber: z.number(), // Numéro par serveur e.g. 1842
  guildId: z.string(),
  userId: z.string(),
  userTag: z.string(),
  moderatorId: z.string(),
  moderatorTag: z.string(),
  action: CaseActionSchema,
  reason: z.string(),
  standardCategory: StandardReasonSchema.optional().default('Other'),
  durationSeconds: z.number().nullable().optional().default(null),
  createdAt: z.string(),
  expiresAt: z.string().nullable().optional().default(null),
  status: CaseStatusSchema.default('ACTIVE'),
  source: CaseSourceSchema.default('MANUAL'),
  appealStatus: AppealStatusSchema.default('NONE'),
  metadata: z
    .object({
      channelId: z.string().optional(),
      channelName: z.string().optional(),
      messageId: z.string().optional(),
      messageContent: z.string().optional(),
      incidentId: z.string().optional(),
      ruleTriggered: z.string().optional(),
      riskScore: z.number().optional(),
      revertedAt: z.string().optional(),
      revertedBy: z.string().optional(),
      revertReason: z.string().optional(),
      relatedCaseNumbers: z.array(z.number()).optional(),
    })
    .partial()
    .optional()
    .default({}),
});

export type ModerationCase = z.infer<typeof ModerationCaseSchema>;

export const ModerationSettingsSchema = z.object({
  guildId: z.string(),
  logChannelId: z.string().optional(),
  quarantineRoleId: z.string().optional(),
  staffRoles: z.array(z.string()).default([]),
  retentionDays: z.number().default(0), // 0 = Forever, 30, 90, 180, 365
  staffAbuseLimits: z
    .object({
      maxBansPerMinute: z.number().default(10),
      maxKicksPerMinute: z.number().default(15),
      maxTimeoutsPerMinute: z.number().default(20),
    })
    .default({
      maxBansPerMinute: 10,
      maxKicksPerMinute: 15,
      maxTimeoutsPerMinute: 20,
    }),
});

export type ModerationSettings = z.infer<typeof ModerationSettingsSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  guildId: z.string(),
  actorId: z.string(),
  actorTag: z.string(),
  action: z.string(), // e.g. 'CASE_REVOKE', 'NOTE_ADD', 'CASE_UPDATE'
  targetType: z.enum(['CASE', 'NOTE', 'SETTINGS', 'USER']),
  targetId: z.string(),
  details: z.string(),
  timestamp: z.string(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export interface UserModerationProfile {
  userId: string;
  userTag: string;
  username: string;
  globalName?: string | null;
  avatarUrl?: string | null;
  accountCreatedAt?: string | null;
  joinedServerAt?: string | null;
  roles: Array<{ id: string; name: string; color: string }>;
  stats: {
    warnings: number;
    timeouts: number;
    kicks: number;
    bans: number;
    quarantines: number;
    totalCases: number;
    activeSanctionsCount: number;
  };
  calculatedRiskScore: number;
  trustLevel: 'TRUSTED' | 'NORMAL' | 'SUSPICIOUS' | 'DANGEROUS';
  activeSanctions: ModerationCase[];
  timeline: ModerationCase[];
  notes: StaffNote[];
}
