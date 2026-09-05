import { BotJobInfo } from '../types/index.js';

export class BotJobSchedulerService {
  private static instance: BotJobSchedulerService;
  private jobs: Map<string, BotJobInfo> = new Map();

  private constructor() {
    this.initJobs();
  }

  public static getInstance(): BotJobSchedulerService {
    if (!BotJobSchedulerService.instance) {
      BotJobSchedulerService.instance = new BotJobSchedulerService();
    }
    return BotJobSchedulerService.instance;
  }

  private initJobs() {
    const defaultJobs: BotJobInfo[] = [
      {
        id: 'analytics_buffer_flush',
        name: 'Analytics Buffer Flusher',
        type: 'buffer_flush',
        intervalDescription: 'Every 5 seconds',
        status: 'idle',
        durationMs: 14,
        totalRuns: 28400,
        failureCount: 0,
        isIdempotent: true,
        description: 'Batches and persists in-memory message and voice event analytics to database storage.',
        lastRunAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 5000).toISOString(),
      },
      {
        id: 'voice_room_cleanup',
        name: 'Empty Voice Rooms Garbage Collector',
        type: 'cleanup',
        intervalDescription: 'Every 60 seconds',
        status: 'idle',
        durationMs: 8,
        totalRuns: 4320,
        failureCount: 0,
        isIdempotent: true,
        description: 'Scans and deletes abandoned temporary personal voice channels when empty for over 30 seconds.',
        lastRunAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 60000).toISOString(),
      },
      {
        id: 'backup_auto_snapshot',
        name: 'Automated Guild Snapshot Service',
        type: 'backup',
        intervalDescription: 'Daily at 04:00 UTC',
        status: 'idle',
        durationMs: 1840,
        totalRuns: 30,
        failureCount: 0,
        isIdempotent: true,
        description: 'Creates daily encrypted snapshot archives of channel structure, roles, and permissions.',
        lastRunAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        nextRunAt: new Date(Date.now() + 3600000 * 16).toISOString(),
      },
      {
        id: 'temp_roles_expiration_check',
        name: 'Temporary Roles Expiry Evaluator',
        type: 'sync',
        intervalDescription: 'Every 2 minutes',
        status: 'idle',
        durationMs: 25,
        totalRuns: 2160,
        failureCount: 0,
        isIdempotent: true,
        description: 'Audits members with temporary role assignments and revokes expired role grants.',
        lastRunAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 120000).toISOString(),
      },
      {
        id: 'giveaways_timer_resolver',
        name: 'Giveaways Ended Timer Checker',
        type: 'cron',
        intervalDescription: 'Every 15 seconds',
        status: 'idle',
        durationMs: 12,
        totalRuns: 9800,
        failureCount: 0,
        isIdempotent: true,
        description: 'Evaluates giveaway countdown timers and triggers cryptographic winner selection on expiry.',
        lastRunAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 15000).toISOString(),
      },
      {
        id: 'audit_logs_retention_prune',
        name: 'Audit Logs Retention Pruner',
        type: 'cleanup',
        intervalDescription: 'Weekly on Sundays',
        status: 'idle',
        durationMs: 450,
        totalRuns: 4,
        failureCount: 0,
        isIdempotent: true,
        description: 'Enforces log retention policy by archiving logs older than configured retention period.',
        lastRunAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        nextRunAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      },
    ];

    for (const j of defaultJobs) {
      this.jobs.set(j.id, j);
    }
  }

  public getAllJobs(): BotJobInfo[] {
    return Array.from(this.jobs.values());
  }

  public async runJob(jobId: string): Promise<BotJobInfo> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'running';
    const start = Date.now();
    this.jobs.set(jobId, job);

    // Simulate safe execution
    await new Promise((r) => setTimeout(r, 60));

    job.durationMs = Date.now() - start;
    job.status = 'idle';
    job.totalRuns++;
    job.lastRunAt = new Date().toISOString();
    this.jobs.set(jobId, job);

    return job;
  }
}
