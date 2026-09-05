import fs from 'node:fs';
import path from 'node:path';
import {
  BackupOverviewKpis,
  BackupScheduleSettings,
  BackupSnapshot,
  RestoreJob,
} from '../types/index.js';
import { BackupIntegrityService } from '../services/backupIntegrityService.js';
import { logger } from '../../../utils/logger.js';

export class BackupRepository {
  private dataDir: string;
  private backupsFile: string;
  private settingsFile: string;
  private jobsFile: string;

  private backupsCache: Map<string, BackupSnapshot[]> = new Map();
  private settingsCache: Map<string, BackupScheduleSettings> = new Map();
  private jobsCache: Map<string, RestoreJob[]> = new Map();

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.backupsFile = path.join(this.dataDir, 'discord_backups.json');
    this.settingsFile = path.join(this.dataDir, 'backup_schedules.json');
    this.jobsFile = path.join(this.dataDir, 'backup_restore_jobs.json');

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    // Nettoyer les fichiers temporaires orphelins (.tmp) d'un crash antérieur
    try {
      if (fs.existsSync(`${this.backupsFile}.tmp`)) fs.unlinkSync(`${this.backupsFile}.tmp`);
      if (fs.existsSync(`${this.settingsFile}.tmp`)) fs.unlinkSync(`${this.settingsFile}.tmp`);
      if (fs.existsSync(`${this.jobsFile}.tmp`)) fs.unlinkSync(`${this.jobsFile}.tmp`);
    } catch {}

