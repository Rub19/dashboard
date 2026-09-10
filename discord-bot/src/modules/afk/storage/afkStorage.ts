import fs from 'fs';
import path from 'path';
import { AfkConfig, AfkConfigSchema, AfkEntry, AfkEntrySchema, AfkOverview } from '../types/afk.js';
import { logger } from '../../../utils/logger.js';

/** Persistance JSON du module AFK (`data/` gitignore, chargé au boot). */
class AfkStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private entriesPath = path.resolve(this.dataDir, 'afk_entries.json');
  private configsPath = path.resolve(this.dataDir, 'afk_configs.json');

  private entries = new Map<string, AfkEntry>(); // key: `${guildId}:${userId}`
  private configs = new Map<string, AfkConfig>(); // key: guildId

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private key(guildId: string, userId: string) {
    return `${guildId}:${userId}`;
  }

  private load() {
    try {
      if (fs.existsSync(this.entriesPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.entriesPath, 'utf8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = AfkEntrySchema.safeParse(item);
            if (res.success) this.entries.set(this.key(res.data.guildId, res.data.userId), res.data);
          }
        }
      }
      if (fs.existsSync(this.configsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configsPath, 'utf8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = AfkConfigSchema.safeParse(item);
            if (res.success) this.configs.set(res.data.guildId, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('[AFK] Échec du chargement des fichiers JSON :', err);
    }
  }

  private saveEntries() {
    try {
      fs.writeFileSync(this.entriesPath, JSON.stringify(Array.from(this.entries.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[AFK] Échec de la sauvegarde de afk_entries.json :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Array.from(this.configs.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[AFK] Échec de la sauvegarde de afk_configs.json :', err);
    }
  }

  public getConfig(guildId: string): AfkConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = AfkConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<AfkConfig>): AfkConfig {
    const next = AfkConfigSchema.parse({
      ...this.getConfig(guildId),
      ...patch,
      guildId,
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(guildId, next);
    this.saveConfigs();
    return next;
  }

  public get(guildId: string, userId: string): AfkEntry | undefined {
    return this.entries.get(this.key(guildId, userId));
  }

  public set(entry: Omit<AfkEntry, 'mentionCount' | 'since'> & Partial<Pick<AfkEntry, 'mentionCount' | 'since'>>): AfkEntry {
    const valid = AfkEntrySchema.parse(entry);
    this.entries.set(this.key(valid.guildId, valid.userId), valid);
    this.saveEntries();
    return valid;
  }

  public bumpMention(guildId: string, userId: string): AfkEntry | undefined {
    const entry = this.get(guildId, userId);
    if (!entry) return undefined;
    entry.mentionCount += 1;
    this.entries.set(this.key(guildId, userId), entry);
    this.saveEntries();
    return entry;
  }

  public clear(guildId: string, userId: string): AfkEntry | undefined {
    const entry = this.get(guildId, userId);
    if (!entry) return undefined;
    this.entries.delete(this.key(guildId, userId));
    this.saveEntries();
    return entry;
  }

  public getGuildEntries(guildId: string): AfkEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.guildId === guildId)
      .sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());
  }

  public getOverview(guildId: string): AfkOverview {
    const conf = this.getConfig(guildId);
    const list = this.getGuildEntries(guildId);
    return {
      enabled: conf.enabled,
      activeCount: list.length,
      totalMentionsWhileAway: list.reduce((sum, e) => sum + e.mentionCount, 0),
      members: list.map((e) => ({ userId: e.userId, reason: e.reason, since: e.since, mentionCount: e.mentionCount })),
    };
  }
}

export const afkStorage = new AfkStorage();
