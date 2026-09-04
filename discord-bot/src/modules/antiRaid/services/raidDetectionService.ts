import crypto from 'crypto';
import {
  Guild,
  GuildAuditLogsEntry,
  GuildChannel,
  GuildMember,
  Message,
  Role,
} from 'discord.js';
import {
  InvolvedMemberInfo,
  LiveRaidMetrics,
  RaidAction,
  ThreatLevel,
} from '../types/antiRaid.js';
import { raidCache } from './raidCache.js';
import { raidConfigService } from './raidConfigService.js';
import { raidRiskEngine } from './raidRiskEngine.js';
import { raidActionService } from './raidActionService.js';
import { raidModeService } from './raidModeService.js';
import { raidIncidentService } from './raidIncidentService.js';
import { raidAlertService } from './raidAlertService.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class RaidDetectionService {
  // ==========================================
  // 1. ÉVÉNEMENT : GUILD MEMBER JOIN
  // ==========================================
  public async handleMemberJoin(member: GuildMember): Promise<void> {
    const guild = member.guild;
    const config = raidConfigService.getConfig(guild.id);

    if (!config.enabled) return;

    // Calcul métadonnées du membre
    const now = Date.now();
    const createdMs = member.user.createdAt.getTime();
    const ageDays = (now - createdMs) / (1000 * 60 * 60 * 24);
    const ageHours = (now - createdMs) / (1000 * 60 * 60);
    const hasDefaultAvatar = !member.user.avatar;
    const isBot = member.user.bot;

    const memberInfo: InvolvedMemberInfo = {
      userId: member.id,
      userTag: member.user.tag,
      joinedAt: new Date(now).toISOString(),
      accountCreatedAt: member.user.createdAt.toISOString(),
      accountAgeDays: Math.round(ageDays * 10) / 10,
      hasDefaultAvatar,
      isBot,
      actionTaken: 'MONITOR',
      riskContributions: [],
    };

    // 1.1 Whitelist check
    if (raidConfigService.isUserWhitelisted(guild.id, member.id)) {
      return;
    }

    // 1.2 Bot Raid Protection
    if (isBot && config.botRaid.enabled) {
      const isTrustedBot = raidConfigService.isBotWhitelisted(guild.id, member.id);
      if (!isTrustedBot && config.botRaid.blockUnwhitelistedBots) {
        memberInfo.actionTaken = 'KICKED_UNTRUSTED_BOT';
        memberInfo.riskContributions.push('Bot non whitelisté');

        try {
          await member.kick('Bot non whitelisté (Protection Bot Raid 2.0)');
          await raidAlertService.sendAlert({
            guild,
            threatLevel: 'SUSPICIOUS',
            riskScore: 35,
            title: '🤖 Bot Non Autorisé Bloqué',
            reason: `Le bot **${member.user.tag}** a tenté de rejoindre mais n'est pas autorisé.`,
            actionsTaken: ['KICK', 'ALERT_STAFF'],
            signals: ['Tentative d’ajout de bot non whitelisté'],
          });
          return;
        } catch (err) {
          logger.error(`[AntiRaid] Échec kick bot ${member.user.tag}:`, err);
        }
      }
    }

    // 1.3 Account Age Protection (Tiers)
    if (!isBot && config.accountAge.enabled && config.accountAge.tiers.length > 0) {
      for (const tier of config.accountAge.tiers) {
        if (ageHours < tier.ageThresholdHours) {
          memberInfo.riskContributions.push(`Compte créé il y a moins de ${tier.ageThresholdHours}h`);
          for (const action of tier.actions) {
            await raidActionService.executeMemberAction(
              member,
              action,
              `Compte trop récent (<${tier.ageThresholdHours}h)`
            );
          }
          memberInfo.actionTaken = tier.actions.join('+');
          break;
        }
      }
    }

    // 1.4 Enregistrer l'arrivée dans la fenêtre glissante
    raidCache.recordJoin(guild.id, memberInfo);

    // Si Raid Mode actif : auto-quarantine configurée
    if (raidModeService.isRaidModeActive(guild.id)) {
      raidModeService.markSuspiciousActivity(guild.id);
      if (config.raidMode.autoQuarantineJoins) {
        await raidActionService.executeMemberAction(
          member,
          'QUARANTINE',
          'Raid Mode Actif (Mise en quarantaine automatique)'
        );
        memberInfo.actionTaken = 'QUARANTINE_RAID_MODE';
      }
    }

    // 1.5 Analyse du risque dynamique
    const risk = raidRiskEngine.calculateRisk(guild.id);

    // Déclenchement Join Raid si seuil dépassé ou score critique
    const joinsInWindow = raidCache.getJoinsInWindow(guild.id, config.joinRaid.timeWindowSeconds);
    const isJoinRaidTriggered =
      config.joinRaid.enabled && joinsInWindow >= config.joinRaid.threshold;

    if (isJoinRaidTriggered || risk.score >= 60) {
      raidModeService.markSuspiciousActivity(guild.id);

      const executedActions: RaidAction[] = [];

      // Déclencher les actions configurées pour le Join Raid
      for (const action of config.joinRaid.actions) {
        if (action === 'ENABLE_RAID_MODE') {
          await raidModeService.activateRaidMode(
            guild,
            `Join Raid détecté (${joinsInWindow} arrivées en ${config.joinRaid.timeWindowSeconds}s)`
          );
          executedActions.push(action);
        } else if (action === 'LOCKDOWN') {
          await raidActionService.executeLockdown(
            guild,
            `Join Raid détecté (${joinsInWindow} membres en ${config.joinRaid.timeWindowSeconds}s)`
          );
          executedActions.push(action);
        } else if (action === 'QUARANTINE' || action === 'KICK' || action === 'BAN' || action === 'TIMEOUT') {
          await raidActionService.executeMemberAction(
            member,
            action,
            `Raid massif détecté (Score: ${risk.score}/100)`
          );
          executedActions.push(action);
        }
      }

      // Créer un incident
      const recentMembers = raidCache.getRecentJoinMembers(guild.id, 60);
      const incident = raidIncidentService.createIncident({
        guildId: guild.id,
        type: 'JOIN_RAID',
        threatLevel: risk.threatLevel,
        riskScore: risk.score,
        triggerReason: `${joinsInWindow} arrivées en ${config.joinRaid.timeWindowSeconds}s`,
        actionsExecuted: executedActions,
        triggerSignals: risk.activeSignals,
        involvedMembers: recentMembers,
      });

      logService.raid(guild.id, 'JOIN_RAID', {
        actor: { id: 'ANTI_RAID', tag: 'Anti-Raid Engine', isBot: true },
        target: { id: guild.id, type: 'SERVER', name: guild.name },
        reason: `${joinsInWindow} arrivées en ${config.joinRaid.timeWindowSeconds}s (Score: ${risk.score}/100)`,
        incidentId: incident.id,
        metadata: {
          threatLevel: risk.threatLevel,
          riskScore: risk.score,
          executedActions,
          signals: risk.activeSignals,
          isCritical: true,
        },
      });

      // Envoyer l'alerte
      await raidAlertService.sendAlert({
        guild,
        threatLevel: risk.threatLevel,
        riskScore: risk.score,
        title: '🚨 JOIN RAID DÉTECTÉ',
        reason: `${joinsInWindow} membres ont rejoint en ${config.joinRaid.timeWindowSeconds} secondes.`,
        actionsTaken: executedActions,
        signals: risk.activeSignals,
        incidentId: incident.id,
      });
    }
  }

  // ==========================================
  // 2. ÉVÉNEMENT : GUILD MEMBER REMOVE (LEAVE)
  // ==========================================
  public handleMemberRemove(member: GuildMember): void {
    const guild = member.guild;
    const config = raidConfigService.getConfig(guild.id);
    if (!config.enabled) return;

    raidCache.recordLeave(guild.id);

    const leaves30s = raidCache.getLeavesInWindow(guild.id, 30);
    if (leaves30s >= 10) {
      raidModeService.markSuspiciousActivity(guild.id);
    }
  }

  // ==========================================
  // 3. ÉVÉNEMENT : MESSAGE CREATE (SPAM / MENTION RAID)
  // ==========================================
  public async handleMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const guild = message.guild;
    const config = raidConfigService.getConfig(guild.id);
    if (!config.enabled) return;

    // Vérifier whitelist utilisateur, rôles et canal
    if (raidConfigService.isUserWhitelisted(guild.id, message.author.id)) return;
    if (raidConfigService.isChannelExempt(guild.id, message.channel.id)) return;
    if (
      message.member &&
      raidConfigService.isRoleWhitelisted(
        guild.id,
        message.member.roles.cache.map((r) => r.id)
      )
    ) {
      return;
    }

    const userId = message.author.id;
    const content = message.content.trim().toLowerCase();
    const contentHash = crypto.createHash('md5').update(content).digest('hex');

    // Mentions check
    const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
    const hasEveryoneOrHere = message.mentions.everyone;

    // Enregistrer dans le cache
    raidCache.recordMessage(
      guild.id,
      userId,
      contentHash,
      mentionsCount,
      hasEveryoneOrHere
    );

    // 3.1 Mention Raid Check
    if (config.mentionRaid.enabled) {
      const userMentionsWindow = raidCache.getUserMentionsInWindow(
        guild.id,
        userId,
        config.mentionRaid.timeWindowSeconds
      );

      const isEveryoneBlocked = config.mentionRaid.blockEveryoneHere && hasEveryoneOrHere;
      const isPerMsgExceeded = mentionsCount >= config.mentionRaid.maxMentionsPerMessage;
      const isWindowExceeded = userMentionsWindow >= config.mentionRaid.maxMentionsPerUserInWindow;

      if (isEveryoneBlocked || isPerMsgExceeded || isWindowExceeded) {
        raidModeService.markSuspiciousActivity(guild.id);

        try {
          if (message.deletable) await message.delete();
          if (message.member && message.member.moderatable) {
            await message.member.timeout(10 * 60 * 1000, 'Mention Raid / Mass Ping');
          }

          await raidAlertService.sendAlert({
            guild,
            threatLevel: 'DANGEROUS',
            riskScore: 65,
            title: '🔔 Mention Raid Détecté',
            reason: `**${message.author.tag}** a tenté un mass ping (${mentionsCount} mentions, everyone: ${hasEveryoneOrHere}).`,
            actionsTaken: ['DELETE', 'TIMEOUT', 'ALERT_STAFF'],
            signals: [`Burst mentions: ${userMentionsWindow} en ${config.mentionRaid.timeWindowSeconds}s`],
          });
          return;
        } catch (err) {
          logger.error('[AntiRaid] Échec sanction mention raid:', err);
        }
      }
    }

    // 3.2 Message Spam Raid Check
    if (config.messageRaid.enabled) {
      const userMsgsInWindow = raidCache.getUserMessageCountInWindow(
        guild.id,
        userId,
        config.messageRaid.timeWindowSeconds
      );
      const duplicates = raidCache.getUserDuplicateMessageCount(
        guild.id,
        userId,
        contentHash,
        15
      );

      const isRateExceeded = userMsgsInWindow >= config.messageRaid.maxMessagesPerUser;
      const isDuplicateExceeded = duplicates >= config.messageRaid.duplicateMessageThreshold;

      if (isRateExceeded || isDuplicateExceeded) {
        raidModeService.markSuspiciousActivity(guild.id);

        try {
          if (message.deletable) await message.delete();
          if (message.member && message.member.moderatable) {
            await message.member.timeout(
              config.messageRaid.timeoutDurationSeconds * 1000,
              'Message Raid / Spam intense'
            );
          }

          await raidAlertService.sendAlert({
            guild,
            threatLevel: 'ELEVATED',
            riskScore: 50,
            title: '💬 Message Spam Raid Détecté',
            reason: `**${message.author.tag}** envoie des messages trop rapidement (${userMsgsInWindow} msgs / ${config.messageRaid.timeWindowSeconds}s ou ${duplicates} répétitions).`,
            actionsTaken: ['DELETE', 'TIMEOUT', 'ALERT_STAFF'],
            signals: ['Spam intensif de messages répétés'],
          });
        } catch (err) {
          logger.error('[AntiRaid] Échec sanction message raid:', err);
        }
      }
    }
  }

  // ==========================================
  // 4. ÉVÉNEMENTS CHANNELS & ROLES (SERVER NUKE)
  // ==========================================
  public async handleChannelEvent(
    type: 'CHANNEL_CREATE' | 'CHANNEL_DELETE',
    channel: GuildChannel
  ): Promise<void> {
    const guild = channel.guild;
    const config = raidConfigService.getConfig(guild.id);
    if (!config.enabled || !config.serverNuke.enabled) return;

    raidCache.recordAuditAction(guild.id, type, undefined, channel.id);
    raidModeService.markSuspiciousActivity(guild.id);

    const deletes = raidCache.getAuditActionsCount(guild.id, 'CHANNEL_DELETE', config.serverNuke.timeWindowSeconds);
    const creates = raidCache.getAuditActionsCount(guild.id, 'CHANNEL_CREATE', config.serverNuke.timeWindowSeconds);

    if (deletes >= config.serverNuke.maxChannelDeletes || creates >= config.serverNuke.maxChannelCreates) {
      await raidActionService.executeLockdown(
        guild,
        `Protection Anti-Nuke: Salons modifiés anormalement (${deletes} suppr, ${creates} créés)`
      );

      await raidAlertService.sendAlert({
        guild,
        threatLevel: 'CRITICAL',
        riskScore: 90,
        title: '💥 SERVER NUKE DÉTECTÉ (Salons)',
        reason: `Activité destructrice sur les salons (${deletes} suppressions en ${config.serverNuke.timeWindowSeconds}s).`,
        actionsTaken: ['LOCKDOWN', 'ALERT_STAFF'],
        signals: ['Salons modifiés ou détruits en rafale'],
      });
    }
  }

  public async handleRoleEvent(
    type: 'ROLE_CREATE' | 'ROLE_DELETE',
    role: Role
  ): Promise<void> {
    const guild = role.guild;
    const config = raidConfigService.getConfig(guild.id);
    if (!config.enabled || !config.serverNuke.enabled) return;

    raidCache.recordAuditAction(guild.id, type, undefined, role.id);
    raidModeService.markSuspiciousActivity(guild.id);

    const deletes = raidCache.getAuditActionsCount(guild.id, 'ROLE_DELETE', config.serverNuke.timeWindowSeconds);
    const creates = raidCache.getAuditActionsCount(guild.id, 'ROLE_CREATE', config.serverNuke.timeWindowSeconds);

    if (deletes >= config.serverNuke.maxRoleDeletes || creates >= config.serverNuke.maxRoleCreates) {
      await raidActionService.executeLockdown(
        guild,
        `Protection Anti-Nuke: Rôles modifiés anormalement (${deletes} suppr, ${creates} créés)`
      );

      await raidAlertService.sendAlert({
        guild,
        threatLevel: 'CRITICAL',
        riskScore: 92,
        title: '💥 SERVER NUKE DÉTECTÉ (Rôles)',
        reason: `Activité destructrice sur les rôles (${deletes} suppressions en ${config.serverNuke.timeWindowSeconds}s).`,
        actionsTaken: ['LOCKDOWN', 'ALERT_STAFF'],
        signals: ['Rôles détruits ou créés en rafale'],
      });
    }
  }

  // ==========================================
  // 5. AUDIT LOGS (MASS BANS, KICKS, WEBHOOKS)
  // ==========================================
  public async handleAuditLog(guild: Guild, entry: GuildAuditLogsEntry): Promise<void> {
    const config = raidConfigService.getConfig(guild.id);
    if (!config.enabled) return;

    const actionType = entry.action;
    // Bans: 22 (MemberBanAdd)
    // Kicks: 20 (MemberKick)
    // Webhook Create: 50 (WebhookCreate)
    if (actionType === 22) {
      raidCache.recordAuditAction(guild.id, 'BAN', entry.executorId || undefined, entry.targetId || undefined);
    } else if (actionType === 20) {
      raidCache.recordAuditAction(guild.id, 'KICK', entry.executorId || undefined, entry.targetId || undefined);
    } else if (actionType === 50) {
      raidCache.recordAuditAction(guild.id, 'WEBHOOK_CREATE', entry.executorId || undefined, entry.targetId || undefined);
    }

    const bans = raidCache.getAuditActionsCount(guild.id, 'BAN', config.massMod.timeWindowSeconds);
    const kicks = raidCache.getAuditActionsCount(guild.id, 'KICK', config.massMod.timeWindowSeconds);

    if (bans >= config.massMod.maxBans || kicks >= config.massMod.maxKicks) {
      raidModeService.markSuspiciousActivity(guild.id);

      await raidAlertService.sendAlert({
        guild,
        threatLevel: 'CRITICAL',
        riskScore: 95,
        title: '☢️ MASS BAN / MASS KICK DÉTECTÉ',
        reason: `Sanctions massives exécutées (${bans} bans, ${kicks} kicks en ${config.massMod.timeWindowSeconds}s).`,
        actionsTaken: ['ALERT_STAFF', 'LOCKDOWN'],
        signals: [`Exécuteur suspect : ${entry.executorId || 'Inconnu'}`],
      });
    }
  }

  // ==========================================
  // 6. LIVE METRICS COMPILATION
  // ==========================================
  public getLiveMetrics(guildId: string): LiveRaidMetrics {
    const risk = raidRiskEngine.calculateRisk(guildId);
    const state = raidModeService.getState(guildId);

    return {
      joinsPerMinute: raidCache.getJoinsInWindow(guildId, 60),
      messagesPerMinute: raidCache.getMessagesInWindow(guildId, 60),
      mentionsPerMinute: raidCache.getMentionsInWindow(guildId, 60),
      bansPerMinute: raidCache.getAuditActionsCount(guildId, 'BAN', 60),
      kicksPerMinute: raidCache.getAuditActionsCount(guildId, 'KICK', 60),
      botsAddedPerMinute: raidCache.getRecentJoinMembers(guildId, 60).filter((m) => m.isBot).length,
      channelsChangedPerMinute:
        raidCache.getAuditActionsCount(guildId, 'CHANNEL_CREATE', 60) +
        raidCache.getAuditActionsCount(guildId, 'CHANNEL_DELETE', 60),
      rolesChangedPerMinute:
        raidCache.getAuditActionsCount(guildId, 'ROLE_CREATE', 60) +
        raidCache.getAuditActionsCount(guildId, 'ROLE_DELETE', 60),
      webhooksChangedPerMinute: raidCache.getAuditActionsCount(guildId, 'WEBHOOK_CREATE', 60),
      leavesPerMinute: raidCache.getLeavesInWindow(guildId, 60),
      currentRiskScore: risk.score,
      threatLevel: risk.threatLevel,
      raidModeActive: raidModeService.isRaidModeActive(guildId),
      raidModeRemainingSeconds: raidModeService.getRemainingSeconds(guildId),
      lockdownActive: raidActionService.isLockdownActive(guildId),
      lockedChannelsCount: raidActionService.getLockedChannelsCount(guildId),
      quarantinedMembersCount: raidActionService.getQuarantinedCount(guildId),
      lastSuspiciousActivityTimestamp: state ? state.lastSuspiciousActivity : 0,
    };
  }
}

export const raidDetectionService = new RaidDetectionService();
