import { Client } from 'discord.js';
import { DiscordPoll, PollResultsSummary, AutomationTriggerPoll } from '../types/index.js';
import { ticketService } from '../../tickets/services/ticketService.js';
import { logger } from '../../../utils/logger.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { getTranslation } from '../../../utils/i18n.js';

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

              const t = getTranslation(guildConfigService.getConfig(poll.guildId).language);
              const winnerText = results.winningOption?.label || t.poll_no_winner;
              const votesText = String(results.winningOption?.votesCount || 0);

              const template = action.messageTemplate || t.poll_announce_winner_template;

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
              if (action.ticketCategoryId && this.client) {
                try {
                  const guild = await this.client.guilds.fetch(poll.guildId);
                  const user = await this.client.users.fetch(poll.creatorId);
                  const formAnswers: Record<string, any> = {
                    pollTitle: poll.title,
                    winningOption: results.winningOption?.label || 'N/A',
                  };
                  const ticket = await ticketService.createTicket(guild, user, action.ticketCategoryId, formAnswers);
                  executedActions.push(`Ticket support de suivi créé : #${ticket.id}`);
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
