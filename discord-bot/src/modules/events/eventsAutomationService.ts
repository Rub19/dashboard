import { Client, TextChannel } from 'discord.js';
import { DiscordEvent, EventParticipant } from './eventsTypes.js';
import { eventRepository } from './eventsRepository.js';
import { logger } from '../../utils/logger.js';

export class EventsAutomationService {
  private client?: Client;

  initialize(client: Client): void {
    this.client = client;
    logger.info('[EventsAutomationService] Initialisé');
  }

  async onEventCreated(event: DiscordEvent): Promise<void> {
    if (!this.client) return;

    try {
      const guild = await this.client.guilds.fetch(event.guildId).catch(() => null);
      if (!guild) return;

      const hasThreadRule = event.automations.some((a) =>
        a.enabled && a.actions.some((act) => act.type === 'CREATE_THREAD')
      );

      if (hasThreadRule && event.discordPanelChannelId) {
        try {
          const channel = await guild.channels.fetch(event.discordPanelChannelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            const thread = await (channel as TextChannel).threads.create({
              name: `💬 ${event.title} - Discussion`,
              autoArchiveDuration: 1440,
              reason: `Fil automatisé pour l'événement ${event.id}`,
            });
            event.discordThreadId = thread.id;
            eventRepository.saveEvent(event);
            logger.info(`[EventsAutomationService] Fil de discussion créé : ${thread.id}`);
          }
        } catch (err) {
          logger.error('[EventsAutomationService] Échec création de thread:', err);
        }
      }
    } catch (err) {
      logger.error('[EventsAutomationService] Erreur dans onEventCreated:', err);
    }
  }

  async onParticipantRSVP(event: DiscordEvent, participant: EventParticipant): Promise<void> {
    if (!this.client || participant.rsvp !== 'GOING') return;

    try {
      const guild = await this.client.guilds.fetch(event.guildId).catch(() => null);
      if (!guild) return;

      const member = await guild.members.fetch(participant.userId).catch(() => null);
      if (!member) return;

      if (event.eventRoleAction === 'ASSIGN_ON_RSVP' && event.eventRoleId) {
        try {
          await member.roles.add(event.eventRoleId);
          logger.info(`[EventsAutomationService] Rôle attribué (${event.eventRoleId}) à ${member.user.tag}`);
        } catch (roleErr) {
          logger.error(`[EventsAutomationService] Échec attribution rôle à ${member.user.tag}:`, roleErr);
        }
      }
    } catch (err) {
      logger.error('[EventsAutomationService] Erreur dans onParticipantRSVP:', err);
    }
  }

  async onParticipantCheckin(event: DiscordEvent, participant: EventParticipant): Promise<void> {
    if (!this.client || participant.attendance !== 'ATTENDED') return;

    try {
      const guild = await this.client.guilds.fetch(event.guildId).catch(() => null);
      if (!guild) return;

      const member = await guild.members.fetch(participant.userId).catch(() => null);
      if (!member) return;

      if (event.eventRoleAction === 'ASSIGN_ON_CHECKIN' && event.eventRoleId) {
        try {
          await member.roles.add(event.eventRoleId);
          logger.info(`[EventsAutomationService] Rôle de présence (${event.eventRoleId}) attribué à ${member.user.tag}`);
        } catch (roleErr) {
          logger.error(`[EventsAutomationService] Échec attribution rôle présence:`, roleErr);
        }
      }
    } catch (err) {
      logger.error('[EventsAutomationService] Erreur dans onParticipantCheckin:', err);
    }
  }

  async onEventCompleted(event: DiscordEvent): Promise<void> {
    if (!this.client) return;

    try {
      const guild = await this.client.guilds.fetch(event.guildId).catch(() => null);
      if (!guild) return;

      if (event.removeRoleAfterEvent && event.eventRoleId) {
        const participants = eventRepository.getParticipants(event.id);
        for (const p of participants) {
          try {
            const member = await guild.members.fetch(p.userId).catch(() => null);
            if (member && member.roles.cache.has(event.eventRoleId)) {
              await member.roles.remove(event.eventRoleId).catch(() => null);
            }
          } catch {
            // ignore individual fail
          }
        }
        logger.info(`[EventsAutomationService] Rôles temporaires nettoyés pour l'événement ${event.id}`);
      }
    } catch (err) {
      logger.error('[EventsAutomationService] Erreur dans onEventCompleted:', err);
    }
  }
}

export const eventsAutomationService = new EventsAutomationService();
