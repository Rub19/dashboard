import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { levelingStorage } from '../../modules/leveling/storage/levelingStorage.js';
import { xpWriteBuffer } from '../../modules/leveling/storage/xpWriteBuffer.js';
import { LevelCalculator } from '../../modules/leveling/services/levelCalculator.js';

export function createLevelingRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const overview = levelingStorage.getOverview(guildId);
    res.json(overview);
  });

  // 2. Classement (Leaderboard)
  router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const search = req.query.search ? String(req.query.search) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;

    const leaderboard = levelingStorage.getLeaderboard(guildId, search, limit);
    res.json({ leaderboard });
  });

  // 3. Fiche profil d'un membre
  router.get('/users/:userId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);

    const user = xpWriteBuffer.getUser(guildId, userId);
    const progress = LevelCalculator.getProgress(user.totalXp);
    const all = levelingStorage.getLeaderboard(guildId);
    const rank = all.findIndex((u) => u.userId === userId) + 1 || all.length + 1;

    res.json({
      user: {
        ...user,
        rank,
        currentLevelXp: progress.currentLevelXp,
        nextLevelXp: progress.nextLevelXp,
        progressPercentage: progress.progressPercentage,
      },
    });
  });

  // 4. Configuration Leveling
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = levelingStorage.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = levelingStorage.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Configuration invalide' });
    }
  });

  // 5. Récompenses de Rôles
  router.get('/rewards', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const rewards = levelingStorage.getRewards(guildId);
    res.json({ rewards });
  });

  router.post('/rewards', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const saved = levelingStorage.saveReward(guildId, req.body);
      res.json({ success: true, reward: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de récompense invalides' });
    }
  });

  router.delete('/rewards/:rewardId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const rewardId = String(req.params.rewardId);

    levelingStorage.deleteReward(guildId, rewardId);
    res.json({ success: true });
  });

  // 6. Multiplicateurs & Boosts
  router.get('/boosts', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const boosts = levelingStorage.getBoosts(guildId);
    res.json({ boosts });
  });

  router.post('/boosts', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const saved = levelingStorage.saveBoost(guildId, req.body);
      res.json({ success: true, boost: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de boost invalides' });
    }
  });

  router.delete('/boosts/:boostId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const boostId = String(req.params.boostId);

    levelingStorage.deleteBoost(guildId, boostId);
    res.json({ success: true });
  });

  // 7. Réinitialisation sécurisée
  router.post('/reset', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { targetUserId } = req.body;

    if (targetUserId) {
      xpWriteBuffer.resetUser(guildId, targetUserId);
      res.json({ success: true, message: 'Utilisateur réinitialisé' });
    } else {
      xpWriteBuffer.resetGuild(guildId);
      res.json({ success: true, message: 'Serveur réinitialisé' });
    }
  });

  return router;
}
