import { z } from 'zod';

/**
 * Server Stats — salons compteurs.
 *
 * Un salon (vocal ou textuel, généralement vocal verrouillé) est renommé
 * périodiquement pour afficher une statistique du serveur : nombre de membres,
 * d'humains, de bots, de boosts, de rôles… `{count}` dans le template est
 * remplacé par la valeur. Discord limite les renommages à 2 / 10 min par salon,
 * donc l'intervalle minimum est de 10 minutes.
 */

export const StatTypeSchema = z.enum([
  'members', // tous les membres
  'humans', // membres non-bots
  'bots', // bots
  'online', // membres en ligne (approx, présence requise)
  'boosts', // nombre de boosts
  'boostTier', // niveau de boost (0-3)
  'roles', // nombre de rôles
  'channels', // nombre de salons
  'roleMembers', // membres portant un rôle donné (roleId requis)
]);
export type StatType = z.infer<typeof StatTypeSchema>;

export const StatChannelSchema = z.object({
  guildId: z.string(),
  channelId: z.string(),
  type: StatTypeSchema,
  /** `{count}` = la valeur. Ex : « 👥 {count} membres ». */
  template: z.string().min(1).max(80).default('{count}'),
  /** Requis pour `roleMembers`. */
  roleId: z.string().nullable().default(null),
  /** Dernière valeur poussée (évite un renommage inutile). */
  lastValue: z.number().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type StatChannel = z.infer<typeof StatChannelSchema>;

export const StatsConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(true),
  /** Intervalle de rafraîchissement en minutes (10–360). */
  updateIntervalMinutes: z.number().int().min(10).max(360).default(15),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type StatsConfig = z.infer<typeof StatsConfigSchema>;

export interface StatsOverview {
  enabled: boolean;
  updateIntervalMinutes: number;
  channels: Array<{ channelId: string; type: StatType; template: string; roleId: string | null; lastValue: number | null }>;
}
