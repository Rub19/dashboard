import { EmbedBuilder } from 'discord.js';
import { resolveHexColor } from '../types/guildConfig.js';

/**
 * Palette de marque ETHONE — chrome visuel générique des embeds du bot.
 *
 * Ces valeurs reprennent exactement les couleurs par défaut déclarées dans
 * `types/guildConfig.ts` (`defaultGuildConfig` / `GuildConfigSchema`), elles-mêmes
 * alignées sur la palette officielle Discord (Blurple / Green / Red). Cela garantit
 * que tout embed générique (pas de couleur de guilde personnalisée) affiche la même
 * identité visuelle que celle utilisée par défaut côté configuration serveur.
 */
export const BRAND_COLORS = {
  primary: 0x5865f2, // Discord Blurple — couleur de marque par défaut (= guildConfig.primaryColor)
  secondary: 0x4752c4, // = guildConfig.secondaryColor
  success: 0x57f287, // = guildConfig.successColor
  error: 0xed4245, // = guildConfig.errorColor
  warning: 0xf59e0b, // Ambre — pas de champ dédié dans guildConfig, convention interne du bot
  info: 0x5865f2, // = guildConfig.infoColor
  neutral: 0x6b7280, // Gris ardoise — état "désactivé / inactif", pas de champ dédié dans guildConfig
} as const;

export type EmbedTone =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral';

export interface EmbedChromeOptions {
  /** Couleur explicite (hex `#RRGGBB` ou nombre). Prioritaire sur le ton. Utile pour
   * répercuter une couleur personnalisée de guilde (ex: `guildConfig.primaryColor`). */
  color?: number | string | null;
  /** Texte du footer. `null` désactive le footer. Par défaut : "ETHONE". */
  footerText?: string | null;
  footerIconURL?: string;
  authorName?: string;
  authorIconURL?: string;
  authorURL?: string;
  /** `false` désactive le timestamp. Une `Date` permet d'horodater un événement précis. */
  timestamp?: boolean | Date;
}

const DEFAULT_FOOTER_TEXT = 'ETHONE';

function toneColor(tone: EmbedTone): number {
  switch (tone) {
    case 'success':
      return BRAND_COLORS.success;
    case 'error':
      return BRAND_COLORS.error;
    case 'warning':
      return BRAND_COLORS.warning;
    case 'info':
      return BRAND_COLORS.info;
    case 'neutral':
      return BRAND_COLORS.neutral;
    case 'secondary':
      return BRAND_COLORS.secondary;
    case 'primary':
    case 'default':
    default:
      return BRAND_COLORS.primary;
  }
}

/**
 * Construit un EmbedBuilder avec le chrome visuel standard ETHONE :
 * couleur de marque (ou couleur de guilde/personnalisée fournie), footer et
 * timestamp cohérents. Ne touche jamais au contenu (titre/description/fields) —
 * ces derniers restent à la charge de l'appelant.
 */
export function baseEmbed(tone: EmbedTone = 'default', options: EmbedChromeOptions = {}): EmbedBuilder {
  const embed = new EmbedBuilder();

  let color: number;
  if (options.color === null || options.color === undefined) {
    color = toneColor(tone);
  } else if (typeof options.color === 'number') {
    color = options.color;
  } else {
    color = resolveHexColor(options.color, toneColor(tone));
  }
  embed.setColor(color);

  if (options.authorName) {
    embed.setAuthor({
      name: options.authorName,
      iconURL: options.authorIconURL,
      url: options.authorURL,
    });
  }

  const footerText = options.footerText === null ? undefined : options.footerText ?? DEFAULT_FOOTER_TEXT;
  if (footerText) {
    embed.setFooter(
      options.footerIconURL ? { text: footerText, iconURL: options.footerIconURL } : { text: footerText }
    );
  }

  if (options.timestamp !== false) {
    embed.setTimestamp(options.timestamp instanceof Date ? options.timestamp : undefined);
  }

  return embed;
}

/** Embed de ton "succès" (vert marque ETHONE). */
export function successEmbed(options: EmbedChromeOptions = {}): EmbedBuilder {
  return baseEmbed('success', options);
}

/** Embed de ton "erreur" (rouge marque ETHONE). */
export function errorEmbed(options: EmbedChromeOptions = {}): EmbedBuilder {
  return baseEmbed('error', options);
}

/** Embed de ton "avertissement" (ambre). */
export function warningEmbed(options: EmbedChromeOptions = {}): EmbedBuilder {
  return baseEmbed('warning', options);
}

/** Embed de ton "information" (identique à la couleur de marque par défaut). */
export function infoEmbed(options: EmbedChromeOptions = {}): EmbedBuilder {
  return baseEmbed('info', options);
}

/** Embed de ton "neutre" (gris ardoise — état désactivé/inactif, ni succès ni erreur). */
export function neutralEmbed(options: EmbedChromeOptions = {}): EmbedBuilder {
  return baseEmbed('neutral', options);
}

/** Adresse des icônes personnalisées des embeds (générées par ethone-next/scripts/build-bot-icons.mjs, servies par le site). */
export const BOT_ICON_BASE = 'https://ethone.dev/bot-icons';

export type NoticeKind = 'success' | 'error' | 'warning' | 'info' | 'denied' | 'neutral';

const LEAD_TONES: Array<[string, NoticeKind]> = [
  ['⛔', 'denied'], ['❌', 'error'], ['✅', 'success'], ['🔨', 'success'], ['⚠️', 'warning'],
  ['⏳', 'warning'], ['🔒', 'denied'], ['⚪', 'neutral'], ['🛠️', 'warning'], ['ℹ️', 'info'],
];

const NOTICE_META: Record<NoticeKind, { label: string; color: number }> = {
  success: { label: 'Succès', color: BRAND_COLORS.success },
  error: { label: 'Erreur', color: BRAND_COLORS.error },
  warning: { label: 'Attention', color: BRAND_COLORS.warning },
  info: { label: 'Information', color: BRAND_COLORS.info },
  denied: { label: 'Accès refusé', color: 0xe11d48 },
  neutral: { label: 'Information', color: BRAND_COLORS.neutral },
};

/**
 * Message de statut court (succès, erreur, refus, information) présenté en embed : pastille d'icône personnalisée
 * dans l'en-tête (sans texte dans l'image), couleur de marque, pied de page ETHONE. À utiliser à la place d'un
 * `content` en texte brut pour toute réponse du bot.
 */
export function noticeEmbed(kind: NoticeKind, text: string, options: { title?: string; icon?: string } = {}): EmbedBuilder {
  // Un texte qui commence par un émoji de statut (❌ ⏳ ✅ …) : l'émoji est retiré (l'icône de l'en-tête le remplace)
  // et détermine le ton quand aucun ton précis n'a été demandé (« info » par défaut).
  let tone = kind;
  let body = String(text);
  if (kind === 'info') {
    for (const [emoji, mapped] of LEAD_TONES) {
      if (body.startsWith(emoji)) {
        tone = mapped;
        body = body.slice(emoji.length).trimStart();
        break;
      }
    }
  }
  const meta = NOTICE_META[tone];
  return new EmbedBuilder()
    .setColor(meta.color)
    .setAuthor({ name: options.title ?? meta.label, iconURL: `${BOT_ICON_BASE}/${options.icon ?? tone}.png` })
    .setDescription(body.slice(0, 4000))
    .setFooter({ text: DEFAULT_FOOTER_TEXT, iconURL: `${BOT_ICON_BASE}/ethone.png` });
}
