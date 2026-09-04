import { Client } from 'discord.js';
import { CaseService } from './caseService.js';
import { SanctionService, ExecuteSanctionParams } from './sanctionService.js';
import { EvidenceService } from './evidenceService.js';
import { StaffNotesService } from './staffNotesService.js';
import { ReportService } from './reportService.js';
import { ModerationScheduler } from './moderationScheduler.js';
import { ModerationAnalytics } from './moderationAnalytics.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { CaseAction, CaseSource, CaseStatus, ModerationCase, StandardReason } from '../types/case.js';
import { ReportStatus } from '../types/report.js';

export class ModerationService {
  private static discordClient: Client;

  public static initialize(client: Client): void {
    this.discordClient = client;
    ModerationScheduler.start(client);
  }

  public static async executeSanction(params: ExecuteSanctionParams) {
    return SanctionService.executeSanction(this.discordClient, params);
  }

  public static createCase(params: {
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
  }) {
    return CaseService.createCase(this.discordClient, params);
  }

  public static getCaseByNumber(guildId: string, caseNumber: number) {
    return CaseService.getCaseByNumber(guildId, caseNumber);
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
  ) {
    return CaseService.getCases(guildId, filters);
  }

  public static revertCase(guildId: string, caseNumber: number, revertedBy: { id: string; tag: string }, revertReason: string) {
    return CaseService.revertCase(this.discordClient, guildId, caseNumber, revertedBy, revertReason);
  }

  public static assignCase(
    guildId: string,
    caseNumber: number,
    assignedTo: { id: string; tag: string; team?: string } | undefined,
    actor: { id: string; tag: string }
  ) {
    return CaseService.assignCase(guildId, caseNumber, assignedTo, actor);
  }

  public static relateCase(
    guildId: string,
    caseNumber: number,
    relationships: ModerationCase['relationships'],
    actor: { id: string; tag: string }
  ) {
    return CaseService.relateCase(guildId, caseNumber, relationships, actor);
  }

  public static getUserProfile(guildId: string, userId: string) {
    return CaseService.getUserProfile(this.discordClient, guildId, userId);
  }

  public static getUserTimeline(guildId: string, userId: string) {
    return CaseService.getUserTimeline(guildId, userId);
  }

