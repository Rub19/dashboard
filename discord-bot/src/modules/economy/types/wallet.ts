import { z } from 'zod';

export const WalletSchema = z.object({
  userId: z.string(),
  guildId: z.string(),
  username: z.string().default('Membre'),
  avatarUrl: z.string().nullable().default(null),
  balance: z.number().min(0).default(0),
  lastDailyClaimAt: z.string().nullable().default(null),
  totalEarned: z.number().min(0).default(0),
  totalSpent: z.number().min(0).default(0),
});

export type Wallet = z.infer<typeof WalletSchema>;

export interface EconomyLeaderboardEntry extends Wallet {
  rank: number;
}
