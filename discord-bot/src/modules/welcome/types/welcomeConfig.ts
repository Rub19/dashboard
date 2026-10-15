import { z } from 'zod';

export const EmbedFieldConfigSchema = z.object({
  id: z.string().default(() => `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  name: z.string().default('Titre du champ'),
  value: z.string().default('Valeur du champ'),
  inline: z.boolean().default(false),
});

export type EmbedFieldConfig = z.infer<typeof EmbedFieldConfigSchema>;

export const ICON_SOURCES = ['none', 'server', 'member', 'custom'] as const;
export type IconSource = (typeof ICON_SOURCES)[number];
const iconSource = z.enum(ICON_SOURCES).optional().catch(undefined);
const httpsUrl = z.string().max(2000).regex(/^https:\/\/\S+$/i);

export const WelcomeEmbedConfigSchema = z.object({
  enabled: z.boolean().default(true),
  url: z.union([httpsUrl, z.literal('')]).optional().catch(undefined),
  authorIcon: iconSource,
  thumbnail: iconSource,
  imageSource: iconSource,
  footerIcon: iconSource,
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
  fields: z.array(EmbedFieldConfigSchema).max(10).default([]),
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

// Une valeur invalide retombe sur le défaut (.catch) au lieu de faire échouer toute la config du serveur.
const hexColor = (fallback: string) => z.string().regex(/^#[0-9a-fA-F]{6}$/).default(fallback).catch(fallback);

export const CARD_TEMPLATES = ['default', 'modern', 'minimal', 'gaming'] as const;
export const CARD_FONTS = ['poppins', 'bebas', 'serif', 'mono'] as const;
export const CARD_AVATAR_SHAPES = ['circle', 'rounded', 'square'] as const;
/** Libellés affichés dans les commandes Discord (carte de bienvenue, carte de rang). */
export const CARD_FONT_LABEL: Record<(typeof CARD_FONTS)[number], string> = { poppins: 'Poppins', bebas: 'Bebas (condensée)', serif: 'Serif', mono: 'Mono' };
export const CARD_SHAPE_LABEL: Record<(typeof CARD_AVATAR_SHAPES)[number], string> = { circle: 'Rond', rounded: 'Arrondi', square: 'Carré' };
/** #RRGGBB normalisé, ou null si la saisie n'est pas une couleur. */
export const parseHexColor = (v: string | null) => (v && /^#?[0-9a-fA-F]{6}$/.test(v.trim()) ? `#${v.trim().replace('#', '').toUpperCase()}` : null);

export const CARD_SIZES = ['large', 'medium', 'banner', 'square'] as const;
export const CARD_SIZE_PX: Record<(typeof CARD_SIZES)[number], [number, number]> = { large: [1024, 450], medium: [800, 350], banner: [1200, 400], square: [600, 600] };

const num = (min: number, max: number, fallback: number) => z.number().min(min).max(max).default(fallback).catch(fallback);
const layerBase = { id: z.string().min(1).max(40), visible: z.boolean().default(true).catch(true), x: num(-2000, 4000, 0), y: num(-2000, 4000, 0) };

export const CardLayerSchema = z.discriminatedUnion('type', [
  z.object({
    ...layerBase,
    type: z.literal('text'),
    text: z.string().max(200).default(''),
    size: num(8, 240, 40),
    color: hexColor('#FFFFFF'),
    font: z.enum(CARD_FONTS).default('poppins').catch('poppins'),
    weight: z.enum(['400', '600', '700', '800']).default('700').catch('700'),
    align: z.enum(['left', 'center', 'right']).default('center').catch('center'),
    maxWidth: num(20, 4000, 900),
    uppercase: z.boolean().default(false).catch(false),
    opacity: num(0, 1, 1),
  }),
  z.object({
    ...layerBase,
    type: z.literal('avatar'),
    size: num(16, 1000, 180),
    shape: z.enum(CARD_AVATAR_SHAPES).default('circle').catch('circle'),
    borderWidth: num(0, 40, 6),
    borderColor: hexColor('#FFFFFF'),
  }),
  z.object({
    ...layerBase,
    type: z.literal('image'),
    url: z.union([z.string().max(2000).regex(/^https:\/\/\S+$/i), z.literal('')]).default('').catch(''),
    w: num(8, 4000, 200),
    h: num(8, 4000, 200),
    radius: num(0, 2000, 0),
    opacity: num(0, 1, 1),
  }),
  z.object({
    ...layerBase,
    type: z.literal('shape'),
    shape: z.enum(['rect', 'circle']).default('rect').catch('rect'),
    w: num(1, 4000, 200),
    h: num(1, 4000, 60),
    radius: num(0, 2000, 12),
    color: hexColor('#FFFFFF'),
    opacity: num(0, 1, 0.15),
  }),
]);
export type CardLayer = z.infer<typeof CardLayerSchema>;

export const CardBackgroundSchema = z.object({
  type: z.enum(['color', 'gradient', 'image']).default('gradient').catch('gradient'),
  color: hexColor('#1E1F22'),
  color2: hexColor('#5865F2'),
  angle: num(0, 360, 135),
  url: z.union([z.string().max(2000).regex(/^https:\/\/\S+$/i), z.literal('')]).default('').catch(''),
  overlay: num(0, 90, 0),
});
export type CardBackground = z.infer<typeof CardBackgroundSchema>;

export const WelcomeImageConfigSchema = z.object({
  enabled: z.boolean().default(true),
  /** default = Classique, modern = Centré, minimal = Minimal, gaming = Gaming. */
  template: z.enum(CARD_TEMPLATES).default('default').catch('default'),
  titleText: z.string().max(60).default('BIENVENUE').catch('BIENVENUE'),
  subtitleText: z.string().max(80).default('{username}').catch('{username}'),
  tagText: z.string().max(120).default('Membre #{membercount}').catch('Membre #{membercount}'),
  accentColor: hexColor('#10B981'),
  backgroundColor: hexColor('#0B0C10'),
  textColor: hexColor('#FFFFFF'),
  /** Image de fond (https uniquement, téléchargée via fetchPublicImage), recouverte d'un voile de backgroundColor. */
  customBackgroundUrl: z
    .string()
    .url()
    .startsWith('https://')
    .nullable()
    .default(null)
    .catch(null),
  overlayOpacity: z.number().int().min(0).max(90).default(55).catch(55),
  avatarShape: z.enum(CARD_AVATAR_SHAPES).default('circle').catch('circle'),
  font: z.enum(CARD_FONTS).default('poppins').catch('poppins'),
  showServerName: z.boolean().default(true).catch(true),
  /** Fond par défaut animé (GIF en boucle). Sans effet avec une image de fond personnalisée. */
  animated: z.boolean().default(true).catch(true),
  size: z.enum(CARD_SIZES).optional().catch(undefined),
  background: CardBackgroundSchema.optional().catch(undefined),
  layers: z.array(CardLayerSchema).max(20).optional().catch(undefined),
});

export type WelcomeImageConfig = z.infer<typeof WelcomeImageConfigSchema>;

export const WelcomeDMConfigSchema = z.object({
  enabled: z.boolean().default(false),
  format: z.enum(['embed', 'container', 'text']).optional().catch(undefined),
  contentAbove: z.string().max(2000).default('').catch(''),
  /** Joint la carte de bienvenue (même design que dans le salon) au message privé. */
  attachCard: z.boolean().default(false).catch(false),
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
  format: z.enum(['embed', 'container', 'text']).optional().catch(undefined),
  contentAbove: z.string().max(2000).default('').catch(''),
  notifyRoles: z.boolean().default(false).catch(false),
  deleteAfterSeconds: z.number().int().min(0).max(604800).default(0).catch(0),
  asServer: z.boolean().default(false).catch(false),

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
  mentionUser: z.boolean().default(false).catch(false),
  format: z.enum(['embed', 'container', 'text']).optional().catch(undefined),
  contentAbove: z.string().max(2000).default('').catch(''),
  notifyRoles: z.boolean().default(false).catch(false),
  deleteAfterSeconds: z.number().int().min(0).max(604800).default(0).catch(0),
  asServer: z.boolean().default(false).catch(false),

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

export const GhostPingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelIds: z.array(z.string().regex(/^\d{15,25}$/)).max(10).default([]).catch([]),
  text: z.string().min(1).max(500).default('{user}').catch('{user}'),
  deleteAfterSeconds: z.number().int().min(0).max(60).default(1).catch(1),
});
export type GhostPingConfig = z.infer<typeof GhostPingConfigSchema>;

export const WelcomeOptionsSchema = z.object({
  waitVerification: z.boolean().default(true).catch(true),
  ignoreBots: z.boolean().default(true).catch(true),
  quickLeave: z.enum(['keep', 'delete', 'deleteSilent']).default('keep').catch('keep'),
});
export type WelcomeOptions = z.infer<typeof WelcomeOptionsSchema>;

export const FullWelcomeConfigSchema = z.object({
  welcome: WelcomeMessageConfigSchema.default({}),
  goodbye: GoodbyeMessageConfigSchema.default({}),
  ghostPing: GhostPingConfigSchema.default({}),
  options: WelcomeOptionsSchema.default({}),
});

export type FullWelcomeConfig = z.infer<typeof FullWelcomeConfigSchema>;
export type FullWelcomeInput = z.input<typeof FullWelcomeConfigSchema>;
