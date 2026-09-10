import { z } from 'zod';

/**
 * Birthdays — anniversaires des membres.
 *
 * `/birthday set 14 07` enregistre la date. Chaque jour à l'heure configurée, le
 * bot annonce les anniversaires du jour dans un salon (message personnalisable)
 * et attribue éventuellement un rôle « Anniversaire » retiré le lendemain.
 */

export const BirthdayEntrySchema = z.object({
  guildId: z.string(),
  userId: z.string(),
  day: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  /** Année de naissance — optionnelle, sert à afficher l'âge. */
  year: z.number().int().min(1900).max(new Date().getFullYear()).nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type BirthdayEntry = z.infer<typeof BirthdayEntrySchema>;

export const BirthdayConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  /** Salon d'annonce. `null` => module inerte. */
  announceChannelId: z.string().nullable().default(null),
  /** Heure locale du serveur (0-23) à laquelle annoncer. */
  announceHour: z.number().int().min(0).max(23).default(9),
  /** `{user}` = mention, `{age}` = âge (si connu), `{date}` = jj/mm. */
  message: z.string().max(500).default('🎂 Joyeux anniversaire {user} ! 🎉'),
  /** Rôle attribué le jour J, retiré le lendemain. `null` => pas de rôle. */
  birthdayRoleId: z.string().nullable().default(null),
  mentionUser: z.boolean().default(true),
  /** Dernière date (YYYY-MM-DD) où une annonce a été faite (anti-double). */
  lastAnnouncedDate: z.string().nullable().default(null),
  /** Membres portant actuellement le rôle anniversaire (pour le retirer). */
  currentRoleHolders: z.array(z.string()).default([]),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type BirthdayConfig = z.infer<typeof BirthdayConfigSchema>;

export interface BirthdayOverview {
  enabled: boolean;
  announceChannelId: string | null;
  announceHour: number;
  total: number;
  today: Array<{ userId: string; age: number | null }>;
  upcoming: Array<{ userId: string; day: number; month: number; inDays: number }>;
}
