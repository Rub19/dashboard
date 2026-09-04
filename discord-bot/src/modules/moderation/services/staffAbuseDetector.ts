import { Client, EmbedBuilder, Colors, TextChannel } from 'discord.js';
import { CaseAction } from '../types/case.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { securityEventBus } from '../../automod/services/securityEventBus.js';
import { logger } from '../../../utils/logger.js';

interface ModActionRecord {
  moderatorId: string;
  action: CaseAction;
  timestamp: number;
}

export class StaffAbuseDetector {
  private static slidingWindow: Map<string, ModActionRecord[]> = new Map(); // guildId -> records
  private static alertCooldowns: Map<string, number> = new Map(); // guildId:moderatorId -> lastAlertTime

  public static trackAction(
    discordClient: Client,
    guildId: string,
    moderatorId: string,
    moderatorTag: string,
    action: CaseAction
  ): void {
    if (moderatorId === 'AUTOMOD' || moderatorId === 'ANTI_RAID' || moderatorId === 'SYSTEM') {
      return;
    }

    const now = Date.now();
    const records = this.slidingWindow.get(guildId) || [];
    // Retirer les enregistrements de plus de 60s
    const filtered = records.filter((r) => now - r.timestamp < 60000);
    filtered.push({ moderatorId, action, timestamp: now });
    this.slidingWindow.set(guildId, filtered);

    // Calculer les actions du modérateur dans les 60s
    const modActions = filtered.filter((r) => r.moderatorId === moderatorId);
    const bans = modActions.filter((r) => r.action === 'BAN' || r.action === 'SOFTBAN').length;
    const kicks = modActions.filter((r) => r.action === 'KICK').length;
    const timeouts = modActions.filter((r) => r.action === 'TIMEOUT').length;

    const settings = moderationRepository.getSettings(guildId);
    const limits = settings.staffAbuseLimits;

    let abuseDetected = false;
    let details = '';

    if (bans >= limits.maxBansPerMinute) {
      abuseDetected = true;
      details = `${bans} bannissements en moins de 60 secondes (Limite: ${limits.maxBansPerMinute})`;
    } else if (kicks >= limits.maxKicksPerMinute) {
      abuseDetected = true;
      details = `${kicks} expulsions en moins de 60 secondes (Limite: ${limits.maxKicksPerMinute})`;
    } else if (timeouts >= limits.maxTimeoutsPerMinute) {
      abuseDetected = true;
      details = `${timeouts} exclusions en moins de 60 secondes (Limite: ${limits.maxTimeoutsPerMinute})`;
    }

    if (abuseDetected) {
      const cooldownKey = `${guildId}:${moderatorId}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
      if (now - lastAlert > 120000) {
        // Cooldown 2 minutes pour éviter le spam d'alertes
        this.alertCooldowns.set(cooldownKey, now);
        this.triggerAbuseAlert(discordClient, guildId, moderatorId, moderatorTag, details);
      }
    }
  }

  private static async triggerAbuseAlert(
    discordClient: Client,
    guildId: string,
    moderatorId: string,
    moderatorTag: string,
    details: string
  ): Promise<void> {
    logger.warn(`[StaffAbuseDetector] Alerte abus staff sur ${guildId} par ${moderatorTag} : ${details}`);

    // 1. Publier sur le Security Event Bus
    securityEventBus.emitStaffAbuse({
      guildId,
      moderatorId,
      moderatorTag,
      riskScore: 85,
      details: `Abus potentiel de permissions de modération : ${details}`,
    });

    // 2. Journaliser dans l'Audit Log
    moderationRepository.addAuditLog({
      id: `AUDIT-${Date.now()}`,
      guildId,
      actorId: moderatorId,
      actorTag: moderatorTag,
      action: 'STAFF_ABUSE_DETECTED',
      targetType: 'USER',
      targetId: moderatorId,
      details,
      timestamp: new Date().toISOString(),
    });

    // 3. Envoyer une alerte dans le salon de logs
    const settings = moderationRepository.getSettings(guildId);
    if (!settings.logChannelId) return;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(settings.logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(Colors.DarkRed)
      .setTitle('🚨 ALERTE SÉCURITÉ STAFF — Activité de Modération Anormale')
      .setDescription(
        `Le modérateur <@${moderatorId}> (**${moderatorTag}**) a effectué une vague inhabituelle d'actions disciplinaires.`
      )
      .addFields(
        { name: 'Détail de la détection', value: details, inline: false },
        { name: 'Niveau de Risque', value: '🔥 **CRITIQUE**', inline: true },
        { name: 'Recommandation', value: 'Vérifier si le compte du modérateur est compromis.', inline: true }
      )
      .setFooter({ text: 'Staff Abuse Guard • ETHONE Security' })
      .setTimestamp();

    await (channel as TextChannel).send({
      content: '@everyone 🚨 **ALERTE SÉCURITÉ MODÉRATION**',
      embeds: [embed],
    }).catch(() => {});
  }
}
