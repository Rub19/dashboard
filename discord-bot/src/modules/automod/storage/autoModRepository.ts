import fs from 'fs';
import path from 'path';
import {
  AutoModConfig,
  AutoModConfigSchema,
  AutoModIncident,
  CustomRule,
  CustomRuleSchema,
  UserStrikeRecord,
} from '../types/autoMod.js';
import { logger } from '../../../utils/logger.js';

class AutoModRepository {
  private configPath = path.resolve(process.cwd(), 'data', 'automod_configs.json');
  private rulesPath = path.resolve(process.cwd(), 'data', 'automod_rules.json');
  private strikesPath = path.resolve(process.cwd(), 'data', 'automod_strikes.json');
  private incidentsPath = path.resolve(process.cwd(), 'data', 'automod_incidents.json');

  private configs = new Map<string, AutoModConfig>();
  private rules = new Map<string, CustomRule[]>(); // guildId -> CustomRule[]
  private strikes = new Map<string, UserStrikeRecord[]>(); // guildId -> UserStrikeRecord[]
  private incidents = new Map<string, AutoModIncident[]>(); // guildId -> AutoModIncident[]

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    // 1. Configs
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = AutoModConfigSchema.safeParse(val);
          if (res.success) this.configs.set(gid, res.data);
        }
      }
    } catch (err) {
      logger.error('[AutoModRepository] Erreur chargement automod_configs.json :', err);
    }

    // 2. Custom Rules
    try {
      if (fs.existsSync(this.rulesPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.rulesPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          const validRules: CustomRule[] = [];
          for (const item of list as any[]) {
            const res = CustomRuleSchema.safeParse(item);
            if (res.success) validRules.push(res.data);
          }
          this.rules.set(gid, validRules);
        }
      }
    } catch (err) {
      logger.error('[AutoModRepository] Erreur chargement automod_rules.json :', err);
    }

    // 3. Strikes
    try {
      if (fs.existsSync(this.strikesPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.strikesPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.strikes.set(gid, list as UserStrikeRecord[]);
        }
      }
    } catch (err) {
      logger.error('[AutoModRepository] Erreur chargement automod_strikes.json :', err);
    }

    // 4. Incidents
    try {
      if (fs.existsSync(this.incidentsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.incidentsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.incidents.set(gid, list as AutoModIncident[]);
        }
      }
    } catch (err) {
      logger.error('[AutoModRepository] Erreur chargement automod_incidents.json :', err);
    }
  }

  private saveConfigs(): void {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[AutoModRepository] Erreur sauvegarde configs :', err);
    }
  }

  private saveRules(): void {
    try {
      const obj = Object.fromEntries(this.rules.entries());
      fs.writeFileSync(this.rulesPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[AutoModRepository] Erreur sauvegarde rules :', err);
    }
  }

  private saveStrikes(): void {
    try {
      const obj = Object.fromEntries(this.strikes.entries());
      fs.writeFileSync(this.strikesPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[AutoModRepository] Erreur sauvegarde strikes :', err);
    }
  }

  private saveIncidents(): void {
    try {
      const obj = Object.fromEntries(this.incidents.entries());
      fs.writeFileSync(this.incidentsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[AutoModRepository] Erreur sauvegarde incidents :', err);
    }
  }

  // ==========================================
  // CONFIGS
  // ==========================================
  public getConfig(guildId: string): AutoModConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = AutoModConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, partial: Partial<AutoModConfig>): AutoModConfig {
    const current = this.getConfig(guildId);
    const updated = AutoModConfigSchema.parse({
      ...current,
      ...partial,
    });
    this.configs.set(guildId, updated);
    this.saveConfigs();
    return updated;
  }

  // ==========================================
  // CUSTOM RULES
  // ==========================================
  public getRules(guildId: string): CustomRule[] {
    return this.rules.get(guildId) || [];
  }

  public addRule(guildId: string, rule: CustomRule): CustomRule {
    const list = this.getRules(guildId);
    list.push(rule);
    this.rules.set(guildId, list);
    this.saveRules();
    return rule;
  }

  public updateRule(guildId: string, ruleId: string, updates: Partial<CustomRule>): CustomRule | null {
    const list = this.getRules(guildId);
    const idx = list.findIndex((r) => r.id === ruleId);
    if (idx === -1) return null;

    const merged = CustomRuleSchema.parse({
      ...list[idx],
      ...updates,
    });
    list[idx] = merged;
    this.rules.set(guildId, list);
    this.saveRules();
    return merged;
  }

  public deleteRule(guildId: string, ruleId: string): boolean {
    const list = this.getRules(guildId);
    const filtered = list.filter((r) => r.id !== ruleId);
    if (filtered.length === list.length) return false;
    this.rules.set(guildId, filtered);
    this.saveRules();
    return true;
  }

  // ==========================================
  // STRIKES
  // ==========================================
  public getUserStrikes(guildId: string, userId: string): UserStrikeRecord[] {
    const list = this.strikes.get(guildId) || [];
    const now = Date.now();
    // Ne garder que les strikes actifs non expirés
    return list.filter((s) => s.userId === userId && s.active && new Date(s.expiresAt).getTime() > now);
  }

  public getAllUserStrikesHistory(guildId: string, userId: string): UserStrikeRecord[] {
    const list = this.strikes.get(guildId) || [];
    return list.filter((s) => s.userId === userId);
  }

  public addStrike(
    guildId: string,
    userId: string,
    reason: string,
    addedBy = 'AUTOMOD',
    expirationDays = 7
  ): UserStrikeRecord {
    const list = this.strikes.get(guildId) || [];
    const now = new Date();
    const expires = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

    const record: UserStrikeRecord = {
      id: `STRIKE-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 1000)}`,
      guildId,
      userId,
      reason,
      addedBy,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      active: true,
    };

    list.push(record);
    this.strikes.set(guildId, list);
    this.saveStrikes();
    return record;
  }

  public clearUserStrikes(guildId: string, userId: string): number {
    const list = this.strikes.get(guildId) || [];
    let count = 0;
    for (const s of list) {
      if (s.userId === userId && s.active) {
        s.active = false;
        count++;
      }
    }
    if (count > 0) this.saveStrikes();
    return count;
  }

  // ==========================================
  // INCIDENTS & HISTORY
  // ==========================================
  public getIncidents(guildId: string, limit = 50): AutoModIncident[] {
    const list = this.incidents.get(guildId) || [];
    return [...list].reverse().slice(0, limit);
  }

  public addIncident(guildId: string, incident: AutoModIncident): void {
    const list = this.incidents.get(guildId) || [];
    list.push(incident);
    if (list.length > 500) {
      list.shift(); // Max 500 récents par serveur
    }
    this.incidents.set(guildId, list);
    this.saveIncidents();
  }
}

export const autoModRepository = new AutoModRepository();