    try {
      if (fs.existsSync(this.backupsFile)) {
        const raw = fs.readFileSync(this.backupsFile, 'utf-8');
        const list = JSON.parse(raw) as BackupSnapshot[];
        this.backupsCache.clear();
        for (const item of list) {
          // Détection d'un crash pendant la capture : ne jamais laisser un backup incomplet en succès
          if ((item.status as any) === 'CREATING' || (item.status as any) === 'IN_PROGRESS') {
            item.status = 'FAILED';
            item.description = `${item.description || ''} [Interrompu par crash inattendu]`;
          }
          const arr = this.backupsCache.get(item.guildId) || [];
          arr.push(item);
          this.backupsCache.set(item.guildId, arr);
        }
      } else {
        this.backupsCache.clear();
      }

      if (fs.existsSync(this.settingsFile)) {
        const raw = fs.readFileSync(this.settingsFile, 'utf-8');
        const list = JSON.parse(raw) as BackupScheduleSettings[];
        this.settingsCache.clear();
        for (const s of list) {
          this.settingsCache.set(s.guildId, s);
        }
      }

      if (fs.existsSync(this.jobsFile)) {
        const raw = fs.readFileSync(this.jobsFile, 'utf-8');
        const list = JSON.parse(raw) as RestoreJob[];
        this.jobsCache.clear();
        for (const j of list) {
          // Détection d'une restauration interrompue par crash
          if (j.status === 'in_progress') {
            j.status = 'failed';
            j.error = 'Processus interrompu pendant la restauration. État sécurisé.';
          }
          const arr = this.jobsCache.get(j.guildId) || [];
          arr.push(j);
          this.jobsCache.set(j.guildId, arr);
        }
      }
    } catch (err) {
      logger.error('[BackupRepository] Erreur lors de la lecture des fichiers :', err);
      this.backupsCache.clear();
    }
  }

  private persistBackups(): void {
    const all: BackupSnapshot[] = [];
    for (const arr of this.backupsCache.values()) {
      all.push(...arr);
    }
    // Écriture atomique avec fichier .tmp et renommage OS
    const tmpFile = `${this.backupsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(all, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.backupsFile);
  }

  private persistSettings(): void {
    const all = Array.from(this.settingsCache.values());
    const tmpFile = `${this.settingsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(all, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.settingsFile);
  }

  private persistJobs(): void {
    const all: RestoreJob[] = [];
    for (const arr of this.jobsCache.values()) {
      all.push(...arr);
    }
    const tmpFile = `${this.jobsFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(all, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.jobsFile);
  }

  public getAll(guildId: string): BackupSnapshot[] {
    const list = this.backupsCache.get(guildId) || [];
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getById(guildId: string, backupId: string): BackupSnapshot | null {
    const list = this.backupsCache.get(guildId) || [];
    return list.find((b) => b.backupId === backupId) || null;
  }

  public save(snapshot: BackupSnapshot): void {
    const list = this.backupsCache.get(snapshot.guildId) || [];
    const idx = list.findIndex((b) => b.backupId === snapshot.backupId);
    if (idx >= 0) {
      list[idx] = snapshot;
    } else {
      list.unshift(snapshot);
    }
    this.backupsCache.set(snapshot.guildId, list);
    this.persistBackups();
  }

  public delete(guildId: string, backupId: string): boolean {
    const list = this.backupsCache.get(guildId) || [];
    const item = list.find((b) => b.backupId === backupId);
    if (!item) return false;
    if (item.isProtected) {
      throw new Error('Impossible de supprimer une sauvegarde protégée. Retirez la protection d\'abord.');
    }
    const filtered = list.filter((b) => b.backupId !== backupId);
    this.backupsCache.set(guildId, filtered);
    this.persistBackups();
    return true;
  }

  public toggleProtection(guildId: string, backupId: string, isProtected: boolean): boolean {
    const list = this.backupsCache.get(guildId) || [];
    const item = list.find((b) => b.backupId === backupId);
    if (!item) return false;
    item.isProtected = isProtected;
    this.persistBackups();
    return true;
  }

  public getSettings(guildId: string): BackupScheduleSettings {
    const existing = this.settingsCache.get(guildId);
    if (existing) return existing;

    const defaultSettings: BackupScheduleSettings = {
      guildId,
      enabled: true,
      frequency: 'daily',
      preferredTime: '03:00',
      timezone: 'Europe/Paris',
      retentionCount: 7,
      retentionDays: 30,
      maxStorageMb: 50,
      autoBackupBeforeMajorChanges: true,
      defaultSafetyLevel: 'SAFE',
    };
    this.settingsCache.set(guildId, defaultSettings);
    this.persistSettings();
    return defaultSettings;
  }

  public saveSettings(guildId: string, settings: Partial<BackupScheduleSettings>): BackupScheduleSettings {
    const current = this.getSettings(guildId);
    const updated: BackupScheduleSettings = {
      ...current,
      ...settings,
      guildId,
    };
    this.settingsCache.set(guildId, updated);
    this.persistSettings();
    return updated;
  }

  public saveJob(job: RestoreJob): void {
    const list = this.jobsCache.get(job.guildId) || [];
    const idx = list.findIndex((j) => j.jobId === job.jobId);
    if (idx >= 0) {
      list[idx] = job;
    } else {
      list.unshift(job);
    }
    // Conserver max 20 jobs récents
    this.jobsCache.set(job.guildId, list.slice(0, 20));
    this.persistJobs();
  }

  public getJob(guildId: string, jobId: string): RestoreJob | null {
    const list = this.jobsCache.get(guildId) || [];
    return list.find((j) => j.jobId === jobId) || null;
  }

  public getRecentJobs(guildId: string): RestoreJob[] {
    return this.jobsCache.get(guildId) || [];
  }

  public pruneExpired(guildId: string): number {
    const settings = this.getSettings(guildId);
    const list = this.getAll(guildId);
    if (list.length === 0) return 0;

    const now = Date.now();
    const maxAgeMs = settings.retentionDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    const kept: BackupSnapshot[] = [];
    let unprotectedCount = 0;

    for (const bkp of list) {
      if (bkp.isProtected) {
        kept.push(bkp);
        continue;
      }

      const ageMs = now - new Date(bkp.createdAt).getTime();
      const exceedsDays = ageMs > maxAgeMs;
      const exceedsCount = unprotectedCount >= settings.retentionCount;

      if (exceedsDays || exceedsCount) {
        pruned++;
      } else {
        unprotectedCount++;
        kept.push(bkp);
      }
    }

    if (pruned > 0) {
      this.backupsCache.set(guildId, kept);
      this.persistBackups();
      logger.info(`[BackupRepository] ${pruned} sauvegardes expirées purgées pour la guild ${guildId}`);
    }

    return pruned;
  }

  public getKpis(guildId: string): BackupOverviewKpis {
    const list = this.getAll(guildId);
    const settings = this.getSettings(guildId);

    const totalBackups = list.length;
    const lastBackupAt = list[0]?.createdAt || null;
    const storageUsedBytes = list.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
    const protectedCount = list.filter((b) => b.isProtected).length;

    let verifiedCount = 0;
    for (const b of list) {
      if (b.status === 'COMPLETED' && BackupIntegrityService.verifySnapshot(b).valid) {
        verifiedCount++;
      }
    }

    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (totalBackups === 0) {
      healthStatus = 'WARNING';
    } else if (lastBackupAt) {
      const ageHours = (Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60);
      if (ageHours > 72) {
        healthStatus = 'WARNING';
      }
    }

    // Calcul approximatif de la prochaine sauvegarde
    let nextScheduledAt: string | null = null;
    if (settings.enabled) {
      const next = new Date();
      if (settings.frequency === '6h') next.setHours(next.getHours() + 6);
      else if (settings.frequency === '12h') next.setHours(next.getHours() + 12);
      else if (settings.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else next.setDate(next.getDate() + 1);
      nextScheduledAt = next.toISOString();
    }

    return {
      totalBackups,
      lastBackupAt,
      storageUsedBytes,
      scheduledEnabled: settings.enabled,
      frequency: settings.frequency,
      protectedCount,
      healthStatus,
      nextScheduledAt,
      verifiedCount,
    };
  }
}

export const backupRepository = new BackupRepository();

