import { z } from 'zod';

/**
 * Comptage — jeu collectif : les membres comptent à tour de rôle (1, 2, 3…) dans un salon dédié. Un message qui commence
 * par un nombre est vérifié ; les autres messages du salon sont ignorés (on peut discuter). Une erreur remet le compteur
 * à zéro (ou pas, selon le réglage). Désactivé par défaut.
 */
export const CountingContributorSchema = z.object({
  correct: z.number().int().min(0).default(0),
  mistakes: z.number().int().min(0).default(0),
});
export type CountingContributor = z.infer<typeof CountingContributorSchema>;

export const CountingConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  /** Un même membre peut-il compter deux fois de suite ? */
  allowConsecutive: z.boolean().default(false),
  /** Une erreur remet le compteur à 0 (sinon le bot signale seulement le bon nombre). */
  resetOnMistake: z.boolean().default(true),
  /** Nombre actuel : le prochain à donner est count + 1. */
  count: z.number().int().min(0).default(0),
  lastUserId: z.string().nullable().default(null),
  highScore: z.number().int().min(0).default(0),
  totalCorrect: z.number().int().min(0).default(0),
  totalMistakes: z.number().int().min(0).default(0),
  lastResetAt: z.string().nullable().default(null),
  contributors: z.record(z.string(), CountingContributorSchema).default({}),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type CountingConfig = z.infer<typeof CountingConfigSchema>;

export interface CountingOverview {
  config: Omit<CountingConfig, 'contributors'>;
  leaderboard: Array<{ userId: string; correct: number; mistakes: number }>;
}
