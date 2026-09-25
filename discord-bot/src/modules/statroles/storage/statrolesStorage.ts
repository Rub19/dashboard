import fs from 'fs';
import path from 'path';
import { StatrolesConfig, StatrolesConfigSchema, StatroleRule } from '../types/statroles.js';
import { logger } from '../../../utils/logger.js';

/** Persistance JSON du module Statroles (`data/statroles_configs.json`, chargé au démarrage). */
class StatrolesStorage {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'statroles_configs.json');
  private configs = new Map<string, StatrolesConfig>();

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
        const res = StatrolesConfigSchema.safeParse(item);
        if (res.success) this.configs.set(res.data.guildId, res.data);
        else logger.warn('[Statroles] Configuration ignorée (invalide) :', res.error.issues[0]?.message);
      }
    } catch (err) {
      logger.error('[Statroles] Échec du chargement de statroles_configs.json :', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify([...this.configs.values()], null, 2), 'utf8');
    } catch (err) {
      logger.error('[Statroles] Échec de la sauvegarde de statroles_configs.json :', err);
    }
  }

  public getConfig(guildId: string): StatrolesConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = StatrolesConfigSchema.parse({ guildId });
      this.configs.set(guildId, conf);
      this.save();
    }
    return conf;
  }

  public updateConfig(guildId: string, patch: Partial<StatrolesConfig>): StatrolesConfig {
    const next = StatrolesConfigSchema.parse({ ...this.getConfig(guildId), ...patch, guildId, updatedAt: new Date().toISOString() });
    this.configs.set(guildId, next);
    this.save();
    return next;
  }

  public upsertRule(guildId: string, rule: StatroleRule): StatrolesConfig {
    const conf = this.getConfig(guildId);
    const rules = conf.rules.some((r) => r.id === rule.id) ? conf.rules.map((r) => (r.id === rule.id ? { ...rule, createdAt: r.createdAt } : r)) : [...conf.rules, rule];
    return this.updateConfig(guildId, { rules });
  }

  public deleteRule(guildId: string, ruleId: string): boolean {
    const conf = this.getConfig(guildId);
    if (!conf.rules.some((r) => r.id === ruleId)) return false;
    this.updateConfig(guildId, { rules: conf.rules.filter((r) => r.id !== ruleId) });
    return true;
  }

  public enabledGuildIds(): string[] {
    return [...this.configs.values()].filter((c) => c.enabled && c.rules.some((r) => r.enabled)).map((c) => c.guildId);
  }
}

export const statrolesStorage = new StatrolesStorage();
