import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Client } from 'discord.js';
import { gamesStorage } from '../../modules/games/storage/gamesStorage.js';
import { actBlackjack, playDice, playRoulette, startBlackjack } from '../../modules/games/services/webCasino.js';
import { economyStorage } from '../../modules/economy/storage/economyStorage.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { GamesConfigSchema } from '../../modules/games/types/games.js';
import { logger } from '../../utils/logger.js';

/** Plafond de la cagnotte alimentée depuis le dashboard. */
const JACKPOT_MAX = 10_000_000;
// Champs inconnus (ex. currencyName renvoyé par GET /config) ignorés ; jackpotPool retiré.
const ConfigPatchSchema = GamesConfigSchema.omit({ jackpotPool: true })
  .extend({ minBet: z.number().int().min(1).max(1_000_000), maxBet: z.number().int().min(10).max(1_000_000) })
  .partial();

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
    // Champs connus seulement (la cagnotte ne se règle pas ici : elle passe par /jackpot/seed, contrôlée et plafonnée).
    const parsed = ConfigPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_config', message: 'Réglages du casino invalides.', details: parsed.error.flatten() });
      return;
    }
    const merged = { ...gamesStorage.getConfig(guildId), ...parsed.data };
    if (merged.minBet > merged.maxBet) {
      res.status(400).json({ error: 'invalid_config', message: 'La mise minimale dépasse la mise maximale.' });
      return;
    }
    const updated = gamesStorage.updateConfig(guildId, parsed.data);
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

  // Alimenter la cagnotte du jackpot (Admin)
  router.post('/jackpot/seed', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const amount = Number(req.body?.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      res.status(400).json({ error: 'invalid_amount', message: 'Montant invalide (entre 1 et 1 000 000).' });
      return;
    }
    // La cagnotte crée de la monnaie : refusée quand le casino est coupé, et plafonnée.
    if (!gamesStorage.getConfig(guildId).enabled) {
      res.status(403).json({ error: 'disabled', message: 'Le casino est désactivé sur ce serveur : active le module avant d’alimenter la cagnotte.' });
      return;
    }
    if (gamesStorage.getJackpot(guildId) + amount > JACKPOT_MAX) {
      res.status(400).json({ error: 'jackpot_cap', message: `La cagnotte est plafonnée à ${JACKPOT_MAX.toLocaleString('fr-FR')}.` });
      return;
    }
    const updated = gamesStorage.addToJackpot(guildId, amount);
    logger.info(`[Games] Cagnotte de ${guildId} alimentée de ${amount} par ${req.user?.id ?? '?'} (total ${updated}).`);

    emitConfigUpdated('games', guildId, { action: 'jackpot_updated', jackpotPool: updated }, 'DASHBOARD', req.user?.id);
    res.json({ success: true, jackpotPool: updated });
  });

  // Parties jouées depuis le dashboard : le bot décide du résultat, le navigateur n'envoie que la mise et le choix.
  const player = (req: Request) => ({
    guildId: String(req.params.guildId),
    userId: req.user!.id,
    username: req.user!.globalName || req.user!.username,
  });
  const send = (res: Response, result: object): void => {
    const r = result as { error?: string; message?: string; httpStatus?: number };
    if (r.error) {
      res.status(r.httpStatus || 400).json({ error: r.error, message: r.message });
      return;
    }
    res.json({ success: true, ...result });
  };

  router.post('/roulette', (req: Request, res: Response): void => {
    send(res, playRoulette(player(req), req.body?.bet, req.body?.choice));
  });

  router.post('/dice', (req: Request, res: Response): void => {
    send(res, playDice(player(req), req.body?.bet));
  });

  router.post('/blackjack/start', (req: Request, res: Response): void => {
    send(res, startBlackjack(player(req), req.body?.bet));
  });

  router.post('/blackjack/:gameId/action', (req: Request, res: Response): void => {
    send(res, actBlackjack(player(req), String(req.params.gameId), req.body?.action));
  });

  return router;
}
