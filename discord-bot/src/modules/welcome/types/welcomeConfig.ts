import { z } from 'zod';

export const EmbedFieldConfigSchema = z.object({
  id: z.string().default(() => `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  name: z.string().default('Titre du champ'),
  value: z.string().default('Valeur du champ'),
  inline: z.boolean().default(false),
});

export type EmbedFieldConfig = z.infer<typeof EmbedFieldConfigSchema>;

export const WelcomeEmbedConfigSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().default('Bienvenue sur {server} !'),
  description: z
    .string()
    .default(
      'Bienvenue {user} ! Nous sommes ravis de t’accueillir parmi nous.\nPrends le temps de lire les règles et passe un bon moment !'
    ),
  color: z.string().default('#10B981'),
  authorName: z.string().default('{username} vient de nous rejoindre'),
  authorIconUrl: z.string().nullable().default(null),
  footer: z.string().default('Membre #{membercount} • {server}'),
  footerIconUrl: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
  showTimestamp: z.boolean().default(true),
  showThumbnail: z.boolean().default(true),
  fields: z.array(EmbedFieldConfigSchema).default([]),
});

export type WelcomeEmbedConfig = z.infer<typeof WelcomeEmbedConfigSchema>;

export const WelcomeButtonActionSchema = z.enum([
  'URL',
  'ROLE',
  'VERIFY',
  'RULES',
  'CHANNEL',
  'TICKET',
  'CUSTOM',
]);

export type WelcomeButtonAction = z.infer<typeof WelcomeButtonActionSchema>;

export const WelcomeButtonStyleSchema = z.enum([
  'PRIMARY',
  'SECONDARY',
  'SUCCESS',
  'DANGER',
  'LINK',
]);

export type WelcomeButtonStyle = z.infer<typeof WelcomeButtonStyleSchema>;

export const WelcomeButtonConfigSchema = z.object({
  id: z.string().default(() => `btn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  label: z.string().default('Bouton'),
  emoji: z.string().nullable().default(null),
  style: WelcomeButtonStyleSchema.default('PRIMARY'),
  action: WelcomeButtonActionSchema.default('RULES'),
  target: z.string().default(''), // URL, role ID, channel ID, ticket category ID, or custom action payload
});

export type WelcomeButtonConfig = z.infer<typeof WelcomeButtonConfigSchema>;

export const WelcomeImageConfigSchema = z.object({
  enabled: z.boolean().default(true),
  template: z.enum(['default', 'modern', 'minimal', 'gaming']).default('default'),
  titleText: z.string().default('BIENVENUE'),
  subtitleText: z.string().default('{username}'),
  tagText: z.string().default('Membre #{membercount}'),
  accentColor: z.string().default('#10B981'),
  customBackgroundUrl: z.string().nullable().default(null),
});

export type WelcomeImageConfig = z.infer<typeof WelcomeImageConfigSchema>;

export const WelcomeDMConfigSchema = z.object({
  enabled: z.boolean().default(false),
  messageContent: z.string().default('👋 Bonjour {user}, bienvenue sur **{server}** !'),
  embed: WelcomeEmbedConfigSchema.default({
    enabled: true,
    title: 'Bienvenue sur {server} !',
    description: 'Consulte les salons importants et fais vérifier ton compte si nécessaire.',
    color: '#10B981',
    authorName: '{server}',
    footer: '{server} • Support disponible',
    showTimestamp: true,
    showThumbnail: true,
    fields: [],
  }),
  buttons: z.array(WelcomeButtonConfigSchema).default([]),
});

export type WelcomeDMConfig = z.infer<typeof WelcomeDMConfigSchema>;

export const WelcomeConditionSchema = z.object({
  enabled: z.boolean().default(false),
  minAccountAgeDays: z.number().default(0), // Si compte trop récent, peut déclencher une restriction
  requireVerificationBeforeWelcome: z.boolean().default(false),
  requiredRoleIds: z.array(z.string()).default([]),
  excludedRoleIds: z.array(z.string()).default([]),
});

export type WelcomeCondition = z.infer<typeof WelcomeConditionSchema>;

export const WelcomeMessageConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  messageContent: z
    .string()
    .default('👋 Bienvenue {user} sur **{server}** ! Tu es notre **{membercount}ème** membre.'),
  mentionUser: z.boolean().default(true),
  sendForBots: z.boolean().default(false),
  embed: WelcomeEmbedConfigSchema.default({}),
  image: WelcomeImageConfigSchema.default({}),
  buttons: z.array(WelcomeButtonConfigSchema).default([]),
  dm: WelcomeDMConfigSchema.default({}),
  conditions: WelcomeConditionSchema.default({}),
  autoRoleIds: z.array(z.string()).default([]),
});

export type WelcomeMessageConfig = z.infer<typeof WelcomeMessageConfigSchema>;

export const GoodbyeMessageConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  messageContent: z
    .string()
    .default('📤 Au revoir **{username}** ! Nous ne sommes plus que **{membercount}** membres.'),
  sendForBots: z.boolean().default(false),
  embed: WelcomeEmbedConfigSchema.default({
    enabled: true,
    title: 'Départ d’un membre',
    description: '**{username}** vient de quitter le serveur.',
    color: '#ED4245',
    authorName: '{username} est parti',
    footer: '{server} • Plus que {membercount} membres',
    showTimestamp: true,
    showThumbnail: true,
    fields: [],
  }),
  image: WelcomeImageConfigSchema.default({
    enabled: false,
    template: 'default',
    titleText: 'À BIENTÔT',
    subtitleText: '{username}',
    tagText: '{membercount} membres restants',
    accentColor: '#ED4245',
  }),
  buttons: z.array(WelcomeButtonConfigSchema).default([]),
});

export type GoodbyeMessageConfig = z.infer<typeof GoodbyeMessageConfigSchema>;

export const FullWelcomeConfigSchema = z.object({
  welcome: WelcomeMessageConfigSchema.default({}),
  goodbye: GoodbyeMessageConfigSchema.default({}),
});

export type FullWelcomeConfig = z.infer<typeof FullWelcomeConfigSchema>;
