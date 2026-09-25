import { z } from 'zod';

/** Cible d'un multiplicateur d'XP : tout le serveur, un rôle, un salon (un fil hérite de son salon), une catégorie, un membre, ou une période (événement). */
export const XpBoostTargetTypeSchema = z.enum(['role', 'channel', 'category', 'member', 'server', 'event']);
export type XpBoostTargetType = z.infer<typeof XpBoostTargetTypeSchema>;

/** Où le multiplicateur s'applique : messages, vocal, ou les deux. */
export const XpBoostScopeSchema = z.enum(['all', 'messages', 'voice']);
export type XpBoostScope = z.infer<typeof XpBoostScopeSchema>;

export const XpBoostSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string().min(1).max(60),
  /** Au-dessus de 1 : bonus ; en dessous de 1 : malus ; 0 : aucun gain d'XP. Plusieurs multiplicateurs se cumulent (produit, plafonné à ×10). */
  multiplier: z.number().min(0).max(10).default(1.5),
  targetType: XpBoostTargetTypeSchema.default('server'),
  targetId: z.string().nullable().default(null),
  scope: XpBoostScopeSchema.default('all'),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  enabled: z.boolean().default(true),
});

export type XpBoost = z.infer<typeof XpBoostSchema>;
