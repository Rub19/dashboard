import { Client, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from 'discord.js';
import { DiscordEvent, EventStatus, RSVPStatus } from './eventsTypes.js';
import { eventRepository } from './eventsRepository.js';
import { logger } from '../../utils/logger.js';

export class EventService {
  public static createEvent(data: Partial<DiscordEvent> & { guildId: string; title: string }): DiscordEvent {
    const now = new Date().toISOString();
    const eventId = data.id || `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newEvent: DiscordEvent = {
      id: eventId,
      guildId: data.guildId,
      title: data.title,
      description: data.description || '',
      category: data.category || 'COMMUNITY',
      status: data.status || 'SCHEDULED',
      organizer: data.organizer || {
        id: 'usr-admin',
        username: 'Administrateur',
      },
      startDate: data.startDate || new Date(Date.now() + 86400000).toISOString(),
      endDate: data.endDate || new Date(Date.now() + 86400000 + 7200000).toISOString(),
      timezone: data.timezone || 'Europe/Paris',
      durationMinutes: data.durationMinutes || 120,
      location: data.location || { type: 'VOICE', channelName: 'Vocal Communautaire' },
      accessType: data.accessType || 'PUBLIC',
      allowedRoles: data.allowedRoles || [],
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      emoji: data.emoji || '📅',
      tags: data.tags || [],
      capacity: data.capacity || {
        unlimited: true,
        maxParticipants: 0,
        waitlistEnabled: true,
      },
      eventRoleId: data.eventRoleId,
      eventRoleAction: data.eventRoleAction || 'NONE',
      removeRoleAfterEvent: data.removeRoleAfterEvent ?? true,
      recurrence: data.recurrence,
      reminders: data.reminders || [
        { id: `rem-${Date.now()}-1`, triggerMinutesBefore: 1440, channel: 'DISCORD_CHANNEL', executed: false },
        { id: `rem-${Date.now()}-2`, triggerMinutesBefore: 60, channel: 'DISCORD_DM', executed: false },
      ],
      automations: data.automations || [],
      stats: {
        goingCount: 0,
        maybeCount: 0,
        notGoingCount: 0,
        waitlistCount: 0,
        attendedCount: 0,
        noShowCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    eventRepository.saveEvent(newEvent);
    logger.info(`[EventService] Event créé : "${newEvent.title}" (${newEvent.id}) sur guild ${newEvent.guildId}`);
    return newEvent;
  }

  public static updateEvent(guildId: string, eventId: string, updates: Partial<DiscordEvent>): DiscordEvent | null {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event) return null;

    Object.assign(event, updates, { updatedAt: new Date().toISOString() });
    eventRepository.saveEvent(event);
    logger.info(`[EventService] Event mis à jour : "${event.title}" (${event.id})`);
    return event;
  }

  public static cancelEvent(guildId: string, eventId: string, reason?: string): { success: boolean; event?: DiscordEvent; error?: string } {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event) return { success: false, error: 'Événement introuvable.' };

    event.status = 'CANCELLED';
    event.updatedAt = new Date().toISOString();
    eventRepository.saveEvent(event);

    logger.info(`[EventService] Event annulé : "${event.title}" (${event.id}). Raison: ${reason || 'Non spécifiée'}`);
    return { success: true, event };
  }

  public static rescheduleEvent(guildId: string, eventId: string, newStartDate: string, newEndDate: string): { success: boolean; event?: DiscordEvent; error?: string } {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event) return { success: false, error: 'Événement introuvable.' };

    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Dates invalides.' };
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    event.startDate = start.toISOString();
    event.endDate = end.toISOString();
    event.durationMinutes = durationMinutes > 0 ? durationMinutes : event.durationMinutes;
    event.status = 'SCHEDULED';
    event.updatedAt = new Date().toISOString();

    // Reset reminders that are now in the future
    event.reminders.forEach((r) => {
      r.executed = false;
    });

    eventRepository.saveEvent(event);
    logger.info(`[EventService] Event reprogrammé : "${event.title}" pour le ${event.startDate}`);
    return { success: true, event };
  }

  public static duplicateEvent(guildId: string, eventId: string): DiscordEvent | null {
    const original = eventRepository.getEventById(guildId, eventId);
    if (!original) return null;

    const copy = this.createEvent({
      ...original,
      id: undefined,
      title: `${original.title} (Copie)`,
      status: 'SCHEDULED',
      createdAt: undefined,
      updatedAt: undefined,
      discordScheduledEventId: undefined,
      discordPanelMessageId: undefined,
      discordThreadId: undefined,
    });

    return copy;
  }

  /**
   * Synchronise avec l'API native Discord Scheduled Events
   */
  public static async syncToDiscordScheduledEvent(event: DiscordEvent, client: Client): Promise<string | null> {
    try {
      const guild = client.guilds.cache.get(event.guildId);
      if (!guild) return null;

      let entityType = GuildScheduledEventEntityType.Voice;
      let channelId = event.location.channelId;
      let entityMetadata: any = undefined;

      if (event.location.type === 'STAGE') {
        entityType = GuildScheduledEventEntityType.StageInstance;
      } else if (event.location.type === 'EXTERNAL') {
        entityType = GuildScheduledEventEntityType.External;
        channelId = undefined;
        entityMetadata = { location: event.location.externalUrl || 'Lien Externe' };
      }

      if (event.discordScheduledEventId) {
        const existing = await guild.scheduledEvents.fetch(event.discordScheduledEventId).catch(() => null);
        if (existing) {
          await existing.edit({
            name: event.title.substring(0, 100),
            description: event.description.substring(0, 1000),
            scheduledStartTime: new Date(event.startDate),
            scheduledEndTime: new Date(event.endDate),
            entityType,
            channel: channelId,
            entityMetadata,
          });
          return existing.id;
        }
      }

      // Create new scheduled event
      const created = await guild.scheduledEvents.create({
        name: event.title.substring(0, 100),
        description: event.description.substring(0, 1000),
        scheduledStartTime: new Date(event.startDate),
        scheduledEndTime: new Date(event.endDate),
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType,
        channel: channelId,
        entityMetadata,
        image: event.imageUrl,
      });

      event.discordScheduledEventId = created.id;
      eventRepository.saveEvent(event);
      return created.id;
    } catch (error) {
      logger.error(`[EventService] Erreur lors de la sync Discord Scheduled Event pour "${event.title}":`, error);
      return null;
    }
  }
}
