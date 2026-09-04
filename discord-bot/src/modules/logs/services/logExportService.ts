import { AuditEvent } from '../types/auditEvent.js';

export class LogExportService {
  public static exportToCsv(events: AuditEvent[]): string {
    const headers = [
      'Event ID',
      'Timestamp',
      'Module',
      'Severity',
      'Type',
      'Actor Tag',
      'Actor ID',
      'Target Name',
      'Target ID',
      'Channel Name',
      'Reason',
      'Case ID',
      'Incident ID',
    ];

    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      e.module,
      e.severity,
      e.type,
      this.escapeCsv(e.actor.tag || ''),
      e.actor.id,
      this.escapeCsv(e.target?.name || ''),
      e.target?.id || '',
      this.escapeCsv(e.channel?.name || ''),
      this.escapeCsv(e.reason || ''),
      e.caseId ? String(e.caseId) : '',
      e.incidentId || '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public static exportToJson(events: AuditEvent[]): string {
    return JSON.stringify(events, null, 2);
  }

  private static escapeCsv(str: string): string {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
