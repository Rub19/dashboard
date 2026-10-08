import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { ServerOverviewService } from '../../modules/server/services/serverOverviewService.js';
import { ServerMemberService } from '../../modules/server/services/serverMemberService.js';
import { ServerChannelService } from '../../modules/server/services/serverChannelService.js';
import { ServerRoleService } from '../../modules/server/services/serverRoleService.js';
import { ServerPermissionDebugger } from '../../modules/server/services/serverPermissionDebugger.js';
import { ServerEmojiService } from '../../modules/server/services/serverEmojiService.js';
import { ServerWebhookService } from '../../modules/server/services/serverWebhookService.js';
import { ServerSettingsService } from '../../modules/server/services/serverSettingsService.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { logStorage } from '../../modules/logs/storage/logStorage.js';
import { logger } from '../../utils/logger.js';
import { handleRouteError } from '../utils/routeError.js';
import { protectionLogCoverage, runSecurityScan, securityScanStore } from '../../modules/server/services/securityScanService.js';
import { applyProtectionSetup, planProtectionSetup } from '../../modules/server/services/protectionSetupService.js';

export function createServerRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  // 1. GET /overview
  router.get('/overview', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const data = await ServerOverviewService.getOverview(client, guildId);
      if (!data) {
        return res.status(404).json({ error: 'Serveur introuvable.' });
      }
      res.json(data);
    } catch (err: any) {
      logger.error('Erreur server/overview :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 2. GET /health
  router.get('/health', (req: Request, res: Response) => {
    try {
      const health = ServerOverviewService.calculateHealthScore(client);
      res.json(health);
    } catch (err: any) {
      logger.error('Erreur server/health :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 3. GET /search
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const q = (req.query.q as string) || '';
      const results = await ServerOverviewService.searchGlobal(client, guildId, q);
      res.json(results);
    } catch (err: any) {
      logger.error('Erreur server/search :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 4. GET /members
  router.get('/members', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 25;
      const search = (req.query.search as string) || '';
      const filter = (req.query.filter as any) || 'all';

      const data = await ServerMemberService.getMembers(client, guildId, {
        page,
        limit,
        search,
        filter,
      });
      res.json(data);
    } catch (err: any) {
      logger.error('Erreur server/members :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 5. GET /members/:userId
  router.get('/members/:userId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const userId = req.params.userId as string;
      const profile = await ServerMemberService.getMemberProfile(client, guildId, userId);
      if (!profile) {
        return res.status(404).json({ error: 'Membre introuvable.' });
      }
      res.json({ profile });
    } catch (err: any) {
      logger.error('Erreur server/members/:userId :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 6. POST /members/:userId/action
  router.post('/members/:userId/action', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const userId = req.params.userId as string;
      const { action, payload } = req.body;
      const actorTag = (req as any).user?.username || 'Dashboard Admin';

      const result = await ServerMemberService.executeAction(client, guildId, userId, action, payload || {}, actorTag);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur server/members/:userId/action :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 7. GET /channels
  router.get('/channels', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const tree = await ServerChannelService.getChannelTree(client, guildId);
      res.json(tree);
    } catch (err: unknown) {
      handleRouteError(err, res, 'Erreur serveur');
    }
  });

  // 8. POST /channels
  router.post('/channels', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const result = await ServerChannelService.createChannel(client, guildId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result);
    } catch (err: any) {
      logger.error('Erreur creation server/channels :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 9. PUT /channels/:channelId
  router.put('/channels/:channelId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const channelId = req.params.channelId as string;
      const result = await ServerChannelService.updateChannel(client, guildId, channelId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur modification server/channels/:id :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 10. DELETE /channels/:channelId
  router.delete('/channels/:channelId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const channelId = req.params.channelId as string;
      const reason = req.body?.reason || 'Supprimé via ETHONE Dashboard';
      const result = await ServerChannelService.deleteChannel(client, guildId, channelId, reason);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur suppression server/channels/:id :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 11. GET /channels/:channelId/permissions
  router.get('/channels/:channelId/permissions', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const channelId = req.params.channelId as string;
      const overwrites = ServerChannelService.getChannelPermissions(client, guildId, channelId);
      res.json({ overwrites });
    } catch (err: any) {
      logger.error('Erreur server/channels/:id/permissions :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 12. PUT /channels/:channelId/permissions
  router.put('/channels/:channelId/permissions', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const channelId = req.params.channelId as string;
      const { targetId, allow, deny } = req.body;
      const result = await ServerChannelService.setChannelPermission(
        client,
        guildId,
        channelId,
        targetId,
        allow || [],
        deny || []
      );
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur modification permissions salon :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 13. GET /roles
  router.get('/roles', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const roles = ServerRoleService.getRoles(client, guildId);
      res.json({ roles });
    } catch (err: any) {
      logger.error('Erreur server/roles :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 14. POST /roles
  router.post('/roles', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const result = await ServerRoleService.createRole(client, guildId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result);
    } catch (err: any) {
      logger.error('Erreur creation server/roles :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 15. PUT /roles/:roleId
  router.put('/roles/:roleId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const roleId = req.params.roleId as string;
      const result = await ServerRoleService.updateRole(client, guildId, roleId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur modification server/roles/:id :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 16. DELETE /roles/:roleId
  router.delete('/roles/:roleId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const roleId = req.params.roleId as string;
      const reason = req.body?.reason || 'Supprimé via ETHONE Dashboard';
      const result = await ServerRoleService.deleteRole(client, guildId, roleId, reason);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur suppression server/roles/:id :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 17. GET /roles/:roleId/members
  router.get('/roles/:roleId/members', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const roleId = req.params.roleId as string;
      const members = await ServerRoleService.getRoleMembers(client, guildId, roleId);
      res.json({ members });
    } catch (err: any) {
      logger.error('Erreur server/roles/:id/members :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 18. GET /permissions/matrix
  router.get('/permissions/matrix', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const matrix = ServerPermissionDebugger.getPermissionMatrix(client, guildId);
      res.json({ matrix });
    } catch (err: any) {
      logger.error('Erreur server/permissions/matrix :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 19. POST /permissions/debug
  router.post('/permissions/debug', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const { userId, channelId, permission } = req.body;
      if (!userId || !channelId || !permission) {
        return res.status(400).json({ error: 'userId, channelId et permission sont requis.' });
      }

      const result = await ServerPermissionDebugger.debugPermission(client, guildId, userId, channelId, permission);
      if (!result) {
        return res.status(404).json({ error: 'Éléments introuvables pour le diagnostic.' });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur server/permissions/debug :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 20. GET /emojis
  router.get('/emojis', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const data = ServerEmojiService.getEmojisAndStickers(client, guildId);
      res.json(data);
    } catch (err: any) {
      logger.error('Erreur server/emojis :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 21. POST /emojis
  router.post('/emojis', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const result = await ServerEmojiService.createEmoji(client, guildId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result);
    } catch (err: any) {
      logger.error('Erreur creation emoji :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 22. DELETE /emojis/:emojiId
  router.delete('/emojis/:emojiId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const emojiId = req.params.emojiId as string;
      const result = await ServerEmojiService.deleteEmoji(client, guildId, emojiId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur suppression emoji :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 22b. PATCH /emojis/:emojiId (renommage)
  router.patch('/emojis/:emojiId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const emojiId = req.params.emojiId as string;
      const result = await ServerEmojiService.updateEmoji(client, guildId, emojiId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur renommage emoji :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 23. GET /webhooks
  router.get('/webhooks', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const webhooks = await ServerWebhookService.getWebhooks(client, guildId);
      res.json({ webhooks });
    } catch (err: any) {
      logger.error('Erreur server/webhooks :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 24. POST /webhooks
  router.post('/webhooks', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const result = await ServerWebhookService.createWebhook(client, guildId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result);
    } catch (err: any) {
      logger.error('Erreur creation webhook :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 25. DELETE /webhooks/:webhookId
  router.delete('/webhooks/:webhookId', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const webhookId = req.params.webhookId as string;
      const result = await ServerWebhookService.deleteWebhook(client, guildId, webhookId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur suppression webhook :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 26. GET /settings
  router.get('/settings', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const settings = ServerSettingsService.getSettings(client, guildId);
      if (!settings) return res.status(404).json({ error: 'Serveur introuvable.' });
      res.json({ settings });
    } catch (err: any) {
      logger.error('Erreur server/settings :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // 27. PUT /settings
  router.put('/settings', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const result = await ServerSettingsService.updateSettings(client, guildId, req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      emitConfigUpdated('server', guildId, result.settings, 'DASHBOARD', req.user?.id);
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur mise à jour server/settings :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Scan de sécurité : lancé à la demande (et gardé), dernier résultat, réglages du scan automatique.
  router.get('/security-scan', async (req: Request, res: Response) => {
    try {
      const result = await runSecurityScan(client, String(req.params.guildId));
      if (!result) {
        res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
        return;
      }
      res.json(result);
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur scan de sécurité');
    }
  });

  // Configuration assistée (façon Keeper) : `apply: false` renvoie le récapitulatif, `apply: true` l'applique.
  router.post('/protection-setup', async (req: Request, res: Response) => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    const { serverType, severity, alertChannelId, overwrite, apply } = req.body ?? {};
    if (!['community', 'friends', 'large'].includes(serverType) || !['watch', 'balanced', 'strict'].includes(severity)) {
      res.status(400).json({ error: 'Type de serveur ou sévérité invalide.' });
      return;
    }
    if (alertChannelId != null && !guild.channels.cache.get(String(alertChannelId))?.isTextBased()) {
      res.status(400).json({ error: 'Salon des alertes introuvable ou non textuel.' });
      return;
    }
    const input = { serverType, severity, alertChannelId: alertChannelId ? String(alertChannelId) : null, overwrite: overwrite === true };
    try {
      const items = apply === true ? await applyProtectionSetup(guild, input) : await planProtectionSetup(guild, input);
      res.json({ items, applied: apply === true });
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur configuration assistée');
    }
  });

  // Protections actives dont les alertes n'arrivent dans aucun salon (calcul en direct, pour la vue d'ensemble).
  router.get('/log-coverage', (req: Request, res: Response) => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable pour le bot.' });
      return;
    }
    res.json(protectionLogCoverage(guild));
  });

  router.get('/security-scan/last', (req: Request, res: Response) => {
    res.json({ result: securityScanStore.getLast(String(req.params.guildId)) });
  });

  router.get('/security-scan/auto', (req: Request, res: Response) => {
    res.json({ auto: securityScanStore.getAuto(String(req.params.guildId)) });
  });

  router.put('/security-scan/auto', (req: Request, res: Response) => {
    const guildId = String(req.params.guildId);
    const guild = client.guilds.cache.get(guildId);
    const { enabled, channelId, frequency } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (typeof enabled === 'boolean') patch.enabled = enabled;
    if (frequency === 'day' || frequency === 'week') patch.frequency = frequency;
    if (channelId === null || typeof channelId === 'string') {
      const channel = channelId ? guild?.channels.cache.get(channelId) : null;
      if (channelId && !channel?.isTextBased()) {
        res.status(400).json({ error: 'Salon introuvable ou non textuel.' });
        return;
      }
      patch.channelId = channelId;
    }
    const auto = securityScanStore.setAuto(guildId, patch);
    if (auto.enabled && !auto.channelId) {
      res.status(400).json({ error: 'Choisis un salon pour le rapport.', auto });
      return;
    }
    res.json({ auto });
  });


  // 28. GET /audit
  router.get('/audit', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const result = logStorage.searchLogs(guildId, { limit: 50 });
      res.json({ logs: result.entries, total: result.total });
    } catch (err: any) {
      logger.error('Erreur server/audit :', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  return router;
}
