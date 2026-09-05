import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { PresenceService } from '../../modules/presence/services/presenceService.js';
import { ActivityRotationEngine } from '../../modules/presence/services/activityRotationEngine.js';
import { PresenceSchedulerService } from '../../modules/presence/services/presenceSchedulerService.js';
import { SmartPresenceEngine } from '../../modules/presence/services/smartPresenceEngine.js';
import { BotIdentityService } from '../../modules/presence/services/botIdentityService.js';
import { config } from '../../config.js';
import { rateLimit, idempotent } from '../middleware/antiAbuseMiddleware.js';

export function createPresenceRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  const presenceService = PresenceService.getInstance();
  const rotationEngine = ActivityRotationEngine.getInstance();
  const schedulerService = PresenceSchedulerService.getInstance();
  const smartEngine = SmartPresenceEngine.getInstance();
  const identityService = BotIdentityService.getInstance();

  presenceService.initialize(client);
  identityService.initialize(client);

  // Guild-level in-memory preferred profile storage
  const guildPreferences = new Map<string, string>();

  // 1. GET /api/bot/presence (État actuel)
  router.get('/', (req: Request, res: Response) => {
    try {
      const state = presenceService.getCurrentState();
      const stats = presenceService.getStats();
      const rotConfig = rotationEngine.getConfig();

      res.json({
        success: true,
        data: {
          state,
          stats,
          rotationEnabled: rotConfig.enabled,
          nextRotationAt: rotConfig.nextRotationAt,
          scopeNotice: 'Discord applique la présence de manière globale par connexion Gateway (shard).',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. POST /api/bot/presence (Mettre à jour la présence)
  router.post(
    '/',
    rateLimit('CONFIG', { actionName: 'presence_update' }),
    idempotent({ scopePrefix: 'presence' }),
    (req: Request, res: Response) => {
    try {
      const { status, activity, reason, force } = req.body;
      if (!status || !activity || !activity.type || !activity.name) {
        res.status(400).json({ success: false, error: 'Champs status et activity (type, name) obligatoires.' });
        return;
      }

      const actor = req.user?.username || (req.user?.id === config.botOwnerId ? 'Bot Owner' : 'Staff ETHONE');
      const actorId = req.user?.id || config.botOwnerId;

      const result = presenceService.updatePresence(
        status,
        activity,
        actor,
        actorId,
        'manual',
        reason || 'Mise à jour manuelle',
        Boolean(force)
      );

      res.json({
        success: result.success,
        data: result.state,
        rateLimited: result.rateLimited,
        message: result.rateLimited
          ? 'Protection rate limit atteinte (max 5 updates/60s). Veuillez patienter.'
          : 'Présence mise à jour avec succès.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. GET /api/bot/presence/rotation
  router.get('/rotation', (req: Request, res: Response) => {
    try {
      const rotConfig = rotationEngine.getConfig();
      res.json({ success: true, data: rotConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. POST /api/bot/presence/rotation
  router.post('/rotation', (req: Request, res: Response) => {
    try {
      const updated = rotationEngine.updateConfig(req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. GET /api/bot/presence/schedule
  router.get('/schedule', (req: Request, res: Response) => {
    try {
      const slots = schedulerService.getSlots();
      res.json({ success: true, data: slots });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. POST /api/bot/presence/schedule
  router.post('/schedule', (req: Request, res: Response) => {
    try {
      const { slots } = req.body;
      const updated = schedulerService.updateSlots(slots || []);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 7. GET /api/bot/presence/profiles
  router.get('/profiles', (req: Request, res: Response) => {
    try {
      const profiles = schedulerService.getProfiles();
      res.json({ success: true, data: profiles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. POST /api/bot/presence/profiles/:id/apply
  router.post('/profiles/:id/apply', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const actor = req.user?.username || (req.user?.id === config.botOwnerId ? 'Bot Owner' : 'Staff');
      const applied = schedulerService.applyProfile(id, actor);
      if (!applied) {
        res.status(404).json({ success: false, error: `Profil ${id} introuvable.` });
        return;
      }
      res.json({ success: true, message: 'Profil appliqué avec succès.', state: presenceService.getCurrentState() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. GET /api/bot/presence/servers (Guilds où le bot est installé avec profil préféré)
  router.get('/servers', (req: Request, res: Response) => {
    try {
      const rawGuilds = client?.guilds?.cache?.values
        ? Array.from(client.guilds.cache.values())
        : Array.from(client?.guilds?.cache || []);

      const guilds = rawGuilds.map((g: any) => ({
        guildId: g.id,
        guildName: g.name,
        icon: typeof g.iconURL === 'function' ? g.iconURL() : null,
        botPresent: true,
        preferredProfileId: guildPreferences.get(g.id) || 'prof_community',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Bot Owner',
        notice: 'Ce serveur a un profil de présence préféré dans ETHONE, mais Discord diffuse la présence de manière globale pour cette connexion Gateway.',
      }));

      res.json({ success: true, data: guilds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. POST /api/bot/presence/servers/:guildId
  router.post('/servers/:guildId', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const { profileId } = req.body;
      guildPreferences.set(guildId, profileId || 'prof_community');
      res.json({ success: true, guildId, preferredProfileId: profileId });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 11. GET /api/bot/presence/identity
  router.get('/identity', (req: Request, res: Response) => {
    try {
      const identity = identityService.getIdentity();
      res.json({ success: true, data: identity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. POST /api/bot/presence/identity/username
  router.post('/identity/username', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string') {
        res.status(400).json({ success: false, error: 'Nouveau nom d\'utilisateur requis.' });
        return;
      }
      const result = await identityService.setUsername(username);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. POST /api/bot/presence/identity/avatar
  router.post('/identity/avatar', async (req: Request, res: Response) => {
    try {
      const { avatarUrl } = req.body;
      if (!avatarUrl) {
        res.status(400).json({ success: false, error: 'URL ou buffer d\'avatar requis.' });
        return;
      }
      const result = await identityService.setAvatar(avatarUrl);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. GET /api/bot/presence/history
  router.get('/history', (req: Request, res: Response) => {
    try {
      const history = presenceService.getAuditHistory();
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 15. POST /api/bot/presence/maintenance
  router.post('/maintenance', (req: Request, res: Response) => {
    try {
      const { enabled, reason } = req.body;
      smartEngine.setMaintenanceMode(Boolean(enabled), reason);
      res.json({ success: true, state: presenceService.getCurrentState() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
