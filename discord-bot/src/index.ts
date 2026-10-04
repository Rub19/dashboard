// config.js runs dotenv.config() — it MUST be evaluated before any module that
// reads process.env at import time, so it stays the very first import.
import { config } from './config.js';
import './utils/fsActivityCounter.js';
// Purge des données des serveurs quittés depuis plus de 30 jours : doit s'exécuter AVANT le chargement des dépôts JSON.
import './bootstrap/purgeDeparted.js';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registerEvents } from './handlers/eventHandler.js';
import { startWebServer } from './server/index.js';
import { logger } from './utils/logger.js';
import { installAnimatedEmojis } from './services/animatedEmojis.js';

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
    GatewayIntentBits.GuildMessageReactions, // Requis pour le Starboard (réactions ⭐)
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember,
    Partials.Reaction, // Starboard : réactions sur des messages non mis en cache
    Partials.User,
  ],
});

// Émojis animés (✅ ❌ ⚠️…) dans toutes les réponses du bot.
installAnimatedEmojis(client);

// Enregistrement des événements
registerEvents(client);

// Démarrage du serveur web Dashboard
startWebServer(client);

// ==========================================
// Arrêt propre (redémarrage PM2, mise en ligne)
// ==========================================
// Les tampons XP / stats / analytics vident leurs données (écritures synchrones) sur ce même signal ; mais écouter
// SIGINT empêche Node de s'arrêter seul : sans cette fonction, PM2 finissait par tuer le bot (SIGKILL) sans fermer
// la connexion Discord.
let shuttingDown = false;
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Arrêt demandé (${signal}) : sauvegarde des données puis déconnexion de Discord.`);
  setTimeout(() => process.exit(0), 3000).unref(); // filet de sécurité
  void client
    .destroy()
    .catch(() => undefined)
    .finally(() => process.exit(0)); // déclenche aussi les sauvegardes 'exit'
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Démarrage et connexion Discord
logger.info('Connexion à Discord en cours...');
client.login(config.token).catch((err) => {
  logger.error('Impossible de se connecter à Discord. Vérifiez votre DISCORD_TOKEN dans .env :', err);
  process.exit(1);
});
