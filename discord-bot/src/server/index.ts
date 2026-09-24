import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { authRouter } from './routes/authRoutes.js';
import { createGuildRouter } from './routes/guildRoutes.js';
import { getModuleStatus, setModuleEnabled } from './moduleStatus.js';
import { createPublicRouter } from './routes/publicRoutes.js';
import { createModuleRouter } from './routes/moduleRoutes.js';
import { createSettingsRouter } from './routes/settingsRoutes.js';
import { createModerationRouter } from './routes/moderationRoutes.js';
import { createWelcomeRouter } from './routes/welcomeRoutes.js';
import { createTicketRouter } from './routes/ticketRoutes.js';
import { createLogRouter } from './routes/logRoutes.js';
import { createRoleRouter } from './routes/roleRoutes.js';
import { createSecurityRouter } from './routes/securityRoutes.js';
import { createAntiRaidRouter } from './routes/antiRaidRoutes.js';
import { createAntiNukeRouter } from './routes/antiNukeRoutes.js';
import { createAutoModRouter } from './routes/autoModRoutes.js';
import { createLevelingRouter } from './routes/levelingRoutes.js';
import { createEconomyRouter } from './routes/economyRoutes.js';
import { createGiveawayRouter } from './routes/giveawayRoutes.js';
import { createSharedSpaceRouter } from './routes/sharedSpaceRoutes.js';
import { createInternalSharedSpaceRouter } from './routes/internalSharedSpaceRoutes.js';
import { createAnalyticsRouter } from './routes/analyticsRoutes.js';
import { createSuggestionRouter } from './routes/suggestionRoutes.js';
import { createCustomCommandRouter } from './routes/customCommandRoutes.js';
import { createMusicRouter } from './routes/musicRoutes.js';
import { createInviteRouter } from './routes/inviteRoutes.js';
import { createVoiceRouter } from './routes/voiceRoutes.js';
import { createBackupRouter } from './routes/backupRoutes.js';
import { createAiRouter } from './routes/aiRoutes.js';
import { createFormRouter } from './routes/formRoutes.js';
import { createPollRouter } from './routes/pollRoutes.js';
import { createStarboardRouter } from './routes/starboardRoutes.js';
import { createStickyRouter } from './routes/stickyRoutes.js';
import { createReminderRouter } from './routes/reminderRoutes.js';
import { reminderService } from '../modules/reminders/services/reminderService.js';
import { createAfkRouter } from './routes/afkRoutes.js';
import { createBirthdayRouter } from './routes/birthdayRoutes.js';
import { createTagRouter } from './routes/tagRoutes.js';
import { createServerStatsRouter } from './routes/serverStatsRoutes.js';
import { serverStatsService } from '../modules/serverStats/services/serverStatsService.js';
import { createHighlightsRouter } from './routes/highlightsRoutes.js';
import { birthdayService } from '../modules/birthdays/services/birthdayService.js';
import { createEventRouter } from './routes/events.js';
import { createCalendarRouter } from './routes/calendar.js';
import { createServerRouter } from './routes/serverRoutes.js';
import { createBotControlRouter } from './routes/botControlRoutes.js';
import { createPresenceRouter } from './routes/presenceRoutes.js';
import { createOwnerShieldRouter } from './routes/ownerShieldRoutes.js';
import { createSyncRouter, createGuildSyncRouter } from './routes/syncRoutes.js';
import { createResilienceRouter } from './routes/resilienceRoutes.js';
import { eventsSchedulerService } from '../modules/events/eventsSchedulerService.js';
import { eventsAutomationService } from '../modules/events/eventsAutomationService.js';
import { authMiddleware, requireBotOwner } from './middleware/auth.js';
import { createGuildAuthMiddleware } from './middleware/guildAuth.js';
import { requireSharedSpacesKey } from './middleware/internalAuth.js';
import { rateLimit } from './middleware/antiAbuseMiddleware.js';
import { BotTelemetryService } from '../modules/botControl/services/botTelemetryService.js';

