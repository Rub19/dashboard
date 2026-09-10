import { z } from 'zod';

/**
 * Reminders — « rappelle-moi ».
 *
 * Un membre programme un rappel (`/reminder add 2h révise le TP`). À l'échéance,
 * le bot le mentionne dans le salon d'origine (fallback MP) avec le message.
 * Les rappels récurrents (`daily` / `weekly`) se replanifient tout seuls.
 * Un scheduler passe toutes les 30 s.
 */

export const ReminderRecurrenceSchema = z.enum(['none', 'daily', 'weekly']);
export type ReminderRecurrence = z.infer<typeof ReminderRecurrenceSchema>;

export const ReminderSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  /** Contenu du rappel (ce que le membre a tapé). */
  message: z.string().min(1).max(1500),
  /** Échéance ISO. */
  remindAt: z.string(),
  recurrence: ReminderRecurrenceSchema.default('none'),
  /** Passé à true une fois délivré (les non-récurrents sont ensuite purgés). */
  delivered: z.boolean().default(false),
  /** Nombre de fois où le rappel a été envoyé (stat + récurrents). */
  deliveredCount: z.number().int().min(0).default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export type Reminder = z.infer<typeof ReminderSchema>;

export interface ReminderOverview {
  total: number;
  pending: number;
  recurring: number;
  delivered: number;
  nextDueAt: string | null;
}
