import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { gamesStorage, DEFAULT_QUESTS } from '../../modules/games/storage/gamesStorage.js';
import { gamesService } from '../../modules/games/services/gamesService.js';
import { economyStorage } from '../../modules/economy/storage/economyStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

export function createGamesRoutes(client: Client): Router {
  const router = Router({ mergeParams: true });

  // Récupérer la vue d'ensemble du Casino avec infos monétaires
  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const overview = gamesStorage.getOverview(guildId);
    const ecoConfig = economyStorage.getConfig(guildId);
    res.json({
      ...overview,
      currencyName: ecoConfig.currencyName || 'Ethone Coins',
      currencySymbol: ecoConfig.currencySymbol || '🪙',
      economyEnabled: ecoConfig.enabled,
    });
  });

  // Récupérer la configuration des jeux
  router.get('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const config = gamesStorage.getConfig(guildId);
    const ecoConfig = economyStorage.getConfig(guildId);
    res.json({
      ...config,
      currencyName: ecoConfig.currencyName || 'Ethone Coins',
      currencySymbol: ecoConfig.currencySymbol || '🪙',
      economyEnabled: ecoConfig.enabled,
    });
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

  // Jouer une partie réelle (liée au portefeuille Ethone Coin) depuis le Dashboard
  router.post('/play', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const { gameType = 'blackjack', bet = 50, won = false, payout = 0, detail = '', mode = 'real' } = req.body || {};
    const userId = req.user?.id || req.body?.userId;
    const username = (req.user as any)?.username || req.body?.username || 'Joueur';

    const ecoConfig = economyStorage.getConfig(guildId);
    const currencyName = ecoConfig.currencyName || 'Ethone Coins';
    const currencySymbol = ecoConfig.currencySymbol || '🪙';

    // En mode réel, on valide le solde et effectue les transactions monétaires réelles
    if (mode === 'real' && userId) {
      const currentBalance = gamesService.getBalance(guildId, userId, username);

      if (bet > 0 && currentBalance < bet) {
        res.status(400).json({
          error: 'insufficient_funds',
          message: `Solde insuffisant en ${currencyName} (${currentBalance.toLocaleString('fr-FR')} ${currencySymbol} disponible, ${bet.toLocaleString('fr-FR')} ${currencySymbol} requis).`,
          balance: currentBalance,
        });
        return;
      }

      // Déduction de la mise
      if (bet > 0) {
        gamesService.deductBalance(guildId, userId, username, bet, `[Ethone Casino Web] ${gameType.toUpperCase()}: Mise`);
        // Contribution au jackpot
        const config = gamesStorage.getConfig(guildId);
        const contrib = Math.max(1, Math.round((bet * (config.jackpotContributionPercent || 2)) / 100));
        gamesStorage.addToJackpot(guildId, contrib);
      }

      // Crédit du gain si victoire
      const finalPayout = Number(payout) || 0;
      if (won && finalPayout > 0) {
        gamesService.addBalance(guildId, userId, username, finalPayout, `[Ethone Casino Web] ${gameType.toUpperCase()}: ${detail || 'Gain'}`);
      }

      const newBalance = gamesService.getBalance(guildId, userId, username);

      const record = gamesStorage.recordGame(guildId, {
        guildId,
        userId,
        username,
        gameType,
        bet,
        payout: finalPayout,
        net: finalPayout - bet,
        won: Boolean(won),
        detail: detail || `${gameType.toUpperCase()} sur Dashboard Web`,
      });

      emitConfigUpdated('games', guildId, { action: 'game_played', record, jackpotPool: gamesStorage.getJackpot(guildId) }, 'DASHBOARD', userId);
      emitConfigUpdated('economy', guildId, { action: 'balance_updated', userId, newBalance }, 'DASHBOARD', userId);

      res.json({
        success: true,
        won: Boolean(won),
        payout: finalPayout,
        net: finalPayout - bet,
        newBalance,
        jackpotPool: gamesStorage.getJackpot(guildId),
        record,
      });
      return;
    }

    // Mode Démo
    const finalPayout = Number(payout) || 0;
    const record = gamesStorage.recordGame(guildId, {
      guildId,
      userId: userId || 'demo_guest',
      username: username || 'Joueur Démo',
      gameType,
      bet,
      payout: finalPayout,
      net: finalPayout - bet,
      won: Boolean(won),
      detail: detail || `Démo ${gameType.toUpperCase()}`,
    });

    res.json({
      success: true,
      won: Boolean(won),
      payout: finalPayout,
      net: finalPayout - bet,
      jackpotPool: gamesStorage.getJackpot(guildId),
      record,
    });
  });

  return router;
}
