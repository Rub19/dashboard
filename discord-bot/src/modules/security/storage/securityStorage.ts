import fs from 'fs';
import path from 'path';
import { SecurityConfig, SecurityConfigSchema } from '../types/securityConfig.js';
import {
  SecurityIncident,
  SecurityIncidentSchema,
  SecurityOverview,
  SecurityStatus,
} from '../types/securityIncident.js';
import { logger } from '../../../utils/logger.js';

class SecurityStorage {
  private configPath = path.resolve(process.cwd(), 'data', 'security_configs.json');
  private incidentsPath = path.resolve(process.cwd(), 'data', 'security_incidents.json');

  private configs = new Map<string, SecurityConfig>();
  private incidents = new Map<string, SecurityIncident[]>(); // guildId -> incidents

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = SecurityConfigSchema.safeParse(val);
          if (res.success) {
            this.configs.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement security_configs.json :', err);
    }

    try {
      if (fs.existsSync(this.incidentsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.incidentsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.incidents.set(gid, list as SecurityIncident[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement security_incidents.json :', err);
    }
  }

  private saveConfigs() {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde security_configs.json :', err);
    }
  }

  private saveIncidents() {
    try {
      const obj = Object.fromEntries(this.incidents.entries());
      fs.writeFileSync(this.incidentsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde security_incidents.json :', err);
    }
  }

  public getConfig(guildId: string): SecurityConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = SecurityConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<SecurityConfig>): SecurityConfig {
    const current = this.getConfig(guildId);
    const valid = SecurityConfigSchema.parse({ ...current, ...update });
    this.configs.set(guildId, valid);
    this.saveConfigs();
    return valid;
  }

  public getIncidents(guildId: string): SecurityIncident[] {
    let list = this.incidents.get(guildId);
    if (!list) {
      list = [];
      this.incidents.set(guildId, list);
    }
    return list;
  }

  public addIncident(
    guildId: string,
    incidentData: Omit<SecurityIncident, 'id' | 'createdAt' | 'perpetratorId' | 'perpetratorTag' | 'resolvedAt'> & {
      perpetratorId?: string | null;
      perpetratorTag?: string | null;
      resolvedAt?: string | null;
    }
  ): SecurityIncident {
    const list = this.getIncidents(guildId);
    const id = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const fullIncident: SecurityIncident = {
      ...incidentData,
      id,
      guildId,
      perpetratorId: incidentData.perpetratorId ?? null,
      perpetratorTag: incidentData.perpetratorTag ?? null,
      resolvedAt: incidentData.resolvedAt ?? null,
      status: incidentData.status || 'open',
      createdAt: new Date().toISOString(),
    };

    list.unshift(fullIncident);
    // Conserver max 200 incidents par serveur
    if (list.length > 200) {
      list.length = 200;
    }

    this.incidents.set(guildId, list);
    this.saveIncidents();
    return fullIncident;
  }

  public resolveIncident(guildId: string, incidentId: string): boolean {
    const list = this.getIncidents(guildId);
    const inc = list.find((i) => i.id === incidentId);
    if (!inc) return false;

    inc.status = 'resolved';
    inc.resolvedAt = new Date().toISOString();
    this.saveIncidents();
    return true;
  }

  // Calcul du Security Score (0 à 100)
  public calculateSecurityScore(config: SecurityConfig, openIncidentsCount: number): number {
    let score = 0;
    if (config.antiRaid.enabled) score += 20;
    if (config.antiNuke.enabled) score += 25;
    if (config.antiSpam.enabled) score += 15;
    if (config.antiRaid.minAccountAgeDays > 0) score += 10;
    if (config.antiRaid.blockUnwhitelistedBots) score += 10;
    if (config.whitelist.trustedUserIds.length > 0 || config.whitelist.trustedRoleIds.length > 0) {
      score += 10;
    }
    if (config.antiSpam.antiInvite) score += 5;
    if (config.antiSpam.blockEveryoneHere) score += 5;

    // Déductions en cas d'incidents critiques ouverts
    score -= openIncidentsCount * 10;
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return score;
  }

  public getOverview(guildId: string, joinsLastMinute = 0, messagesLastMinute = 0, raidModeActive = false): SecurityOverview {
    const config = this.getConfig(guildId);
    const allIncidents = this.getIncidents(guildId);
    const openIncidents = allIncidents.filter((i) => i.status === 'open');

    let status: SecurityStatus = 'protected';
    if (raidModeActive || config.lockdown.active) {
      status = 'attack';
    } else if (openIncidents.length > 0) {
      status = 'warning';
    }

    const score = this.calculateSecurityScore(config, openIncidents.length);

    const raidsPrevented = allIncidents.filter((i) => i.type === 'MASS_JOIN').length;
    const nukesPrevented = allIncidents.filter((i) =>
      ['MASS_BAN', 'MASS_KICK', 'MASS_CHANNEL_DELETE', 'MASS_ROLE_DELETE'].includes(i.type)
    ).length;

    return {
      status,
      score,
      raidModeActive,
      lockdownActive: config.lockdown.active,
      joinsLastMinute,
      messagesLastMinute,
      recentIncidents: allIncidents.slice(0, 10),
      stats: {
        totalIncidents: allIncidents.length,
        resolvedIncidents: allIncidents.filter((i) => i.status === 'resolved').length,
        raidsPrevented,
        nukesPrevented,
      },
    };
  }
}

export const securityStorage = new SecurityStorage();
