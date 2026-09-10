import { z } from 'zod';

/**
 * Starboard — met en avant les messages plébiscités par la communauté.
 *
 * Quand un message reçoit assez de réactions ⭐ (seuil configurable), le bot le
 * republie dans un salon dédié ("hall of fame"). L'embed est ensuite maintenu à
 * jour (compteur de ⭐) tant que le message d'origine existe.
 */

export const StarboardConfigSchema = z.object({
  guildId: z.string(),
  /** Module actif sur ce serveur. Désactivé par défaut : il faut choisir un salon. */
  enabled: z.boolean().default(false),
  /** Salon où sont republiés les messages étoilés. `null` => module inerte. */
  channelId: z.string().nullable().default(null),
  /** Emoji déclencheur. Unicode (`⭐`) ou custom (`<:name:id>` / `name:id`). */
  emoji: z.string().default('⭐'),
  /** Nombre de réactions requis pour apparaître sur le starboard. */
  threshold: z.number().int().min(1).max(100).default(3),
  /** Autoriser l'auteur à s'auto-étoiler (compte quand même dans le total). */
  selfStarAllowed: z.boolean().default(false),
  /** Ignorer les réactions des bots dans le décompte. */
  ignoreBots: z.boolean().default(true),
  /** Republier aussi les messages des salons NSFW. */
  allowNsfw: z.boolean().default(false),
  /** Retirer l'entrée du starboard si le total repasse sous le seuil. */
  removeBelowThreshold: z.boolean().default(true),
  /** Salons dont les messages ne peuvent jamais être étoilés. */
  ignoredChannelIds: z.array(z.string()).default([]),
  /** Couleur de la barre latérale de l'embed starboard (hex `#RRGGBB`). */
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/)
    .default('#F5B301'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type StarboardConfig = z.infer<typeof StarboardConfigSchema>;

export const StarboardEntrySchema = z.object({
  guildId: z.string(),
  sourceChannelId: z.string(),
  sourceMessageId: z.string(),
  /** Message posté par le bot dans le salon starboard. `null` tant que sous le seuil. */
  starboardMessageId: z.string().nullable().default(null),
  authorId: z.string(),
  /** Décompte de ⭐ au dernier rafraîchissement. */
  starCount: z.number().int().min(0).default(0),
  /** IDs des membres ayant réagi (dédup + recomptage fiable après redémarrage). */
  starrerIds: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type StarboardEntry = z.infer<typeof StarboardEntrySchema>;

export interface StarboardOverview {
  enabled: boolean;
  channelId: string | null;
  emoji: string;
  threshold: number;
  totalEntries: number;
  postedEntries: number;
  totalStars: number;
  topMessage: { sourceMessageId: string; starCount: number } | null;
}
