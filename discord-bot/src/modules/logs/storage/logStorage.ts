import fs from 'fs';
import path from 'path';
import { LogCategory, LogEntry, LogType } from '../types/logEvent.js';
import { LogConfig, LogConfigSchema } from '../types/logConfig.js';
import { logger } from '../../../utils/logger.js';

class LogStorage {
  private logsPath = path.resolve(process.cwd(), 'data', 'logs.json');
  private configsPath = path.resolve(process.cwd(), 'data', 'log_configs.json');

  private logs: LogEntry[] = [];
  private configs = new Map<string, LogConfig>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.logsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.logsPath)) {
        this.logs = JSON.parse(fs.readFileSync(this.logsPath, 'utf-8'));
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de logs.json :', err);
    }

    try {
      if (fs.existsSync(this.configsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configsPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = LogConfigSchema.safeParse(val);
          if (res.success) {
            this.configs.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de log_configs.json :', err);
    }
  }

  private saveLogs() {
    try {
      // Conserver au maximum les 5000 derniers événements en mémoire et sur disque
      if (this.logs.length > 5000) {
        this.logs = this.logs.slice(0, 5000);
      }
      fs.writeFileSync(this.logsPath, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de logs.json :', err);
    }
  }

  private saveConfigs() {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de log_configs.json :', err);
    }
  }

  public getConfig(guildId: string): LogConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = LogConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<LogConfig>): LogConfig {
    const current = this.getConfig(guildId);
    const valid = LogConfigSchema.parse({
      ...current,
      ...update,
      categories: {
        ...current.categories,
        ...(update.categories || {}),
      },
    });
    this.configs.set(guildId, valid);
    this.saveConfigs();
    return valid;
  }

  public saveEntry(entry: LogEntry): void {
    this.logs.unshift(entry);
    this.saveLogs();
  }

  // ==========================================
  // Recherche et Filtrage pour le Dashboard
  // ==========================================
  public searchLogs(
    guildId: string,
    options: {
      category?: LogCategory | 'all';
      type?: LogType | 'all';
      search?: string;
      period?: '24h' | '7d' | '30d' | 'all';
      limit?: number;
      offset?: number;
    }
  ): { total: number; entries: LogEntry[] } {
    let filtered = this.logs.filter((l) => l.guildId === guildId);

    // Filtre période
    if (options.period && options.period !== 'all') {
      const now = Date.now();
      const maxAgeMs =
        options.period === '24h'
          ? 24 * 60 * 60 * 1000
          : options.period === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((l) => now - new Date(l.createdAt).getTime() <= maxAgeMs);
    }

    // Filtre catégorie
    if (options.category && options.category !== 'all') {
      filtered = filtered.filter((l) => l.category === options.category);
    }

    // Filtre type
    if (options.type && options.type !== 'all') {
      filtered = filtered.filter((l) => l.type === options.type);
    }

    // Filtre recherche textuelle
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.userTag && l.userTag.toLowerCase().includes(q)) ||
          (l.userId && l.userId.includes(q)) ||
          (l.channelName && l.channelName.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const entries = filtered.slice(offset, offset + limit);

    return { total, entries };
  }

  // ==========================================
  // Statistiques pour l'Overview
  // ==========================================
  public getOverview(guildId: string) {
    const list = this.logs.filter((l) => l.guildId === guildId);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const todayEvents = list.filter((l) => new Date(l.createdAt).getTime() >= oneDayAgo);

    const deletedMessagesToday = todayEvents.filter(
      (l) => l.type === 'MESSAGE_DELETE' || l.type === 'MESSAGE_DELETE_BULK'
    ).length;

    const modActionsToday = todayEvents.filter(
      (l) => l.category === 'moderation' || l.type === 'MOD_SANCTION' || l.type === 'AUTOMOD_ALERT'
    ).length;

    const membersJoinedToday = todayEvents.filter((l) => l.type === 'MEMBER_JOIN').length;
    const membersLeftToday = todayEvents.filter((l) => l.type === 'MEMBER_LEAVE').length;

    // Distribution par catégorie
    const categoryCounts: Record<string, number> = {};
    for (const l of todayEvents) {
      categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
    }

    return {
      todayTotal: todayEvents.length,
      deletedMessagesToday,
      modActionsToday,
      membersJoinedToday,
      membersLeftToday,
      categoryCounts,
      recentEvents: list.slice(0, 15),
    };
  }

  // ==========================================
  // Élagage automatique selon la rétention
  // ==========================================
  public pruneLogs(): void {
    const now = Date.now();
    let changed = false;

    this.logs = this.logs.filter((entry) => {
      const conf = this.getConfig(entry.guildId);
      if (conf.retentionDays === 0) return true; // illimité
      const ageDays = (now - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > conf.retentionDays) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      this.saveLogs();
    }
  }
}

export const logStorage = new LogStorage();
