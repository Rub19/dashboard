import { z } from 'zod';

/**
 * AFK — statut "absent".
 *
 * `/afk [raison]` marque le membre comme absent. Quand quelqu'un le mentionne,
 * le bot répond « X est AFK : raison (depuis …) ». Dès que le membre reparle,
 * son statut est retiré et le bot lui dit combien de fois il a été mentionné.
 */

export const AfkEntrySchema = z.object({
  guildId: z.string(),
  userId: z.string(),
  reason: z.string().max(500).default('Absent'),
  since: z.string().default(() => new Date().toISOString()),
  /** Nombre de fois où le membre a été mentionné pendant son absence. */
  mentionCount: z.number().int().min(0).default(0),
  /** Ancien pseudo, restauré au retour si le bot l'avait préfixé (best effort). */
  previousNickname: z.string().nullable().default(null),
});
export type AfkEntry = z.infer<typeof AfkEntrySchema>;

export const AfkConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(true),
  /** Retirer le statut AFK dès que le membre envoie un message. */
  clearOnMessage: z.boolean().default(true),
  /** Répondre quand un membre AFK est mentionné. */
  notifyOnMention: z.boolean().default(true),
  /** Préfixer le pseudo du membre avec [AFK] (nécessite Gérer les pseudos). */
  prefixNickname: z.boolean().default(false),
  /** Délai (secondes) avant auto-suppression des réponses du bot (0 = jamais). */
  autoDeleteSeconds: z.number().int().min(0).max(60).default(10),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type AfkConfig = z.infer<typeof AfkConfigSchema>;

export interface AfkOverview {
  enabled: boolean;
  activeCount: number;
  totalMentionsWhileAway: number;
  members: Array<{ userId: string; reason: string; since: string; mentionCount: number }>;
}
