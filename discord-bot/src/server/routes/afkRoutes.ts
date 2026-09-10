import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { afkStorage } from '../../modules/afk/storage/afkStorage.js';
import { AfkConfigSchema } from '../../modules/afk/types/afk.js';

/**
 * API Dashboard du module AFK.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createAfkRouter(_client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(afkStorage.getOverview(String(req.params.guildId)));
  });

  router.get('/config', (req: Request, res: Response): void => {
    res.json(afkStorage.getConfig(String(req.params.guildId)));
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = AfkConfigSchema.partial().omit({ guildId: true, updatedAt: true });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    res.json({ success: true, config: afkStorage.updateConfig(guildId, parsed.data) });
  });

  // Retirer manuellement le statut AFK d'un membre.
  router.delete('/entries/:userId', (req: Request, res: Response): void => {
    const cleared = afkStorage.clear(String(req.params.guildId), String(req.params.userId));
    res.json({ success: !!cleared });
  });

  return router;
}
