import { Client, PermissionsBitField } from 'discord.js';
import express, { Request, Response } from 'express';
import { guildConfigService } from '../../services/guildConfigService.js';
import { statsService } from '../../services/statsService.js';
import { authMiddleware } from '../middleware/auth.js';
import { createGuildAuthMiddleware, fetchUserGuilds } from '../middleware/guildAuth.js';

export function createGuildRouter(client: Client): express.Router {
  const router = express.Router();
  const guildAuth = createGuildAuthMiddleware(client);

  /**
   * GET /api/guilds
   * Liste les serveurs où l'utilisateur possède les permissions d'administration
   */
  router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    try {
      // Mode de test local dev
      if (req.user.id === 'dev-admin-user') {
        const botGuilds = client.guilds.cache.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          owner: true,
          permissions: '8',
          botPresent: true,
          memberCount: g.memberCount,
        }));
        res.json({ guilds: botGuilds });
        return;
      }

      const userGuilds = await fetchUserGuilds(req.user.accessToken, req.user.id);

      // Filtrer les serveurs où l'utilisateur a ManageGuild ou Administrator
      const manageableGuilds = userGuilds
        .filter((g) => {
          const perms = BigInt(g.permissions);
          const isAdmin = (perms & PermissionsBitField.Flags.Administrator) === PermissionsBitField.Flags.Administrator;
          const isManager = (perms & PermissionsBitField.Flags.ManageGuild) === PermissionsBitField.Flags.ManageGuild;
          return g.owner || isAdmin || isManager;
        })
        .map((g) => {
          const botGuild = client.guilds.cache.get(g.id);
          return {
            id: g.id,
            name: g.name,
            icon: g.icon,
            owner: g.owner,
            permissions: g.permissions,
            botPresent: !!botGuild,
            memberCount: botGuild ? botGuild.memberCount : null,
          };
        });

      res.json({ guilds: manageableGuilds });
    } catch (err) {
      res.status(500).json({ error: 'Impossible de récupérer la liste des serveurs' });
    }
  });

  /**
   * GET /api/guilds/:guildId/overview
   * Récupère les vraies statistiques, métriques et aperçu du serveur
   */
  router.get('/:guildId/overview', authMiddleware, guildAuth, (req: Request, res: Response) => {
    const guildId = String(req.params.guildId);
    const botGuild = client.guilds.cache.get(guildId);
    const config = guildConfigService.getConfig(guildId);
    const stats = statsService.getGuildStats(guildId);
    const globalStats = statsService.getGlobalStats();

    res.json({
      guild: {
        id: guildId,
        name: botGuild ? botGuild.name : 'Serveur Discord',
        icon: botGuild ? botGuild.icon : null,
        memberCount: botGuild ? botGuild.memberCount : 0,
        channelsCount: botGuild ? botGuild.channels.cache.size : 0,
        rolesCount: botGuild ? botGuild.roles.cache.size : 0,
        botPresent: !!botGuild,
      },
      botStatus: {
        online: true,
        uptimeMs: client.uptime || 0,
        pingMs: client.ws.ping,
      },
      stats: {
        totalCommands: stats.totalCommands,
        commandsToday: globalStats.commandsToday,
        recentActivities: stats.recentActivities,
      },
      config,
    });
  });

  return router;
}
