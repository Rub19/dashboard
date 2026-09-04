import { Client } from 'discord.js';
import { CaseService } from './caseService.js';
import { SanctionService, ExecuteSanctionParams } from './sanctionService.js';
import { EvidenceService } from './evidenceService.js';
import { StaffNotesService } from './staffNotesService.js';
import { ModerationScheduler } from './moderationScheduler.js';
import { ModerationAnalytics } from './moderationAnalytics.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { CaseAction, CaseSource, CaseStatus, ModerationCase, StandardReason } from '../types/case.js';

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

  public static getUserProfile(guildId: string, userId: string) {
    return CaseService.getUserProfile(this.discordClient, guildId, userId);
  }

  public static getOverviewStats(guildId: string) {
    return ModerationAnalytics.getOverviewStats(guildId);
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
