import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { economyStorage } from '../../modules/economy/storage/economyStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { rateLimit } from '../middleware/antiAbuseMiddleware.js';

export function createEconomyRouter(_discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = economyStorage.getConfig(guildId);
    const leaderboard = economyStorage.getLeaderboard(guildId, config.leaderboardSize);
    res.json({
      enabled: config.enabled,
      currencyName: config.currencyName,
      currencySymbol: config.currencySymbol,
      topWallet: leaderboard[0] || null,
      config,
    });
  });

  // 2. Classement
  router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    res.json({ leaderboard: economyStorage.getLeaderboard(guildId, limit) });
  });

  // 3. Portefeuille d'un membre
  router.get('/wallets/:userId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);
    res.json({ wallet: economyStorage.getWallet(guildId, userId) });
  });

  // 4. Configuration
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    res.json({ config: economyStorage.getConfig(guildId) });
  });

  router.patch('/config', rateLimit('CONFIG', { byGuild: true, actionName: 'economy_config' }), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = economyStorage.updateConfig(guildId, req.body);
      emitConfigUpdated('economy', guildId, updated, 'DASHBOARD', req.user?.id);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Configuration invalide' });
    }
  });

  // 5. Boutique
  router.get('/shop', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    res.json({ items: economyStorage.getShopItems(guildId) });
  });

  router.post('/shop', rateLimit('CONFIG', { byGuild: true, actionName: 'economy_shop_save' }), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const saved = economyStorage.saveShopItem(guildId, req.body);
      res.json({ success: true, item: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Article invalide' });
    }
  });

  router.delete('/shop/:itemId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const itemId = String(req.params.itemId);
    economyStorage.deleteShopItem(guildId, itemId);
    res.json({ success: true });
  });

  return router;
}
