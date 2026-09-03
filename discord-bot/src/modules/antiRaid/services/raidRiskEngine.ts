import { ThreatLevel } from '../types/antiRaid.js';
import { raidCache } from './raidCache.js';
import { raidConfigService } from './raidConfigService.js';

export interface RiskAnalysisResult {
  score: number; // 0 to 100
  threatLevel: ThreatLevel;
  breakdown: {
    joinRisk: number;
    messageRisk: number;
    nukeRisk: number;
    modRisk: number;
    botRisk: number;
    leaveRisk: number;
  };
  activeSignals: string[];
}

class RaidRiskEngine {
  public calculateRisk(guildId: string): RiskAnalysisResult {
    const config = raidConfigService.getConfig(guildId);
    const signals: string[] = [];

    // --- 1. JOIN COMPONENT (0 - 35 points) ---
    let joinRisk = 0;
    const joins10s = raidCache.getJoinsInWindow(guildId, 10);
    const joins30s = raidCache.getJoinsInWindow(guildId, 30);
    const joins60s = raidCache.getJoinsInWindow(guildId, 60);

    const baselineJoinsPerMin = config.adaptiveDetection
      ? raidCache.getAverageJoinsPerMinute(guildId)
      : 2;

    const joinThreshold = config.joinRaid.threshold;

    if (joins10s >= joinThreshold) {
      joinRisk += 25;
      signals.push(`Burst de joins intense (${joins10s} arrivées en 10s)`);
    } else if (joins30s >= joinThreshold) {
      joinRisk += 18;
      signals.push(`Vitesse de join élevée (${joins30s} en 30s)`);
    } else if (joins60s > baselineJoinsPerMin * 5 && joins60s >= 5) {
      joinRisk += 12;
      signals.push(`Anomalie de joins vs trafic normal (${joins60s}/min vs ~${baselineJoinsPerMin.toFixed(1)}/min)`);
    }

    // Inspecter les membres récents des 30 dernières secondes
    const recentMembers = raidCache.getRecentJoinMembers(guildId, 30);
    if (recentMembers.length > 0) {
      const recentAccountCount = recentMembers.filter((m) => m.accountAgeDays < 1).length;
      const defaultAvatarCount = recentMembers.filter((m) => m.hasDefaultAvatar).length;

      if (recentAccountCount >= 3) {
        joinRisk += 8;
        signals.push(`${recentAccountCount} nouveaux comptes créés il y a <24h`);
      }
      if (defaultAvatarCount >= 4 && defaultAvatarCount / recentMembers.length > 0.6) {
        joinRisk += 7;
        signals.push(`Forte proportion de comptes sans avatar (${defaultAvatarCount}/${recentMembers.length})`);
      }
    }
    joinRisk = Math.min(35, joinRisk);

    // --- 2. MESSAGE & MENTION SPAM COMPONENT (0 - 25 points) ---
    let messageRisk = 0;
    const messages10s = raidCache.getMessagesInWindow(guildId, 10);
    const mentions10s = raidCache.getMentionsInWindow(guildId, 10);

    if (messages10s > 25) {
      messageRisk += 12;
      signals.push(`Spam de messages massif (${messages10s} msgs en 10s)`);
    } else if (messages10s > 15) {
      messageRisk += 6;
      signals.push(`Fréquence de messages élevée (${messages10s} msgs en 10s)`);
    }

    if (mentions10s >= 10) {
      messageRisk += 15;
      signals.push(`Rafale de mentions suspecte (${mentions10s} mentions en 10s)`);
    } else if (mentions10s >= 5) {
      messageRisk += 8;
      signals.push(`Nombre élevé de mentions (${mentions10s} mentions en 10s)`);
    }
    messageRisk = Math.min(25, messageRisk);

    // --- 3. SERVER NUKE COMPONENT (0 - 30 points) ---
    let nukeRisk = 0;
    const channelDeletes = raidCache.getAuditActionsCount(guildId, 'CHANNEL_DELETE', 15);
    const channelCreates = raidCache.getAuditActionsCount(guildId, 'CHANNEL_CREATE', 15);
    const roleDeletes = raidCache.getAuditActionsCount(guildId, 'ROLE_DELETE', 15);
    const roleCreates = raidCache.getAuditActionsCount(guildId, 'ROLE_CREATE', 15);
    const webhookCreates = raidCache.getAuditActionsCount(guildId, 'WEBHOOK_CREATE', 15);

    if (channelDeletes >= config.serverNuke.maxChannelDeletes) {
      nukeRisk += 18;
      signals.push(`Suppression massive de salons (${channelDeletes} en 15s)`);
    } else if (channelDeletes >= 1) {
      nukeRisk += 5;
    }

    if (roleDeletes >= config.serverNuke.maxRoleDeletes) {
      nukeRisk += 18;
      signals.push(`Suppression massive de rôles (${roleDeletes} en 15s)`);
    }

    if (channelCreates >= config.serverNuke.maxChannelCreates) {
      nukeRisk += 10;
      signals.push(`Création en masse de salons (${channelCreates} en 15s)`);
    }

    if (roleCreates >= config.serverNuke.maxRoleCreates) {
      nukeRisk += 10;
      signals.push(`Création en masse de rôles (${roleCreates} en 15s)`);
    }

    if (webhookCreates >= config.serverNuke.maxWebhookCreates) {
      nukeRisk += 8;
      signals.push(`Créations suspectes de webhooks (${webhookCreates} en 15s)`);
    }
    nukeRisk = Math.min(30, nukeRisk);

    // --- 4. MASS MODERATION COMPONENT (0 - 30 points) ---
    let modRisk = 0;
    const bans15s = raidCache.getAuditActionsCount(guildId, 'BAN', 15);
    const kicks15s = raidCache.getAuditActionsCount(guildId, 'KICK', 15);

    if (bans15s >= config.massMod.maxBans) {
      modRisk += 20;
      signals.push(`Bans massifs détectés (${bans15s} bans en 15s)`);
    } else if (bans15s >= 2) {
      modRisk += 8;
    }

    if (kicks15s >= config.massMod.maxKicks) {
      modRisk += 18;
      signals.push(`Expulsions massives détectées (${kicks15s} kicks en 15s)`);
    } else if (kicks15s >= 2) {
      modRisk += 7;
    }
    modRisk = Math.min(30, modRisk);

    // --- 5. BOT BURST COMPONENT (0 - 20 points) ---
    let botRisk = 0;
    const recentBots = recentMembers.filter((m) => m.isBot);
    if (recentBots.length >= config.botRaid.maxBotsInWindow) {
      botRisk += 15;
      signals.push(`Ajout de bots en rafale (${recentBots.length} bots en 30s)`);
    } else if (recentBots.length >= 1) {
      botRisk += 5;
    }
    botRisk = Math.min(20, botRisk);

    // --- 6. BURST LEAVES COMPONENT (0 - 15 points) ---
    let leaveRisk = 0;
    const leaves30s = raidCache.getLeavesInWindow(guildId, 30);
    if (leaves30s >= 10) {
      leaveRisk += 12;
      signals.push(`Vague anormale de départs de membres (${leaves30s} départs en 30s)`);
    } else if (leaves30s >= 5) {
      leaveRisk += 5;
    }
    leaveRisk = Math.min(15, leaveRisk);

    // Total composite score
    let totalScore = joinRisk + messageRisk + nukeRisk + modRisk + botRisk + leaveRisk;
    totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    const threatLevel = this.getThreatLevel(totalScore);

    return {
      score: totalScore,
      threatLevel,
      breakdown: {
        joinRisk,
        messageRisk,
        nukeRisk,
        modRisk,
        botRisk,
        leaveRisk,
      },
      activeSignals: signals,
    };
  }

  public getThreatLevel(score: number): ThreatLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'DANGEROUS';
    if (score >= 40) return 'ELEVATED';
    if (score >= 20) return 'SUSPICIOUS';
    return 'SAFE';
  }
}

export const raidRiskEngine = new RaidRiskEngine();
