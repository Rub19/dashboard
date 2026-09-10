import { z } from 'zod';

/**
 * Tags — réponses/snippets réutilisables du serveur.
 *
 * `/tag add regles <texte>` puis `/tag get regles` (ou `/tag regles`) réaffiche
 * le texte. Utile pour les FAQ, formats de candidature, liens récurrents.
 */

export const TAG_NAME_RE = /^[a-z0-9_-]{1,32}$/;

export const TagSchema = z.object({
  guildId: z.string(),
  /** Nom normalisé (minuscules, a-z 0-9 _ -). Sert de clé. */
  name: z.string().regex(TAG_NAME_RE),
  content: z.string().min(1).max(2000),
  createdBy: z.string().nullable().default(null),
  /** Nombre d'affichages via /tag get. */
  uses: z.number().int().min(0).default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type Tag = z.infer<typeof TagSchema>;

export interface TagOverview {
  total: number;
  totalUses: number;
  top: Array<{ name: string; uses: number }>;
}
