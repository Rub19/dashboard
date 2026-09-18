import { z } from 'zod';

export const WalletSchema = z.object({
  userId: z.string(),
  guildId: z.string(),
  username: z.string().default('Membre'),
  avatarUrl: z.string().nullable().default(null),
  balance: z.number().min(0).default(0),
  lastDailyClaimAt: z.string().nullable().default(null),
  // Jours consécutifs de /daily (remis à 0 si un jour est sauté)
  dailyStreak: z.number().min(0).default(0),
  lastPassiveEarnAt: z.string().nullable().default(null),
  lastWorkAt: z.string().nullable().default(null),
  lastRobAt: z.string().nullable().default(null),
  totalEarned: z.number().min(0).default(0),
  totalSpent: z.number().min(0).default(0),
});

export type Wallet = z.infer<typeof WalletSchema>;

export interface EconomyLeaderboardEntry extends Wallet {
  rank: number;
}

export const TransactionTypeSchema = z.enum([
  'daily',
  'passive',
  'work',
  'rob_gain',
  'rob_loss',
  'rob_fine',
  'transfer_in',
  'transfer_out',
  'gamble_win',
  'gamble_loss',
  'purchase',
  'admin',
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// Historique des mouvements (dashboard "Transactions") — un enregistrement par
// mutation de solde, borné par serveur pour ne pas faire gonfler le JSON.
export const TransactionSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  userId: z.string(),
  type: TransactionTypeSchema,
  amount: z.number(), // signé : + crédit, - débit
  balanceAfter: z.number().min(0),
  counterpartyId: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;
