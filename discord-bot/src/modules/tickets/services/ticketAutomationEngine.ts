import { Client, TextChannel } from 'discord.js';
import { Ticket, TicketPriority, TicketStatus } from '../types/ticket.js';
import { TicketTrigger } from '../types/automation.js';
import { ticketRepository } from '../storage/ticketRepository.js';
import { logger } from '../../../utils/logger.js';

export class TicketAutomationEngine {
  public static async executeTrigger(
    discordClient: Client | null,
    trigger: TicketTrigger,
    ticket: Ticket
  ): Promise<Ticket> {
    try {
      const rules = ticketRepository
        .getAutomations(ticket.guildId)
        .filter((r) => r.enabled && r.trigger === trigger);

      let modified = false;

      for (const rule of rules) {
        // Vérification des conditions
        if (rule.conditions.categoryId && rule.conditions.categoryId !== ticket.categoryId) {
          continue;
        }

        if (rule.conditions.priority && rule.conditions.priority !== ticket.priority) {
          continue;
        }

        if (rule.conditions.status && rule.conditions.status !== ticket.status) {
          continue;
        }

        // Exécution des actions
        if (rule.actions.assignTeamId && ticket.assignedTeamId !== rule.actions.assignTeamId) {
          ticket.assignedTeamId = rule.actions.assignTeamId;
          modified = true;
        }

        if (rule.actions.setPriority && ticket.priority !== rule.actions.setPriority) {
          ticket.priority = rule.actions.setPriority;
          modified = true;
        }

        if (rule.actions.addTags && rule.actions.addTags.length > 0) {
          const currentTags = new Set(ticket.tags || []);
          for (const tag of rule.actions.addTags) {
            currentTags.add(tag);
          }
          ticket.tags = Array.from(currentTags);
          modified = true;
        }

        if (rule.actions.changeStatus && ticket.status !== rule.actions.changeStatus) {
          ticket.status = rule.actions.changeStatus;
          modified = true;
        }

        // Message automatique Discord
        if (rule.actions.sendDiscordMessage && discordClient) {
          try {
            const guild = discordClient.guilds.cache.get(ticket.guildId);
            const channel = guild?.channels.cache.get(ticket.channelId) as TextChannel | undefined;
            if (channel) {
              await channel.send(rule.actions.sendDiscordMessage);
            }
          } catch (err) {
            logger.error(`Erreur envoi message automation pour ${ticket.id}:`, err);
          }
        }
      }

      if (modified) {
        ticketRepository.saveTicket(ticket);
      }

      return ticket;
    } catch (err) {
      logger.error(`Erreur dans TicketAutomationEngine pour ticket ${ticket.id}:`, err);
      return ticket;
    }
  }
}
