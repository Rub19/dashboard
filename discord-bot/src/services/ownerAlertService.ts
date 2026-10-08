import { EmbedBuilder, type Guild } from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { logger } from '../utils/logger.js';

/**
 * « Prévenir le propriétaire en MP » (Réglages de la console, désactivé par défaut) : lors d'une alerte grave
 * (raid, nuke), le propriétaire du serveur reçoit un message privé. Au plus un message toutes les 10 min par
 * serveur, pour ne pas le noyer pendant une attaque.
 */
const COOLDOWN_MS = 10 * 60_000;
const lastSent = new Map<string, number>();

export async function notifyOwnerByDm(guild: Guild, title: string, description: string): Promise<boolean> {
  if (!guildConfigService.getConfig(guild.id).ownerDmAlerts) return false;
  const now = Date.now();
  if (now - (lastSent.get(guild.id) ?? 0) < COOLDOWN_MS) return false;
  lastSent.set(guild.id, now);
  try {
    const owner = await guild.fetchOwner();
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`🚨 ${title}`)
      .setDescription(`${description}\n\nServeur : **${guild.name}**`)
      .setFooter({ text: 'Désactivable dans la console Etho › Réglages' })
      .setTimestamp();
    await owner.send({ embeds: [embed] });
    return true;
  } catch (err) {
    logger.warn(`[OwnerAlert] MP au propriétaire impossible sur ${guild.name} :`, err);
    return false;
  }
}
