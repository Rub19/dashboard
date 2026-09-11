import { z } from 'zod';

/**
 * Highlights — mots-clés surveillés ("Google Alerts" pour le chat).
 *
 * Chaque membre peut enregistrer des mots-clés/phrases via `/highlight add`. Quand un
 * AUTRE membre (pas un bot, pas soi-même) envoie un message qui contient ce mot-clé
 * dans un salon du serveur, le bot lui envoie un DM avec le contexte (auteur, salon,
 * extrait du message, lien direct). Un cooldown par (utilisateur, mot-clé) évite le
 * spam de DM dans un salon très actif.
 */

/** Longueur autorisée d'un mot-clé (2-50 caractères, hors espaces superflus). */
export const HIGHLIGHT_KEYWORD_MIN_LENGTH = 2;
export const HIGHLIGHT_KEYWORD_MAX_LENGTH = 50;

export const HighlightKeywordSchema = z.object({
  guildId: z.string(),
  userId: z.string(),
  keyword: z
    .string()
    .trim()
    .min(HIGHLIGHT_KEYWORD_MIN_LENGTH)
    .max(HIGHLIGHT_KEYWORD_MAX_LENGTH),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type HighlightKeyword = z.infer<typeof HighlightKeywordSchema>;

export const HighlightUserConfigSchema = z.object({
  guildId: z.string(),
  userId: z.string(),
  /** Coupe-circuit perso : suspend tous les highlights sans supprimer les mots-clés. */
  enabled: z.boolean().default(true),
  /** Salons personnellement ignorés (ex : un salon spammy) — perso, pas une config serveur. */
  ignoredChannelIds: z.array(z.string()).default([]),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type HighlightUserConfig = z.infer<typeof HighlightUserConfigSchema>;

export interface HighlightOverview {
  /** Nombre de membres ayant au moins un mot-clé (compte uniquement, pas le contenu). */
  totalWatchers: number;
  /** Nombre total de mots-clés enregistrés sur le serveur (tous membres confondus). */
  totalKeywords: number;
  /** Nombre de membres ayant désactivé temporairement leurs highlights. */
  pausedWatchers: number;
}

export interface HighlightUserOverview {
  config: HighlightUserConfig;
  keywords: HighlightKeyword[];
}
