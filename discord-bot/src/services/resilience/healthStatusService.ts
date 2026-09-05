/**
 * 🏥 ETHONE DISCORD — RESILIENCE 2.0
 * Health Status & Recovery Tracking Service
 *
 * System Health States:
 * - HEALTHY: All subsystems operational
 * - DEGRADED: Partial non-fatal issue (e.g. high latency, rate limits)
 * - RECOVERING: Active recovery or reconnection in progress
 * - PARTIAL_OUTAGE: One non-critical subsystem down
 * - OFFLINE: Primary service or Gateway disconnected
 * - UNKNOWN: State pending verification / reconciliation
 */

import { logger } from '../../utils/logger.js';

export type SystemHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'PARTIAL_OUTAGE'
  | 'OFFLINE'
  | 'UNKNOWN';

export type SubsystemName =
  | 'gateway'
  | 'database'
  | 'restApi'
  | 'realtime'
  | 'jobScheduler'
  | 'backupEngine'
  | 'reconciliation';

export interface SubsystemHealth {
  name: SubsystemName;
  state: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  latencyMs: number;
  lastChecked: string;
  details?: string;
}

export interface IncidentRecord {
  id: string;
  service: string;
  incident: string;
  severity: 'WARNING' | 'CRITICAL';
  status: 'INVESTIGATING' | 'RECOVERING' | 'RESOLVED' | 'FAILED';
  startTime: string;
  resolvedTime?: string;
  durationSeconds?: number;
  impact: string;
  recoveryType: 'AUTOMATIC' | 'MANUAL';
  retriesCount: number;
  result: string;
  details?: string;
}

export class HealthStatusService {
  private static instance: HealthStatusService;
  private currentState: SystemHealthState = 'UNKNOWN';
  private statusMessage = 'Initializing system...';
  private subsystems: Map<SubsystemName, SubsystemHealth> = new Map();
  private incidents: IncidentRecord[] = [];
  private stateChangeTime = Date.now();

  private constructor() {
    this.initSubsystems();
  }

  public static getInstance(): HealthStatusService {
    if (!HealthStatusService.instance) {
      HealthStatusService.instance = new HealthStatusService();
    }
    return HealthStatusService.instance;
  }

  private initSubsystems(): void {
    const names: SubsystemName[] = [
      'gateway',
      'database',
      'restApi',
      'realtime',
      'jobScheduler',
      'backupEngine',
      'reconciliation',
    ];
    for (const name of names) {
      this.subsystems.set(name, {
        name,
        state: 'UNKNOWN',
        latencyMs: 0,
        lastChecked: new Date().toISOString(),
      });
    }
  }

  public getHealthState(): SystemHealthState {
    return this.currentState;
  }

  public setSubsystemState(
    name: SubsystemName,
    state: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN',
    latencyMs = 0,
    details?: string
  ): void {
    const sub = this.subsystems.get(name) || {
      name,
      state: 'UNKNOWN',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
    };
    sub.state = state;
    sub.latencyMs = latencyMs;
    sub.lastChecked = new Date().toISOString();
    sub.details = details;
    this.subsystems.set(name, sub);

    this.recomputeOverallHealth();
  }

  private recomputeOverallHealth(): void {
    const list = Array.from(this.subsystems.values());
    const downCount = list.filter((s) => s.state === 'DOWN').length;
    const degradedCount = list.filter((s) => s.state === 'DEGRADED').length;
    const unknownCount = list.filter((s) => s.state === 'UNKNOWN').length;

    const oldState = this.currentState;

    if (this.subsystems.get('gateway')?.state === 'DOWN') {
      this.currentState = 'OFFLINE';
      this.statusMessage = 'Discord Gateway connection interrupted';
    } else if (downCount > 1) {
      this.currentState = 'PARTIAL_OUTAGE';
      this.statusMessage = `${downCount} critical subsystems are offline`;
    } else if (downCount === 1) {
      this.currentState = 'PARTIAL_OUTAGE';
      this.statusMessage = `Subsystem outage detected`;
    } else if (degradedCount > 0) {
      this.currentState = 'DEGRADED';
      this.statusMessage = 'System operating with degraded performance';
    } else if (unknownCount > 0 && this.currentState !== 'HEALTHY') {
      this.currentState = 'UNKNOWN';
      this.statusMessage = 'Verification required';
    } else {
      this.currentState = 'HEALTHY';
      this.statusMessage = 'All systems nominal and synchronized';
    }

    if (oldState !== this.currentState) {
      this.stateChangeTime = Date.now();
      logger.info(`[HealthStatusService] System state transitioned: ${oldState} -> ${this.currentState} (${this.statusMessage})`);
    }
  }

  public setSystemState(state: SystemHealthState, message?: string): void {
    this.currentState = state;
    if (message) this.statusMessage = message;
    this.stateChangeTime = Date.now();
  }

  public recordIncident(incident: Omit<IncidentRecord, 'id' | 'startTime'>): IncidentRecord {
    const record: IncidentRecord = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: new Date().toISOString(),
      ...incident,
    };
    this.incidents.unshift(record);
    if (this.incidents.length > 100) {
      this.incidents.pop();
    }
    logger.warn(`[HealthStatusService] Incident recorded: ${record.service} - ${record.incident} (${record.severity})`);
    return record;
  }

  public resolveIncident(incidentId: string, resultMessage = 'Recovered successfully'): boolean {
    const item = this.incidents.find((i) => i.id === incidentId);
    if (!item) return false;

    item.status = 'RESOLVED';
    item.resolvedTime = new Date().toISOString();
    item.result = resultMessage;
    const startMs = new Date(item.startTime).getTime();
    item.durationSeconds = Math.max(1, Math.round((Date.now() - startMs) / 1000));

    logger.success(`[HealthStatusService] Incident resolved: ${item.incident} after ${item.durationSeconds}s`);
    return true;
  }

  public getSnapshot() {
    return {
      state: this.currentState,
      message: this.statusMessage,
      stateChangeTime: new Date(this.stateChangeTime).toISOString(),
      subsystems: Array.from(this.subsystems.values()),
      recentIncidents: this.incidents.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
  }

  public getIncidentHistory(limit = 50): IncidentRecord[] {
    return this.incidents.slice(0, limit);
  }
}

export const healthStatusService = HealthStatusService.getInstance();
