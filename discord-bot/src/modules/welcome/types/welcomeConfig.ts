import { z } from 'zod';

export const WelcomeEmbedConfigSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().default('Bienvenue sur {server} !'),
  description: z
    .string()
    .default('Bienvenue {user} ! Nous sommes ravis de t’accueillir parmi nous.\nPrends le temps de lire les règles et passe un bon moment !'),
  color: z.string().default('#5865F2'),
  authorName: z.string().default('{username} vient de nous rejoindre'),
  footer: z.string().default('Membre #{membercount} • {server}'),
  showTimestamp: z.boolean().default(true),
  showThumbnail: z.boolean().default(true),
});

export type WelcomeEmbedConfig = z.infer<typeof WelcomeEmbedConfigSchema>;

export const WelcomeImageConfigSchema = z.object({
  enabled: z.boolean().default(true),
  template: z.enum(['default', 'modern', 'minimal', 'gaming']).default('default'),
  titleText: z.string().default('BIENVENUE'),
  subtitleText: z.string().default('{username}'),
  tagText: z.string().default('Membre #{membercount}'),
  accentColor: z.string().default('#8B5CF6'),
});

export type WelcomeImageConfig = z.infer<typeof WelcomeImageConfigSchema>;

export const WelcomeMessageConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  messageContent: z.string().default('👋 Bienvenue {user} sur **{server}** ! Tu es notre **{membercount}ème** membre.'),
  mentionUser: z.boolean().default(true),
  sendForBots: z.boolean().default(false),
  embed: WelcomeEmbedConfigSchema.default({}),
  image: WelcomeImageConfigSchema.default({}),
  autoRoleIds: z.array(z.string()).default([]),
});

export type WelcomeMessageConfig = z.infer<typeof WelcomeMessageConfigSchema>;

export const GoodbyeMessageConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  messageContent: z.string().default('📤 Au revoir **{username}** ! Nous ne sommes plus que **{membercount}** membres.'),
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
  }),
  image: WelcomeImageConfigSchema.default({
    enabled: false,
    template: 'default',
    titleText: 'À BIENTÔT',
    subtitleText: '{username}',
    tagText: '{membercount} membres restants',
    accentColor: '#ED4245',
  }),
});

export type GoodbyeMessageConfig = z.infer<typeof GoodbyeMessageConfigSchema>;

export const FullWelcomeConfigSchema = z.object({
  welcome: WelcomeMessageConfigSchema.default({}),
  goodbye: GoodbyeMessageConfigSchema.default({}),
});

export type FullWelcomeConfig = z.infer<typeof FullWelcomeConfigSchema>;
