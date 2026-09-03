import { z } from 'zod';

export const SanctionTypeSchema = z.enum([
  'warn',
  'timeout',
  'untimeout',
  'kick',
  'ban',
  'unban',
]);

export type SanctionType = z.infer<typeof SanctionTypeSchema>;

export const SanctionSchema = z.object({
  id: z.string(), // e.g. CASE-1001
  guildId: z.string(),
  userId: z.string(),
  userTag: z.string(),
  moderatorId: z.string(),
  moderatorTag: z.string(),
  type: SanctionTypeSchema,
  reason: z.string().default('Aucune raison spécifiée'),
  timestamp: z.string(), // ISO 8601
  durationSeconds: z.number().nullable().default(null),
  active: z.boolean().default(true),
});

export type Sanction = z.infer<typeof SanctionSchema>;
