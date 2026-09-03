import { GuildMember, Message, PartialMessage, PermissionFlagsBits, TextChannel } from 'discord.js';
import { autoModRepository } from '../storage/autoModRepository.js';
import { autoModCache } from './autoModCache.js';
import { AutoModAction, DetectionResult } from '../types/autoMod.js';
import { SpamDetector } from '../detectors/spamDetector.js';
import { FloodDetector } from '../detectors/floodDetector.js';
import { LinkDetector } from '../detectors/linkDetector.js';
import { InviteDetector } from '../detectors/inviteDetector.js';
import { MentionDetector } from '../detectors/mentionDetector.js';
import { GhostPingDetector } from '../detectors/ghostPingDetector.js';
import { CapsDetector } from '../detectors/capsDetector.js';
import { KeywordDetector } from '../detectors/keywordDetector.js';
import { RegexDetector } from '../detectors/regexDetector.js';
import { ProfileDetector } from '../detectors/profileDetector.js';
import { AutoModRiskEngine } from './autoModRiskEngine.js';
import { RuleEngine } from './ruleEngine.js';
import { ActionEngine } from './actionEngine.js';
import { StrikeService } from './strikeService.js';
import { AutoModAlertService } from './autoModAlertService.js';
import { AutoModIncidentService } from './autoModIncidentService.js';
import { securityEventBus } from './securityEventBus.js';
import { raidModeService } from '../../antiRaid/services/raidModeService.js';
import { logger } from '../../../utils/logger.js';

