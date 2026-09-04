import { Client, TextChannel } from 'discord.js';
import { ticketRepository } from '../storage/ticketRepository.js';
import { ticketService } from './ticketService.js';
import { logger } from '../../../utils/logger.js';

export class TicketScheduler {
  private static timer: NodeJS.Timeout | null = null;

  public static start(client: Client): void {
    if (this.timer) return;

    // Exécution toutes les 5 minutes
    this.timer = setInterval(() => {
      this.checkInactivity(client);
    }, 5 * 60 * 1000);

    logger.info('[TicketScheduler] Planificateur de tickets démarré (auto-close & rappels).');
  }

  private static async checkInactivity(client: Client): Promise<void> {
    try {
      const allGuilds = client.guilds.cache;

      for (const [guildId, guild] of allGuilds) {
        const config = ticketRepository.getConfig(guildId);
        if (!config.enabled) continue;

        const { tickets } = ticketRepository.getTickets(guildId, { status: 'ALL', limit: 1000 });
        const now = Date.now();

        for (const ticket of tickets) {
          if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') continue;

          const lastActivity = new Date(ticket.lastActivityAt || ticket.createdAt).getTime();
          const inactiveMinutes = Math.floor((now - lastActivity) / (60 * 1000));
          const inactiveHours = inactiveMinutes / 60;

          // 1. Fermeture automatique pour inactivité
          const category = ticketRepository
            .getCategories(guildId)
            .find((c) => c.id === ticket.categoryId);

          const autoCloseHours =
            category?.autoCloseInactivityHours || config.autoCloseInactivityHours || 24;

          if (autoCloseHours > 0 && inactiveHours >= autoCloseHours) {
            logger.info(`[TicketScheduler] Fermeture auto du ticket ${ticket.id} (${inactiveHours.toFixed(1)}h d'inactivité)`);
            await ticketService.closeTicket(
              guild,
              ticket.id,
              { id: 'SYSTEM', tag: 'Système Auto-Close' },
              `Fermeture automatique après ${autoCloseHours}h d'inactivité`
            );
          }
        }
      }
    } catch (err) {
      logger.error('Erreur dans TicketScheduler.checkInactivity :', err);
    }
  }
}
