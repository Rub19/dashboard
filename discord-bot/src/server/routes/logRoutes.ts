import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { logStorage } from '../../modules/logs/storage/logStorage.js';
import { LogCategory, LogType } from '../../modules/logs/types/logEvent.js';

export function createLogRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble des logs & Statistiques
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const overview = logStorage.getOverview(guildId);
    res.json(overview);
  });

  // 2. Recherche et exploration des événements
  router.get('/events', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { category, type, search, period, limit, offset } = req.query;

    const result = logStorage.searchLogs(guildId, {
      category: (category as LogCategory | 'all') || 'all',
      type: (type as LogType | 'all') || 'all',
      search: search ? String(search) : undefined,
      period: (period as '24h' | '7d' | '30d' | 'all') || 'all',
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json(result);
  });

  // 3. Configuration des logs
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = logStorage.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = logStorage.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  return router;
}
