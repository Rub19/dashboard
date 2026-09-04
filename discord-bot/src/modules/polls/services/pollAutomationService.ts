import { Client } from 'discord.js';
import { DiscordPoll, PollResultsSummary, AutomationTriggerPoll } from '../types/index.js';
import { ticketService } from '../../tickets/services/ticketService.js';
import { logger } from '../../../utils/logger.js';

export class PollAutomationService {
  private client: Client | null = null;

  public setClient(client: Client): void {
    this.client = client;
  }

  /**
   * Execute automation rules associated with a poll event.
   */
  public async executeTrigger(
    trigger: AutomationTriggerPoll,
    poll: DiscordPoll,
    results: PollResultsSummary
  ): Promise<string[]> {
    const executedActions: string[] = [];
    const activeRules = poll.automations.filter((r) => r.enabled && r.trigger === trigger);

    if (activeRules.length === 0) return executedActions;

    for (const rule of activeRules) {
      for (const action of rule.actions) {
        try {
          switch (action.type) {
            case 'ANNOUNCE_WINNER': {
              const targetChannelId = action.targetChannelId || poll.panelConfig.channelId;
              if (!targetChannelId) break;

              const winnerText = results.winningOption?.label || 'Aucun gagnant';
              const votesText = String(results.winningOption?.votesCount || 0);

              const template =
                action.messageTemplate ||
                '🏆 **Résultats du sondage "{pollTitle}" !**\nLe choix gagnant est **{winner}** avec {votes} votes ({percent}%).';

              const content = template
                .replace(/\{pollTitle\}/g, poll.title)
                .replace(/\{pollId\}/g, poll.id)
                .replace(/\{winner\}/g, winnerText)
                .replace(/\{votes\}/g, votesText)
                .replace(/\{percent\}/g, String(results.winningOption?.percentage || 0));

              await this.sendChannelMessage(targetChannelId, content);
              executedActions.push(`Annonce du gagnant envoyée dans le salon ${targetChannelId}`);
              break;
            }

            case 'CREATE_TICKET': {
              if (action.ticketCategoryId) {
                try {
                  const ticket = await ticketService.createTicket({
                    guildId: poll.guildId,
                    userId: poll.creatorId,
                    userTag: poll.creatorTag,
                    categoryId: action.ticketCategoryId,
                    source: 'PANEL',
                    initialMessage: `🗳️ **Sondage terminé : ${poll.title}**\nRésultats finaux disponibles. Gagnant : ${results.winningOption?.label || 'N/A'}.`,
                  });
                  executedActions.push(`Ticket support de suivi créé : #${ticket.number}`);
                } catch (ticketErr) {
                  logger.warn('Impossible de créer le ticket via poll automation :', ticketErr);
                }
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          logger.error(`Erreur exécution automation poll (${action.type}) :`, err);
        }
      }
    }

    return executedActions;
  }

  private async sendChannelMessage(channelId: string, content: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased() && 'send' in channel) {
        await (channel as any).send(content);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const pollAutomationService = new PollAutomationService();
