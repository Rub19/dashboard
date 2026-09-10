import { z } from 'zod';

/**
 * Sticky Messages — garde un message « épinglé » en bas d'un salon.
 *
 * Dès qu'un membre poste dans le salon, le bot supprime son ancien message
 * sticky et le republie tout en bas, pour qu'une consigne importante (règles du
 * salon, format d'une candidature, lien utile…) reste toujours visible sans
 * scroller. Un anti-rebond par salon évite le spam / le rate-limit.
 */

export const StickyMessageSchema = z.object({
  guildId: z.string(),
  /** Un seul sticky par salon : le salon est la clé. */
  channelId: z.string(),
  /** Corps du sticky. Markdown Discord supporté. */
  content: z.string().min(1).max(2000),
  /** Rendre le sticky sous forme d'embed (sinon message texte simple). */
  asEmbed: z.boolean().default(true),
  /** Titre de l'embed (ignoré si `asEmbed` est faux). */
  title: z.string().max(256).default('📌 À lire'),
  /** Couleur de la barre latérale de l'embed (hex `#RRGGBB`). */
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/)
    .default('#5865F2'),
  /** Sticky actif. Mettre à faux met en pause sans perdre le contenu. */
  enabled: z.boolean().default(true),
  /** Délai anti-rebond en secondes entre deux repositionnements (2–120). */
  cooldownSeconds: z.number().int().min(2).max(120).default(6),
  /** ID du dernier message sticky posté par le bot (pour le supprimer au repositionnement). */
  lastMessageId: z.string().nullable().default(null),
  /** Nombre total de repositionnements (stat dashboard). */
  repostCount: z.number().int().min(0).default(0),
  /** ID Discord de l'auteur de la config. */
  createdBy: z.string().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type StickyMessage = z.infer<typeof StickyMessageSchema>;

export interface StickyOverview {
  total: number;
  active: number;
  paused: number;
  totalReposts: number;
  channels: Array<{
    channelId: string;
    enabled: boolean;
    asEmbed: boolean;
    repostCount: number;
    preview: string;
    updatedAt: string;
  }>;
}
