import { Colors, EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { AutoModAction, AutoModConfig, AutoModRiskLevel } from '../types/autoMod.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

interface AlertParams {
  guild: Guild;
  userId: string;
  userTag: string;
  channelId: string;
  channelName: string;
  content: string;
  ruleOrDetector: string;
  riskScore: number;
  riskLevel: AutoModRiskLevel;
  actionsTaken: AutoModAction[];
  strikesCount: number;
  config: AutoModConfig;
}

export class AutoModAlertService {
  // Cooldown de notification: clé `${guildId}:${userId}:${rule}` -> timestamp
  private static alertCooldowns = new Map<string, number>();

  public static async sendAlert(params: AlertParams): Promise<void> {
    const {
      guild,
      userId,
      userTag,
      channelId,
      channelName,
      content,
      ruleOrDetector,
      riskScore,
      riskLevel,
      actionsTaken,
      strikesCount,
      config,
    } = params;

    // Cooldown check (max 1 alerte par utilisateur et par règle toutes les 10 secondes)
    const cooldownKey = `${guild.id}:${userId}:${ruleOrDetector}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
    if (Date.now() - lastAlert < 10000) return;
    this.alertCooldowns.set(cooldownKey, Date.now());

    let color: number = Colors.Yellow;
    if (riskLevel === 'CRITICAL') color = Colors.DarkRed;
    else if (riskLevel === 'HIGH') color = Colors.Red;
    else if (riskLevel === 'MEDIUM') color = Colors.Orange;

    const embed = new EmbedBuilder()
      .setTitle(`🤖 Détection AutoMod 2.0 — ${ruleOrDetector}`)
      .setColor(color)
      .addFields(
        { name: '👤 Utilisateur', value: `**${userTag}** (<@${userId}>)`, inline: true },
        { name: '💬 Salon', value: `<#${channelId}>`, inline: true },
        { name: '📊 Risk Score', value: `\`${riskScore}/100\` (${riskLevel})`, inline: true },
        { name: '⚡ Actions Appliquées', value: actionsTaken.map((a) => `\`${a}\``).join(', ') || '`LOG`', inline: true },
        { name: '⚠️ Strikes Actifs', value: `\`${strikesCount}\``, inline: true }
      )
      .setFooter({ text: 'ETHONE Smart Moderation Engine' })
      .setTimestamp();

    if (content) {
      const preview = content.length > 250 ? `${content.slice(0, 250)}...` : content;
      embed.addFields({ name: '📝 Aperçu du message', value: `\`\`\`${preview}\`\`\``, inline: false });
    }

    // 1. Envoi dans le salon d'alerte configuré
    if (config.alertChannelId) {
      const channel = guild.channels.cache.get(config.alertChannelId);
      if (channel && channel.isTextBased()) {
        try {
          const mention = config.staffMentionRoleId ? `<@&${config.staffMentionRoleId}> ` : '';
          await (channel as TextChannel).send({
            content: mention ? `${mention}🚨 **Alerte AutoMod**` : undefined,
            embeds: [embed],
          });
        } catch (err) {
          logger.error('[AutoModAlertService] Échec envoi alerte dans salon staff :', err);
        }
      }
    }

    // 2. Journalisation dans les logs de modération globaux
    try {
      await logService.log(guild, {
        category: 'moderation',
        type: 'AUTOMOD_ALERT',
        title: `🤖 AutoMod : ${ruleOrDetector}`,
        description: `Membre : **${userTag}** | Risque : **${riskScore}/100**\nActions : ${actionsTaken.join(', ')}`,
        color: riskLevel === 'CRITICAL' ? '#EF4444' : '#F59E0B',
        fields: [
          { name: 'Infraction', value: ruleOrDetector, inline: true },
          { name: 'Niveau de Risque', value: `${riskLevel} (${riskScore}/100)`, inline: true },
          { name: 'Actions exécutées', value: actionsTaken.join(', ') || 'Aucune', inline: false },
        ],
        userId,
        userTag,
        channelId,
        channelName,
      });
    } catch {}
  }
}