  public static async searchMembers(guildId: string, query: string) {
    const raw = query.trim();
    if (!raw) return [];

    const cleanQuery = raw.replace(/[<@!>#]/g, '').toLowerCase();
    const guild = this.discordClient.guilds.cache.get(guildId);

    // 1. Chercher par numéro de Case si #numéro ou pur entier
    if (/^\d+$/.test(cleanQuery)) {
      const caseNum = parseInt(cleanQuery, 10);
      const matchedCase = moderationRepository.getCaseByNumber(guildId, caseNum);
      if (matchedCase) {
        const profile = await CaseService.getUserProfile(this.discordClient, guildId, matchedCase.userId);
        return [
          {
            userId: profile.userId,
            username: profile.username,
            userTag: profile.userTag,
            avatarUrl: profile.avatarUrl,
            memberSince: profile.joinedServerAt,
            riskScore: profile.calculatedRiskScore,
            riskLevel: profile.trustLevel,
            casesCount: profile.stats.totalCases,
            warningsCount: profile.stats.warnings,
            timeoutsCount: profile.stats.timeouts,
            bansCount: profile.stats.bans,
            matchedBy: `Case #${caseNum}`,
          },
        ];
      }
    }

    const resultsMap = new Map<string, any>();

    // 2. Recherche parmi les membres Discord en cache / fetch
    if (guild) {
      const members = await guild.members
        .fetch({ query: cleanQuery, limit: 15 })
        .catch(() => guild.members.cache);

      for (const [, member] of members) {
        const u = member.user;
        const userCases = moderationRepository.getUserCases(guildId, u.id);
        const warnings = userCases.filter((c) => c.action === 'WARN').length;
        const timeouts = userCases.filter((c) => c.action === 'TIMEOUT').length;
        const bans = userCases.filter((c) => c.action === 'BAN' || c.action === 'SOFTBAN').length;
        const risk = Math.min(100, warnings * 10 + timeouts * 20 + bans * 50);

        resultsMap.set(u.id, {
          userId: u.id,
          username: u.username,
          displayName: member.displayName || u.globalName || u.username,
          userTag: u.tag || u.username,
          avatarUrl: u.displayAvatarURL({ size: 64 }),
          memberSince: member.joinedAt ? member.joinedAt.toISOString() : null,
          riskScore: risk,
          riskLevel: risk >= 75 ? 'DANGEROUS' : risk >= 40 ? 'SUSPICIOUS' : 'NORMAL',
          casesCount: userCases.length,
          warningsCount: warnings,
          timeoutsCount: timeouts,
          bansCount: bans,
        });
      }
    }

    // 3. Recherche dans l'historique des cases existantes (permet de retrouver des utilisateurs déjà sanctionnés même s'ils sont partis)
    const allGuildCases = moderationRepository.getCases(guildId, { search: cleanQuery, limit: 20 });
    for (const c of allGuildCases.cases) {
      if (!resultsMap.has(c.userId)) {
        const userCases = moderationRepository.getUserCases(guildId, c.userId);
        const warnings = userCases.filter((cs) => cs.action === 'WARN').length;
        const timeouts = userCases.filter((cs) => cs.action === 'TIMEOUT').length;
        const bans = userCases.filter((cs) => cs.action === 'BAN' || cs.action === 'SOFTBAN').length;
        const risk = Math.min(100, warnings * 10 + timeouts * 20 + bans * 50);

        resultsMap.set(c.userId, {
          userId: c.userId,
          username: c.userTag.split('#')[0] || c.userTag,
          displayName: c.userTag,
          userTag: c.userTag,
          avatarUrl: null,
          memberSince: null,
          riskScore: risk,
          riskLevel: risk >= 75 ? 'DANGEROUS' : risk >= 40 ? 'SUSPICIOUS' : 'NORMAL',
          casesCount: userCases.length,
          warningsCount: warnings,
          timeoutsCount: timeouts,
          bansCount: bans,
        });
      }
    }

    return Array.from(resultsMap.values()).slice(0, 10);
  }

  // Reports
  public static getReports(guildId: string, filters?: Parameters<typeof ReportService.getReports>[1]) {
    return ReportService.getReports(guildId, filters);
  }

  public static createReport(params: Parameters<typeof ReportService.createReport>[0]) {
    return ReportService.createReport(params);
  }

  public static updateReportStatus(
    guildId: string,
    reportId: string,
    status: ReportStatus,
    moderator: { id: string; tag: string },
    resolutionNotes?: string,
    caseNumber?: number
  ) {
    return ReportService.updateReportStatus(guildId, reportId, status, moderator, resolutionNotes, caseNumber);
  }

  public static assignReport(guildId: string, reportId: string, moderator: { id: string; tag: string }) {
    return ReportService.assignReport(guildId, reportId, moderator);
  }

  public static getOverviewStats(guildId: string) {
    const stats = ModerationAnalytics.getOverviewStats(guildId);
    const pendingReports = ReportService.getPendingCount(guildId);
    return { ...stats, pendingReports };
  }

  public static getPeriodTrends(guildId: string, days = 7) {
    return ModerationAnalytics.getPeriodTrends(guildId, days);
  }

  public static getStaffPerformance(guildId: string) {
    return ModerationAnalytics.getStaffPerformance(guildId);
  }

  public static getEvidence(caseId: string) {
    return EvidenceService.getEvidence(caseId);
  }

  public static addEvidence(params: Parameters<typeof EvidenceService.addEvidence>[0]) {
    return EvidenceService.addEvidence(params);
  }

  public static deleteEvidence(caseId: string, evidenceId: string) {
    return EvidenceService.deleteEvidence(caseId, evidenceId);
  }

  public static getUserNotes(guildId: string, userId: string) {
    return StaffNotesService.getUserNotes(guildId, userId);
  }

  public static getCaseNotes(guildId: string, caseId: string) {
    return StaffNotesService.getCaseNotes(guildId, caseId);
  }

  public static addNote(params: Parameters<typeof StaffNotesService.addNote>[0]) {
    return StaffNotesService.addNote(params);
  }

  public static deleteNote(guildId: string, noteId: string, actorId: string, actorTag: string) {
    return StaffNotesService.deleteNote(guildId, noteId, actorId, actorTag);
  }

  public static getSettings(guildId: string) {
    return moderationRepository.getSettings(guildId);
  }

  public static updateSettings(guildId: string, updates: Parameters<typeof moderationRepository.updateSettings>[1]) {
    return moderationRepository.updateSettings(guildId, updates);
  }

  public static getAuditLogs(guildId: string, limit = 50) {
    return moderationRepository.getAuditLogs(guildId, limit);
  }
}

