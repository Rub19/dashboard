import { z } from 'zod';

export const LevelUpChannelTypeSchema = z.enum([
  'same_channel',
  'specific_channel',
  'dm',
  'disabled',
]);
export type LevelUpChannelType = z.infer<typeof LevelUpChannelTypeSchema>;

export const RewardDistributionTypeSchema = z.enum(['cumulative', 'progressive']);
export type RewardDistributionType = z.infer<typeof RewardDistributionTypeSchema>;

export const LevelingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  minXp: z.number().min(1).max(100).default(15),
  maxXp: z.number().min(5).max(200).default(30),
  cooldownSeconds: z.number().min(5).max(300).default(60),
  minMessageLength: z.number().min(0).max(50).default(5),
  levelUpChannelType: LevelUpChannelTypeSchema.default('same_channel'),
  levelUpChannelId: z.string().nullable().default(null),
  levelUpMessage: z
    .string()
    .default('🎉 Félicitations {user} ! Vous venez d’atteindre le **niveau {level}** !'),
  rewardType: RewardDistributionTypeSchema.default('cumulative'),
  excludedChannelIds: z.array(z.string()).default([]),
  excludedRoleIds: z.array(z.string()).default([]),
  allowBots: z.boolean().default(false),
});

export type LevelingConfig = z.infer<typeof LevelingConfigSchema>;
