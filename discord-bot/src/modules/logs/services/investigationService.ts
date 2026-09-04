import { AuditEvent, InvestigationResult } from '../types/auditEvent.js';
import { auditRepository } from '../storage/auditRepository.js';

export class InvestigationService {
  public static investigateEvent(eventId: string): InvestigationResult | null {
    const targetEvent = auditRepository.getEventById(eventId);
    if (!targetEvent) return null;

    const eventTime = new Date(targetEvent.timestamp).getTime();
    const windowMs = 15 * 60 * 1000; // ±15 minutes
    const startMs = eventTime - windowMs;
    const endMs = eventTime + windowMs;

    const allGuildEvents = auditRepository.getAllEventsForGuild(targetEvent.guildId);

    // Événements dans la fenêtre ±15 min
    const windowEvents = allGuildEvents.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= startMs && t <= endMs;
    });

    // Détecter les événements corrélés
    const relatedEvents: AuditEvent[] = [];
    for (const e of windowEvents) {
      if (e.id === targetEvent.id) continue;

      const isSameCorrelation = targetEvent.correlationId && e.correlationId === targetEvent.correlationId;
      const isSameCase = targetEvent.caseId && e.caseId && String(targetEvent.caseId) === String(e.caseId);
      const isSameIncident = targetEvent.incidentId && e.incidentId && targetEvent.incidentId === e.incidentId;
      const isSameActor = e.actor.id === targetEvent.actor.id;
      const isSameTarget = targetEvent.target && e.target && e.target.id === targetEvent.target.id;
      const isBurst = e.type === targetEvent.type && Math.abs(new Date(e.timestamp).getTime() - eventTime) < 60000;

      if (isSameCorrelation || isSameCase || isSameIncident || isSameActor || isSameTarget || isBurst) {
        relatedEvents.push(e);
      }
    }

    // Trier du plus ancien au plus récent pour reconstituer la chaîne de causalité
    const fullChainEvents = [...relatedEvents, targetEvent].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const causalityChain = fullChainEvents.map((e, index) => {
      let relation: 'PARENT' | 'TRIGGER' | 'SANCTION' | 'SAME_ACTOR' | 'SAME_TARGET' | 'BURST' = 'TRIGGER';

      if (e.id === targetEvent.id) {
        relation = 'TRIGGER';
      } else if (targetEvent.correlationId && e.id === targetEvent.correlationId) {
        relation = 'PARENT';
      } else if (e.caseId || e.type.includes('SANCTION') || e.type.includes('TIMEOUT') || e.type.includes('BAN')) {
        relation = 'SANCTION';
      } else if (e.actor.id === targetEvent.actor.id) {
        relation = 'SAME_ACTOR';
      } else if (targetEvent.target && e.target && e.target.id === targetEvent.target.id) {
        relation = 'SAME_TARGET';
      } else {
        relation = 'BURST';
      }

      const summary = `${e.actor.tag || e.actor.id} → ${e.type}${e.target ? ` sur ${e.target.name || e.target.id}` : ''}${e.reason ? ` (${e.reason})` : ''}`;

      return {
        step: index + 1,
        eventId: e.id,
        timestamp: e.timestamp,
        module: e.module,
        severity: e.severity,
        summary,
        relation,
      };
    });

    // Calcul du comparateur Before / After
    const diffInspection: { field: string; beforeDisplay: string; afterDisplay: string }[] = [];
    if (targetEvent.diff && targetEvent.diff.length > 0) {
      for (const d of targetEvent.diff) {
        diffInspection.push({
          field: d.field,
          beforeDisplay: typeof d.before === 'object' ? JSON.stringify(d.before) : String(d.before ?? '—'),
          afterDisplay: typeof d.after === 'object' ? JSON.stringify(d.after) : String(d.after ?? '—'),
        });
      }
    } else if (targetEvent.before || targetEvent.after) {
      const allKeys = Array.from(
        new Set([...Object.keys(targetEvent.before || {}), ...Object.keys(targetEvent.after || {})])
      );
      for (const key of allKeys) {
        const bVal = targetEvent.before?.[key];
        const aVal = targetEvent.after?.[key];
        if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
          diffInspection.push({
            field: key,
            beforeDisplay: typeof bVal === 'object' ? JSON.stringify(bVal) : String(bVal ?? '—'),
            afterDisplay: typeof aVal === 'object' ? JSON.stringify(aVal) : String(aVal ?? '—'),
          });
        }
      }
    }

    return {
      targetEvent,
      timeWindowStart: new Date(startMs).toISOString(),
      timeWindowEnd: new Date(endMs).toISOString(),
      relatedEvents,
      causalityChain,
      diffInspection: diffInspection.length > 0 ? diffInspection : undefined,
    };
  }
}
