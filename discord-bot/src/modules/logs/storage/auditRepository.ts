import fs from 'fs';
import path from 'path';
import { AuditEvent, AuditModule, AuditSeverity, AuditSettings } from '../types/auditEvent.js';
import { logger } from '../../../utils/logger.js';

export interface AuditQueryOptions {
  module?: AuditModule | 'ALL';
  severity?: AuditSeverity | 'ALL';
  search?: string;
  actorId?: string;
  targetId?: string;
  channelId?: string;
  caseId?: string | number;
  incidentId?: string;
  startDate?: string;
  endDate?: string;
  period?: '1h' | '24h' | '7d' | '30d' | '90d' | 'all';
  limit?: number;
  offset?: number;
}

export class AuditRepository {
  private eventsPath = path.resolve(process.cwd(), 'data', 'audit_events.json');
  private configsPath = path.resolve(process.cwd(), 'data', 'audit_configs.json');

  private events: AuditEvent[] = [];
  private configs = new Map<string, AuditSettings>();

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.eventsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.eventsPath)) {
        const raw = fs.readFileSync(this.eventsPath, 'utf-8');
        this.events = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de audit_events.json :', err);
      this.events = [];
    }

    try {
      if (fs.existsSync(this.configsPath)) {
        const raw = fs.readFileSync(this.configsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, cfg] of Object.entries(parsed)) {
          this.configs.set(gid, cfg as AuditSettings);
        }
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de audit_configs.json :', err);
    }
  }

  public saveEvents(): void {
    try {
      // Garder les 10 000 événements les plus récents en persistance
      if (this.events.length > 10000) {
        this.events = this.events.slice(0, 10000);
      }
      fs.writeFileSync(this.eventsPath, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de audit_events.json :', err);
    }
  }

  public saveConfigs(): void {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur lors de la sauvegarde de audit_configs.json :', err);
    }
  }

  public insertBatch(newEvents: AuditEvent[]): void {
    if (!newEvents.length) return;
    // Ajout en tête (ordre antéchronologique)
    this.events.unshift(...newEvents);
    this.saveEvents();
  }

  public insert(event: AuditEvent): void {
    this.events.unshift(event);
    this.saveEvents();
  }

  public getEventById(id: string): AuditEvent | null {
    return this.events.find((e) => e.id === id) || null;
  }

  public getAllEventsForGuild(guildId: string): AuditEvent[] {
    return this.events.filter((e) => e.guildId === guildId);
  }

  public search(guildId: string, options: AuditQueryOptions): { events: AuditEvent[]; total: number } {
    let filtered = this.events.filter((e) => e.guildId === guildId);

    // Période temporelle
    const now = Date.now();
    if (options.period && options.period !== 'all') {
      let durationMs = 24 * 60 * 60 * 1000;
      if (options.period === '1h') durationMs = 60 * 60 * 1000;
      else if (options.period === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
      else if (options.period === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;
      else if (options.period === '90d') durationMs = 90 * 24 * 60 * 60 * 1000;

      const cutoff = now - durationMs;
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    }

    if (options.startDate) {
      const startMs = new Date(options.startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }

    if (options.endDate) {
      const endMs = new Date(options.endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }

    // Filtre par Module
    if (options.module && options.module !== 'ALL') {
      filtered = filtered.filter((e) => e.module === options.module);
    }

    // Filtre par Sévérité
    if (options.severity && options.severity !== 'ALL') {
      filtered = filtered.filter((e) => e.severity === options.severity);
    }

    // Filtre par Acteur
    if (options.actorId) {
      filtered = filtered.filter((e) => e.actor.id === options.actorId);
    }

    // Filtre par Cible
    if (options.targetId) {
      filtered = filtered.filter((e) => e.target?.id === options.targetId);
    }

    // Filtre par Salon
    if (options.channelId) {
      filtered = filtered.filter((e) => e.channel?.id === options.channelId);
    }

    // Filtre par Case ou Incident
    if (options.caseId) {
      const cStr = String(options.caseId);
      filtered = filtered.filter((e) => String(e.caseId) === cStr);
    }

    if (options.incidentId) {
      filtered = filtered.filter((e) => e.incidentId === options.incidentId);
    }

    // Recherche plein texte
    if (options.search) {
      const query = options.search.toLowerCase().trim();
      filtered = filtered.filter((e) => {
        const inActor = e.actor.tag?.toLowerCase().includes(query) || e.actor.id.includes(query);
        const inTarget = e.target?.name?.toLowerCase().includes(query) || e.target?.id?.includes(query);
        const inType = e.type.toLowerCase().includes(query);
        const inReason = e.reason?.toLowerCase().includes(query);
        const inId = e.id.toLowerCase().includes(query);
        const inChannel = e.channel?.name?.toLowerCase().includes(query);
        const inCase = e.caseId ? String(e.caseId).includes(query) : false;
        const inIncident = e.incidentId ? e.incidentId.toLowerCase().includes(query) : false;
        return inActor || inTarget || inType || inReason || inId || inChannel || inCase || inIncident;
      });
    }

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return {
      events: filtered.slice(offset, offset + limit),
      total,
    };
  }

  public getOverview(guildId: string) {
    const guildEvents = this.events.filter((e) => e.guildId === guildId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTodayMs = startOfToday.getTime();

    let eventsToday = 0;
    let securityToday = 0;
    let moderationToday = 0;
    let automodToday = 0;
    let criticalToday = 0;

    const byModule: Record<string, number> = {};
    const bySeverity: Record<string, number> = {
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const e of guildEvents) {
      byModule[e.module] = (byModule[e.module] || 0) + 1;
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;

      const t = new Date(e.timestamp).getTime();
      if (t >= startTodayMs) {
        eventsToday++;
        if (e.module === 'SECURITY') securityToday++;
        if (e.module === 'MODERATION') moderationToday++;
        if (e.module === 'AUTOMOD') automodToday++;
        if (e.severity === 'CRITICAL') criticalToday++;
      }
    }

    // Récupérer les 10 derniers événements critiques
    const criticalEvents = guildEvents
      .filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH')
      .slice(0, 10);

    return {
      eventsToday,
      securityToday,
      moderationToday,
      automodToday,
      criticalToday,
      totalEvents: guildEvents.length,
      byModule,
      bySeverity,
      criticalEvents,
    };
  }

  public getUserActivity(guildId: string, userId: string, limit = 50): AuditEvent[] {
    return this.events
      .filter((e) => e.guildId === guildId && (e.actor.id === userId || e.target?.id === userId))
      .slice(0, limit);
  }

  public getChannelActivity(guildId: string, channelId: string, limit = 50): AuditEvent[] {
    return this.events
      .filter((e) => e.guildId === guildId && (e.channel?.id === channelId || e.target?.id === channelId))
      .slice(0, limit);
  }

  public getRoleAudit(guildId: string, roleId: string, limit = 50): AuditEvent[] {
    return this.events
      .filter(
        (e) =>
          e.guildId === guildId &&
          (e.target?.id === roleId ||
            e.before?.roleId === roleId ||
            e.after?.roleId === roleId ||
            e.metadata?.roleId === roleId)
      )
      .slice(0, limit);
  }

  public getConfig(guildId: string): AuditSettings {
    let cfg = this.configs.get(guildId);
    if (!cfg) {
      cfg = {
        guildId,
        enabled: true,
        routing: {
          generalChannelId: null,
          generalThreshold: 'ALL',
          moderationChannelId: null,
          moderationThreshold: 'IMPORTANT',
          securityChannelId: null,
          securityThreshold: 'IMPORTANT',
          automodChannelId: null,
          automodThreshold: 'IMPORTANT',
          raidChannelId: null,
          raidThreshold: 'CRITICAL_ONLY',
        },
        retentionDays: 90,
        notificationRules: [
          {
            id: 'rule-critical-sec',
            name: 'Alerte immédiate sécurité critique',
            enabled: true,
            condition: { minSeverity: 'CRITICAL', modules: ['SECURITY', 'AUTOMOD'] },
            action: { sendDirectAlert: true },
          },
        ],
        privacy: {
          maskSensitiveTokens: true,
          redactMessageContents: false,
        },
        updatedAt: new Date().toISOString(),
      };
      this.configs.set(guildId, cfg);
      this.saveConfigs();
    }
    return cfg;
  }

  public updateConfig(guildId: string, partial: Partial<AuditSettings>): AuditSettings {
    const existing = this.getConfig(guildId);
    const updated: AuditSettings = {
      ...existing,
      ...partial,
      routing: {
        ...existing.routing,
        ...(partial.routing || {}),
      },
      privacy: {
        ...existing.privacy,
        ...(partial.privacy || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    this.configs.set(guildId, updated);
    this.saveConfigs();
    return updated;
  }

  public purgeOlderThanDays(days: number): number {
    if (days <= 0) return 0;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const initialLen = this.events.length;
    this.events = this.events.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    const deleted = initialLen - this.events.length;
    if (deleted > 0) {
      this.saveEvents();
    }
    return deleted;
  }
}

export const auditRepository = new AuditRepository();
