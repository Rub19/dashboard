import { z } from 'zod';

export const HexColorRegex = /^#([0-9A-Fa-f]{6})$/;

export const GuildModulesSchema = z.object({
  moderation: z.boolean().default(true),
  welcome: z.boolean().default(false),
  logging: z.boolean().default(false),
  autoRoles: z.boolean().default(false),
  tickets: z.boolean().default(false),
  fun: z.boolean().default(true),
  music: z.boolean().default(false),
});

export type GuildModules = z.infer<typeof GuildModulesSchema>;

/** Règle d'une commande (page « Commandes » de la console). Valeurs par défaut = fonctionnement d'origine. */
export const CommandRuleSchema = z.object({
  enabled: z.boolean().default(true),
  /** « origin » = accès d'origine ; « roles » = en plus, réservé aux membres qui ont un des allowedRoles. */
  access: z.enum(['origin', 'roles']).default('origin'),
  allowedRoles: z.array(z.string()).max(25).default([]),
  deniedRoles: z.array(z.string()).max(25).default([]),
  /** Vide = partout. */
  allowedChannels: z.array(z.string()).max(25).default([]),
  /** Le propriétaire et les owners Etho ignorent ces règles. */
  ownersBypass: z.boolean().default(true),
  cooldownSeconds: z.number().int().min(0).max(86400).default(0),
  /** 0 = illimité. */
  maxUses: z.number().int().min(0).max(1000).default(0),
  maxUsesWindowMinutes: z.number().int().min(1).max(10080).default(60),
});
export type CommandRule = z.infer<typeof CommandRuleSchema>;

export const GuildConfigSchema = z.object({
  // Identifiant Discord
  guildId: z.string(),

  // Apparence
  botName: z.string().min(1).max(32).default('Etho'),
  primaryColor: z.string().regex(HexColorRegex, 'Format HEX invalide (ex: #5865F2)').default('#5865F2'),
  secondaryColor: z.string().regex(HexColorRegex, 'Format HEX invalide (ex: #4752C4)').default('#4752C4'),
  successColor: z.string().regex(HexColorRegex, 'Format HEX invalide (ex: #57F287)').default('#57F287'),
  errorColor: z.string().regex(HexColorRegex, 'Format HEX invalide (ex: #ED4245)').default('#ED4245'),
  infoColor: z.string().regex(HexColorRegex, 'Format HEX invalide (ex: #5865F2)').default('#5865F2'),

  // Emojis personnalisés
  emojis: z
    .object({
      success: z.string().default('✅'),
      error: z.string().default('❌'),
      info: z.string().default('ℹ️'),
      loading: z.string().default('⏳'),
      settings: z.string().default('⚙️'),
      prefix: z.string().default('⌨️'),
      slash: z.string().default('⚡'),
    })
    .default({}),

  // Commandes
  prefix: z
    .string()
    .min(1, 'Le préfixe ne peut pas être vide')
    .max(5, 'Le préfixe ne doit pas dépasser 5 caractères')
    .refine((val) => !/\s/.test(val), 'Le préfixe ne doit pas contenir d\'espaces')
    .default('!'),
  prefixCommandsEnabled: z.boolean().default(true),
  slashCommandsEnabled: z.boolean().default(true),

  // Modules activables
  modules: GuildModulesSchema.default({}),

  // Général & Langue
  language: z.enum(['fr', 'en', 'es', 'de']).default('fr'),
  timezone: z.string().default('Europe/Paris'),

  // Contacts d'urgence : prévenus quand un problème sérieux est détecté (permission manquante, salon supprimé…)
  emergencyContacts: z
    .object({
      mode: z.enum(['admins', 'owner', 'custom']).default('admins'),
      userIds: z.array(z.string().regex(/^\d{5,25}$/)).max(10).default([]),
      roleIds: z.array(z.string().regex(/^\d{5,25}$/)).max(10).default([]),
    })
    .default({}),

  // Confidentialité & Personnalisation
  responseVisibility: z.enum(['PUBLIC', 'EPHEMERAL']).default('PUBLIC'),
  botPersonality: z.enum(['FRIENDLY', 'PROFESSIONAL', 'HUMOROUS', 'CONCISE', 'CYBER']).default('FRIENDLY'),
  commandCooldown: z.number().min(0).max(60).default(0),
  musicDefaultVolume: z.number().min(0).max(100).default(80),
  themePreset: z.enum(['DEFAULT', 'CYBERPUNK', 'EMERALD', 'SUNSET', 'DARK']).default('DEFAULT'),
  autoDeleteCommands: z.boolean().default(false),
  adminRoles: z.array(z.string()).default([]),
  modRoles: z.array(z.string()).default([]),
  vipRoles: z.array(z.string()).default([]),
  activePreset: z.string().default('PRESET_BALANCED'),
  systemChannelId: z.string().nullable().optional(),
  /** Owners Etho ajoutés par le propriétaire : peuvent tout régler dans la console (comme les « owners Keeper »). */
  ethoOwners: z.array(z.string()).default([]),
  /** Prévenir le propriétaire du serveur en MP lors d'une alerte grave (raid, nuke). */
  ownerDmAlerts: z.boolean().default(false),
  /** Comptes blacklistés : bannis tout de suite s'ils sont sur le serveur, puis à chaque retour. */
  blacklist: z
    .array(z.object({ userId: z.string(), reason: z.string().default(''), addedBy: z.string().nullable().default(null), addedAt: z.string() }))
    .default([]),
  commandRules: z.record(z.string(), CommandRuleSchema).default({}),
});

export type GuildConfig = z.infer<typeof GuildConfigSchema>;

export type GuildConfigInput = Partial<Omit<GuildConfig, 'guildId' | 'emojis' | 'modules'>> & {
  emojis?: Partial<GuildConfig['emojis']>;
  modules?: Partial<GuildConfig['modules']>;
};

export const defaultGuildConfig: Omit<GuildConfig, 'guildId'> = {
  botName: 'Etho',
  primaryColor: '#5865F2',
  secondaryColor: '#4752C4',
  successColor: '#57F287',
  errorColor: '#ED4245',
  infoColor: '#5865F2',
  emojis: {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    loading: '⏳',
    settings: '⚙️',
    prefix: '⌨️',
    slash: '⚡',
  },
  prefix: '!',
  prefixCommandsEnabled: true,
  slashCommandsEnabled: true,
  modules: {
    moderation: true,
    welcome: false,
    logging: false,
    autoRoles: false,
    tickets: false,
    fun: true,
    music: false,
  },
  language: 'fr',
  timezone: 'Europe/Paris',
  emergencyContacts: { mode: 'admins', userIds: [], roleIds: [] },
  responseVisibility: 'PUBLIC',
  botPersonality: 'FRIENDLY',
  commandCooldown: 0,
  musicDefaultVolume: 80,
  themePreset: 'DEFAULT',
  autoDeleteCommands: false,
  adminRoles: [],
  modRoles: [],
  vipRoles: [],
  activePreset: 'PRESET_BALANCED',
  ethoOwners: [],
  ownerDmAlerts: false,
  blacklist: [],
  commandRules: {},
};

/**
 * Convertit un code couleur hexadécimal (#RRGGBB) en nombre entier pour Discord.js
 * Fallback garanti sans aucun risque de crash.
 */
export function resolveHexColor(hex: string, fallback = 0x5865f2): number {
  if (!hex || !HexColorRegex.test(hex)) return fallback;
  try {
    return parseInt(hex.replace('#', ''), 16);
  } catch {
    return fallback;
  }
}
