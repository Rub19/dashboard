import { raidRepository } from '../storage/raidRepository.js';
import {
  InvolvedMemberInfo,
  RaidAction,
  RaidIncident,
  RaidType,
  ThreatLevel,
} from '../types/antiRaid.js';

class RaidIncidentService {
  private activeIncidents = new Map<string, RaidIncident>(); // guildId -> active incident

  public createIncident(params: {
    guildId: string;
    type: RaidType;
    threatLevel: ThreatLevel;
    riskScore: number;
    triggerReason: string;
    actionsExecuted: RaidAction[];
    triggerSignals: string[];
    involvedMembers: InvolvedMemberInfo[];
  }): RaidIncident {
    const counter = Math.floor(100 + Math.random() * 900);
    const incidentId = `INC-${Date.now().toString().slice(-4)}-${counter}`;

    const incident: RaidIncident = {
      id: incidentId,
      guildId: params.guildId,
      type: params.type,
      threatLevel: params.threatLevel,
      maxRiskScore: params.riskScore,
      triggerReason: params.triggerReason,
      startedAt: new Date().toISOString(),
      resolvedAt: null,
      durationSeconds: 0,
      affectedCount: params.involvedMembers.length || 1,
      actionsExecuted: params.actionsExecuted,
      triggerSignals: params.triggerSignals,
      involvedMembers: params.involvedMembers,
      status: 'ACTIVE',
    };

    this.activeIncidents.set(params.guildId, incident);
    raidRepository.addIncident(params.guildId, incident);
    return incident;
  }

  public getActiveIncident(guildId: string): RaidIncident | null {
    return this.activeIncidents.get(guildId) || null;
  }

  public appendToActiveIncident(
    guildId: string,
    member: InvolvedMemberInfo,
    riskScore: number
  ): void {
    const incident = this.activeIncidents.get(guildId);
    if (!incident) return;

    incident.involvedMembers.push(member);
    incident.affectedCount = incident.involvedMembers.length;
    if (riskScore > incident.maxRiskScore) {
      incident.maxRiskScore = riskScore;
    }

    raidRepository.updateIncident(guildId, incident.id, {
      involvedMembers: incident.involvedMembers,
      affectedCount: incident.affectedCount,
      maxRiskScore: incident.maxRiskScore,
    });
  }

  public resolveIncident(
    guildId: string,
    incidentId: string,
    resolvedBy?: string,
    isAuto = false
  ): RaidIncident | null {
    const now = new Date();
    const incident = raidRepository.getIncidentById(guildId, incidentId);
    if (!incident) return null;

    const startedTime = new Date(incident.startedAt).getTime();
    const durationSeconds = Math.max(1, Math.round((now.getTime() - startedTime) / 1000));

    const updated = raidRepository.updateIncident(guildId, incidentId, {
      status: isAuto ? 'AUTO_RESOLVED' : 'RESOLVED',
      resolvedAt: now.toISOString(),
      durationSeconds,
      resolvedBy: resolvedBy || (isAuto ? 'Auto-Exit' : 'Staff'),
    });

    const active = this.activeIncidents.get(guildId);
    if (active && active.id === incidentId) {
      this.activeIncidents.delete(guildId);
    }

    return updated;
  }

  public getIncidents(guildId: string, limit = 50): RaidIncident[] {
    return raidRepository.getIncidents(guildId, limit);
  }

  public getIncidentById(guildId: string, incidentId: string): RaidIncident | null {
    return raidRepository.getIncidentById(guildId, incidentId);
  }
}

export const raidIncidentService = new RaidIncidentService();
