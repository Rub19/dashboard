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
} as const;

export type EmbedTone = 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

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
