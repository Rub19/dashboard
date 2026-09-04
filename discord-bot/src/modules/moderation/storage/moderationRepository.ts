import fs from 'fs';
import path from 'path';
import {
  AuditLogEntry,
  CaseAction,
  CaseEvidence,
  CaseSource,
  CaseStatus,
  ModerationCase,
  ModerationCaseSchema,
  ModerationSettings,
  ModerationSettingsSchema,
  StaffNote,
} from '../types/case.js';
import { ModerationReport, ModerationReportSchema } from '../types/report.js';
import { logger } from '../../../utils/logger.js';

class ModerationRepository {
  private casesPath = path.resolve(process.cwd(), 'data', 'moderation_cases.json');
  private notesPath = path.resolve(process.cwd(), 'data', 'moderation_notes.json');
  private evidencePath = path.resolve(process.cwd(), 'data', 'moderation_evidence.json');
  private settingsPath = path.resolve(process.cwd(), 'data', 'moderation_settings.json');
  private auditPath = path.resolve(process.cwd(), 'data', 'moderation_audit_logs.json');
  private reportsPath = path.resolve(process.cwd(), 'data', 'moderation_reports.json');

  // En mémoire
  private cases = new Map<string, ModerationCase[]>(); // guildId -> cases
  private notes = new Map<string, StaffNote[]>(); // guildId -> notes
  private evidence = new Map<string, CaseEvidence[]>(); // caseId -> evidence
  private settings = new Map<string, ModerationSettings>(); // guildId -> settings
  private auditLogs = new Map<string, AuditLogEntry[]>(); // guildId -> auditLogs
  private reports = new Map<string, ModerationReport[]>(); // guildId -> reports

