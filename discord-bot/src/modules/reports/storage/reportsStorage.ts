import fs from 'fs';
import path from 'path';
import { ReportsConfig, ReportsConfigSchema, ReportThread } from '../types/reportsConfig.js';
import { logger } from '../../../utils/logger.js';

/** Persistance JSON du module Signalements : réglages par serveur et messages d'équipe (`data/reports_*.json`). */
class ReportsStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private configPath = path.resolve(this.dataDir, 'reports_configs.json');
  private threadsPath = path.resolve(this.dataDir, 'reports_threads.json');
  private configs = new Map<string, ReportsConfig>();
  private threads = new Map<string, ReportThread>(); // `${guildId}:${reportedUserId}`
  private lastReportAt = new Map<string, number>(); // `${guildId}:${reporterId}` (en mémoire : le délai est court)

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.configPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.configPath, 'utf8'))) {
          const res = ReportsConfigSchema.safeParse(item);
          if (res.success) this.configs.set(res.data.guildId, res.data);
        }
      }
      if (fs.existsSync(this.threadsPath)) {
        for (const t of JSON.parse(fs.readFileSync(this.threadsPath, 'utf8')) as ReportThread[]) this.threads.set(`${t.guildId}:${t.reportedUserId}`, t);
      }
    } catch (err) {
      logger.error('[Signalements] Échec du chargement des fichiers JSON :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify([...this.configs.values()], null, 2), 'utf8');
    } catch (err) {
      logger.error('[Signalements] Échec de la sauvegarde de reports_configs.json :', err);
    }
  }

  private saveThreads() {
    try {
      fs.writeFileSync(this.threadsPath, JSON.stringify([...this.threads.values()], null, 2), 'utf8');
    } catch (err) {
      logger.error('[Signalements] Échec de la sauvegarde de reports_threads.json :', err);
    }
  }

  public getConfig(guildId: string): ReportsConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = ReportsConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<ReportsConfig>): ReportsConfig {
    const next = ReportsConfigSchema.parse({ ...this.getConfig(guildId), ...patch, guildId, updatedAt: new Date().toISOString() });
    this.configs.set(guildId, next);
    this.saveConfigs();
    return next;
  }

  public getThread(guildId: string, reportedUserId: string): ReportThread | undefined {
    return this.threads.get(`${guildId}:${reportedUserId}`);
  }

  public setThread(t: ReportThread) {
    this.threads.set(`${t.guildId}:${t.reportedUserId}`, t);
    this.saveThreads();
  }

  public clearThread(guildId: string, reportedUserId: string) {
    if (this.threads.delete(`${guildId}:${reportedUserId}`)) this.saveThreads();
  }

  /** Renvoie les secondes restantes avant que ce membre puisse signaler à nouveau (0 = tout de suite) et enregistre le signalement. */
  public checkAndStamp(guildId: string, reporterId: string, cooldownSeconds: number, now = Date.now()): number {
    const key = `${guildId}:${reporterId}`;
    const last = this.lastReportAt.get(key) ?? 0;
    const wait = Math.ceil((last + cooldownSeconds * 1000 - now) / 1000);
    if (wait > 0) return wait;
    this.lastReportAt.set(key, now);
    return 0;
  }
}

export const reportsStorage = new ReportsStorage();