class AutoModService {
  // ==========================================
  // 1. ANALYSE PRINCIPALE DE MESSAGE
  // ==========================================
  public async processMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot || !message.member) return false;

    const guildId = message.guild.id;
    const config = autoModRepository.getConfig(guildId);
    if (!config.enabled) return false;

    // 1.1 Immunité Administrateur
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return false;
    }

    // 1.2 Exemptions globales de rôles et salons
    if (config.exemptChannelIds.includes(message.channel.id)) return false;
    if (config.exemptRoleIds.some((r) => message.member!.roles.cache.has(r))) return false;

    // 1.3 Enregistrement dans le cache glissant
    const content = message.content || '';
    autoModCache.recordMessage(guildId, message.author.id, message.channel.id, content);
    GhostPingDetector.onMessageCreate(message, config);

    // Vérifier si le mode Raid est actif sur ce serveur
    const isRaidMode = raidModeService.isRaidModeActive(guildId);

    // 1.4 Exécution du pipeline de détection
    const detectionResults: DetectionResult[] = [
      SpamDetector.check(message, config, isRaidMode),
      FloodDetector.check(message, config),
      LinkDetector.check(message, config),
      InviteDetector.check(message, config),
      MentionDetector.check(message, config),
      CapsDetector.check(message, config),
      KeywordDetector.check(message, config),
      RegexDetector.check(message, config),
    ];

    const triggeredDetectors = detectionResults.filter((r) => r.triggered);

    // 1.5 Calcul du Risk Score partiel
    const { totalScore: detectorRisk, riskLevel: detectorLevel } =
      AutoModRiskEngine.calculateTotalRisk(detectionResults);

    // 1.6 Évaluation des règles personnalisées
    const activeStrikes = StrikeService.getActiveStrikes(guildId, message.author.id).length;
    const customRules = autoModRepository.getRules(guildId);
    const matchedCustomRules = RuleEngine.evaluateRules(
      {
        message,
        currentRiskScore: detectorRisk,
        userStrikesCount: activeStrikes,
        raidModeActive: isRaidMode,
      },
      customRules
    );

    // S'il n'y a aucune détection et aucune règle déclenchée, autoriser le message
    if (triggeredDetectors.length === 0 && matchedCustomRules.length === 0) {
      return false;
    }

    // 1.7 Agrégation des actions et du risque
    const actionsToExecute = new Set<AutoModAction>();
    const reasons: string[] = [];
    let extraRisk = 0;
    let addStrikesCount = 0;

    for (const d of triggeredDetectors) {
      d.actions.forEach((a) => actionsToExecute.add(a));
      reasons.push(d.reason);
    }

    for (const m of matchedCustomRules) {
      m.rule.actions.forEach((a) => actionsToExecute.add(a));
      reasons.push(m.reason);
      extraRisk += 20;
      addStrikesCount += m.rule.addStrikesCount || 1;
    }

    const finalRiskScore = Math.min(100, detectorRisk + extraRisk);
    const finalRiskLevel = AutoModRiskEngine.getRiskLevel(finalRiskScore);
    const primaryReason = reasons.join(' • ') || 'Infraction aux règles AutoMod';

    // 1.8 Communication avec Anti-Raid via Security Event Bus
    securityEventBus.emitAutoModViolation({
      guildId,
      userId: message.author.id,
      userTag: message.author.tag,
      channelId: message.channel.id,
      riskScore: finalRiskScore,
      triggerReason: primaryReason,
      detectors: triggeredDetectors.map((d) => d.detectorName),
    });

    // 1.9 Exécution des actions
    const { executed, newStrikesCount } = await ActionEngine.executeActions({
      message,
      member: message.member,
      actions: Array.from(actionsToExecute),
      reason: primaryReason,
      config,
      addStrikesCount,
    });

    // 1.10 Enregistrement de l'incident
    AutoModIncidentService.addIncident({
      guildId,
      userId: message.author.id,
      userTag: message.author.tag,
      channelId: message.channel.id,
      channelName: 'name' in message.channel ? (message.channel as TextChannel).name : 'DM',
      messageContent: content,
      triggeredDetectors: triggeredDetectors.map((d) => d.detectorName),
      matchedRules: matchedCustomRules.map((m) => m.rule.name),
      totalRiskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      actionsTaken: executed,
      strikesAdded: executed.includes('STRIKE') ? addStrikesCount || 1 : 0,
      currentStrikesTotal: newStrikesCount,
    });

    // 1.11 Alerte Staff
    await AutoModAlertService.sendAlert({
      guild: message.guild,
      userId: message.author.id,
      userTag: message.author.tag,
      channelId: message.channel.id,
      channelName: 'name' in message.channel ? (message.channel as TextChannel).name : 'salon',
      content,
      ruleOrDetector: triggeredDetectors[0]?.detectorName || matchedCustomRules[0]?.rule.name || 'AutoMod',
      riskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      actionsTaken: executed,
      strikesCount: newStrikesCount,
      config,
    });

    return true;
  }

  // ==========================================
  // 2. ÉVÉNEMENT : GHOST PING SUR SUPPRESSION
  // ==========================================
  public async handleMessageDelete(message: Message | PartialMessage): Promise<void> {
    if (!message.guild) return;
    const config = autoModRepository.getConfig(message.guild.id);
    if (!config.enabled || !config.ghostPing.enabled) return;

    const { triggered, result, record } = GhostPingDetector.onMessageDelete(message.id, config);
    if (triggered && result && record) {
      await AutoModAlertService.sendAlert({
        guild: message.guild,
        userId: record.authorId,
        userTag: record.authorTag,
        channelId: record.channelId,
        channelName: 'salon',
        content: record.content,
        ruleOrDetector: 'GhostPingDetector',
        riskScore: result.riskPoints,
        riskLevel: 'MEDIUM',
        actionsTaken: result.actions,
        strikesCount: StrikeService.getActiveStrikes(message.guild.id, record.authorId).length,
        config,
      });
    }
  }

  // ==========================================
  // 3. SCAN PROFIL (PSEUDO / NICKNAME)
  // ==========================================
  public async handleMemberProfile(member: GuildMember): Promise<void> {
    const config = autoModRepository.getConfig(member.guild.id);
    if (!config.enabled || !config.profiles.enabled) return;

    const result = ProfileDetector.check(member, config);
    if (result.triggered) {
      try {
        if (member.manageable) {
          await member.setNickname('Pseudo Modéré', '[AutoMod] Pseudo inapproprié');
        }
        await AutoModAlertService.sendAlert({
          guild: member.guild,
          userId: member.id,
          userTag: member.user.tag,
          channelId: member.guild.systemChannelId || '',
          channelName: 'profil',
          content: `Pseudo détecté : ${member.user.tag}`,
          ruleOrDetector: 'ProfileDetector',
          riskScore: result.riskPoints,
          riskLevel: 'LOW',
          actionsTaken: result.actions,
          strikesCount: 0,
          config,
        });
      } catch (err) {
        logger.error('[AutoModService] Erreur réinitialisation pseudo :', err);
      }
    }
  }
}

export const autoModService = new AutoModService();
