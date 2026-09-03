import fs from 'fs';
import path from 'path';
import { AntiRaidConfig, AntiRaidConfigSchema, RaidIncident } from '../types/antiRaid.js';
import { logger } from '../../../utils/logger.js';

class RaidRepository {
  private configPath = path.resolve(process.cwd(), 'data', 'anti_raid_configs.json');
  private incidentsPath = path.resolve(process.cwd(), 'data', 'anti_raid_incidents.json');

  private configs = new Map<string, AntiRaidConfig>();
  private incidents = new Map<string, RaidIncident[]>(); // guildId -> incidents

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
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = AntiRaidConfigSchema.safeParse(val);
          if (res.success) {
            this.configs.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('[RaidRepository] Erreur chargement anti_raid_configs.json :', err);
    }

    try {
      if (fs.existsSync(this.incidentsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.incidentsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.incidents.set(gid, list as RaidIncident[]);
        }
      }
    } catch (err) {
      logger.error('[RaidRepository] Erreur chargement anti_raid_incidents.json :', err);
    }
  }

  private saveConfigs(): void {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[RaidRepository] Erreur sauvegarde configs :', err);
    }
  }

  private saveIncidents(): void {
    try {
      const obj = Object.fromEntries(this.incidents.entries());
      fs.writeFileSync(this.incidentsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[RaidRepository] Erreur sauvegarde incidents :', err);
    }
  }

  public getConfig(guildId: string): AntiRaidConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = AntiRaidConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, partial: Partial<AntiRaidConfig>): AntiRaidConfig {
    const current = this.getConfig(guildId);
    const updated = AntiRaidConfigSchema.parse({
      ...current,
      ...partial,
    });
    this.configs.set(guildId, updated);
    this.saveConfigs();
    return updated;
  }

  public getIncidents(guildId: string, limit = 50): RaidIncident[] {
    const list = this.incidents.get(guildId) || [];
    return [...list].reverse().slice(0, limit);
  }

  public getIncidentById(guildId: string, incidentId: string): RaidIncident | null {
    const list = this.incidents.get(guildId) || [];
    return list.find((inc) => inc.id === incidentId) || null;
  }

  public addIncident(guildId: string, incident: RaidIncident): void {
    const list = this.incidents.get(guildId) || [];
    list.push(incident);
    // Garder max 200 incidents par serveur pour optimiser la mémoire
    if (list.length > 200) {
      list.shift();
    }
    this.incidents.set(guildId, list);
    this.saveIncidents();
  }

  public updateIncident(
    guildId: string,
    incidentId: string,
    updates: Partial<RaidIncident>
  ): RaidIncident | null {
    const list = this.incidents.get(guildId) || [];
    const index = list.findIndex((i) => i.id === incidentId);
    if (index === -1) return null;

    const merged = { ...list[index], ...updates };
    list[index] = merged;
    this.incidents.set(guildId, list);
    this.saveIncidents();
    return merged;
  }
}

export const raidRepository = new RaidRepository();
