import { z } from 'zod';

export const EconomyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  currencyName: z.string().default('Crédits ETHONE'),
  currencySymbol: z.string().default('🪙'),
  startingBalance: z.number().min(0).default(0),
  dailyAmountMin: z.number().min(0).default(50),
  dailyAmountMax: z.number().min(0).default(150),
  dailyCooldownHours: z.number().min(1).max(72).default(24),
  // Série quotidienne : bonus par jour consécutif réclamé (plafonné) — récompense
  // la régularité sans exploser l'inflation.
  dailyStreakBonus: z.number().min(0).default(10),
  dailyStreakMaxBonus: z.number().min(0).default(100),
  gambleMinBet: z.number().min(1).default(10),
  gambleMaxBet: z.number().min(1).default(5000),
  gambleWinMultiplier: z.number().min(1).max(5).default(1.9),
  transfersEnabled: z.boolean().default(true),
  leaderboardSize: z.number().min(5).max(50).default(10),
  // Gain passif par message : petit montant aléatoire, avec un cooldown par
  // membre pour que le spam ne rapporte rien (même logique que l'XP du leveling).
  passiveEarnEnabled: z.boolean().default(true),
  passiveEarnMin: z.number().min(0).default(1),
  passiveEarnMax: z.number().min(0).default(4),
  passiveEarnCooldownSeconds: z.number().min(5).max(600).default(60),
  passiveEarnMinMessageLength: z.number().min(0).max(50).default(5),
  // /work : petit boulot avec cooldown (gain modeste mais fiable)
  workEnabled: z.boolean().default(true),
  workAmountMin: z.number().min(0).default(20),
  workAmountMax: z.number().min(0).default(60),
  workCooldownMinutes: z.number().min(1).max(1440).default(30),
  // /rob : vol risqué — taux de réussite, part max volée, amende en cas d'échec
  robEnabled: z.boolean().default(true),
  robSuccessRate: z.number().min(0).max(1).default(0.35),
  robMaxStealPercent: z.number().min(1).max(100).default(20),
  robFailPenaltyPercent: z.number().min(0).max(100).default(10),
  robCooldownMinutes: z.number().min(1).max(1440).default(120),
  robMinTargetBalance: z.number().min(0).default(100),
});

export type EconomyConfig = z.infer<typeof EconomyConfigSchema>;
