import { Client } from 'discord.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { ModerationReport, ReportStatus } from '../types/report.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ReportService {
  public static getReports(
    guildId: string,
    filters?: {
      status?: string;
      reportedUserId?: string;
      reporterUserId?: string;
      assignedId?: string;
    }
  ): ModerationReport[] {
    return moderationRepository.getReports(guildId, filters);
  }

  public static getReportById(guildId: string, reportId: string): ModerationReport | undefined {
    return moderationRepository.getReportById(guildId, reportId);
  }

  public static createReport(params: {
    guildId: string;
    reportedUserId: string;
    reportedUserTag: string;
    reporterUserId: string;
    reporterUserTag: string;
    reason: string;
    category?: string;
    channelId?: string;
    messageId?: string;
    messageContent?: string;
  }): ModerationReport {
    const reportCount = moderationRepository.getReports(params.guildId).length;
    const reportId = `REP-${reportCount + 1}`;
    const now = new Date().toISOString();

    const report: ModerationReport = {
      id: reportId,
      guildId: params.guildId,
      reportedUserId: params.reportedUserId,
      reportedUserTag: params.reportedUserTag,
      reporterUserId: params.reporterUserId,
      reporterUserTag: params.reporterUserTag,
      reason: params.reason,
      category: params.category || 'Other',
      channelId: params.channelId,
      messageId: params.messageId,
      messageContent: params.messageContent,
      status: 'NEW',
      createdAt: now,
      updatedAt: now,
    };

    const created = moderationRepository.addReport(report);

    // Audit log & LogService
    moderationRepository.addAuditLog({
      id: `AUDIT-${Date.now()}`,
      guildId: params.guildId,
      actorId: params.reporterUserId,
      actorTag: params.reporterUserTag,
      action: 'REPORT_CREATE',
      targetType: 'USER',
      targetId: params.reportedUserId,
      details: `Nouveau signalement (${reportId}) contre ${params.reportedUserTag} : ${params.reason}`,
      timestamp: now,
    });

    logService.moderation(params.guildId, 'REPORT_CREATE', {
      actor: { id: params.reporterUserId, tag: params.reporterUserTag },
      target: { id: params.reportedUserId, type: 'USER', name: params.reportedUserTag, tag: params.reportedUserTag },
      reason: params.reason,
      metadata: { reportId, category: params.category },
    });

    return created;
  }

  public static updateReportStatus(
    guildId: string,
    reportId: string,
    status: ReportStatus,
    moderator: { id: string; tag: string },
    resolutionNotes?: string,
    caseNumber?: number
  ): ModerationReport | null {
    const updated = moderationRepository.updateReport(guildId, reportId, {
      status,
      assignedModerator: moderator,
      resolutionNotes,
      ...(caseNumber ? { caseNumber } : {}),
    });

    if (updated) {
      moderationRepository.addAuditLog({
        id: `AUDIT-${Date.now()}`,
        guildId,
        actorId: moderator.id,
        actorTag: moderator.tag,
        action: 'REPORT_UPDATE',
        targetType: 'USER',
        targetId: updated.reportedUserId,
        details: `Statut du signalement ${reportId} changé en ${status} par ${moderator.tag}${
          resolutionNotes ? ` (${resolutionNotes})` : ''
        }`,
        timestamp: new Date().toISOString(),
      });
    }

    return updated;
  }

  public static assignReport(
    guildId: string,
    reportId: string,
    moderator: { id: string; tag: string }
  ): ModerationReport | null {
    const updated = moderationRepository.updateReport(guildId, reportId, {
      assignedModerator: moderator,
      status: 'REVIEWING',
    });

    return updated;
  }

  public static getPendingCount(guildId: string): number {
    return moderationRepository.getPendingReportsCount(guildId);
  }
}
