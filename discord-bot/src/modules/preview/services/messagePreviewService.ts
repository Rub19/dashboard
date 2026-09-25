import { BaseMessageOptions, Client, Guild, MessageFlags } from 'discord.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { getTranslation } from '../../../utils/i18n.js';
import { noticeEmbed } from '../../../utils/embeds.js';
import { buildPingMessage } from '../../../commands/general/ping.js';
import { buildSettingsMessage } from '../../../commands/admin/settings.js';
import { buildSanctionDmEmbed } from '../../moderation/utils/sanctionDmEmbed.js';
import { buildSanctionCard } from '../../moderation/utils/sanctionCard.js';
import { levelingStorage } from '../../leveling/storage/levelingStorage.js';
import { buildLevelUpEmbed, buildRewardEmbed } from '../../leveling/services/levelMessages.js';
import { buildAutomodWarnEmbed } from '../../automod/services/actionEngine.js';
import { buildEmergencyEmbed } from '../../health/services/emergencyService.js';
import { buildGrantedEmbed, buildSetupEmbed } from '../../secureroles/services/secureMessages.js';
import { logger } from '../../../utils/logger.js';

/**
 * Aperçu des messages du bot : envoie en message privé un exemplaire de chaque message que le bot sait produire, construit
 * avec les MÊMES fonctions que les vrais envois (aucune copie à maintenir). Données d'exemple, aucun effet sur le serveur.
 */

export interface PreviewEntry {
  id: string;
  category: string;
  title: string;
  message: BaseMessageOptions;
  /** Message « Components V2 » (pas de texte libre à côté). */
  v2?: boolean;
}

export const PREVIEW_CATEGORIES: Array<[string, string]> = [
  ['statuts', 'Statuts (succès, erreur…)'],
  ['general', 'Général'],
  ['moderation', 'Modération'],
  ['niveaux', 'Niveaux'],
  ['automod', 'AutoMod'],
  ['securite', 'Sécurité et urgences'],
];

const SAMPLE = { username: 'Lucas', mention: '@Lucas', tag: 'lucas#0001' };

