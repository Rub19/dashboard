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

export const GuildConfigSchema = z.object({
  // Identifiant Discord
  guildId: z.string(),

  // Apparence
  botName: z.string().min(1).max(32).default('Ethone Bot'),
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

  // Général
  language: z.enum(['fr', 'en']).default('fr'),
  timezone: z.string().default('Europe/Paris'),
});

export type GuildConfig = z.infer<typeof GuildConfigSchema>;

export type GuildConfigInput = Partial<Omit<GuildConfig, 'guildId' | 'emojis' | 'modules'>> & {
  emojis?: Partial<GuildConfig['emojis']>;
  modules?: Partial<GuildConfig['modules']>;
};

export const defaultGuildConfig: Omit<GuildConfig, 'guildId'> = {
  botName: 'Ethone Bot',
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
