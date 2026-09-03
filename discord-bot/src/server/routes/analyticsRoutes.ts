import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { analyticsService } from '../../modules/analytics/services/analyticsService.js';
import { TimeRangePeriodSchema } from '../../modules/analytics/types/analytics.js';

export function createAnalyticsRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble des Analytics
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const periodParam = (req.query.period as string) || '7d';
    const periodRes = TimeRangePeriodSchema.safeParse(periodParam);
    const period = periodRes.success ? periodRes.data : '7d';

    try {
      const data = analyticsService.getOverview(guildId, period, discordClient);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du calcul des analytics' });
    }
  });

  // 2. Exportation des Données (CSV / JSON)
  router.get('/export', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const periodParam = (req.query.period as string) || '7d';
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const periodRes = TimeRangePeriodSchema.safeParse(periodParam);
    const period = periodRes.success ? periodRes.data : '7d';

    try {
      const exported = analyticsService.exportData(guildId, period, format, discordClient);
      res.setHeader('Content-Type', exported.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      res.send(exported.content);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l’export des données' });
    }
  });

  return router;
}
