import { z } from 'zod';

export const UserRoleOverrideSchema = z.object({
  userId: z.string(),
  roleIds: z.array(z.string()).default([]),
});
export type UserRoleOverride = z.infer<typeof UserRoleOverrideSchema>;

const roleIds = z.array(z.string().regex(/^\d{15,25}$/)).max(25).default([]).catch([]);

export const TempRoleConfigSchema = z.object({
  enabled: z.boolean().default(false).catch(false),
  roleIds,
  durationMinutes: z.number().int().min(1).max(43200).default(1440).catch(1440),
  waitForScreening: z.boolean().default(true).catch(true),
});
export type TempRoleConfig = z.infer<typeof TempRoleConfigSchema>;

export const VoiceRoleConfigSchema = z.object({
  enabled: z.boolean().default(false).catch(false),
  roleIds,
  memberMode: z.enum(['allow', 'deny']).default('allow').catch('allow'),
  memberRoleIds: roleIds,
  channelMode: z.enum(['allow', 'deny']).default('allow').catch('allow'),
  channelIds: z.array(z.string().regex(/^\d{15,25}$/)).max(50).default([]).catch([]),
  ignoreBots: z.boolean().default(true).catch(true),
});
export type VoiceRoleConfig = z.infer<typeof VoiceRoleConfigSchema>;

export const AutoRoleConfigSchema = z.object({
  enabled: z.boolean().default(false),
  roleIds: z.array(z.string()).default([]),
  applyToHumans: z.boolean().default(true),
  applyToBots: z.boolean().default(false),
  // N'attribue pas les rôles tant que le membre n'a pas validé le filtrage des règles (Rules Screening) de
  // Discord — repris quand guildMemberUpdate voit passer `pending` de true à false (voir handleScreeningPassed).
  waitForScreening: z.boolean().default(false),
  // Délai avant attribution (anti-raid : laisse le temps à un premier passage de sécurité). En mémoire
  // seulement — un redémarrage du bot pendant le délai annule l'attribution en attente, pas de file persistée.
  delaySeconds: z.number().int().min(0).max(86400).default(0),
  lastSyncAt: z.string().nullable().default(null),

  // Rôles différents pour les bots (sinon applyToBots réutilise simplement `roleIds`).
  useSeparateBotRoles: z.boolean().default(false),
  botRoleIds: z.array(z.string()).default([]),
  botDelaySeconds: z.number().int().min(0).max(86400).default(0),

  // « Sync now » ne touche jamais ces rôles, même s'ils sont dans roleIds (utile pour un rôle temporaire
  // qu'on ne veut pas réattribuer en masse rétroactivement).
  excludeFromSyncRoleIds: z.array(z.string()).default([]),

  // Synchronisation programmée : relance syncGuild automatiquement toutes les N heures.
  scheduledSyncEnabled: z.boolean().default(false),
  scheduledSyncIntervalHours: z.number().int().min(1).max(168).default(24),
  lastScheduledSyncAt: z.string().nullable().default(null),

  // Rôles supplémentaires pour des membres précis, en plus de roleIds.
  userOverrides: z.array(UserRoleOverrideSchema).default([]),
  removeUserFromListAfterAssignment: z.boolean().default(true),

  temp: TempRoleConfigSchema.default({}),
  voice: VoiceRoleConfigSchema.default({}),
});

export type AutoRoleConfig = z.infer<typeof AutoRoleConfigSchema>;
