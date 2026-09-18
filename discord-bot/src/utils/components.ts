import {
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { BRAND_COLORS } from './embeds.js';
import { resolveHexColor } from '../types/guildConfig.js';

/**
 * Helpers Components V2 (ContainerBuilder & co) — le "chrome" moderne des
 * réponses du bot, en remplacement des embeds classiques sur les commandes
 * les plus vues (/rank, /leaderboard, /economy, /help).
 *
 * Toute réponse construite ici DOIT être envoyée avec `componentsV2: true`
 * via CommandContext.reply()/editReply(), qui pose le flag IsComponentsV2.
 * Contraintes Discord à garder en tête : pas de `content`/`embeds` mélangés
 * avec des composants V2, 40 composants max par message, 4000 caractères de
 * texte au total.
 */

export type ContainerTone = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';

export function toneToColor(tone: ContainerTone, guildHex?: string | null): number {
  if (guildHex) return resolveHexColor(guildHex, BRAND_COLORS[tone] ?? BRAND_COLORS.primary);
  return BRAND_COLORS[tone] ?? BRAND_COLORS.primary;
}

export function text(content: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(content);
}

export function separator(divider = true, large = false): SeparatorBuilder {
  return new SeparatorBuilder()
    .setDivider(divider)
    .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
}

/** Bloc texte(s) + vignette à droite (avatar, icône...). */
export function sectionWithThumbnail(lines: string[], thumbnailUrl: string, description?: string): SectionBuilder {
  const section = new SectionBuilder();
  for (const line of lines.slice(0, 3)) {
    section.addTextDisplayComponents(text(line));
  }
  const thumb = new ThumbnailBuilder().setURL(thumbnailUrl);
  if (description) thumb.setDescription(description);
  section.setThumbnailAccessory(thumb);
  return section;
}

/** Bloc texte(s) + bouton à droite. */
export function sectionWithButton(lines: string[], button: ButtonBuilder): SectionBuilder {
  const section = new SectionBuilder();
  for (const line of lines.slice(0, 3)) {
    section.addTextDisplayComponents(text(line));
  }
  section.setButtonAccessory(button);
  return section;
}

export function buttonRow(...buttons: ButtonBuilder[]): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons.slice(0, 5));
}

/**
 * Conteneur avec barre d'accent colorée. `parts` accepte les builders V2
 * (TextDisplay, Section, Separator, ActionRow) dans l'ordre d'affichage.
 */
export function container(
  color: number,
  parts: Array<TextDisplayBuilder | SectionBuilder | SeparatorBuilder | ActionRowBuilder<ButtonBuilder>>
): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(color);
  for (const part of parts) {
    if (part instanceof TextDisplayBuilder) c.addTextDisplayComponents(part);
    else if (part instanceof SectionBuilder) c.addSectionComponents(part);
    else if (part instanceof SeparatorBuilder) c.addSeparatorComponents(part);
    else if (part instanceof ActionRowBuilder) c.addActionRowComponents(part);
  }
  return c;
}

/** Barre de progression textuelle (même rendu que LevelCalculator.renderProgressBar, mais ici pour tout le bot). */
export function progressBar(percent: number, length = 12): string {
  const filled = Math.min(length, Math.max(0, Math.round((percent / 100) * length)));
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

/** Pied de page discret (petit texte gris) — équivalent du footer d'embed. */
export function footer(content: string): TextDisplayBuilder {
  return text(`-# ${content}`);
}
