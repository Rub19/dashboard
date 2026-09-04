import { Client } from 'discord.js';
import {
  CaseAction,
  CaseSource,
  CaseStatus,
  ModerationCase,
  StandardReason,
  UserModerationProfile,
} from '../types/case.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { ModerationLogger } from './moderationLogger.js';
import { StaffAbuseDetector } from './staffAbuseDetector.js';
import { logService } from '../../logs/services/logService.js';

export class CaseService {
  public static createCase(
    discordClient: Client,
    params: {
      guildId: string;
      userId: string;
      userTag: string;
      moderatorId: string;
      moderatorTag: string;
      action: CaseAction;
      reason: string;
      standardCategory?: StandardReason;
      durationSeconds?: number | null;
      source?: CaseSource;
      metadata?: ModerationCase['metadata'];
    }
  ): ModerationCase {
    const expiresAt =
      params.durationSeconds && params.durationSeconds > 0
        ? new Date(Date.now() + params.durationSeconds * 1000).toISOString()
        : null;

    const modCase = moderationRepository.createCase({
      guildId: params.guildId,
      userId: params.userId,
      userTag: params.userTag,
      moderatorId: params.moderatorId,
      moderatorTag: params.moderatorTag,
      action: params.action,
      reason: params.reason || 'Aucun motif spécifié',
      standardCategory: params.standardCategory || 'Other',
      durationSeconds: params.durationSeconds ?? null,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'ACTIVE',
      source: params.source || 'MANUAL',
      appealStatus: 'NONE',
      metadata: params.metadata || {},
    });

    // 1. Journalisation dans les logs de modération
    ModerationLogger.logCase(discordClient, modCase);

    // 2. Détection d'abus potentiel si action manuelle
    StaffAbuseDetector.trackAction(
      discordClient,
      params.guildId,
      params.moderatorId,
      params.moderatorTag,
      params.action
    );

    // 3. Audit log
    moderationRepository.addAuditLog({
      id: `AUDIT-${Date.now()}`,
      guildId: params.guildId,
      actorId: params.moderatorId,
      actorTag: params.moderatorTag,
      action: `CASE_CREATE_${params.action}`,
      targetType: 'CASE',
      targetId: modCase.id,
      details: `Création de la Case #${modCase.caseNumber} (${params.action}) sur ${params.userTag} (${params.userId})`,
      timestamp: new Date().toISOString(),
    });

    logService.moderation(params.guildId, `CASE_CREATE_${params.action}`, {
      actor: { id: params.moderatorId, tag: params.moderatorTag },
      target: { id: params.userId, type: 'USER', name: params.userTag, tag: params.userTag },
      reason: params.reason,
      caseId: modCase.caseNumber,
      metadata: {
        caseNumber: modCase.caseNumber,
        action: params.action,
        durationSeconds: params.durationSeconds,
        source: params.source,
      },
    });

    return modCase;
  }

  public static getCaseByNumber(guildId: string, caseNumber: number): ModerationCase | null {
    return moderationRepository.getCaseByNumber(guildId, caseNumber);
  }

