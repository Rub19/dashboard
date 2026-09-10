import fs from 'fs';
import path from 'path';
import {
  StarboardConfig,
  StarboardConfigSchema,
  StarboardEntry,
  StarboardEntrySchema,
  StarboardOverview,
} from '../types/starboard.js';
import { logger } from '../../../utils/logger.js';

/**
 * Persistance JSON du module Starboard (même approche que `suggestionStorage` /
 * `voiceRepository` : `data/` est gitignore, chargé en mémoire au boot).
 */
class StarboardStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private configsPath = path.resolve(this.dataDir, 'starboard_configs.json');
  private entriesPath = path.resolve(this.dataDir, 'starboard_entries.json');

  private configs = new Map<string, StarboardConfig>(); // key: guildId
  private entries = new Map<string, StarboardEntry>(); // key: `${guildId}:${sourceMessageId}`

  constructor() {
    this.ensureDir();
    this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private entryKey(guildId: string, sourceMessageId: string) {
    return `${guildId}:${sourceMessageId}`;
  }

  private load() {
    try {
      if (fs.existsSync(this.configsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configsPath, 'utf8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = StarboardConfigSchema.safeParse(item);
            if (res.success) this.configs.set(res.data.guildId, res.data);
          }
        }
      }
      if (fs.existsSync(this.entriesPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.entriesPath, 'utf8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const res = StarboardEntrySchema.safeParse(item);
            if (res.success) {
              this.entries.set(this.entryKey(res.data.guildId, res.data.sourceMessageId), res.data);
            }
          }
        }
      }
    } catch (err) {
      logger.error('[Starboard] Échec du chargement de starboard_configs.json / starboard_entries.json :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Array.from(this.configs.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Starboard] Échec de la sauvegarde de starboard_configs.json :', err);
    }
  }

  private saveEntries() {
    try {
      fs.writeFileSync(this.entriesPath, JSON.stringify(Array.from(this.entries.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Starboard] Échec de la sauvegarde de starboard_entries.json :', err);
    }
  }

  public getConfig(guildId: string): StarboardConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = StarboardConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<StarboardConfig>): StarboardConfig {
    const current = this.getConfig(guildId);
    const next = StarboardConfigSchema.parse({
      ...current,
      ...patch,
      guildId,
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(guildId, next);
    this.saveConfigs();
    return next;
  }

  public getEntry(guildId: string, sourceMessageId: string): StarboardEntry | undefined {
    return this.entries.get(this.entryKey(guildId, sourceMessageId));
  }

  public upsertEntry(entry: StarboardEntry): StarboardEntry {
    const valid = StarboardEntrySchema.parse({ ...entry, updatedAt: new Date().toISOString() });
    this.entries.set(this.entryKey(valid.guildId, valid.sourceMessageId), valid);
    this.saveEntries();
    return valid;
  }

  public deleteEntry(guildId: string, sourceMessageId: string): boolean {
    const deleted = this.entries.delete(this.entryKey(guildId, sourceMessageId));
    if (deleted) this.saveEntries();
    return deleted;
  }

  public getGuildEntries(guildId: string): StarboardEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.guildId === guildId)
      .sort((a, b) => b.starCount - a.starCount);
  }

  public getOverview(guildId: string): StarboardOverview {
    const conf = this.getConfig(guildId);
    const list = this.getGuildEntries(guildId);
    const posted = list.filter((e) => e.starboardMessageId);
    const totalStars = list.reduce((sum, e) => sum + e.starCount, 0);
    const top = posted[0] ?? null;
    return {
      enabled: conf.enabled,
      channelId: conf.channelId,
      emoji: conf.emoji,
      threshold: conf.threshold,
      totalEntries: list.length,
      postedEntries: posted.length,
      totalStars,
      topMessage: top ? { sourceMessageId: top.sourceMessageId, starCount: top.starCount } : null,
    };
  }
}

export const starboardStorage = new StarboardStorage();
