import { BotJobInfo } from '../types/index.js';
import { logger } from '../../../utils/logger.js';

interface JobMeta {
  name: string;
  type: BotJobInfo['type'];
  interval: string;
  /** Période en ms quand elle est fixe (sert à calculer la prochaine exécution). */
  intervalMs?: number;
  description: string;
}

/** Description des tâches réellement planifiées par le bot (chaque id est branché via `track`). */
const META: Record<string, JobMeta> = {
  analytics_buffer_flush: { name: 'Écriture des statistiques', type: 'buffer_flush', interval: 'Toutes les 30 secondes', intervalMs: 30_000, description: "Vide le tampon d'analyse (messages, vocal) vers le stockage." },
  xp_buffer_flush: { name: "Écriture de l'XP", type: 'buffer_flush', interval: 'Toutes les 10 secondes', intervalMs: 10_000, description: "Enregistre sur disque l'XP gagnée par les membres." },
  backup_scheduler: { name: 'Sauvegardes automatiques', type: 'backup', interval: 'Toutes les 15 minutes', intervalMs: 15 * 60_000, description: 'Vérifie quelles sauvegardes de serveur planifiées doivent être lancées.' },
  birthdays_tick: { name: 'Anniversaires', type: 'cron', interval: 'Toutes les 15 minutes', intervalMs: 15 * 60_000, description: "Annonce les anniversaires à l'heure configurée." },
  events_scheduler: { name: 'Événements', type: 'cron', interval: 'Toutes les minutes', intervalMs: 60_000, description: 'Ouvre, rappelle et clôture les événements planifiés.' },
  invites_checks: { name: 'Suivi des invitations', type: 'sync', interval: 'Toutes les 10 minutes', intervalMs: 10 * 60_000, description: "Contrôle la cohérence des invitations et détecte les arrivées suspectes." },
  log_retention: { name: 'Rétention des journaux', type: 'cleanup', interval: 'Toutes les 12 heures', intervalMs: 12 * 3_600_000, description: "Supprime les journaux plus vieux que la durée de conservation configurée." },
  moderation_expirations: { name: 'Sanctions expirées', type: 'cleanup', interval: 'Périodique', description: 'Lève les sanctions temporaires arrivées à échéance.' },
  reminders_tick: { name: 'Rappels', type: 'cron', interval: 'Toutes les 30 secondes', intervalMs: 30_000, description: "Envoie les rappels dont l'heure est arrivée." },
  server_stats_tick: { name: 'Salons de statistiques', type: 'sync', interval: 'Toutes les 5 minutes', intervalMs: 5 * 60_000, description: 'Met à jour les noms des salons compteurs (limite Discord : 2 renommages / 10 min).' },
  tickets_inactivity: { name: 'Inactivité des tickets', type: 'cleanup', interval: 'Toutes les 5 minutes', intervalMs: 5 * 60_000, description: 'Relance puis ferme automatiquement les tickets inactifs.' },
  voice_stay_watch: { name: 'Mode 24h/24 vocal', type: 'sync', interval: 'Toutes les 30 secondes', intervalMs: 30_000, description: 'Ramène le bot dans son salon vocal mémorisé s\'il en est sorti.' },
  presence_schedule: { name: 'Planning de présence', type: 'cron', interval: 'Toutes les 5 minutes', intervalMs: 5 * 60_000, description: "Applique le créneau de présence (statut et activité) prévu au planning." },
  raid_auto_exit: { name: 'Sortie du mode raid', type: 'cron', interval: 'Toutes les 30 secondes', intervalMs: 30_000, description: 'Désactive automatiquement le mode raid quand la période est écoulée.' },
};

/**
 * Registre des tâches planifiées. Chaque minuterie réelle du bot s'enregistre en enveloppant sa
 * fonction avec `track(id, fn)` : les compteurs (exécutions, échecs, durée, dernière exécution) sont
 * donc mesurés, jamais écrits à la main. Une tâche n'apparaît qu'une fois branchée.
 */
export class BotJobSchedulerService {
  private static instance: BotJobSchedulerService;
  private jobs: Map<string, BotJobInfo> = new Map();
  private runners: Map<string, () => unknown> = new Map();

  public static getInstance(): BotJobSchedulerService {
    if (!BotJobSchedulerService.instance) {
      BotJobSchedulerService.instance = new BotJobSchedulerService();
    }
    return BotJobSchedulerService.instance;
  }

  private ensure(id: string): BotJobInfo {
    let job = this.jobs.get(id);
    if (!job) {
      const meta = META[id];
      job = {
        id,
        name: meta?.name ?? id,
        type: meta?.type ?? 'cron',
        intervalDescription: meta?.interval ?? 'Périodique',
        status: 'idle',
        durationMs: 0,
        totalRuns: 0,
        failureCount: 0,
        isIdempotent: true,
        description: meta?.description ?? '',
      };
      if (meta?.intervalMs) job.nextRunAt = new Date(Date.now() + meta.intervalMs).toISOString();
      this.jobs.set(id, job);
    }
    return job;
  }

  private finish(id: string, start: number, ok: boolean, err?: unknown) {
    const job = this.ensure(id);
    job.durationMs = Date.now() - start;
    job.totalRuns++;
    job.lastRunAt = new Date().toISOString();
    job.status = ok ? 'idle' : 'failed';
    if (!ok) {
      job.failureCount++;
      logger.error(`[Jobs] ${id} a échoué :`, err);
    }
    const every = META[id]?.intervalMs;
    if (every) job.nextRunAt = new Date(Date.now() + every).toISOString();
  }

  /** Enveloppe `fn` : mesure sa durée et compte ses exécutions/échecs. Les erreurs sont journalisées, pas propagées. */
  public track<A extends unknown[]>(id: string, fn: (...args: A) => unknown): (...args: A) => unknown {
    this.ensure(id);
    this.runners.set(id, fn as () => unknown);
    return (...args: A) => {
      const job = this.ensure(id);
      const start = Date.now();
      job.status = 'running';
      try {
        const result = fn(...args);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>).then(
            (v) => {
              this.finish(id, start, true);
              return v;
            },
            (e) => this.finish(id, start, false, e)
          );
        }
        this.finish(id, start, true);
        return result;
      } catch (e) {
        this.finish(id, start, false, e);
        return undefined;
      }
    };
  }

  public getAllJobs(): BotJobInfo[] {
    return Array.from(this.jobs.values());
  }

  /** Lance réellement la tâche maintenant (la même fonction que la minuterie). */
  public async runJob(jobId: string): Promise<BotJobInfo> {
    const job = this.jobs.get(jobId);
    const runner = this.runners.get(jobId);
    if (!job || !runner) throw new Error(`Tâche ${jobId} introuvable`);
    if (job.status === 'running') throw new Error('Cette tâche est déjà en cours d\'exécution');
    const start = Date.now();
    job.status = 'running';
    try {
      await runner();
      this.finish(jobId, start, true);
    } catch (e) {
      this.finish(jobId, start, false, e);
      throw new Error(`La tâche a échoué : ${e instanceof Error ? e.message : String(e)}`);
    }
    return this.ensure(jobId);
  }
}
