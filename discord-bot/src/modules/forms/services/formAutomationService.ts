import { Client, Guild, GuildMember, Role } from 'discord.js';
import { DiscordForm, FormResponse, AutomationTrigger } from '../types/index.js';
import { ticketService } from '../../tickets/services/ticketService.js';
import { logger } from '../../../utils/logger.js';

export class FormAutomationService {
  private client: Client | null = null;

  public setClient(client: Client): void {
    this.client = client;
  }

  /**
   * Execute automation rules matching the given trigger and context.
   */
  public async executeTrigger(
    trigger: AutomationTrigger,
    form: DiscordForm,
    response: FormResponse
  ): Promise<string[]> {
    const executedActionSummaries: string[] = [];

    const activeRules = form.automations.filter((rule) => rule.enabled && rule.trigger === trigger);
    if (activeRules.length === 0) return executedActionSummaries;

    for (const rule of activeRules) {
      // Check conditions
      if (rule.conditions.minScore !== undefined && response.score < rule.conditions.minScore) {
        continue;
      }
      if (rule.conditions.maxScore !== undefined && response.score > rule.conditions.maxScore) {
        continue;
      }
      if (rule.conditions.targetStatus && response.status !== rule.conditions.targetStatus) {
        continue;
      }

      for (const action of rule.actions) {
        try {
          switch (action.type) {
            case 'ADD_ROLE': {
              if (!action.targetRoleId) break;
              const success = await this.assignRole(form.guildId, response.userId, action.targetRoleId);
              if (success) {
                executedActionSummaries.push(`Rôle attribué : ${action.targetRoleId}`);
              }
              break;
            }

            case 'REMOVE_ROLE': {
              if (!action.targetRoleId) break;
              const success = await this.removeRole(form.guildId, response.userId, action.targetRoleId);
              if (success) {
                executedActionSummaries.push(`Rôle retiré : ${action.targetRoleId}`);
              }
              break;
            }

            case 'SEND_DM': {
              if (!action.messageTemplate) break;
              const content = this.interpolate(action.messageTemplate, form, response);
              await this.sendDm(response.userId, content);
              executedActionSummaries.push(`DM envoyé à l'utilisateur`);
              break;
            }

            case 'SEND_CHANNEL_MESSAGE': {
              const targetChannelId = action.targetChannelId || form.panelConfig.channelId;
              if (!targetChannelId || !action.messageTemplate) break;
              const content = this.interpolate(action.messageTemplate, form, response);
              await this.sendChannelMessage(targetChannelId, content);
              executedActionSummaries.push(`Message envoyé dans le salon ${targetChannelId}`);
              break;
            }

            case 'CREATE_TICKET': {
              if (action.ticketCategoryId) {
                try {
                  const ticket = await ticketService.createTicket({
                    guildId: form.guildId,
                    userId: response.userId,
                    userTag: response.userTag,
                    userAvatar: response.userAvatar,
                    categoryId: action.ticketCategoryId,
                    source: 'PANEL',
                    initialMessage: `📋 **Candidature / Formulaire : ${form.title}**\nSoumis par ${response.userTag} (Score : ${response.score}/100).\nStatut : ${response.status}`,
                  });
                  executedActionSummaries.push(`Ticket support créé : #${ticket.number}`);
                } catch (ticketErr) {
                  logger.warn('Impossible de créer le ticket via l\'automation form :', ticketErr);
                }
              }
              break;
            }

            case 'ADD_TAG': {
              if (action.tagToAdd && !response.tags.includes(action.tagToAdd)) {
                response.tags.push(action.tagToAdd);
                executedActionSummaries.push(`Tag ajouté : ${action.tagToAdd}`);
              }
              break;
            }

            default:
              break;
          }
        } catch (actionErr) {
          logger.error(`Erreur exécution action automation ${action.type} :`, actionErr);
        }
      }
    }

    return executedActionSummaries;
  }

  private interpolate(template: string, form: DiscordForm, response: FormResponse): string {
    return template
      .replace(/\{userTag\}/g, response.userTag)
      .replace(/\{userId\}/g, response.userId)
      .replace(/\{formTitle\}/g, form.title)
      .replace(/\{formId\}/g, form.id)
      .replace(/\{score\}/g, String(response.score))
      .replace(/\{status\}/g, response.status);
  }

  private async assignRole(guildId: string, userId: string, roleId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const guild = await this.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return false;

      const member = await guild.members.fetch(userId).catch(() => null);
      const role = await guild.roles.fetch(roleId).catch(() => null);
      const botMember = guild.members.me;

      if (!member || !role || !botMember) return false;

      // Role hierarchy check
      if (botMember.roles.highest.comparePositionTo(role) <= 0) {
        logger.warn(`Hiérarchie insuffisante pour attribuer le rôle ${role.name}`);
        return false;
      }

      await member.roles.add(role, 'ETHONE Forms Automation');
      return true;
    } catch (err) {
      logger.error('Erreur assignRole formAutomation :', err);
      return false;
    }
  }

  private async removeRole(guildId: string, userId: string, roleId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const guild = await this.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return false;

      const member = await guild.members.fetch(userId).catch(() => null);
      const role = await guild.roles.fetch(roleId).catch(() => null);
      const botMember = guild.members.me;

      if (!member || !role || !botMember) return false;

      if (botMember.roles.highest.comparePositionTo(role) <= 0) {
        return false;
      }

      await member.roles.remove(role, 'ETHONE Forms Automation');
      return true;
    } catch (err) {
      logger.error('Erreur removeRole formAutomation :', err);
      return false;
    }
  }

  private async sendDm(userId: string, content: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const user = await this.client.users.fetch(userId).catch(() => null);
      if (!user) return false;
      await user.send(content);
      return true;
    } catch {
      return false;
    }
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

export const formAutomationService = new FormAutomationService();
