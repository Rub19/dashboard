import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { gamesStorage, DEFAULT_QUESTS } from '../../modules/games/storage/gamesStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

export function createGamesRoutes(client: Client): Router {
  const router = Router({ mergeParams: true });

  // Récupérer la vue d'ensemble du Casino
  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const overview = gamesStorage.getOverview(guildId);
    res.json(overview);
  });

  // Récupérer la configuration des jeux
  router.get('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const config = gamesStorage.getConfig(guildId);
    res.json(config);
  });

  // Mettre à jour la configuration
  router.patch('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const patch = req.body || {};

    const updated = gamesStorage.updateConfig(guildId, patch);
    emitConfigUpdated('games', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  // Historique récent des parties
  router.get('/history', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const limit = Number(req.query.limit) || 20;
    const history = gamesStorage.getHistory(guildId, limit);
    res.json({ history });
  });

  // Quêtes actives
  router.get('/quests', (_req: Request, res: Response): void => {
    res.json({ quests: DEFAULT_QUESTS });
  });

  // Alimenter la cagnotte du jackpot (Admin)
  router.post('/jackpot/seed', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const amount = Number(req.body?.amount) || 1000;
    const updated = gamesStorage.addToJackpot(guildId, amount);

    emitConfigUpdated('games', guildId, { action: 'jackpot_updated', jackpotPool: updated }, 'DASHBOARD', req.user?.id);
    res.json({ success: true, jackpotPool: updated });
  });

  // Simulation d'une partie démo pour le Dashboard
  router.post('/simulate', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const { gameType = 'blackjack', bet = 100 } = req.body || {};

    const won = Math.random() > 0.48;
    const payout = won ? (gameType === 'blackjack' ? Math.round(bet * 2) : Math.round(bet * 2)) : 0;

    const record = gamesStorage.recordGame(guildId, {
      guildId,
      userId: req.user?.id || 'demo_user',
      username: (req.user as any)?.username || 'Joueur Démo',
      gameType,
      bet,
      payout,
      net: payout - bet,
      won,
      detail: `Simulation Dashboard (${gameType.toUpperCase()})`,
    });

    res.json({ success: true, record, newJackpot: gamesStorage.getJackpot(guildId) });
  });

  return router;
}
