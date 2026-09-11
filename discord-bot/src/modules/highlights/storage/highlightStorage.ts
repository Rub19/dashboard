import fs from 'fs';
import path from 'path';
import {
  HighlightKeyword,
  HighlightKeywordSchema,
  HighlightOverview,
  HighlightUserConfig,
  HighlightUserConfigSchema,
} from '../types/highlight.js';
import { logger } from '../../../utils/logger.js';

/** Nombre maximum de mots-clés surveillés par membre et par serveur. */
const MAX_KEYWORDS_PER_USER = 15;

/** Persistance JSON du module Highlights (`data/` gitignore, chargé au boot). */
class HighlightStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private keywordsPath = path.resolve(this.dataDir, 'highlights_keywords.json');
  private configsPath = path.resolve(this.dataDir, 'highlights_configs.json');

  // key: `${guildId}:${userId}:${keyword.toLowerCase()}`
  private keywords = new Map<string, HighlightKeyword>();
  // key: `${guildId}:${userId}`
  private configs = new Map<string, HighlightUserConfig>();

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private userKey(g: string, u: string) {
    return `${g}:${u}`;
  }

  private keywordKey(g: string, u: string, keyword: string) {
    return `${g}:${u}:${keyword.toLowerCase()}`;
  }

  private load() {
    try {
      if (fs.existsSync(this.keywordsPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.keywordsPath, 'utf8'))) {
          const res = HighlightKeywordSchema.safeParse(item);
          if (res.success) {
            this.keywords.set(this.keywordKey(res.data.guildId, res.data.userId, res.data.keyword), res.data);
          }
        }
      }
      if (fs.existsSync(this.configsPath)) {
        for (const item of JSON.parse(fs.readFileSync(this.configsPath, 'utf8'))) {
          const res = HighlightUserConfigSchema.safeParse(item);
          if (res.success) this.configs.set(this.userKey(res.data.guildId, res.data.userId), res.data);
        }
      }
    } catch (err) {
      logger.error('[Highlights] Échec du chargement des fichiers JSON :', err);
    }
  }

  private saveKeywords() {
    try {
      fs.writeFileSync(this.keywordsPath, JSON.stringify(Array.from(this.keywords.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Highlights] Échec de la sauvegarde de highlights_keywords.json :', err);
    }
  }

  private saveConfigs() {
    try {
      fs.writeFileSync(this.configsPath, JSON.stringify(Array.from(this.configs.values()), null, 2), 'utf8');
    } catch (err) {
      logger.error('[Highlights] Échec de la sauvegarde de highlights_configs.json :', err);
    }
  }

  public getConfig(guildId: string, userId: string): HighlightUserConfig {
    let conf = this.configs.get(this.userKey(guildId, userId));
    if (!conf) {
      conf = HighlightUserConfigSchema.parse({ guildId, userId });
      this.configs.set(this.userKey(guildId, userId), conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, userId: string, patch: Partial<HighlightUserConfig>): HighlightUserConfig {
    const next = HighlightUserConfigSchema.parse({
      ...this.getConfig(guildId, userId),
      ...patch,
      guildId,
      userId,
      updatedAt: new Date().toISOString(),
    });
    this.configs.set(this.userKey(guildId, userId), next);
    this.saveConfigs();
    return next;
  }

  public listForUser(guildId: string, userId: string): HighlightKeyword[] {
    return Array.from(this.keywords.values())
      .filter((k) => k.guildId === guildId && k.userId === userId)
      .sort((a, b) => a.keyword.localeCompare(b.keyword));
  }

  /** Tous les mots-clés d'un serveur, tous membres confondus (scan des messages). */
  public listForGuild(guildId: string): HighlightKeyword[] {
    return Array.from(this.keywords.values()).filter((k) => k.guildId === guildId);
  }

  public canAddMore(guildId: string, userId: string): boolean {
    return this.listForUser(guildId, userId).length < MAX_KEYWORDS_PER_USER;
  }

  public has(guildId: string, userId: string, keyword: string): boolean {
    return this.keywords.has(this.keywordKey(guildId, userId, keyword));
  }

  public add(input: Omit<HighlightKeyword, 'createdAt'> & { createdAt?: string }): HighlightKeyword {
    const valid = HighlightKeywordSchema.parse(input);
    this.keywords.set(this.keywordKey(valid.guildId, valid.userId, valid.keyword), valid);
    this.saveKeywords();
    return valid;
  }

  public remove(guildId: string, userId: string, keyword: string): boolean {
    const deleted = this.keywords.delete(this.keywordKey(guildId, userId, keyword));
    if (deleted) this.saveKeywords();
    return deleted;
  }

  public getOverview(guildId: string): HighlightOverview {
    const guildKeywords = this.listForGuild(guildId);
    const watcherIds = new Set(guildKeywords.map((k) => k.userId));
    const pausedWatchers = Array.from(watcherIds).filter((userId) => !this.getConfig(guildId, userId).enabled).length;
    return {
      totalWatchers: watcherIds.size,
      totalKeywords: guildKeywords.length,
      pausedWatchers,
    };
  }
}

export const highlightStorage = new HighlightStorage();
export { MAX_KEYWORDS_PER_USER };
