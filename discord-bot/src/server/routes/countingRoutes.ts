import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { z } from 'zod';
import { countingStorage } from '../../modules/counting/storage/countingStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

/** API Dashboard du module Comptage (derrière authMiddleware + createGuildAuthMiddleware, cf. server/index.ts). */
export function createCountingRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  /** Vue d'ensemble avec pseudo et avatar des membres du classement (« Ancien membre » s'ils ont quitté le serveur). */
  const overviewWithNames = async (guildId: string) => {
    const overview = countingStorage.getOverview(guildId);
    const guild = client.guilds.cache.get(guildId);
    const ids = overview.leaderboard.map((e) => e.userId);
    const found = guild && ids.length > 0 ? await guild.members.fetch({ user: ids.slice(0, 100) }).catch(() => null) : null;
    return {
      ...overview,
      leaderboard: overview.leaderboard.map((e) => {
        const m = found?.get(e.userId) ?? guild?.members.cache.get(e.userId);
        return { ...e, name: m?.displayName ?? 'Ancien membre', avatarUrl: m?.user.displayAvatarURL({ extension: 'png', size: 64 }) ?? null };
      }),
    };
  };

  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    res.json(await overviewWithNames(String(req.params.guildId)));
  });

  router.put('/config', async (req: Request, res: Response): Promise<void> => {
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
    res.json({ success: true, ...(await overviewWithNames(guildId)) });
  });

  router.post('/reset', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const updated = countingStorage.resetCount(guildId);
    emitConfigUpdated('counting', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, ...(await overviewWithNames(guildId)) });
  });

  return router;
}
