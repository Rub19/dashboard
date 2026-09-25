import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { z } from 'zod';
import { countingStorage } from '../../modules/counting/storage/countingStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

/** API Dashboard du module Comptage (derrière authMiddleware + createGuildAuthMiddleware, cf. server/index.ts). */
export function createCountingRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(countingStorage.getOverview(String(req.params.guildId)));
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const schema = z
      .object({
        enabled: z.boolean(),
        channelId: z.string().regex(/^\d{5,25}$/).nullable(),
        allowConsecutive: z.boolean(),
        resetOnMistake: z.boolean(),
      })
      .partial()
      .strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    // Le salon doit exister sur ce serveur (et être textuel) : jamais un identifiant quelconque.
    if (parsed.data.channelId) {
      const channel = client.guilds.cache.get(guildId)?.channels.cache.get(parsed.data.channelId);
      if (!channel || !channel.isTextBased()) {
        res.status(400).json({ error: 'Salon introuvable sur ce serveur' });
        return;
      }
    }
    const before = countingStorage.getConfig(guildId);
    // Changer de salon repart de zéro (l'ancien nombre n'a plus de sens ailleurs).
    const channelChanged = parsed.data.channelId !== undefined && parsed.data.channelId !== before.channelId;
    const updated = countingStorage.updateConfig(guildId, { ...parsed.data, ...(channelChanged ? { count: 0, lastUserId: null } : {}) });
    emitConfigUpdated('counting', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, ...countingStorage.getOverview(guildId) });
  });

  router.post('/reset', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const updated = countingStorage.resetCount(guildId);
    emitConfigUpdated('counting', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, ...countingStorage.getOverview(guildId) });
  });

  return router;
}
