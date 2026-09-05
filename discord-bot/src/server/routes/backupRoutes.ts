import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { backupService } from '../../modules/backup/services/backupService.js';
import { backupRepository } from '../../modules/backup/storage/backupRepository.js';
import { logger } from '../../utils/logger.js';
import { rateLimit, idempotent, guildLock } from '../middleware/antiAbuseMiddleware.js';

export function createBackupRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  // 1. Vue d'ensemble & KPIs
  router.get('/overview', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const overview = backupService.getOverview(guildId);
      res.json(overview);
    } catch (err: any) {
      logger.error('Erreur GET /backups/overview :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 2. Liste des sauvegardes avec filtres
  router.get('/', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { type, status, search } = req.query;

      const backups = backupService.listBackups(guildId, {
        type: type as string,
        status: status as string,
        search: search as string,
      });

      res.json({ backups, total: backups.length });
    } catch (err: any) {
      logger.error('Erreur GET /backups :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 3. Création d'une sauvegarde
  router.post(
    '/',
    guildLock('BACKUP_CREATE', 60000),
    rateLimit('SENSITIVE', { byGuild: true, actionName: 'backup_create' }),
    idempotent({ scopePrefix: 'backup_create' }),
    async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { name, description, type, isProtected, includedComponents } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Le nom de la sauvegarde est requis' });
      }

      const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };

      const snapshot = await backupService.createBackup({
        guildId,
        name,
        description,
        type,
        isProtected: Boolean(isProtected),
        includedComponents,
        creator: {
          id: user.id,
          tag: user.username,
        },
      });

      res.status(201).json(snapshot);
    } catch (err: any) {
      logger.error('Erreur POST /backups :', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la création de la sauvegarde' });
    }
  });

  // 3b. Import d'une sauvegarde (.ethone-backup.json)
  router.post(
    '/import',
    guildLock('BACKUP_CREATE', 30000),
    rateLimit('SENSITIVE', { byGuild: true, actionName: 'backup_import' }),
    idempotent({ scopePrefix: 'backup_import' }),
    async (req: Request, res: Response) => {
      try {
        const { guildId } = req.params;
        const { payload, allowCrossGuildMigration } = req.body;

        if (!payload || typeof payload !== 'object') {
          return res.status(400).json({ error: 'Payload de sauvegarde requis' });
        }

        const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };
        const snapshot = await backupService.importBackup({
          guildId,
          rawPayload: payload,
          allowCrossGuildMigration: Boolean(allowCrossGuildMigration),
          importer: {
            id: user.id,
            tag: user.username,
          },
        });

        res.status(201).json(snapshot);
      } catch (err: any) {
        logger.error('Erreur POST /backups/import :', err);
        res.status(400).json({ error: err.message || 'Erreur lors de l\'importation' });
      }
    }
  );

  // 4. Paramètres de planification & rétention
  router.get('/settings', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const settings = backupRepository.getSettings(guildId);
      res.json(settings);
    } catch (err: any) {
      logger.error('Erreur GET /backups/settings :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  router.put('/settings', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const updated = backupRepository.saveSettings(guildId, req.body);
      res.json(updated);
    } catch (err: any) {
      logger.error('Erreur PUT /backups/settings :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 5. Comparaison de deux sauvegardes (ou snapshot vs live)
  router.post('/compare', async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { backupAId, backupBId } = req.body;

      if (!backupAId || !backupBId) {
        return res.status(400).json({ error: 'backupAId et backupBId sont requis' });
      }

      const diff = await backupService.compare(guildId, backupAId, backupBId);
      res.json(diff);
    } catch (err: any) {
      logger.error('Erreur POST /backups/compare :', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la comparaison' });
    }
  });

  // 6. Suivi d'un job de restauration
  router.get('/jobs/:jobId', (req: Request, res: Response) => {
    try {
      const { guildId, jobId } = req.params;
      const job = backupService.getJob(guildId, jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job introuvable' });
      }
      res.json(job);
    } catch (err: any) {
      logger.error('Erreur GET /backups/jobs/:jobId :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 7. Détail d'une sauvegarde spécifique & vérification d'intégrité
  router.get('/:backupId', (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const result = backupService.getBackup(guildId, backupId);
      if (!result.snapshot) {
        return res.status(404).json({ error: 'Sauvegarde introuvable' });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur GET /backups/:backupId :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 8. Test / Dry-Run d'une sauvegarde
  router.post('/:backupId/test', (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const testResult = backupService.testBackup(guildId, backupId);
      res.json(testResult);
    } catch (err: any) {
      logger.error('Erreur POST /backups/:backupId/test :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 9. Téléchargement du fichier de sauvegarde (.ethone-backup / JSON)
  router.get('/:backupId/download', (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const result = backupService.getBackup(guildId, backupId);
      if (!result.snapshot) {
        return res.status(404).json({ error: 'Sauvegarde introuvable' });
      }

      const fileName = `${result.snapshot.backupId}.ethone-backup.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result.snapshot, null, 2));
    } catch (err: any) {
      logger.error('Erreur GET /backups/:backupId/download :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 10. Basculer la protection d'un snapshot
  router.patch('/:backupId/protect', (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const { isProtected } = req.body;
      const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };

      const ok = backupService.toggleProtection(guildId, backupId, Boolean(isProtected), {
        id: user.id,
        tag: user.username,
      });

      if (!ok) {
        return res.status(404).json({ error: 'Sauvegarde introuvable' });
      }

      res.json({ success: true, isProtected: Boolean(isProtected) });
    } catch (err: any) {
      logger.error('Erreur PATCH /backups/:backupId/protect :', err);
      res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
  });

  // 11. Suppression d'une sauvegarde
  router.delete('/:backupId', (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };

      const ok = backupService.deleteBackup(guildId, backupId, {
        id: user.id,
        tag: user.username,
      });

      if (!ok) {
        return res.status(404).json({ error: 'Sauvegarde introuvable' });
      }

      res.json({ success: true, message: 'Sauvegarde supprimée avec succès' });
    } catch (err: any) {
      logger.error('Erreur DELETE /backups/:backupId :', err);
      res.status(400).json({ error: err.message || 'Erreur lors de la suppression' });
    }
  });

  // 12. Prévisualisation de la restauration
  router.post('/:backupId/preview-restore', async (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const { safetyLevel, mode, selectedComponents } = req.body;

      const plan = await backupService.previewRestore({
        guildId,
        backupId,
        safetyLevel,
        mode,
        selectedComponents,
      });

      res.json(plan);
    } catch (err: any) {
      logger.error('Erreur POST /backups/:backupId/preview-restore :', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la prévisualisation' });
    }
  });

  // 13. Exécution de la restauration
  router.post(
    '/:backupId/restore',
    guildLock('BACKUP_RESTORE', 120000),
    rateLimit('SENSITIVE', { byGuild: true, actionName: 'backup_restore' }),
    idempotent({ scopePrefix: 'backup_restore' }),
    async (req: Request, res: Response) => {
    try {
      const { guildId, backupId } = req.params;
      const { safetyLevel, mode, selectedComponents, confirmServerName } = req.body;

      // Protection supplémentaire pour le mode destructif
      if (safetyLevel === 'DESTRUCTIVE') {
        const guild = client.guilds.cache.get(guildId);
        if (guild && confirmServerName !== guild.name) {
          return res.status(400).json({
            error: `Le nom du serveur saisi ne correspond pas ("${guild.name}"). Confirmation destructive refusée.`,
          });
        }
      }

      const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };

      const job = await backupService.executeRestore({
        guildId,
        backupId,
        safetyLevel,
        mode,
        selectedComponents,
        actor: { id: user.id, tag: user.username },
      });

      res.json(job);
    } catch (err: any) {
      logger.error('Erreur POST /backups/:backupId/restore :', err);
      res.status(500).json({ error: err.message || 'Erreur lors du lancement de la restauration' });
    }
  });

  return router;
}
