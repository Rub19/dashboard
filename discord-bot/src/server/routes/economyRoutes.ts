import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { economyStorage } from '../../modules/economy/storage/economyStorage.js';
import { economyService } from '../../modules/economy/services/economyService.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { rateLimit } from '../middleware/antiAbuseMiddleware.js';

export function createEconomyRouter(discordClient: Client) {
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

  // 3b. Historique des transactions (dashboard) — optionnellement filtré par membre
  router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const limit = Math.min(500, req.query.limit ? parseInt(String(req.query.limit), 10) || 50 : 50);
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    res.json({ transactions: economyStorage.getTransactions(guildId, limit, userId) });
  });

  // 3c. Activité (volume 24h, mouvements 24h, masse monétaire en circulation)
  router.get('/activity', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    res.json({ activity: economyStorage.getActivitySummary(guildId) });
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

  // 6. Réclamer le bonus quotidien depuis le web
  router.post('/daily', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Session du bot requise.' });
      return;
    }
    const guild = discordClient.guilds.cache.get(guildId);
    const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
    const userRef = {
      id: userId,
      username: member?.user.username || req.user?.username || 'Utilisateur',
      avatarUrl: member?.user.displayAvatarURL() || null,
    };
    const result = economyService.claimDaily(guildId, userRef);
    if (!result.ok) {
      res.status(400).json({
        error: result.reason === 'cooldown' ? 'Bonus déjà réclamé.' : 'L’économie est désactivée sur ce serveur.',
        reason: result.reason,
        remainingMs: result.remainingMs,
      });
      return;
    }
    res.json({ success: true, ...result });
  });

  // 7. Acheter un rôle de la boutique depuis le web
  router.post('/shop/:itemId/buy', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const itemId = String(req.params.itemId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Session du bot requise.' });
      return;
    }
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable.' });
      return;
    }
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      res.status(404).json({ error: 'Vous devez être membre de ce serveur pour effectuer un achat.' });
      return;
    }
    const result = await economyService.purchaseRole(guildId, member, itemId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: 'Article introuvable dans la boutique.',
        insufficient_funds: 'Solde insuffisant pour acheter ce rôle.',
        already_owned: 'Vous possédez déjà ce rôle sur le serveur.',
        role_unavailable: 'Le bot ne peut pas attribuer ce rôle (hiérarchie ou permissions insuffisantes).',
      };
      res.status(400).json({ error: messages[result.reason] || 'Achat impossible.' });
      return;
    }
    res.json({ success: true, item: result.item, balance: result.balance });
  });

  return router;
}
