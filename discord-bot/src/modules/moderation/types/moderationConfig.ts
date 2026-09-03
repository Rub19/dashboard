import { z } from 'zod';

export const AutoModActionSchema = z.enum([
  'delete',
  'warn',
  'timeout',
  'kick',
  'ban',
  'log',
]);

export type AutoModAction = z.infer<typeof AutoModActionSchema>;

export const AutoModRuleSchema = z.object({
  enabled: z.boolean().default(false),
  action: AutoModActionSchema.default('delete'),
  timeoutDurationSeconds: z.number().default(60), // 1 minute par défaut
});

export type AutoModRule = z.infer<typeof AutoModRuleSchema>;

export const AutoModWordFilterSchema = AutoModRuleSchema.extend({
  words: z.array(z.string()).default([]),
});

export type AutoModWordFilter = z.infer<typeof AutoModWordFilterSchema>;

export const AutoModConfigSchema = z.object({
  antiSpam: AutoModRuleSchema.default({
    enabled: true,
    action: 'timeout',
    timeoutDurationSeconds: 60,
  }),
  antiInvites: AutoModRuleSchema.default({
    enabled: true,
    action: 'delete',
    timeoutDurationSeconds: 60,
  }),
  antiLinks: AutoModRuleSchema.default({
    enabled: false,
    action: 'delete',
    timeoutDurationSeconds: 60,
  }),
  antiMassMentions: AutoModRuleSchema.default({
    enabled: true,
    action: 'warn',
    timeoutDurationSeconds: 60,
  }),
  antiCaps: AutoModRuleSchema.default({
    enabled: false,
    action: 'delete',
    timeoutDurationSeconds: 60,
  }),
  wordFilter: AutoModWordFilterSchema.default({
    enabled: false,
    action: 'delete',
    timeoutDurationSeconds: 60,
    words: [],
  }),
});

export type AutoModConfig = z.infer<typeof AutoModConfigSchema>;

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
  autoMod: AutoModConfigSchema.default({}),
  warningEscalation: WarningEscalationSchema.default({}),
});

export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;