  public static getCases(
    guildId: string,
    filters?: {
      action?: CaseAction;
      status?: CaseStatus;
      source?: CaseSource;
      userId?: string;
      moderatorId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): { cases: ModerationCase[]; total: number } {
    return moderationRepository.getCases(guildId, filters);
  }

  public static revertCase(
    discordClient: Client,
    guildId: string,
    caseNumber: number,
    revertedBy: { id: string; tag: string },
    revertReason: string
  ): { success: boolean; case?: ModerationCase; error?: string } {
    const existing = moderationRepository.getCaseByNumber(guildId, caseNumber);
    if (!existing) {
      return { success: false, error: `Case #${caseNumber} introuvable.` };
    }

    if (existing.status === 'REVOKED') {
      return { success: false, error: `La Case #${caseNumber} a déjà été révoquée.` };
    }

    const updated = moderationRepository.updateCase(guildId, caseNumber, {
      status: 'REVOKED',
      metadata: {
        ...existing.metadata,
        revertedAt: new Date().toISOString(),
        revertedBy: `${revertedBy.tag} (${revertedBy.id})`,
        revertReason,
      },
    });

    if (!updated) {
      return { success: false, error: 'Échec de la mise à jour.' };
    }

    // Lever la sanction sur Discord si c'est un timeout ou un ban
    try {
      const guild = discordClient.guilds.cache.get(guildId);
      if (guild) {
        if (updated.action === 'TIMEOUT') {
          guild.members.fetch(updated.userId).then((m) => m?.timeout(null, `Révocation Case #${caseNumber}`)).catch(() => {});
        } else if (updated.action === 'BAN') {
          guild.bans.remove(updated.userId, `Révocation Case #${caseNumber}`).catch(() => {});
        }
      }
    } catch {}

    // Journalisation
    ModerationLogger.logRevert(discordClient, updated, revertedBy.tag, revertReason);

    moderationRepository.addAuditLog({
      id: `AUDIT-${Date.now()}`,
      guildId,
      actorId: revertedBy.id,
      actorTag: revertedBy.tag,
      action: 'CASE_REVOKE',
      targetType: 'CASE',
      targetId: updated.id,
      details: `Révocation de la Case #${caseNumber} (${updated.action}) : ${revertReason}`,
      timestamp: new Date().toISOString(),
    });

    logService.moderation(guildId, 'CASE_REVOKE', {
      actor: { id: revertedBy.id, tag: revertedBy.tag },
      target: { id: updated.userId, type: 'USER', name: updated.userTag, tag: updated.userTag },
      reason: revertReason,
      caseId: updated.caseNumber,
      metadata: {
        caseNumber: updated.caseNumber,
        originalAction: updated.action,
        revertReason,
      },
    });

    return { success: true, case: updated };
  }

  public static async getUserProfile(
    discordClient: Client,
    guildId: string,
    userId: string
  ): Promise<UserModerationProfile> {
    const allCases = moderationRepository.getUserCases(guildId, userId);
    const notes = moderationRepository.getUserNotes(guildId, userId);

    const guild = discordClient.guilds.cache.get(guildId);
    let member = guild ? guild.members.cache.get(userId) : null;
    if (!member && guild) {
      member = await guild.members.fetch(userId).catch(() => null);
    }

    let user = member ? member.user : null;
    if (!user) {
      user = await discordClient.users.fetch(userId).catch(() => null);
    }

    const warnings = allCases.filter((c) => c.action === 'WARN').length;
    const timeouts = allCases.filter((c) => c.action === 'TIMEOUT').length;
    const kicks = allCases.filter((c) => c.action === 'KICK').length;
    const bans = allCases.filter((c) => c.action === 'BAN' || c.action === 'SOFTBAN').length;
    const quarantines = allCases.filter((c) => c.action === 'QUARANTINE').length;

    const activeSanctions = allCases.filter((c) => c.status === 'ACTIVE');

    // Calcul du score de risque de modération (0-100)
    let calculatedRisk = 0;
    calculatedRisk += warnings * 10;
    calculatedRisk += timeouts * 20;
    calculatedRisk += kicks * 30;
    calculatedRisk += bans * 50;
    calculatedRisk += quarantines * 25;
    calculatedRisk = Math.min(100, calculatedRisk);

    let trustLevel: 'TRUSTED' | 'NORMAL' | 'SUSPICIOUS' | 'DANGEROUS' = 'NORMAL';
    if (calculatedRisk >= 75) trustLevel = 'DANGEROUS';
    else if (calculatedRisk >= 40) trustLevel = 'SUSPICIOUS';
    else if (calculatedRisk === 0 && member && Date.now() - member.joinedTimestamp! > 30 * 86400000) {
      trustLevel = 'TRUSTED';
    }

    const roles = member
      ? member.roles.cache
          .filter((r) => r.name !== '@everyone')
          .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
      : [];

    return {
      userId,
      userTag: user?.tag || userId,
      username: user?.username || 'Inconnu',
      globalName: user?.globalName,
      avatarUrl: user?.displayAvatarURL({ size: 128 }) || null,
      accountCreatedAt: user?.createdAt ? user.createdAt.toISOString() : null,
      joinedServerAt: member?.joinedAt ? member.joinedAt.toISOString() : null,
      roles,
      stats: {
        warnings,
        timeouts,
        kicks,
        bans,
        quarantines,
        totalCases: allCases.length,
        activeSanctionsCount: activeSanctions.length,
      },
      calculatedRiskScore: calculatedRisk,
      trustLevel,
      activeSanctions,
      timeline: allCases,
      notes,
    };
  }
}
