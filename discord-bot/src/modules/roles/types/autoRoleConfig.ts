import { z } from 'zod';

export const UserRoleOverrideSchema = z.object({
  userId: z.string(),
  roleIds: z.array(z.string()).default([]),
});
export type UserRoleOverride = z.infer<typeof UserRoleOverrideSchema>;

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
});

export type AutoRoleConfig = z.infer<typeof AutoRoleConfigSchema>;
