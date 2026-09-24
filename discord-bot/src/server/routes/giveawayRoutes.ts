import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { giveawayStorage } from '../../modules/giveaways/storage/giveawayStorage.js';
import { giveawayService } from '../../modules/giveaways/services/giveawayService.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

export function createGiveawayRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const overview = giveawayStorage.getOverview(guildId);
    res.json(overview);
  });

  // Salons texte du serveur (sélecteur du dashboard) — même convention que reminderRoutes.ts.
  router.get('/channels', (req: Request, res: Response): void => {
    const guild = discordClient.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  });

  // Rôles du serveur (sélecteur requis/exclu du dashboard) — même convention que welcomeRoutes.ts.
  router.get('/roles', (req: Request, res: Response): void => {
    const guild = discordClient.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ roles: [] });
      return;
    }
    const roles = guild.roles.cache
      .filter((r) => r.name !== '@everyone')
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
      .sort((a, b) => b.position - a.position);
    res.json({ roles });
  });

  // 2. Liste des Giveaways
  router.get('/list', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const giveaways = giveawayStorage.getForGuild(guildId);
    res.json({ giveaways });
  });

  // 3. Créer un Giveaway (depuis le wizard Dashboard)
  router.post('/create', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const {
        channelId,
        prize,
        description,
        winnerCount,
        durationMinutes,
        rewardRoleId,
        bannerUrl,
        requirements,
        requireClaim,
        claimTimeoutHours,
      } = req.body;

      if (!channelId || !prize || !durationMinutes) {
        res.status(400).json({ error: 'Champs requis manquants (channelId, prize, durationMinutes)' });
        return;
      }

      const giveaway = await giveawayService.createGiveaway(discordClient, {
        guildId,
        channelId,
        prize,
        description,
        winnerCount: Number(winnerCount) || 1,
        durationMinutes: Number(durationMinutes),
        rewardRoleId: rewardRoleId || null,
        bannerUrl: bannerUrl || null,
        hostedById: (req as any).user?.id || 'dashboard_admin',
        hostedByTag: (req as any).user?.username || 'Dashboard Admin',
        requirements,
        requireClaim: Boolean(requireClaim),
        claimTimeoutHours: Number(claimTimeoutHours) || 24,
      });

      emitConfigUpdated('giveaways', guildId, giveaway, 'DASHBOARD', (req as any).user?.id);
      res.json({ success: true, giveaway });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la création du giveaway' });
    }
  });

  // 4. Terminer manuellement
  router.post('/:id/end', async (req: Request, res: Response): Promise<void> => {
    const giveawayId = String(req.params.id);
    try {
      const winners = await giveawayService.endGiveawayManual(giveawayId, discordClient);
      res.json({ success: true, winners });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la clôture du giveaway' });
    }
  });

  // 5. Reroll
  router.post('/:id/reroll', async (req: Request, res: Response): Promise<void> => {
    const giveawayId = String(req.params.id);
    const count = req.body.count ? parseInt(String(req.body.count), 10) : 1;
    try {
      const winners = await giveawayService.reroll(giveawayId, discordClient, count);
      res.json({ success: true, winners });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors du reroll' });
    }
  });

  // 6. Annuler
  router.post('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
    const giveawayId = String(req.params.id);
    try {
      const ok = await giveawayService.cancelGiveaway(giveawayId, discordClient);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l’annulation du giveaway' });
    }
  });

  // 7. Prolonger
  router.post('/:id/extend', async (req: Request, res: Response): Promise<void> => {
    const giveawayId = String(req.params.id);
    const minutes = req.body.minutes ? parseInt(String(req.body.minutes), 10) : 1440; // défaut 24h
    try {
      const ok = await giveawayService.extendGiveaway(giveawayId, minutes, discordClient);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de l’extension du giveaway' });
    }
  });

  // 8. Participants
  router.get('/:id/participants', async (req: Request, res: Response): Promise<void> => {
    const giveawayId = String(req.params.id);
    const gw = giveawayStorage.getById(giveawayId);
    if (!gw) {
      res.status(404).json({ error: 'Giveaway introuvable' });
      return;
    }
    res.json({ participants: gw.participants });
  });

  router.delete('/:id/participants/:userId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const giveawayId = String(req.params.id);
    const userId = String(req.params.userId);

    // Le tirage doit appartenir à CE serveur (sinon un admin pourrait retirer des participants ailleurs).
    if (giveawayStorage.getById(giveawayId)?.guildId !== guildId) {
      res.status(404).json({ success: false, error: 'Tirage introuvable sur ce serveur.' });
      return;
    }
    const ok = giveawayStorage.removeParticipant(giveawayId, userId);
    if (ok) {
      await giveawayService.updateMessage(discordClient, giveawayId);
    }
    res.json({ success: ok });
  });

  return router;
}