  constructor() {
    this.ensureDirectory();
    this.loadAll();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.casesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadAll(): void {
    // 1. Cases
    try {
      if (fs.existsSync(this.casesPath)) {
        const raw = fs.readFileSync(this.casesPath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [guildId, list] of Object.entries(obj)) {
          if (Array.isArray(list)) {
            const parsed = list.map((item) => ModerationCaseSchema.parse(item));
            this.cases.set(guildId, parsed);
          }
        }
      }
    } catch (err) {
      logger.error('[ModerationRepository] Erreur chargement cases :', err);
    }

    // 2. Notes
    try {
      if (fs.existsSync(this.notesPath)) {
        const raw = fs.readFileSync(this.notesPath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [guildId, list] of Object.entries(obj)) {
          if (Array.isArray(list)) {
            this.notes.set(guildId, list as StaffNote[]);
          }
        }
      }
    } catch (err) {
      logger.error('[ModerationRepository] Erreur chargement notes :', err);
    }

    // 3. Evidence
    try {
      if (fs.existsSync(this.evidencePath)) {
        const raw = fs.readFileSync(this.evidencePath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [caseId, list] of Object.entries(obj)) {
          if (Array.isArray(list)) {
            this.evidence.set(caseId, list as CaseEvidence[]);
          }
        }
      }
    } catch (err) {
      logger.error('[ModerationRepository] Erreur chargement evidence :', err);
    }

    // 4. Settings
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [guildId, val] of Object.entries(obj)) {
          const parsed = ModerationSettingsSchema.parse(val);
          this.settings.set(guildId, parsed);
        }
      }
    } catch (err) {
      logger.error('[ModerationRepository] Erreur chargement settings :', err);
    }

    // 5. Audit Logs
    try {
      if (fs.existsSync(this.auditPath)) {
        const raw = fs.readFileSync(this.auditPath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [guildId, list] of Object.entries(obj)) {
          if (Array.isArray(list)) {
            this.auditLogs.set(guildId, list as AuditLogEntry[]);
          }
        }
      }
    } catch (err) {
      logger.error('[ModerationRepository] Erreur chargement audit logs :', err);
    }

    // 6. Reports
    try {
      if (fs.existsSync(this.reportsPath)) {
        const raw = fs.readFileSync(this.reportsPath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [guildId, list] of Object.entries(obj)) {
          if (Array.isArray(list)) {
            const parsed = list.map((item) => ModerationReportSchema.parse(item));
            this.reports.set(guildId, parsed);
          }
        }
      }
    } catch (err) {
      logger.error('[ModerationRepository] Erreur chargement reports :', err);
    }
  }

  private saveReports(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.reports.entries());
      fs.writeFileSync(this.reportsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ModerationRepository] Erreur sauvegarde reports :', err);
    }
  }

  private saveCases(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.cases.entries());
      fs.writeFileSync(this.casesPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ModerationRepository] Erreur sauvegarde cases :', err);
    }
  }

  private saveNotes(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.notes.entries());
      fs.writeFileSync(this.notesPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ModerationRepository] Erreur sauvegarde notes :', err);
    }
  }

  private saveEvidence(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.evidence.entries());
      fs.writeFileSync(this.evidencePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ModerationRepository] Erreur sauvegarde evidence :', err);
    }
  }

  private saveSettings(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.settings.entries());
      fs.writeFileSync(this.settingsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ModerationRepository] Erreur sauvegarde settings :', err);
    }
  }

  private saveAudit(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.auditLogs.entries());
      fs.writeFileSync(this.auditPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ModerationRepository] Erreur sauvegarde audit logs :', err);
    }
  }

  // ==========================================
  // CASE METHODS
  // ==========================================
  public getNextCaseNumber(guildId: string): number {
    const list = this.cases.get(guildId) || [];
    if (list.length === 0) return 1;
    let max = 0;
    for (const c of list) {
      if (c.caseNumber > max) max = c.caseNumber;
    }
    return max + 1;
  }

  public createCase(data: Omit<ModerationCase, 'id' | 'caseNumber'>): ModerationCase {
    const list = this.cases.get(data.guildId) || [];
    const caseNumber = this.getNextCaseNumber(data.guildId);
    const id = `CASE-${data.guildId}-${caseNumber}`;

    const newCase: ModerationCase = {
      ...data,
      id,
      caseNumber,
    };

    list.unshift(newCase);
    this.cases.set(data.guildId, list);
    this.saveCases();
    return newCase;
  }

  public getCaseByNumber(guildId: string, caseNumber: number): ModerationCase | null {
    const list = this.cases.get(guildId) || [];
    return list.find((c) => c.caseNumber === caseNumber) || null;
  }

  public getCaseById(guildId: string, caseId: string): ModerationCase | null {
    const list = this.cases.get(guildId) || [];
    return list.find((c) => c.id === caseId) || null;
  }

  public updateCase(guildId: string, caseNumber: number, updates: Partial<ModerationCase>): ModerationCase | null {
    const list = this.cases.get(guildId) || [];
    const index = list.findIndex((c) => c.caseNumber === caseNumber);
    if (index === -1) return null;

    const current = list[index];
    const updated: ModerationCase = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        ...(updates.metadata || {}),
      },
    };

    list[index] = updated;
    this.cases.set(guildId, list);
    this.saveCases();
    return updated;
  }

  public getCases(
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
    let list = this.cases.get(guildId) || [];

    if (filters) {
      if (filters.action) {
        list = list.filter((c) => c.action === filters.action);
      }
      if (filters.status) {
        list = list.filter((c) => c.status === filters.status);
      }
      if (filters.source) {
        list = list.filter((c) => c.source === filters.source);
      }
      if (filters.userId) {
        list = list.filter((c) => c.userId === filters.userId);
      }
      if (filters.moderatorId) {
        list = list.filter((c) => c.moderatorId === filters.moderatorId);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (c) =>
            c.caseNumber.toString() === q ||
            c.id.toLowerCase().includes(q) ||
            c.userId.includes(q) ||
            c.userTag.toLowerCase().includes(q) ||
            c.moderatorTag.toLowerCase().includes(q) ||
            c.reason.toLowerCase().includes(q) ||
            (c.metadata?.channelName && c.metadata.channelName.toLowerCase().includes(q))
        );
      }
    }

    const total = list.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paginated = list.slice(offset, offset + limit);

    return { cases: paginated, total };
  }

  public getUserCases(guildId: string, userId: string): ModerationCase[] {
    const list = this.cases.get(guildId) || [];
    return list.filter((c) => c.userId === userId);
  }

  public getActiveTemporarySanctions(): ModerationCase[] {
    const now = Date.now();
    const result: ModerationCase[] = [];
    for (const [, list] of this.cases.entries()) {
      for (const c of list) {
        if (c.status === 'ACTIVE' && c.expiresAt) {
          result.push(c);
        }
      }
    }
    return result;
  }

  // ==========================================
  // EVIDENCE METHODS
  // ==========================================
  public getCaseEvidence(caseId: string): CaseEvidence[] {
    return this.evidence.get(caseId) || [];
  }

  public addCaseEvidence(item: CaseEvidence): void {
    const list = this.evidence.get(item.caseId) || [];
    list.push(item);
    this.evidence.set(item.caseId, list);
    this.saveEvidence();
  }

  public deleteEvidence(caseId: string, evidenceId: string): boolean {
    const list = this.evidence.get(caseId) || [];
    const filtered = list.filter((e) => e.id !== evidenceId);
    if (filtered.length !== list.length) {
      this.evidence.set(caseId, filtered);
      this.saveEvidence();
      return true;
    }
    return false;
  }

  // ==========================================
  // STAFF NOTES METHODS
  // ==========================================
  public getUserNotes(guildId: string, userId: string): StaffNote[] {
    const list = this.notes.get(guildId) || [];
    return list.filter((n) => n.userId === userId);
  }

  public getCaseNotes(guildId: string, caseId: string): StaffNote[] {
    const list = this.notes.get(guildId) || [];
    return list.filter((n) => n.caseId === caseId);
  }

  public addNote(note: StaffNote): void {
    const list = this.notes.get(note.guildId) || [];
    list.unshift(note);
    this.notes.set(note.guildId, list);
    this.saveNotes();
  }

  public deleteNote(guildId: string, noteId: string): boolean {
    const list = this.notes.get(guildId) || [];
    const filtered = list.filter((n) => n.id !== noteId);
    if (filtered.length !== list.length) {
      this.notes.set(guildId, filtered);
      this.saveNotes();
      return true;
    }
    return false;
  }

  // ==========================================
  // SETTINGS METHODS
  // ==========================================
  public getSettings(guildId: string): ModerationSettings {
    let conf = this.settings.get(guildId);
    if (!conf) {
      conf = ModerationSettingsSchema.parse({ guildId });
      this.settings.set(guildId, conf);
      this.saveSettings();
    }
    return conf;
  }

  public updateSettings(guildId: string, updates: Partial<ModerationSettings>): ModerationSettings {
    const current = this.getSettings(guildId);
    const merged = ModerationSettingsSchema.parse({
      ...current,
      ...updates,
      staffAbuseLimits: {
        ...current.staffAbuseLimits,
        ...(updates.staffAbuseLimits || {}),
      },
    });
    this.settings.set(guildId, merged);
    this.saveSettings();
    return merged;
  }

  // ==========================================
  // AUDIT LOG METHODS
  // ==========================================
  public addAuditLog(entry: AuditLogEntry): void {
    const list = this.auditLogs.get(entry.guildId) || [];
    list.unshift(entry);
    if (list.length > 500) list.pop(); // Conserver jusqu'à 500 entrées d'audit par guild
    this.auditLogs.set(entry.guildId, list);
    this.saveAudit();
  }

  public getAuditLogs(guildId: string, limit = 50): AuditLogEntry[] {
    const list = this.auditLogs.get(guildId) || [];
    return list.slice(0, limit);
  }

  // ==========================================
  // REPORT METHODS
  // ==========================================
  public getReports(
    guildId: string,
    filters?: {
      status?: string;
      reportedUserId?: string;
      reporterUserId?: string;
      assignedId?: string;
    }
  ): ModerationReport[] {
    const list = this.reports.get(guildId) || [];
    let filtered = [...list];

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    if (filters?.reportedUserId) {
      filtered = filtered.filter((r) => r.reportedUserId === filters.reportedUserId);
    }
    if (filters?.reporterUserId) {
      filtered = filtered.filter((r) => r.reporterUserId === filters.reporterUserId);
    }
    if (filters?.assignedId) {
      filtered = filtered.filter((r) => r.assignedModerator?.id === filters.assignedId);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReportById(guildId: string, reportId: string): ModerationReport | undefined {
    const list = this.reports.get(guildId) || [];
    return list.find((r) => r.id === reportId);
  }

  public addReport(report: ModerationReport): ModerationReport {
    const list = this.reports.get(report.guildId) || [];
    list.unshift(report);
    this.reports.set(report.guildId, list);
    this.saveReports();
    return report;
  }

  public updateReport(
    guildId: string,
    reportId: string,
    updates: Partial<ModerationReport>
  ): ModerationReport | null {
    const list = this.reports.get(guildId) || [];
    const index = list.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    const current = list[index];
    const updated: ModerationReport = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    this.reports.set(guildId, list);
    this.saveReports();
    return updated;
  }

  public getPendingReportsCount(guildId: string): number {
    const list = this.reports.get(guildId) || [];
    return list.filter((r) => r.status === 'NEW' || r.status === 'REVIEWING').length;
  }

  // ==========================================
  // CASE ASSIGNMENT & RELATIONSHIPS
  // ==========================================
  public assignCase(
    guildId: string,
    caseNumber: number,
    assignedTo?: { id: string; tag: string; team?: string }
  ): ModerationCase | null {
    return this.updateCase(guildId, caseNumber, { assignedTo });
  }

  public relateCase(
    guildId: string,
    caseNumber: number,
    relationships: ModerationCase['relationships']
  ): ModerationCase | null {
    const existing = this.getCaseByNumber(guildId, caseNumber);
    if (!existing) return null;

    return this.updateCase(guildId, caseNumber, {
      relationships: {
        ...(existing.relationships || {}),
        ...(relationships || {}),
      },
    });
  }
}

export const moderationRepository = new ModerationRepository();

