import { z } from 'zod';

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
});

export type AutoRoleConfig = z.infer<typeof AutoRoleConfigSchema>;
