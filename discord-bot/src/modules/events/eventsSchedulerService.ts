import { Client, TextChannel } from 'discord.js';
import { eventRepository } from './eventsRepository.js';
import { DiscordEvent, EventRecurrence } from './eventsTypes.js';
import { EventService } from './eventsService.js';
import { logger } from '../../utils/logger.js';

export class EventsSchedulerService {
  private client?: Client;
  private timer?: NodeJS.Timeout;
  private isProcessing: boolean = false;

  initialize(client: Client): void {
    this.client = client;
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.runSchedulerTick().catch((err) => {
        logger.error('[EventsSchedulerService] Erreur lors du tick:', err);
      });
    }, 60 * 1000);
    logger.info('[EventsSchedulerService] Initialisé et actif (intervalle 60s)');
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runSchedulerTick(): Promise<{ remindersSent: number; statusUpdated: number; recurrencesSpawned: number }> {
    if (this.isProcessing) return { remindersSent: 0, statusUpdated: 0, recurrencesSpawned: 0 };
    this.isProcessing = true;

    let remindersSent = 0;
    let statusUpdated = 0;
    let recurrencesSpawned = 0;

    try {
      const now = new Date();
      const events = eventRepository.getAllEvents();

      for (const event of events) {
        if (event.status === 'CANCELLED') continue;

        const start = new Date(event.startDate);
        const end = new Date(event.endDate);

        // 1. Status: SCHEDULED -> LIVE
        if (event.status === 'SCHEDULED' && now >= start && now < end) {
          event.status = 'LIVE';
          event.updatedAt = now.toISOString();
          eventRepository.saveEvent(event);
          statusUpdated++;
          logger.info(`[EventsSchedulerService] Événement "${event.title}" (${event.id}) est maintenant EN DIRECT (LIVE)`);
        }

        // 2. Status: LIVE -> COMPLETED
        if ((event.status === 'LIVE' || event.status === 'SCHEDULED') && now >= end) {
          event.status = 'COMPLETED';
          event.updatedAt = now.toISOString();
          eventRepository.saveEvent(event);
          statusUpdated++;
          logger.info(`[EventsSchedulerService] Événement "${event.title}" (${event.id}) est maintenant TERMINÉ (COMPLETED)`);

          // Spawn next recurrence
          if (event.recurrence && event.recurrence.frequency !== 'NONE') {
            const nextEvent = await this.spawnNextRecurrence(event);
            if (nextEvent) {
              recurrencesSpawned++;
            }
          }
        }

        // 3. Reminders
        if (event.status === 'SCHEDULED' && event.reminders && event.reminders.length > 0) {
          const sentCount = await this.processReminders(event, now);
          remindersSent += sentCount;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { remindersSent, statusUpdated, recurrencesSpawned };
  }

  calculateNextDate(currentDateStr: string, recurrence: EventRecurrence): Date | null {
    const current = new Date(currentDateStr);
    const interval = recurrence.interval || 1;
    const next = new Date(current);

    switch (recurrence.frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * interval);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14 * interval);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + interval);
        break;
      default:
        return null;
    }

    if (recurrence.endDate && next > new Date(recurrence.endDate)) {
      return null;
    }

    return next;
  }

  async spawnNextRecurrence(parentEvent: DiscordEvent): Promise<DiscordEvent | null> {
    if (!parentEvent.recurrence || parentEvent.recurrence.frequency === 'NONE') return null;

    const nextStart = this.calculateNextDate(parentEvent.startDate, parentEvent.recurrence);
    if (!nextStart) return null;

    const durationMs = new Date(parentEvent.endDate).getTime() - new Date(parentEvent.startDate).getTime();
    const nextEnd = new Date(nextStart.getTime() + durationMs).toISOString();

    const currentCount = parentEvent.recurrence.currentOccurrence || 1;
    if (parentEvent.recurrence.maxOccurrences && currentCount >= parentEvent.recurrence.maxOccurrences) {
      return null;
    }

    const nextEvent = EventService.createEvent({
      ...parentEvent,
      id: undefined,
      startDate: nextStart.toISOString(),
      endDate: nextEnd,
      status: 'SCHEDULED',
      recurrence: {
        ...parentEvent.recurrence,
        currentOccurrence: currentCount + 1,
      },
      reminders: parentEvent.reminders.map((r) => ({ ...r, executed: false })),
    });

    logger.info(`[EventsSchedulerService] Nouvelle occurrence créée : ${nextEvent.id} pour le ${nextEvent.startDate}`);
    return nextEvent;
  }

  private async processReminders(event: DiscordEvent, now: Date): Promise<number> {
    let sentCount = 0;
    const startMs = new Date(event.startDate).getTime();
    const nowMs = now.getTime();
    const diffMinutes = Math.floor((startMs - nowMs) / 60000);

    for (const rule of event.reminders) {
      if (rule.executed) continue;

      if (diffMinutes <= rule.triggerMinutesBefore && diffMinutes >= -15) {
        rule.executed = true;
        eventRepository.saveEvent(event);

        await this.dispatchReminder(event, rule.triggerMinutesBefore, rule.customMessage);
        sentCount++;
      }
    }

    return sentCount;
  }

  private async dispatchReminder(event: DiscordEvent, minutesBefore: number, customMessage?: string): Promise<void> {
    const timeLabel = minutesBefore === 0
      ? 'COMMENCE MAINTENANT !'
      : minutesBefore < 60
      ? `commence dans ${minutesBefore} minutes !`
      : minutesBefore < 1440
      ? `commence dans ${Math.floor(minutesBefore / 60)}h !`
      : `commence dans ${Math.floor(minutesBefore / 1440)} jour(s) !`;

    const startUnix = Math.floor(new Date(event.startDate).getTime() / 1000);
    const content = customMessage || `⏰ **Rappel d'Événement** : **${event.title}** ${timeLabel}\n📅 <t:${startUnix}:F> (<t:${startUnix}:R>)`;

    if (!this.client) return;

    if (event.discordPanelChannelId) {
      try {
        const channel = await this.client.channels.fetch(event.discordPanelChannelId).catch(() => null);
        if (channel && channel.isTextBased()) {
          await (channel as TextChannel).send({ content });
        }
      } catch (err) {
        logger.error(`[EventsSchedulerService] Erreur lors de l'envoi du rappel sur channel ${event.discordPanelChannelId}:`, err);
      }
    }
  }
}

export const eventsSchedulerService = new EventsSchedulerService();
