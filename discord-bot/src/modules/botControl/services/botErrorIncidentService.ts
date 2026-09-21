import { BotErrorFingerprint, BotIncident } from '../types/index.js';
import { logger } from '../../../utils/logger.js';

const MAX_FINGERPRINTS = 500;

export class BotErrorIncidentService {
  private static instance: BotErrorIncidentService;
  private fingerprints: Map<string, BotErrorFingerprint> = new Map();
  private incidents: Map<string, BotIncident> = new Map();

  private constructor() {
    // Toute erreur journalisée par le bot (logger.error) devient une empreinte : le module est lu dans le
    // préfixe « [Module] » du message, la pile dans le premier argument de type Error.
    logger.setErrorListener((message, args) => {
      const module = /^\[([^\]]+)\]/.exec(message)?.[1] ?? 'bot';
      const err = args.find((a): a is Error => a instanceof Error);
      const detail = err ? ` ${err.message}` : '';
      this.recordError(`${message}${detail}`.slice(0, 300), module, 'error', err?.stack?.split('\n').slice(0, 6).join('\n'));
    });
  }

  public static getInstance(): BotErrorIncidentService {
    if (!BotErrorIncidentService.instance) {
      BotErrorIncidentService.instance = new BotErrorIncidentService();
    }
    return BotErrorIncidentService.instance;
  }

  private computeFingerprint(message: string, module: string): string {
    const cleanMsg = message.replace(/\b[0-9a-f]{8,}\b/gi, '<ID>').replace(/\b\d+\b/g, '<NUM>');
    return `${module}_${Buffer.from(cleanMsg).toString('base64').substring(0, 16)}`;
  }

  public recordError(
    message: string,
    module: string,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'error',
    stackPreview?: string
  ): BotErrorFingerprint {
    const fpId = this.computeFingerprint(message, module);
    const existing = this.fingerprints.get(fpId);

    if (existing) {
      existing.occurrences++;
      existing.lastSeenAt = new Date().toISOString();
      existing.resolved = false;
      this.fingerprints.set(fpId, existing);

      // If critical error exceeds 3 times, auto-escalate incident
      if (severity === 'critical' && existing.occurrences >= 3) {
        this.createOrUpdateIncident(
          `Repeated Critical Failure: ${existing.title}`,
          'critical',
          `Automated detection from error fingerprint ${fpId}`,
          [module]
        );
      }
      return existing;
    }

    const newFp: BotErrorFingerprint = {
      fingerprint: fpId,
      title: message.split('\n')[0].substring(0, 80),
      message,
      severity,
      module,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      occurrences: 1,
      resolved: false,
      stackPreview,
    };

    this.fingerprints.set(fpId, newFp);
    if (this.fingerprints.size > MAX_FINGERPRINTS) {
      // On oublie la plus ancienne empreinte (une Map conserve l'ordre d'insertion).
      const oldest = this.fingerprints.keys().next().value;
      if (oldest !== undefined) this.fingerprints.delete(oldest);
    }
    return newFp;
  }

  public resolveFingerprint(fingerprint: string): boolean {
    const fp = this.fingerprints.get(fingerprint);
    if (fp) {
      fp.resolved = true;
      fp.resolvedAt = new Date().toISOString();
      this.fingerprints.set(fingerprint, fp);
      return true;
    }
    return false;
  }

  public getAllFingerprints(): BotErrorFingerprint[] {
    return Array.from(this.fingerprints.values()).sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );
  }

  public createOrUpdateIncident(
    title: string,
    severity: 'warning' | 'critical',
    rootCause: string,
    affectedSubsystems: string[]
  ): BotIncident {
    const id = `inc_${Date.now()}`;
    const incident: BotIncident = {
      id,
      title,
      severity,
      status: 'investigating',
      rootCause,
      affectedSubsystems,
      createdAt: new Date().toISOString(),
    };
    this.incidents.set(id, incident);
    return incident;
  }

  public getAllIncidents(): BotIncident[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getActiveIncidentsCount(): number {
    return Array.from(this.incidents.values()).filter((i) => i.status !== 'resolved').length;
  }
}
