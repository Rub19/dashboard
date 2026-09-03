import { z } from 'zod';

export const GiveawayStatusSchema = z.enum([
  'scheduled',
  'active',
  'paused',
  'ended',
  'cancelled',
]);
export type GiveawayStatus = z.infer<typeof GiveawayStatusSchema>;

export const GiveawayRequirementsSchema = z.object({
  requiredRoleIds: z.array(z.string()).default([]),
  roleMode: z.enum(['all', 'any']).default('any'),
  excludedRoleIds: z.array(z.string()).default([]),
  minAccountAgeDays: z.number().min(0).default(0),
  minLevel: z.number().min(0).default(0),
});
export type GiveawayRequirements = z.infer<typeof GiveawayRequirementsSchema>;

export const GiveawayParticipantSchema = z.object({
  userId: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable().default(null),
  joinedAt: z.string().default(() => new Date().toISOString()),
  isEligible: z.boolean().default(true),
});
export type GiveawayParticipant = z.infer<typeof GiveawayParticipantSchema>;

export const GiveawayRerollEntrySchema = z.object({
  date: z.string(),
  previousWinnerIds: z.array(z.string()),
  newWinnerIds: z.array(z.string()),
});
export type GiveawayRerollEntry = z.infer<typeof GiveawayRerollEntrySchema>;

export const GiveawaySchema = z.object({
  id: z.string(),
  guildId: z.string(),
  channelId: z.string(),
  messageId: z.string().nullable().default(null),
  prize: z.string().min(1),
  description: z.string().default(''),
  winnerCount: z.number().min(1).max(50).default(1),
  rewardRoleId: z.string().nullable().default(null),
  bannerUrl: z.string().nullable().default(null),
  status: GiveawayStatusSchema.default('active'),
  createdAt: z.string().default(() => new Date().toISOString()),
  scheduledAt: z.string().nullable().default(null),
  startedAt: z.string().default(() => new Date().toISOString()),
  endsAt: z.string(),
  hostedById: z.string(),
  hostedByTag: z.string(),
  requirements: GiveawayRequirementsSchema.default({}),
  participants: z.array(GiveawayParticipantSchema).default([]),
  winnerIds: z.array(z.string()).default([]),
  rerollHistory: z.array(GiveawayRerollEntrySchema).default([]),
  requireClaim: z.boolean().default(false),
  claimTimeoutHours: z.number().min(1).max(72).default(24),
  claimedWinnerIds: z.array(z.string()).default([]),
});

export type Giveaway = z.infer<typeof GiveawaySchema>;

export interface GiveawayOverview {
  activeCount: number;
  endedCount: number;
  totalParticipants: number;
  totalWinners: number;
  activeGiveaways: Giveaway[];
}
