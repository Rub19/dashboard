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
import { logger } from '../utils/logger.js';

export async function onReady(client: Client<true>) {
  logger.success(`Connecté avec succès en tant que ${client.user.tag} !`);

  // Mise à jour du statut d'activité
  client.user.setPresence({
    activities: [{ name: 'vos commandes | /help ou !help', type: ActivityType.Custom }],
    status: 'online',
  });

  // Déploiement automatique des slash commands au démarrage
  await commandRegistry.deploySlashCommands();

  // Restauration des timers de Giveaways actifs
  giveawayScheduler.init(client);

  // Démarrage du Moderation Center 2.0 & du scheduler de sanctions temporaires
  ModerationService.initialize(client);

  // Démarrage de Music Center 2.0
  musicService.initialize(client);

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
