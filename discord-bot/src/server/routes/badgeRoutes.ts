import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { scanBadges } from '../../modules/serverInfo/badgeScanner.js';
import { trq } from '../../utils/tr.js';

export function createBadgeRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: trq('Serveur introuvable') });
      return;
    }
    try {
      res.json(await scanBadges(guild, req.query.refresh === '1'));
    } catch {
      res.status(502).json({ error: trq('Impossible d\'analyser les membres pour le moment') });
    }
  });

  return router;
}
