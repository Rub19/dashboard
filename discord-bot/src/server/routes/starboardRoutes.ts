import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { starboardStorage } from '../../modules/starboard/storage/starboardStorage.js';
import { StarboardConfigSchema } from '../../modules/starboard/types/starboard.js';

/**
 * API Dashboard du module Starboard.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createStarboardRouter(_discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // Vue d'ensemble + statistiques
  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(starboardStorage.getOverview(guildId));
  });

  // Configuration courante
  router.get('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(starboardStorage.getConfig(guildId));
  });

  // Mise à jour de la configuration (patch partiel validé par zod)
  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = StarboardConfigSchema.partial().omit({ guildId: true, createdAt: true, updatedAt: true });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    const updated = starboardStorage.updateConfig(guildId, parsed.data);
    res.json({ success: true, config: updated });
  });

  // Liste des messages étoilés (les plus étoilés en premier)
  router.get('/entries', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json({ entries: starboardStorage.getGuildEntries(guildId) });
  });

  return router;
}
