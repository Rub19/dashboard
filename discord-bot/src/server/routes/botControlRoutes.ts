import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { BotTelemetryService } from '../../modules/botControl/services/botTelemetryService.js';
import { BotCommandStatsService } from '../../modules/botControl/services/botCommandStatsService.js';
import { BotEventBusService } from '../../modules/botControl/services/botEventBusService.js';
import { BotJobSchedulerService } from '../../modules/botControl/services/botJobSchedulerService.js';
import { BotErrorIncidentService } from '../../modules/botControl/services/botErrorIncidentService.js';
import { BotDiagnosticsService } from '../../modules/botControl/services/botDiagnosticsService.js';
import { BotAiMonitorService } from '../../modules/botControl/services/botAiMonitorService.js';
import { requireStringParam } from '../utils/params.js';
import { BotIntegrationsService } from '../../modules/botControl/services/botIntegrationsService.js';
import { BotSecurityAuditService } from '../../modules/botControl/services/botSecurityAuditService.js';
import { BotConfigService } from '../../modules/botControl/services/botConfigService.js';
import { rateLimit, idempotent } from '../middleware/antiAbuseMiddleware.js';

export function createBotControlRouter(client: Client): Router {
  const router = Router();
  const telemetryService = BotTelemetryService.getInstance();
  const commandStats = BotCommandStatsService.getInstance();
  const eventBus = BotEventBusService.getInstance();
  const jobScheduler = BotJobSchedulerService.getInstance();
  const errorIncidents = BotErrorIncidentService.getInstance();
  const diagnosticsService = BotDiagnosticsService.getInstance();
  const aiMonitor = BotAiMonitorService.getInstance();
  const integrationsService = BotIntegrationsService.getInstance();
  const securityAudit = BotSecurityAuditService.getInstance();
  const configService = BotConfigService.getInstance();

  // Overview
  router.get('/overview', (req: Request, res: Response) => {
    try {
      const activeIncidents = errorIncidents.getActiveIncidentsCount();
      const status = telemetryService.getGlobalStatus(client, activeIncidents);
      const snapshot = telemetryService.getTelemetrySnapshot(client);
      const recentIncidents = errorIncidents.getAllIncidents().slice(0, 3);
      const topErrors = errorIncidents.getAllFingerprints().filter((f) => !f.resolved).slice(0, 5);

      res.json({
        success: true,
        data: {
          globalStatus: status,
          snapshot,
          recentIncidents,
          topErrors,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telemetry Snapshot
  router.get('/telemetry', (req: Request, res: Response) => {
    try {
      const snapshot = telemetryService.getTelemetrySnapshot(client);
      res.json({ success: true, data: snapshot });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // NOTE: This router used to expose GET /modules and POST /modules/:moduleId/toggle
  // backed by a hardcoded, in-memory, global (not per-guild) BotModuleRegistryService —
  // fabricated uptime/error/memory stats and a toggle that never touched real bot
  // behavior (guildConfigService). It has been removed: the real, guild-scoped module
  // toggle system lives in moduleRoutes.ts (GET/PATCH /api/guilds/:guildId/modules...),
  // which is genuinely backed by guildConfigService and shared with the /module Discord
  // command. The dashboard now calls that API directly instead of this one.

  // Command Center
  router.get('/commands', (req: Request, res: Response) => {
    try {
      const commands = commandStats.getAllCommands();
      res.json({ success: true, data: commands });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Events Center
  router.get('/events', (req: Request, res: Response) => {
    try {
      const stats = eventBus.getEventBusStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Queue & Jobs Center
  router.get('/jobs', (req: Request, res: Response) => {
    try {
      const jobs = jobScheduler.getAllJobs();
      res.json({ success: true, data: jobs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/jobs/:jobId/run', async (req: Request, res: Response) => {
    try {
      const jobId = requireStringParam(req.params.jobId, 'jobId');
      const job = await jobScheduler.runJob(jobId);
      res.json({ success: true, data: job });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Error & Incident Center
  router.get('/errors', (req: Request, res: Response) => {
    try {
      const fingerprints = errorIncidents.getAllFingerprints();
      const incidents = errorIncidents.getAllIncidents();
      res.json({ success: true, data: { fingerprints, incidents } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/errors/:fingerprint/resolve', (req: Request, res: Response) => {
    try {
      const fingerprint = requireStringParam(req.params.fingerprint, 'fingerprint');
      const success = errorIncidents.resolveFingerprint(fingerprint);
      res.json({ success, data: { fingerprint, resolved: success } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Performance Telemetry (multi-window historical charts) — real sampled
  // points from BotTelemetryService's ring buffer (one sample every ~30s),
  // not generated. A freshly started bot will have a short history until
  // the buffer fills up; that's an honest gap, not something to backfill
  // with fabricated points.
  router.get('/performance', (req: Request, res: Response) => {
    try {
      const windowParam = (req.query.window as string) || '1h';
      const points = telemetryService.getPerformanceHistory(windowParam);
      res.json({ success: true, data: { window: windowParam, points } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // AI Center
  router.get('/ai', (req: Request, res: Response) => {
    try {
      const stats = aiMonitor.getAiStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Integrations Center
  router.get('/integrations', (req: Request, res: Response) => {
    try {
      const list = integrationsService.getAllIntegrations();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/integrations/:id/test', async (req: Request, res: Response) => {
    try {
      const id = requireStringParam(req.params.id, 'id');
      const tested = await integrationsService.testIntegration(id);
      res.json({ success: true, data: tested });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Security Audit Center
  router.get('/security', (req: Request, res: Response) => {
    try {
      const report = securityAudit.getSecurityAudit(client);
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Diagnostics Suite Runner
  router.post(
    '/diagnostics/run',
    rateLimit('EXPENSIVE', { actionName: 'bot_diagnostics' }),
    async (req: Request, res: Response) => {
      try {
        const suite = await diagnosticsService.runFullDiagnostics(client);
        const passCount = suite.filter((s) => s.status === 'pass').length;
        const warnCount = suite.filter((s) => s.status === 'warn').length;
        const criticalCount = suite.filter((s) => s.status === 'critical').length;

        res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            summary: {
              total: suite.length,
              pass: passCount,
              warn: warnCount,
              critical: criticalCount,
              overallStatus: criticalCount > 0 ? 'CRITICAL' : warnCount > 0 ? 'WARN' : 'HEALTHY',
            },
            checks: suite,
          },
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  // Bot Settings
  router.get('/settings', (req: Request, res: Response) => {
    try {
      const settings = configService.getSettings();
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put(
    '/settings',
    rateLimit('CONFIG', { actionName: 'bot_settings' }),
    idempotent({ scopePrefix: 'bot_settings' }),
    (req: Request, res: Response) => {
    try {
      const updated = configService.updateSettings(req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Remote Restart — authorization is enforced upstream by requireBotOwner
  // (index.ts), which checks the signed session's user id against
  // config.botOwnerId. A client-supplied header/body field must never be
  // trusted for this: it can be set to anything by the caller.
  router.post('/restart', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Bot restart scheduled in 1 second' });

    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  // Remote Update — see /restart above for the authorization note.
  router.post('/update', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Update command received' });
  });

  return router;
}
