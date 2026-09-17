import { z } from 'zod';

export const EconomyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  currencyName: z.string().default('Crédits ETHONE'),
  currencySymbol: z.string().default('🪙'),
  startingBalance: z.number().min(0).default(0),
  dailyAmountMin: z.number().min(0).default(50),
  dailyAmountMax: z.number().min(0).default(150),
  dailyCooldownHours: z.number().min(1).max(72).default(24),
  gambleMinBet: z.number().min(1).default(10),
  gambleMaxBet: z.number().min(1).default(5000),
  gambleWinMultiplier: z.number().min(1).max(5).default(1.9),
  transfersEnabled: z.boolean().default(true),
  leaderboardSize: z.number().min(5).max(50).default(10),
});

export type EconomyConfig = z.infer<typeof EconomyConfigSchema>;
