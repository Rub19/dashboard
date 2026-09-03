import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import { registerEvents } from './handlers/eventHandler.js';
import { startWebServer } from './server/index.js';
import { logger } from './utils/logger.js';

// ==========================================
// Gestion globale des exceptions (Résilience VPS)
// ==========================================
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

// ==========================================
// Initialisation du Client Discord
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Requis pour Welcome, Auto-rôles et Logs arrivées/départs
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Requis pour lire les commandes préfixes (ex: !ping)
    GatewayIntentBits.GuildModeration, // Requis pour les bans / unbans
    GatewayIntentBits.GuildVoiceStates, // Requis pour les logs d'activité vocale
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// Enregistrement des événements
registerEvents(client);

// Démarrage du serveur web Dashboard
startWebServer(client);

// Démarrage et connexion Discord
logger.info('Connexion à Discord en cours...');
client.login(config.token).catch((err) => {
  logger.error('Impossible de se connecter à Discord. Vérifiez votre DISCORD_TOKEN dans .env :', err);
  process.exit(1);
});
