import {
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  MessageActionRowComponentBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';

/** Flags à passer à interaction.reply()/editReply()/update() pour un message V2. */
export const V2_FLAGS = MessageFlags.IsComponentsV2;
export const V2_EPHEMERAL_FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
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
export type ContainerPart =
  | TextDisplayBuilder
  | SectionBuilder
  | SeparatorBuilder
  | ActionRowBuilder<MessageActionRowComponentBuilder>
  | null
  | false
  | undefined;

export function container(color: number, parts: ContainerPart[]): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(color);
  for (const part of parts) {
    if (!part) continue;
    if (part instanceof TextDisplayBuilder) c.addTextDisplayComponents(part);
    else if (part instanceof SectionBuilder) c.addSectionComponents(part);
    else if (part instanceof SeparatorBuilder) c.addSeparatorComponents(part);
    else if (part instanceof ActionRowBuilder) c.addActionRowComponents(part as ActionRowBuilder<MessageActionRowComponentBuilder>);
  }
  return c;
}

/** Ligne "clé · clé · clé" en petit texte, pour les stats sous un titre. */
export function statsLine(items: Array<string | null | undefined | false>): TextDisplayBuilder {
  return text(items.filter(Boolean).join('  ·  '));
}

/** mm:ss (ou h:mm:ss au-delà d'une heure). */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '∞';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
