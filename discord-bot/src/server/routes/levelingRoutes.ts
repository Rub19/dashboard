import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { levelingStorage } from '../../modules/leveling/storage/levelingStorage.js';
import { xpWriteBuffer } from '../../modules/leveling/storage/xpWriteBuffer.js';
import { LevelCalculator } from '../../modules/leveling/services/levelCalculator.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { levelingService } from '../../modules/leveling/services/levelingService.js';
import { XpBoostScopeSchema, XpBoostTargetTypeSchema } from '../../modules/leveling/types/xpBoost.js';
import { z } from 'zod';
import { rateLimit } from '../middleware/antiAbuseMiddleware.js';

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

  // Admin XP adjustment (dashboard "Gérer XP" action) — delta can be
  // positive or negative, clamped so totalXp never goes below 0.
  router.post('/users/:userId/adjust', rateLimit('CONFIG', { byGuild: true, actionName: 'leveling_xp_adjust' }), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.params.userId);
    const delta = Number(req.body?.delta);

    if (!Number.isFinite(delta) || delta === 0) {
      res.status(400).json({ error: 'delta invalide' });
      return;
    }

    const user = xpWriteBuffer.getUser(guildId, userId);
    const totalXp = Math.max(0, user.totalXp + delta);
    const level = LevelCalculator.calculateLevel(totalXp);
    const updated = { ...user, totalXp, level };
    xpWriteBuffer.updateUser(updated);
    xpWriteBuffer.flushNow();

    const progress = LevelCalculator.getProgress(totalXp);
    res.json({ success: true, user: { ...updated, ...progress } });
  });

  // 4. Configuration Leveling
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = levelingStorage.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/config', rateLimit('CONFIG', { byGuild: true, actionName: 'leveling_config' }), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = levelingStorage.updateConfig(guildId, req.body);
      emitConfigUpdated('leveling', guildId, updated, 'DASHBOARD', req.user?.id);
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

  const snowflake = z.string().regex(/^\d{5,25}$/);
  const BoostBody = z
    .object({
      id: z.string().max(60).optional(),
      name: z.string().trim().min(1).max(60),
      multiplier: z.number().min(0).max(10),
      targetType: XpBoostTargetTypeSchema,
      targetId: snowflake.nullable().optional(),
      scope: XpBoostScopeSchema.default('all'),
      startTime: z.string().datetime().nullable().optional(),
      endTime: z.string().datetime().nullable().optional(),
      enabled: z.boolean().default(true),
    })
    .strict();

  /** La cible doit exister sur CE serveur (rôle, salon, catégorie) ; un membre est désigné par son identifiant. */
  const checkTarget = (guildId: string, b: z.infer<typeof BoostBody>): string | null => {
    const needsTarget = ['role', 'channel', 'category', 'member'].includes(b.targetType);
    if (!needsTarget) return null;
    if (!b.targetId) return 'Choisissez la cible du multiplicateur.';
    const guild = discordClient.guilds.cache.get(guildId);
    if (b.targetType === 'role' && !guild?.roles.cache.has(b.targetId)) return 'Rôle introuvable sur ce serveur';
    if (b.targetType === 'channel' && !guild?.channels.cache.has(b.targetId)) return 'Salon introuvable sur ce serveur';
    if (b.targetType === 'category' && guild?.channels.cache.get(b.targetId)?.type !== 4) return 'Catégorie introuvable sur ce serveur';
    return null;
  };

  router.post('/boosts', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const parsed = BoostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Multiplicateur invalide', details: parsed.error.flatten() });
      return;
    }
    const problem = checkTarget(guildId, parsed.data);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }
    if (parsed.data.startTime && parsed.data.endTime && parsed.data.endTime <= parsed.data.startTime) {
      res.status(400).json({ error: 'La fin doit être après le début.' });
      return;
    }
    try {
      const data = { ...parsed.data, targetId: ['server', 'event'].includes(parsed.data.targetType) ? null : parsed.data.targetId ?? null };
      const saved = levelingStorage.saveBoost(guildId, data);
      emitConfigUpdated('leveling', guildId, levelingStorage.getConfig(guildId), 'DASHBOARD', req.user?.id);
      res.json({ success: true, boost: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de boost invalides' });
    }
  });

  /** Active / désactive un multiplicateur sans le supprimer. */
  router.patch('/boosts/:boostId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const parsed = z.object({ enabled: z.boolean() }).strict().safeParse(req.body);
    const existing = levelingStorage.getBoosts(guildId).find((b) => b.id === String(req.params.boostId));
    if (!parsed.success || !existing) {
      res.status(parsed.success ? 404 : 400).json({ error: parsed.success ? 'Multiplicateur introuvable' : 'Requête invalide' });
      return;
    }
    const saved = levelingStorage.saveBoost(guildId, { ...existing, enabled: parsed.data.enabled });
    emitConfigUpdated('leveling', guildId, levelingStorage.getConfig(guildId), 'DASHBOARD', req.user?.id);
    res.json({ success: true, boost: saved });
  });

  /**
   * Aperçu : « combien d'XP gagnerait ce membre, dans ce salon, en message ou en vocal ? » avec la liste des multiplicateurs
   * qui comptent. Ne modifie rien.
   */
  router.get('/boosts/preview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);
    const userId = String(req.query.userId ?? '');
    const channelId = String(req.query.channelId ?? '');
    const scope = req.query.scope === 'voice' ? 'voice' : 'messages';
    if (!guild || !/^\d{5,25}$/.test(userId)) {
      res.status(400).json({ error: 'Identifiant de membre invalide' });
      return;
    }
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      res.status(404).json({ error: 'Membre introuvable sur ce serveur' });
      return;
    }
    const ch = channelId ? guild.channels.cache.get(channelId) : undefined;
    const thread = ch?.isThread() ?? false;
    const out = levelingService.effectiveMultiplier(
      guildId,
      member,
      { channelId: ch?.id ?? null, parentChannelId: thread ? ch?.parentId ?? null : null, categoryId: thread ? ch?.parent?.parentId ?? null : ch?.parentId ?? null },
      scope
    );
    const config = levelingStorage.getConfig(guildId);
    const base = scope === 'voice' ? config.voiceXpPerMinute : (config.minXp + config.maxXp) / 2;
    res.json({ member: { id: member.id, name: member.displayName }, scope, multiplier: out.multiplier, applied: out.applied, baseXp: base, xp: Math.round(base * out.multiplier * 10) / 10 });
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
