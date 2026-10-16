import { z } from 'zod';

/**
 * Signalements — les membres signalent un abus en un clic (menu contextuel sur un message ou un membre, ou /report) ; l'équipe
 * reçoit un message unique par membre signalé, avec les sanctions passées, et le traite avec des boutons (prendre en charge,
 * sanctionner, marquer comme traité). Désactivé par défaut.
 */
export const ReportsConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  /** Salon où arrivent les signalements (visible de l'équipe seulement). */
  channelId: z.string().nullable().default(null),
  /** Rôle de l'équipe : peut traiter les signalements et est mentionné à l'arrivée d'un nouveau. Sans rôle, la permission « Exclure temporairement des membres » suffit. */
  staffRoleId: z.string().nullable().default(null),
  /** Mentionner le rôle de l'équipe à chaque nouveau signalement. */
  pingStaff: z.boolean().default(false),
  /** Délai minimum entre deux signalements d'un même membre (anti-spam). */
  cooldownSeconds: z.number().int().min(0).max(3600).default(60),
  /** Rôles qui traitent les signalements, en plus des permissions de modération. */
  moderatorRoleIds: z.array(z.string()).max(25).default([]),
  /** Rôles mentionnés à chaque nouveau signalement. */
  mentionRoleIds: z.array(z.string()).max(25).default([]),
  /** Émoji posé sur le message signalé par clic droit (vide : aucun). */
  reactionEmoji: z.string().max(80).default('🚩'),
  /** Plusieurs signalements du même membre en 15 minutes forment un seul message. */
  groupWindow: z.boolean().default(true),
  /** Signalements qu'un modérateur peut avoir en cours (0 : sans limite). */
  maxClaims: z.number().int().min(0).max(50).default(0),
  /** Sinon, seules les raisons prédéfinies sont proposées pour sanctionner. */
  customSanctions: z.boolean().default(true),
  /** Prévenir le signaleur à la clôture. */
  notifyReporter: z.boolean().default(true),
  confirmationMessage: z.string().max(500).default(''),
  threadPerReport: z.boolean().default(false),
  triageThreads: z.boolean().default(false),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type ReportsConfig = z.infer<typeof ReportsConfigSchema>;

/** Message d'équipe d'un membre signalé (les nouveaux signalements le mettent à jour au lieu d'en créer un autre). */
export interface ReportThread {
  guildId: string;
  reportedUserId: string;
  channelId: string;
  messageId: string;
}
