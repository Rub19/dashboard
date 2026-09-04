import { ActivityType, Client } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import { giveawayScheduler } from '../modules/giveaways/services/giveawayScheduler.js';
import { ModerationService } from '../modules/moderation/services/moderationService.js';
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
}
