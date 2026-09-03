import { z } from 'zod';

export const UserXpDataSchema = z.object({
  userId: z.string(),
  guildId: z.string(),
  username: z.string().default('Membre'),
  avatarUrl: z.string().nullable().default(null),
  totalXp: z.number().min(0).default(0),
  level: z.number().min(0).default(0),
  messagesCount: z.number().min(0).default(0),
  lastMessageAt: z.string().default(() => new Date().toISOString()),
  unlockedRewardRoleIds: z.array(z.string()).default([]),
});

export type UserXpData = z.infer<typeof UserXpDataSchema>;

export interface LeaderboardEntry extends UserXpData {
  rank: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
}
