import { z } from 'zod';

export const LevelUpChannelTypeSchema = z.enum([
  'same_channel',
  'specific_channel',
  'dm',
  'disabled',
]);
export type LevelUpChannelType = z.infer<typeof LevelUpChannelTypeSchema>;

/** Annonce des récompenses : soit ajoutée au message de niveau (défaut), soit un message à part. */
export const RewardAnnounceTypeSchema = z.enum(['with_levelup', 'same_channel', 'specific_channel', 'dm', 'disabled']);
export type RewardAnnounceType = z.infer<typeof RewardAnnounceTypeSchema>;

export const RewardDistributionTypeSchema = z.enum(['cumulative', 'progressive']);
export type RewardDistributionType = z.infer<typeof RewardDistributionTypeSchema>;

const snowflakeOrNull = z.string().regex(/^\d{5,25}$/).nullable().default(null);

export const LevelingConfigSchema = z.object({
  // Désactivé par défaut : aucun XP ne se gagne tant que le module n'est pas activé.
  enabled: z.boolean().default(false),
  minXp: z.number().min(1).max(100).default(15),
  maxXp: z.number().min(5).max(200).default(30),
  cooldownSeconds: z.number().min(5).max(300).default(60),
  minMessageLength: z.number().min(0).max(50).default(5),
  levelUpChannelType: LevelUpChannelTypeSchema.default('same_channel'),
  levelUpChannelId: z.string().nullable().default(null),
  levelUpMessage: z
    .string()
    .default('🎉 Félicitations {user} ! Vous venez d’atteindre le **niveau {level}** !'),
  rewardType: RewardDistributionTypeSchema.default('cumulative'),
  excludedChannelIds: z.array(z.string()).default([]),
  excludedRoleIds: z.array(z.string()).default([]),
  allowBots: z.boolean().default(false),

  // --- Options supplémentaires ---
  /** Niveau maximum (0 = aucun) : au-delà, plus d'XP. */
  maxLevel: z.number().int().min(0).max(1000).default(0),
  xpInThreads: z.boolean().default(true),
  xpInForums: z.boolean().default(true),
  /** Faux : l'XP d'un membre est effacé quand il quitte le serveur. */
  keepXpOnLeave: z.boolean().default(true),

  // --- XP en vocal ---
  voiceXpEnabled: z.boolean().default(false),
  voiceXpPerMinute: z.number().int().min(1).max(50).default(5),
  /** Pas d'XP tant que le membre est muet ou en sourdine. */
  voiceXpIgnoreMuted: z.boolean().default(true),
  /** Nombre minimum de vrais membres dans le salon (évite de gagner de l'XP seul). */
  voiceXpMinMembers: z.number().int().min(1).max(10).default(2),

  // --- Classements ---
  /** Page publique du classement (https://ethone.dev/leaderboard?guildId=…). */
  leaderboardPublic: z.boolean().default(false),
  /** La commande /leaderboard fonctionne sur Discord. */
  leaderboardOnDiscord: z.boolean().default(true),

  // --- Personnalisation ---
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#f59e0b'),

  // --- Annonce des récompenses de rôle ---
  rewardAnnounceType: RewardAnnounceTypeSchema.default('with_levelup'),
  rewardChannelId: snowflakeOrNull,
  rewardMessage: z.string().max(500).default('🏅 {user}, tu obtiens le rôle **{role}** en atteignant le niveau **{level}** !'),
});

export type LevelingConfig = z.infer<typeof LevelingConfigSchema>;
