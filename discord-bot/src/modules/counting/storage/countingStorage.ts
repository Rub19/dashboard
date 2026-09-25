import fs from 'fs';
import path from 'path';
import { CountingConfig, CountingConfigSchema, CountingOverview } from '../types/counting.js';
import { logger } from '../../../utils/logger.js';

/** Persistance JSON du module Comptage (`data/counting_configs.json`, chargé au démarrage). */
class CountingStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'counting_configs.json');
  private configs = new Map<string, CountingConfig>();

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const res = CountingConfigSchema.safeParse(item);
        if (res.success) this.configs.set(res.data.guildId, res.data);
      }
    } catch (err) {
      logger.error('[Comptage] Échec du chargement de counting_configs.json :', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify([...this.configs.values()], null, 2), 'utf8');
    } catch (err) {
      logger.error('[Comptage] Échec de la sauvegarde de counting_configs.json :', err);
    }
  }

  public getConfig(guildId: string): CountingConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = CountingConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.save();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<CountingConfig>): CountingConfig {
    const next = CountingConfigSchema.parse({ ...this.getConfig(guildId), ...patch, guildId, updatedAt: new Date().toISOString() });
    this.configs.set(guildId, next);
    this.save();
    return next;
  }

  /** Remet le compteur à zéro (le record, les statistiques et les réglages sont conservés). */
  public resetCount(guildId: string): CountingConfig {
    return this.updateConfig(guildId, { count: 0, lastUserId: null, lastResetAt: new Date().toISOString() });
  }

  public getOverview(guildId: string): CountingOverview {
    const { contributors, ...config } = this.getConfig(guildId);
    const leaderboard = Object.entries(contributors)
      .map(([userId, c]) => ({ userId, correct: c.correct, mistakes: c.mistakes }))
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 10);
    return { config, leaderboard };
  }
}

export const countingStorage = new CountingStorage();
