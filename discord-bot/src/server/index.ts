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
import { createModuleRouter } from './routes/moduleRoutes.js';
import { createSettingsRouter } from './routes/settingsRoutes.js';
import { createModerationRouter } from './routes/moderationRoutes.js';
import { createWelcomeRouter } from './routes/welcomeRoutes.js';
import { createTicketRouter } from './routes/ticketRoutes.js';
import { createLogRouter } from './routes/logRoutes.js';
import { createRoleRouter } from './routes/roleRoutes.js';
import { createSecurityRouter } from './routes/securityRoutes.js';
import { createAntiRaidRouter } from './routes/antiRaidRoutes.js';
import { createAutoModRouter } from './routes/autoModRoutes.js';
import { createLevelingRouter } from './routes/levelingRoutes.js';
import { createGiveawayRouter } from './routes/giveawayRoutes.js';
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
import { createEventRouter } from './routes/events.js';
import { createCalendarRouter } from './routes/calendar.js';
import { createServerRouter } from './routes/serverRoutes.js';
import { createBotControlRouter } from './routes/botControlRoutes.js';
import { createPresenceRouter } from './routes/presenceRoutes.js';
import { createSyncRouter, createGuildSyncRouter } from './routes/syncRoutes.js';
import { eventsSchedulerService } from '../modules/events/eventsSchedulerService.js';
import { eventsAutomationService } from '../modules/events/eventsAutomationService.js';
import { authMiddleware } from './middleware/auth.js';
import { createGuildAuthMiddleware } from './middleware/guildAuth.js';

export function startWebServer(client: Client): http.Server {
  const app = express();

  // Middleware de sécurité et parsing
  app.use(
    cors({
      origin: [config.dashboardUrl, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // Enregistrement des routes API
  app.use('/api/auth', authRouter);
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
    createGuildAuthMiddleware(client),
    createTicketRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/logs',
    authMiddleware,
    createGuildAuthMiddleware(client),
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
    '/api/guilds/:guildId/giveaways',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createGiveawayRouter(client)
  );
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
    createGuildAuthMiddleware(client),
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
  app.use(
    '/api/bot',
    createBotControlRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/bot',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createBotControlRouter(client)
  );
  app.use(
    '/api/bot/presence',
    createPresenceRouter(client)
  );
  app.use(
    '/api/guilds/:guildId/bot/presence',
    authMiddleware,
    createGuildAuthMiddleware(client),
    createPresenceRouter(client)
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

  // Initialisation des services de fond Événements 2.0
  eventsSchedulerService.initialize(client);
  eventsAutomationService.initialize(client);

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
    logger.success(`Serveur Web Dashboard actif sur : http://localhost:${config.port}`);
  });

  return server;
}