/** Construit le catalogue pour un serveur (langue, couleurs et réglages du serveur pris en compte). */
export function buildCatalog(client: Client, guild: Guild): PreviewEntry[] {
  const guildConfig = guildConfigService.getConfig(guild.id);
  const t = getTranslation(guildConfig.language);
  const leveling = levelingStorage.getConfig(guild.id);
  const avatar = client.user?.displayAvatarURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png';
  const who = { guildName: guild.name, userMention: SAMPLE.mention, username: SAMPLE.username, avatarUrl: avatar };
  const noComponents = (m: BaseMessageOptions): BaseMessageOptions => ({ embeds: m.embeds });

  const list: PreviewEntry[] = [
    { id: 'status-success', category: 'statuts', title: 'Succès', message: { embeds: [noticeEmbed('success', 'L’action a bien été effectuée.')] } },
    { id: 'status-error', category: 'statuts', title: 'Erreur', message: { embeds: [noticeEmbed('error', 'Une erreur est survenue. Réessaie dans un instant.')] } },
    { id: 'status-warning', category: 'statuts', title: 'Avertissement', message: { embeds: [noticeEmbed('warning', 'Attention : cette action est sensible.')] } },
    { id: 'status-info', category: 'statuts', title: 'Information', message: { embeds: [noticeEmbed('info', 'Voici une information sur le serveur.')] } },
    { id: 'status-denied', category: 'statuts', title: 'Accès refusé', message: { embeds: [noticeEmbed('denied', 'Tu n’as pas la permission d’utiliser cette commande.')] } },

    { id: 'general-ping', category: 'general', title: '/ping', message: noComponents(buildPingMessage(client, guildConfig, 42)) },
    { id: 'general-settings', category: 'general', title: '/settings', message: noComponents(buildSettingsMessage(guildConfig, SAMPLE.username)) },

    ...(['warn', 'kick', 'ban'] as const).map<PreviewEntry>((kind) => ({
      id: `mod-dm-${kind}`,
      category: 'moderation',
      title: `Message privé au membre sanctionné (${kind})`,
      message: { embeds: [buildSanctionDmEmbed(kind, t, { guildName: guild.name, reason: 'Exemple de motif', moderatorTag: 'Modérateur#0001' })] },
    })),
    ...(['warn', 'timeout', 'ban'] as const).map<PreviewEntry>((type) => ({
      id: `mod-card-${type}`,
      category: 'moderation',
      title: `Confirmation d’une sanction (${type})`,
      v2: true,
      message: {
        components: [buildSanctionCard({ guildConfig, type, sanctionId: 128, targetTag: SAMPLE.tag, targetMention: SAMPLE.mention, targetAvatarUrl: avatar, moderatorMention: '@Modérateur', reason: 'Exemple de motif', durationSeconds: type === 'timeout' ? 3600 : null, totalSanctions: 3 })],
        flags: MessageFlags.IsComponentsV2,
      },
    })),

    { id: 'lvl-up', category: 'niveaux', title: 'Montée de niveau', message: { embeds: [buildLevelUpEmbed(leveling, t, who, 12, 1450, [])] } },
    { id: 'lvl-up-roles', category: 'niveaux', title: 'Montée de niveau avec rôle débloqué', message: { embeds: [buildLevelUpEmbed(leveling, t, who, 10, 1000, ['Actif'])] } },
    { id: 'lvl-reward', category: 'niveaux', title: 'Annonce d’une récompense (message séparé)', message: { embeds: [buildRewardEmbed(leveling, who, 'Actif', 10)] } },

    { id: 'automod-warn', category: 'automod', title: 'Avertissement AutoMod', message: { embeds: [buildAutomodWarnEmbed(guild.name, 'Invitation Discord interdite', 2)] } },

    { id: 'sec-emergency', category: 'securite', title: 'Alerte d’urgence', message: { embeds: [buildEmergencyEmbed(guild, [{ id: 'x', title: 'Signalements', detail: 'Le salon configuré (`123456789012345678`) n’existe plus.' }], false)] } },
    { id: 'sec-emergency-test', category: 'securite', title: 'Test des contacts d’urgence', message: { embeds: [buildEmergencyEmbed(guild, [], true)] } },
    { id: 'sec-2fa-setup', category: 'securite', title: 'Rôles sécurisés : configuration du code', message: { embeds: [buildSetupEmbed('ABCD EFGH IJKL MNOP QRST UVWX YZ23 4567'.replace(/ /g, ''), 'otpauth://totp/ETHONE:lucas?secret=ABCDEFGHIJKLMNOPQRSTUVWXYZ234567&issuer=ETHONE')] } },
    { id: 'sec-2fa-granted', category: 'securite', title: 'Rôles sécurisés : session ouverte', message: { embeds: [buildGrantedEmbed(new Date(Date.now() + 30 * 60_000))] } },
  ];
  return list;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PreviewResult {
  total: number;
  sent: number;
  failed: number;
  dmClosed: boolean;
}

/** Envoie le catalogue (ou une catégorie) en message privé. Une pause entre chaque envoi évite la limite de débit de Discord. */
export async function sendPreview(client: Client, guild: Guild, userId: string, category?: string | null, pauseMs = 900): Promise<PreviewResult> {
  const entries = buildCatalog(client, guild).filter((e) => !category || e.category === category);
  const user = await client.users.fetch(userId);
  const result: PreviewResult = { total: entries.length, sent: 0, failed: 0, dmClosed: false };

  try {
    await user.send({ embeds: [noticeEmbed('info', `Voici ${entries.length} message(s) du bot, avec des données d’exemple (rien n’est modifié sur **${guild.name}**). Les boutons et menus sont retirés : ils ne fonctionnent pas en message privé.`, { title: 'Aperçu des messages du bot' })] });
  } catch {
    result.dmClosed = true;
    return result;
  }

  for (const [i, entry] of entries.entries()) {
    const label = `**[${i + 1}/${entries.length}] ${PREVIEW_CATEGORIES.find(([k]) => k === entry.category)?.[1] ?? entry.category} · ${entry.title}**`;
    try {
      if (entry.v2) {
        await user.send({ content: label });
        await user.send(entry.message);
      } else {
        await user.send({ ...entry.message, content: label });
      }
      result.sent++;
    } catch (err) {
      result.failed++;
      logger.warn(`[Preview] Envoi impossible (${entry.id}) :`, err instanceof Error ? err.message : err);
    }
    if (i < entries.length - 1) await sleep(pauseMs);
  }
  return result;
}
