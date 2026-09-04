import { DiscordEvent, EventParticipant, RSVPStatus } from './eventsTypes.js';
import { eventRepository } from './eventsRepository.js';
import { logger } from '../../utils/logger.js';

export interface RSVPResult {
  success: boolean;
  status?: RSVPStatus;
  waitlistPosition?: number;
  message?: string;
  error?: string;
  promotedParticipant?: EventParticipant;
}

export class EventRSVPService {
  /**
   * Enregistre ou modifie le RSVP d'un utilisateur
   */
  public static handleRSVP(
    guildId: string,
    eventId: string,
    user: { id: string; username: string; displayName?: string; avatarUrl?: string },
    desiredStatus: RSVPStatus
  ): RSVPResult {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event) {
      return { success: false, error: 'Événement introuvable.' };
    }

    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      return { success: false, error: "L'événement est déjà terminé ou a été annulé." };
    }

    const currentParticipant = eventRepository.getParticipant(eventId, user.id);
    const prevStatus = currentParticipant?.rsvp;

    let finalStatus = desiredStatus;
    let waitlistPosition: number | undefined = undefined;

    // Check capacity if user wants to be GOING
    if (desiredStatus === 'GOING') {
      const isAlreadyGoing = prevStatus === 'GOING';

      if (!isAlreadyGoing && !event.capacity.unlimited && event.capacity.maxParticipants > 0) {
        const currentGoingCount = event.stats.goingCount;

        if (currentGoingCount >= event.capacity.maxParticipants) {
          if (!event.capacity.waitlistEnabled) {
            return {
              success: false,
              error: 'Cet événement a atteint sa capacité maximale et les inscriptions sont fermées.',
            };
          }

          // User is placed on WAITLIST
          finalStatus = 'WAITLIST';
          const waitlistParticipants = eventRepository
            .getParticipants(eventId)
            .filter((p) => p.rsvp === 'WAITLIST');
          waitlistPosition = waitlistParticipants.length + 1;
        }
      }
    }

    // Save participant
    const ticketNumber = currentParticipant?.ticketNumber || `#EVT-${Math.floor(1000 + Math.random() * 9000)}`;
    const updatedParticipant: EventParticipant = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
      rsvp: finalStatus,
      joinedAt: currentParticipant?.joinedAt || new Date().toISOString(),
      attendance: currentParticipant?.attendance || 'REGISTERED',
      waitlistPosition,
      ticketNumber,
    };

    eventRepository.saveParticipant(eventId, updatedParticipant);

    // If user changed status away from GOING, check if someone from waitlist can be promoted!
    let promotedParticipant: EventParticipant | undefined = undefined;
    if (prevStatus === 'GOING' && finalStatus !== 'GOING') {
      promotedParticipant = this.promoteNextFromWaitlist(guildId, eventId) || undefined;
    }

    // Recompute stats
    this.recalculateStats(event);

    logger.info(
      `[EventRSVPService] RSVP pour ${user.username} sur "${event.title}": ${finalStatus} ${
        waitlistPosition ? `(Waitlist #${waitlistPosition})` : ''
      }`
    );

    return {
      success: true,
      status: finalStatus,
      waitlistPosition,
      promotedParticipant,
      message:
        finalStatus === 'WAITLIST'
          ? `L'événement est complet. Vous êtes inscrit sur la liste d'attente (Position #${waitlistPosition}).`
          : `Votre participation (${finalStatus}) a bien été enregistrée !`,
    };
  }

  /**
   * Promeut le premier participant en liste d'attente
   */
  public static promoteNextFromWaitlist(guildId: string, eventId: string): EventParticipant | null {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event || event.capacity.unlimited) return null;

    const participants = eventRepository.getParticipants(eventId);
    const waitlist = participants
      .filter((p) => p.rsvp === 'WAITLIST')
      .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));

    if (waitlist.length === 0) return null;

    const nextInLine = waitlist[0];
    nextInLine.rsvp = 'GOING';
    nextInLine.waitlistPosition = undefined;
    eventRepository.saveParticipant(eventId, nextInLine);

    // Re-index remaining waitlist
    waitlist.slice(1).forEach((p, idx) => {
      p.waitlistPosition = idx + 1;
      eventRepository.saveParticipant(eventId, p);
    });

    this.recalculateStats(event);
    logger.info(`[EventRSVPService] Utilisateur ${nextInLine.username} promu de la Waitlist vers GOING pour "${event.title}"`);
    return nextInLine;
  }

  public static recalculateStats(event: DiscordEvent): void {
    const participants = eventRepository.getParticipants(event.id);

    event.stats.goingCount = participants.filter((p) => p.rsvp === 'GOING').length;
    event.stats.maybeCount = participants.filter((p) => p.rsvp === 'MAYBE').length;
    event.stats.notGoingCount = participants.filter((p) => p.rsvp === 'NOT_GOING').length;
    event.stats.waitlistCount = participants.filter((p) => p.rsvp === 'WAITLIST').length;
    event.stats.attendedCount = participants.filter((p) => p.attendance === 'ATTENDED').length;
    event.stats.noShowCount = participants.filter((p) => p.attendance === 'NO_SHOW').length;

    eventRepository.saveEvent(event);
  }
}
