import { Router, Request, Response } from 'express';
import { syncEngine, SyncMutation } from '../../services/syncEngine.js';
import { config } from '../../config.js';

export function createSyncRouter(): Router {
  const router = Router();

  // 1. GET /api/sync/stream - Flux SSE global / Bot Owner
  router.get('/stream', (req: Request, res: Response) => {
    const clientId = `sse_global_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = (req as any).user?.id || (req.query.userId as string);
    syncEngine.registerClient(clientId, res, undefined, userId);
  });

  // 2. GET /api/sync/audit - Historique d'audit des mutations
  router.get('/audit', (req: Request, res: Response) => {
    const guildId = req.query.guildId as string | undefined;
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

  // 4. POST /api/sync/mutate - Mutation générique synchronisée
  router.post('/mutate', async (req: Request, res: Response) => {
    try {
      const { guildId, module, path, value, previousValue } = req.body;
      if (!module || !path) {
        res.status(400).json({ success: false, error: 'Champs module et path obligatoires.' });
        return;
      }

      const userId = (req as any).user?.id || config.botOwnerId;
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
        // Retourne la valeur appliquée (ou l'exécution spécifique du service)
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
