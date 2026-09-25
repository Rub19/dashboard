import { ActivityType, Client } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import { giveawayScheduler } from '../modules/giveaways/services/giveawayScheduler.js';
import { ModerationService } from '../modules/moderation/services/moderationService.js';
import { musicService } from '../modules/music/services/musicService.js';
import { logService } from '../modules/logs/services/logService.js';
import { ticketService } from '../modules/tickets/services/ticketService.js';
import { inviteService } from '../modules/invites/services/inviteService.js';
import { voiceService } from '../modules/voice/services/voiceService.js';
import { backupService } from '../modules/backup/services/backupService.js';
import { aiService } from '../modules/ai/services/aiService.js';
import { runModuleMigrations } from '../services/moduleMigrations.js';
import { logger } from '../utils/logger.js';

const BOT_SITE_URL = 'https://discord.ethone.dev';

/** « À propos de moi » du bot (400 caractères max) : présentation, site web et lien d'invitation. */
function buildBotBio(clientId: string): string {
  const invite = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
  return [
    'ETHONE : le bot Discord tout-en-un piloté depuis un dashboard en temps réel (modération, musique, tickets, niveaux, sécurité…).',
    `🌐 Site : ${BOT_SITE_URL}`,
    `➕ Inviter le bot : ${invite}`,
  ].join('\n').slice(0, 400);
}

/** Met la bio à jour uniquement si elle a changé (évite d'appeler l'API Discord à chaque démarrage). */
async function syncBotBio(client: Client<true>): Promise<void> {
  try {
    const bio = buildBotBio(client.user.id);
    const app = await client.application.fetch();
    if ((app.description || '').trim() === bio) return;
    await client.application.edit({ description: bio });
    logger.success('[Profil] Bio du bot mise à jour (site web + lien d\'invitation).');
  } catch (err) {
    logger.warn('[Profil] Impossible de mettre à jour la bio du bot :', err);
  }
}

export async function onReady(client: Client<true>) {
  logger.success(`Connecté avec succès en tant que ${client.user.tag} !`);

  // Mise à jour du statut d'activité
  client.user.setPresence({
    activities: [{ name: 'vos commandes | /help ou !help', type: ActivityType.Custom }],
    status: 'online',
  });

  void syncBotBio(client);

  // Migrations uniques de modules (ex. XP désactivé partout), avant tout démarrage de module
  runModuleMigrations(client);

  // Déploiement automatique des slash commands au démarrage
  await commandRegistry.deploySlashCommands();

  // Restauration des timers de Giveaways actifs
  giveawayScheduler.init(client);

  // Démarrage du Moderation Center 2.0 & du scheduler de sanctions temporaires
  ModerationService.initialize(client);

  // Démarrage de Music Center 2.0 (restaure aussi les files d'attente actives)
  await musicService.initialize(client);

  // Démarrage de Logs & Audit Center 2.0
  logService.initialize(client);

  // Démarrage de Tickets Center 2.0
  ticketService.initialize(client);

  // Démarrage de Invite Tracker & Referral 2.0
  await inviteService.initialize(client);

  // Démarrage de Voice Channels 2.0 (Récupération et réconciliation)
  await voiceService.initialize(client);

  // Démarrage de Server Backup & Restore 2.0
  await backupService.initialize(client);

  // Démarrage de AI Assistant 2.0
  await aiService.initialize(client);
}