export function startWebServer(client: Client): http.Server {
  const app = express();

  // Ne pas annoncer la technologie du serveur, et poser les en-têtes de sécurité de base sur toute réponse.
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Réponses d'API (sessions, données de serveurs) : jamais mises en cache par un navigateur ou un intermédiaire.
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Middleware de sécurité et parsing
  app.use(
    cors({
      origin: [
        config.dashboardUrl,
        'https://ethone.dev',
        'https://www.ethone.dev',
        // Sous-domaine optionnel de la page vitrine du bot (Cloudflare Pages, même projet que ethone.dev).
        'https://discord.ethone.dev',
        // Origines locales (avec cookies !) uniquement quand on le demande explicitement, jamais en production.
        ...(process.env.ALLOW_LOCALHOST_CORS === 'true' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
      ],
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // Protection volumétrique globale (Rate limit baseline 120 req/min par IP/User)
  app.use('/api', rateLimit('READ', { customLimit: 120, customWindowMs: 60000 }));

  // Enregistrement des routes API
  app.use('/api/auth', authRouter);

  // Chiffres globaux du bot pour la vue d'ensemble d'un serveur (uniquement deux compteurs, pas de télémétrie).
  app.get('/api/guilds/:guildId/bot/overview', authMiddleware, createGuildAuthMiddleware(client), (_req, res) => {
    const snapshot = BotTelemetryService.getInstance().getTelemetrySnapshot(client);
    res.json({ snapshot: { guildsCount: snapshot.guildsCount, cachedUsersCount: snapshot.cachedUsersCount } });
  });
  // Interrupteur général de chaque module (pastilles « actif / désactivé » du hub).
  app.get('/api/guilds/:guildId/module-status', authMiddleware, createGuildAuthMiddleware(client), (req, res) => {
    res.json({ modules: getModuleStatus(String(req.params.guildId)) });
  });
  // Interrupteur d'un module depuis le hub du dashboard (même effet que /module sur Discord).
  app.put('/api/guilds/:guildId/module-status/:moduleId', authMiddleware, createGuildAuthMiddleware(client), (req, res) => {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'La propriété "enabled" (boolean) est requise' });
      return;
    }
    const guildId = String(req.params.guildId);
    if (!setModuleEnabled(guildId, String(req.params.moduleId), enabled, 'DASHBOARD', req.user?.id)) {
      res.status(404).json({ error: 'Module introuvable' });
      return;
    }
    res.json({ success: true, modules: getModuleStatus(guildId) });
  });
  // Page vitrine du bot : compteurs globaux et liste des commandes (sans authentification, lecture seule).
  app.use('/api/public', createPublicRouter(client));
  app.use('/api/guilds', createGuildRouter(client));
  app.use('/api/guilds', createSettingsRouter(client));
  app.use('/api/guilds', createModuleRouter(client));
  app.use(
    '/api/guilds/:guildId/moderation',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createModerationRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/welcome',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createWelcomeRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/tickets',
    authMiddleware,
    createGuildAuthMiddleware(client, { allowBotOwnerOverride: false }),
    createTicketRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/logs',
    authMiddleware,
    createGuildAuthMiddleware(client, { allowBotOwnerOverride: false }),
    createLogRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/roles',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createRoleRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/security',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createSecurityRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/anti-raid',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createAntiRaidRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/anti-nuke',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createAntiNukeRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/automod',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createAutoModRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/leveling',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createLevelingRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/economy',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createEconomyRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/giveaways',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createGiveawayRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/shared-space',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createSharedSpaceRouter(client)
  );
  app.use('/api/internal/shared-spaces', requireSharedSpacesKey, createInternalSharedSpaceRouter(client));
  app.use(
    '/api/guilds/:guildId/analytics',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createAnalyticsRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/suggestions',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createSuggestionRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/custom-commands',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createCustomCommandRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/music',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createMusicRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/invites',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createInviteRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/voice',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createVoiceRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/backups',
    authMiddleware,
    createGuildAuthMiddleware(client, { allowBotOwnerOverride: false }),
    createBackupRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/ai',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createAiRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/forms',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createFormRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/polls',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createPollRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/events',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createEventRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/starboard',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createStarboardRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/sticky',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createStickyRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/reminders',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createReminderRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/afk',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createAfkRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/birthdays',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createBirthdayRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/tags',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createTagRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/server-stats',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createServerStatsRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/highlights',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createHighlightsRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/calendar',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createCalendarRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/server',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createServerRouter(client)
  );
  // Présence du bot dans une liste de serveurs — accessible à tout utilisateur
  // connecté (pas seulement le bot owner) : le dashboard s'en sert pour
  // marquer/trier les serveurs de l'utilisateur. On ne renvoie que
  // l'intersection avec les ids demandés, jamais la liste complète des guilds.
  app.get('/api/guild-presence', authMiddleware, (req, res) => {
    const raw = String(req.query.ids || '');
    const ids = raw.split(',').map((s) => s.trim()).filter((s) => /^\d{15,22}$/.test(s)).slice(0, 200);
    const present = ids.filter((id) => client.guilds.cache.has(id));
    const details = present.map((id) => {
      const g = client.guilds.cache.get(id)!;
      return { id, memberCount: g.memberCount ?? null, joinedAt: g.joinedAt?.toISOString() ?? null };
    });
    res.json({ present, details });
  });

  app.use(
    '/api/bot',
    authMiddleware,
    requireBotOwner,
    createBotControlRouter(client)
  );
  app.use(
    '/api/bot/presence',
    authMiddleware,
    requireBotOwner,
    createPresenceRouter(client)
  );
  app.use(
    '/api/bot/owner-shield',
    authMiddleware,
    requireBotOwner,
    createOwnerShieldRouter(client)
  );
  app.use(
    '/api/sync',
    createSyncRouter()
  );
  app.use(
    '/api/guilds/:guildId/sync',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createGuildSyncRouter()
  );
  app.use(
    '/api/resilience',
    authMiddleware,
    requireBotOwner,
    createResilienceRouter()
  );

  // Initialisation des services de fond Événements 2.0
  eventsSchedulerService.initialize(client);
  eventsAutomationService.initialize(client);

  // Scheduler des rappels personnels (tick 30s)
  reminderService.initialize(client);

  // Scheduler des anniversaires (tick 15 min)
  birthdayService.initialize(client);

  // Scheduler des salons compteurs (tick 5 min)
  serverStatsService.initialize(client);

  // Route de santé de l'API
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      botOnline: client.isReady(),
      uptimeMs: client.uptime,
      version: '1.0.0',
    });
  });

  // Distribution du frontend React (Vite)
  const webDistPath = path.resolve(process.cwd(), 'web', 'dist');
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));

    // Fallback Single Page Application pour React Router
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
    logger.info(`Frontend web servi depuis : ${webDistPath}`);
  } else {
    app.get('/', (req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>ETHONE Discord Bot Dashboard</title></head>
        <body style="font-family: sans-serif; background: #08090C; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh;">
          <h1>🚀 ETHONE Discord Bot API</h1>
          <p>Le backend de l'API est en ligne sur le port ${config.port}.</p>
          <p>Pour lancer l'interface web en développement : <code>npm run dev:web</code></p>
        </body>
        </html>
      `);
    });
  }

  const server = app.listen(config.port, () => {
    logger.success(`Serveur API Bot en ligne sur le port ${config.port} (Dashboard : ${config.dashboardUrl})`);
  });

  return server;
}
