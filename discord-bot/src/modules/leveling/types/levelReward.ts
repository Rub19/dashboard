import { z } from 'zod';

export const LevelRewardSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  level: z.number().min(1),
  roleId: z.string(),
  message: z.string().nullable().default(null),
  enabled: z.boolean().default(true),
});

export type LevelReward = z.infer<typeof LevelRewardSchema>;
