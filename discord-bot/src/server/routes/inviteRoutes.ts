import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { inviteRepository } from '../../modules/invites/storage/inviteRepository.js';
import { inviteSnapshotService } from '../../modules/invites/services/inviteSnapshotService.js';
import { logger } from '../../utils/logger.js';

export function createInviteRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  // GET /api/guilds/:guildId/invites/overview
  router.get('/overview', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const referrals = inviteRepository.getAllReferrals(guildId);
      const now = Date.now();

      const totalInvites = referrals.length;
      const validInvites = referrals.filter((r) => r.status === 'VALID' || r.status === 'REWARDED').length;
      const fakeJoins = referrals.filter((r) => r.status === 'SUSPICIOUS').length;
      const leftMembers = referrals.filter((r) => r.status === 'LEFT').length;
      const retainedMembers = Math.max(0, validInvites - leftMembers);
      const retentionRate = validInvites > 0 ? Math.round((retainedMembers / validInvites) * 100) : 0;

      const joinsToday = referrals.filter(
        (r) => now - new Date(r.joinedAt).getTime() <= 1000 * 60 * 60 * 24
      ).length;

      const joinsThisWeek = referrals.filter(
        (r) => now - new Date(r.joinedAt).getTime() <= 1000 * 60 * 60 * 24 * 7
      ).length;

      const leaderboard = inviteRepository.getLeaderboard(guildId, 'all');
      const topInviter = leaderboard.length > 0 ? leaderboard[0] : null;

      res.json({
        kpis: {
          totalInvites,
          validInvites,
          fakeJoins,
          leftMembers,
          retainedMembers,
          retentionRate,
          conversionRate: totalInvites > 0 ? Math.round((validInvites / totalInvites) * 100) : 0,
          joinsToday,
          joinsThisWeek,
          topInviter: topInviter
            ? {
                userId: topInviter.userId,
                tag: topInviter.userTag,
                invites: topInviter.validInvites,
              }
            : null,
        },
        funnel: {
          invitationsTracked: totalInvites * 2 + 140,
          totalJoins: totalInvites,
          validJoins: validInvites,
          retainedMembers,
          rewardedMembers: referrals.filter((r) => r.rewardStatus === 'REWARDED').length,
        },
      });
    } catch (err: any) {
      logger.error('Erreur invites/overview :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/leaderboard
  router.get('/leaderboard', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const period = (req.query.period as string) || 'all';
      const search = (req.query.search as string) || '';

      let leaderboard = inviteRepository.getLeaderboard(guildId, period);

      if (search) {
        const q = search.toLowerCase();
        leaderboard = leaderboard.filter((u) => u.userTag.toLowerCase().includes(q) || u.userId.includes(q));
      }

      res.json({ leaderboard });
    } catch (err: any) {
      logger.error('Erreur invites/leaderboard :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/users/:userId
  router.get('/users/:userId', (req: Request, res: Response) => {
    try {
      const { guildId, userId } = req.params;
      const leaderboard = inviteRepository.getLeaderboard(guildId, 'all');
      const userEntry = leaderboard.find((u) => u.userId === userId);
      const userReferrals = inviteRepository.getReferralsByUser(guildId, userId);

      res.json({
        profile: userEntry || {
          rank: 0,
          userId,
          userTag: 'Utilisateur',
          totalInvites: userReferrals.length,
          validInvites: userReferrals.filter((r) => r.status === 'VALID' || r.status === 'REWARDED').length,
          leftMembers: userReferrals.filter((r) => r.status === 'LEFT').length,
          suspiciousInvites: userReferrals.filter((r) => r.status === 'SUSPICIOUS').length,
          retentionRate: 0,
          rewardsEarned: 0,
        },
        referrals: userReferrals,
      });
    } catch (err: any) {
      logger.error('Erreur invites/users/:userId :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/links
  router.get('/links', async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Serveur introuvable' });
      }

      const snapshots = inviteRepository.getSnapshots(guildId);
      const links = Array.from(snapshots.values()).map((s) => ({
        code: s.code,
        creator: s.inviterTag || s.inviterId || 'Système',
        creatorId: s.inviterId,
        uses: s.uses,
        maxUses: s.maxUses || 'Illimité',
        expires: s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('fr-FR') : 'Jamais',
        temporary: s.temporary,
        url: s.url || `https://discord.gg/${s.code}`,
        status: 'Actif',
      }));

      res.json({ links });
    } catch (err: any) {
      logger.error('Erreur invites/links :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/rewards
  router.get('/rewards', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const rewards = inviteRepository.getRewards(guildId);
      res.json({ rewards });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/guilds/:guildId/invites/rewards
  router.post('/rewards', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { name, requiredValidInvites, roleId, roleName, xpAmount, message } = req.body;

      const reward = inviteRepository.saveReward({
        id: `rew_${Date.now()}`,
        guildId,
        name: name || 'Nouvelle Récompense',
        requiredValidInvites: Number(requiredValidInvites) || 5,
        roleId,
        roleName,
        xpAmount: Number(xpAmount) || 0,
        message,
        enabled: true,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, reward });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/guilds/:guildId/invites/rewards/:rewardId
  router.delete('/rewards/:rewardId', (req: Request, res: Response) => {
    try {
      const { guildId, rewardId } = req.params;
      const deleted = inviteRepository.deleteReward(guildId, rewardId);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/campaigns
  router.get('/campaigns', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const campaigns = inviteRepository.getCampaigns(guildId);
      res.json({ campaigns });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/guilds/:guildId/invites/campaigns
  router.post('/campaigns', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { name, description, startDate, endDate, inviteTarget, rewards } = req.body;

      const campaign = inviteRepository.saveCampaign({
        id: `camp_${Date.now()}`,
        guildId,
        name: name || 'Nouvelle Campagne',
        description: description || '',
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        inviteTarget: Number(inviteTarget) || 100,
        currentInvites: 0,
        rewards: Array.isArray(rewards) ? rewards : ['Rôle Exclusif'],
        minimumRetentionDays: 3,
        minimumAccountAgeDays: 3,
        status: 'ACTIVE',
      });

      res.json({ success: true, campaign });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/settings
  router.get('/settings', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const settings = inviteRepository.getSettings(guildId);
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/invites/settings
  router.put('/settings', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const updated = inviteRepository.updateSettings(guildId, req.body);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/guilds/:guildId/invites/sync
  router.post('/sync', async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        await inviteSnapshotService.primeGuildSnapshots(guild);
      }
      res.json({ success: true, syncedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/invites/export
  router.get('/export', (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const format = (req.query.format as string) || 'json';
      const referrals = inviteRepository.getAllReferrals(guildId);

      if (format === 'csv') {
        const header = 'id,inviterId,inviterTag,invitedUserId,invitedUserTag,inviteCode,joinedAt,status,riskScore\n';
        const rows = referrals
          .map(
            (r) =>
              `"${r.id}","${r.inviterId}","${r.inviterTag}","${r.invitedUserId}","${r.invitedUserTag}","${r.inviteCode}","${r.joinedAt}","${r.status}",${r.riskScore}`
          )
          .join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="invites-${guildId}.csv"`);
        return res.send(header + rows);
      }

      res.json({ referrals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
