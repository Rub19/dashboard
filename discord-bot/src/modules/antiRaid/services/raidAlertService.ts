import { Colors, EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { RaidAction, ThreatLevel } from '../types/antiRaid.js';
import { raidConfigService } from './raidConfigService.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

interface AlertParams {
  guild: Guild;
  threatLevel: ThreatLevel;
  riskScore: number;
  title: string;
  reason: string;
  actionsTaken: RaidAction[];
  signals: string[];
  incidentId?: string;
}

class RaidAlertService {
  public async sendAlert(params: {
    guild: Guild;
    threatLevel: ThreatLevel;
    riskScore: number;
    title: string;
    reason: string;
    actionsTaken: RaidAction[];
    signals: string[];
    incidentId?: string;
  }): Promise<void> {
    const { guild, threatLevel, riskScore, title, reason, actionsTaken, signals, incidentId } =
      params;
    const config = raidConfigService.getConfig(guild.id);

    // Déterminer la couleur selon le Threat Level
    let embedColor: number = Colors.Yellow;
    if (threatLevel === 'CRITICAL') embedColor = Colors.DarkRed;
    else if (threatLevel === 'DANGEROUS') embedColor = Colors.Red;
    else if (threatLevel === 'ELEVATED') embedColor = Colors.Orange;

    const actionList = actionsTaken.map((a) => `✓ \`${a}\``).join('\n') || '✓ `LOG_EVENT`';
    const signalsList = signals.map((s) => `• ${s}`).join('\n') || '• Aucune anomalie additionnelle';

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ ${title}`)
      .setColor(embedColor)
      .setDescription(
        `**Niveau de menace :** \`${threatLevel}\`\n**Risk Score :** \`${riskScore}/100\``
      )
      .addFields(
        { name: '🚨 Cause du déclenchement', value: reason, inline: false },
        { name: '📊 Signaux suspects détectés', value: signalsList, inline: false },
        { name: '⚡ Actions de protection exécutées', value: actionList, inline: false }
      )
      .setTimestamp();

    if (incidentId) {
      embed.setFooter({ text: `Incident ID : ${incidentId} • ETHONE Anti-Raid 2.0` });
    }

    // 1. Envoyer dans le salon d'alerte configuré
    if (config.alerts.channelId) {
      const channel = guild.channels.cache.get(config.alerts.channelId);
      if (channel && channel.isTextBased()) {
        try {
          const mention = config.alerts.mentionRoleId
            ? `<@&${config.alerts.mentionRoleId}> `
            : '';
          await (channel as TextChannel).send({
            content: mention ? `${mention}🚨 **Alerte Sécurité Anti-Raid**` : undefined,
            embeds: [embed],
          });
        } catch (err) {
          logger.error(`[RaidAlertService] Échec envoi alerte dans #${channel.id}:`, err);
        }
      }
    }

    // 2. Journaliser dans le système centralisé des logs
    try {
      await logService.log(guild, {
        category: 'moderation',
        type: 'MOD_SANCTION',
        title: `🚨 ${title}`,
        description: `Risk Score: **${riskScore}/100** | Menace: **${threatLevel}**\n${reason}`,
        color: threatLevel === 'CRITICAL' ? '#EF4444' : '#F59E0B',
        fields: [
          { name: 'Actions', value: actionsTaken.join(', ') || 'Alerte seule', inline: true },
          { name: 'Incident', value: incidentId || 'N/A', inline: true },
        ],
      });
    } catch (err) {
      logger.error('[RaidAlertService] Erreur logging centralisé:', err);
    }
  }
}

export const raidAlertService = new RaidAlertService();
