import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { auditRepository, AuditQueryOptions } from '../../modules/logs/storage/auditRepository.js';
import { logQueue } from '../../modules/logs/services/logQueue.js';
import { InvestigationService } from '../../modules/logs/services/investigationService.js';
import { LogExportService } from '../../modules/logs/services/logExportService.js';
import { logService } from '../../modules/logs/services/logService.js';
import { AuditModule, AuditSeverity } from '../../modules/logs/types/auditEvent.js';

export function createLogRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble des métriques d'audit
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    logQueue.flush(); // Garantir que tous les logs en mémoire sont enregistrés
    const overview = auditRepository.getOverview(guildId);
    res.json(overview);
  });

  // 2. Recherche et exploration des événements d'audit
  router.get('/events', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const {
      module,
      severity,
      search,
      period,
      actorId,
      targetId,
      channelId,
      caseId,
      incidentId,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    logQueue.flush();

    const options: AuditQueryOptions = {
      module: (module as AuditModule | 'ALL') || 'ALL',
      severity: (severity as AuditSeverity | 'ALL') || 'ALL',
      search: search ? String(search) : undefined,
      period: (period as any) || 'all',
      actorId: actorId ? String(actorId) : undefined,
      targetId: targetId ? String(targetId) : undefined,
      channelId: channelId ? String(channelId) : undefined,
      caseId: caseId ? String(caseId) : undefined,
      incidentId: incidentId ? String(incidentId) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    };

    const result = auditRepository.search(guildId, options);
    res.json({
      ...result,
      limit: options.limit,
      offset: options.offset,
    });
  });

  // 3. Mode Enquête & Causalité approfondie
  router.get('/events/:eventId/investigate', async (req: Request, res: Response): Promise<void> => {
    const eventId = String(req.params.eventId);
    logQueue.flush();
    const investigation = InvestigationService.investigateEvent(eventId);
    if (!investigation) {
      res.status(404).json({ error: 'Événement introuvable pour enquête' });
      return;
    }
    res.json(investigation);
  });

  // 4. Historique d'activité d'un utilisateur
  router.get('/users/:userId/activity', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    logQueue.flush();
    const activity = auditRepository.getUserActivity(guildId, userId, limit);
    res.json({ userId, activity, count: activity.length });
  });

  // 5. Historique d'activité d'un salon
  router.get('/channels/:channelId/activity', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    logQueue.flush();
    const activity = auditRepository.getChannelActivity(guildId, channelId, limit);
    res.json({ channelId, activity, count: activity.length });
  });

  // 6. Audit des modifications d'un rôle
  router.get('/roles/:roleId/audit', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const roleId = String(req.params.roleId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    logQueue.flush();
    const auditTrail = auditRepository.getRoleAudit(guildId, roleId, limit);
    res.json({ roleId, auditTrail, count: auditTrail.length });
  });

  // 7. Export des logs filtrés (CSV / JSON)
  router.get('/export', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const format = String(req.query.format || 'json').toLowerCase();
    logQueue.flush();

    const { events } = auditRepository.search(guildId, {
      module: (req.query.module as any) || 'ALL',
      severity: (req.query.severity as any) || 'ALL',
      search: req.query.search ? String(req.query.search) : undefined,
      period: (req.query.period as any) || 'all',
      limit: 10000,
    });

    if (format === 'csv') {
      const csv = LogExportService.exportToCsv(events);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${guildId}.csv"`);
      res.send(csv);
    } else {
      const json = LogExportService.exportToJson(events);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${guildId}.json"`);
      res.send(json);
    }
  });

  // 8. Configuration & Routage des logs Discord
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = auditRepository.getConfig(guildId);
    res.json({ config });
  });

  router.put('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const oldConfig = auditRepository.getConfig(guildId);
      const updated = auditRepository.updateConfig(guildId, req.body);

      // Audit de modification administrative
      logService.system(guildId, 'CONFIG_UPDATE', {
        actor: { id: 'ETHONE_ADMIN', tag: 'Administrateur Dashboard' },
        target: { id: guildId, type: 'CONFIG', name: 'Audit Center Settings' },
        reason: 'Modification de la configuration des logs et du routage',
        before: oldConfig.routing,
        after: updated.routing,
      });

      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de configuration invalides' });
    }
  });

  router.patch('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = auditRepository.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  return router;
}
