import { z } from 'zod';

export const XpBoostTargetTypeSchema = z.enum(['role', 'channel', 'server', 'event']);
export type XpBoostTargetType = z.infer<typeof XpBoostTargetTypeSchema>;

export const XpBoostSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1),
  multiplier: z.number().min(1.1).max(10).default(1.5),
  targetType: XpBoostTargetTypeSchema.default('server'),
  targetId: z.string().nullable().default(null),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  enabled: z.boolean().default(true),
});

export type XpBoost = z.infer<typeof XpBoostSchema>;
