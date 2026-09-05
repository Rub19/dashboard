import { Router, Request, Response } from 'express';
import { syncEngine, SyncMutation } from '../../services/syncEngine.js';
import { config } from '../../config.js';
import { authMiddleware } from '../middleware/auth.js';

export function createSyncRouter(): Router {
  const router = Router();

  // 1. GET /api/sync/stream - Flux SSE global réservé EXCLUSIVEMENT au Bot Owner
  router.get('/stream', authMiddleware, (req: Request, res: Response): void => {
    if (!req.user || req.user.id !== config.botOwnerId) {
      res.status(403).json({ error: 'Accès interdit. Le flux SSE global est réservé au propriétaire du bot.' });
      return;
    }
    const clientId = `sse_global_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    syncEngine.registerClient(clientId, res, undefined, req.user.id);
  });

  // 2. GET /api/sync/audit - Historique d'audit des mutations (Global réservé au Bot Owner)
  router.get('/audit', authMiddleware, (req: Request, res: Response): void => {
    const guildId = req.query.guildId as string | undefined;
    if (!guildId && req.user?.id !== config.botOwnerId) {
      res.status(403).json({ error: 'Accès interdit. L\'audit global est réservé au propriétaire du bot.' });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 50;
    const history = syncEngine.getAuditHistory(guildId, limit);
    res.json({ success: true, data: history });
  });

  // 3. GET /api/sync/status - Télémétrie du moteur de synchronisation
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        connectedClients: syncEngine.getConnectedClientsCount(),
        ownerId: config.botOwnerId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 4. POST /api/sync/mutate - Mutation synchronisée sécurisée
  router.post('/mutate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
      const { guildId, module, path, value, previousValue } = req.body;
      if (!module || !path) {
        res.status(400).json({ success: false, error: 'Champs module et path obligatoires.' });
        return;
      }

      // Si aucune guildId (mutation globale), seul le Bot Owner peut exécuter
      if (!guildId && req.user?.id !== config.botOwnerId) {
        res.status(403).json({ success: false, error: 'Mutations globales réservées au propriétaire du bot.' });
        return;
      }

      const userId = req.user?.id || 'unknown';
      const mutation: SyncMutation = {
        id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        guildId,
        module,
        path,
        value,
        previousValue,
        source: 'DASHBOARD',
        actorId: userId,
        timestamp: Date.now(),
      };

      // Exécution de la mutation avec broadcast temps réel automatique
      const result = await syncEngine.submitMutation(mutation, async (val) => {
        return { applied: true, value: val, executedAt: new Date().toISOString() };
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

export function createGuildSyncRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET /api/guilds/:guildId/sync/stream - Flux SSE cloisonné à un serveur
  router.get('/stream', (req: Request, res: Response) => {
    const { guildId } = req.params;
    const clientId = `sse_guild_${guildId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = (req as any).user?.id || (req.query.userId as string);
    syncEngine.registerClient(clientId, res, guildId, userId);
  });

  // GET /api/guilds/:guildId/sync/audit
  router.get('/audit', (req: Request, res: Response) => {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = syncEngine.getAuditHistory(guildId, limit);
    res.json({ success: true, data: history });
  });

  return router;
}
