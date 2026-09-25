import type { EmbedBuilder } from 'discord.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { formatString, type TranslationDictionary } from '../../../utils/i18n.js';
import type { LevelingConfig } from '../types/levelingConfig.js';

/** Contenu affiché pour un membre : réutilisé par les vrais messages et par l'aperçu des messages du bot. */
export interface LevelMessageSubject {
  guildName: string;
  userMention: string;
  username: string;
  avatarUrl: string;
}

const accentOf = (config: LevelingConfig) => parseInt(config.accentColor.slice(1), 16);

/** Embed « niveau supérieur » (rôles débloqués ajoutés au texte quand l'annonce des récompenses est fusionnée). */
export function buildLevelUpEmbed(config: LevelingConfig, t: TranslationDictionary, who: LevelMessageSubject, level: number, xp: number, grantedRoleNames: string[]): EmbedBuilder {
  let content = config.levelUpMessage
    .replace(/{user}/g, who.userMention)
    .replace(/{username}/g, who.username)
    .replace(/{level}/g, String(level))
    .replace(/{xp}/g, String(xp))
    .replace(/{server}/g, who.guildName);
  if (grantedRoleNames.length > 0 && config.rewardAnnounceType === 'with_levelup') {
    content += `\n${formatString(t.leveling_levelup_roles_unlocked, { roles: grantedRoleNames.map((r) => `\`@${r}\``).join(', ') })}`;
  }
  // Ton « warning » = ambre doré, accent de marque du module Niveaux ; la couleur choisie dans le dashboard prend le relais.
  return baseEmbed('warning').setTitle(t.leveling_levelup_title).setDescription(content).setThumbnail(who.avatarUrl).setColor(accentOf(config));
}

/** Embed d'annonce séparée d'une récompense de rôle. */
export function buildRewardEmbed(config: LevelingConfig, who: LevelMessageSubject, roleName: string, level: number): EmbedBuilder {
  const text = config.rewardMessage
    .replace(/{user}/g, who.userMention)
    .replace(/{username}/g, who.username)
    .replace(/{role}/g, roleName)
    .replace(/{level}/g, String(level))
    .replace(/{server}/g, who.guildName);
  return baseEmbed('warning').setDescription(text).setThumbnail(who.avatarUrl).setColor(accentOf(config));
}
