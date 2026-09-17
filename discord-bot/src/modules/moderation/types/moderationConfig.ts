import { z } from 'zod';

export const WarningEscalationSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().min(1).max(20).default(3), // Après 3 warns
  action: z.enum(['timeout', 'kick', 'ban']).default('timeout'),
  durationSeconds: z.number().default(3600), // 1 heure si timeout
});

export type WarningEscalation = z.infer<typeof WarningEscalationSchema>;

export const ModerationConfigSchema = z.object({
  modLogChannelId: z.string().nullable().default(null),
  modRoleId: z.string().nullable().default(null),
  warningEscalation: WarningEscalationSchema.default({}),
});

export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;
