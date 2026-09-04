import { eventRepository } from './eventsRepository.js';
import { DiscordEvent, EventParticipant, AttendanceStatus } from './eventsTypes.js';
import { EventRSVPService } from './eventsRsvpService.js';
import { logger } from '../../utils/logger.js';

export class EventsCheckinService {
  /**
   * Check if check-in is currently open for this event
   */
  public static isCheckinOpen(event: DiscordEvent): { open: boolean; reason?: string } {
    if (event.status === 'CANCELLED') {
      return { open: false, reason: 'Événement annulé.' };
    }
    if (event.status === 'COMPLETED') {
      return { open: false, reason: 'Événement déjà terminé.' };
    }

    const now = Date.now();
    const startMs = new Date(event.startDate).getTime();
    const endMs = new Date(event.endDate).getTime();

    // Checkin opens 60 mins before start until event ends + 30 mins grace
    const earliestCheckin = startMs - 60 * 60 * 1000;
    const latestCheckin = endMs + 30 * 60 * 1000;

    if (now < earliestCheckin) {
      const minutesRemaining = Math.ceil((earliestCheckin - now) / 60000);
      return { open: false, reason: `Le pointage ouvrira dans ${minutesRemaining} minute(s).` };
    }

    if (now > latestCheckin) {
      return { open: false, reason: 'La fenêtre de pointage est fermée.' };
    }

    return { open: true };
  }

  /**
   * Self check-in by a user via button click or slash command
   */
  public static checkInUser(params: {
    guildId: string;
    eventId: string;
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    method?: 'DISCORD_BUTTON' | 'VOICE_PRESENCE' | 'MANUAL_STAFF' | 'SLASH_COMMAND';
    codeEntered?: string;
  }): { success: boolean; message: string; participant?: EventParticipant } {
    const event = eventRepository.getEventById(params.guildId, params.eventId);
    if (!event) {
      return { success: false, message: 'Événement introuvable.' };
    }

    const checkinState = this.isCheckinOpen(event);
    if (!checkinState.open) {
      return { success: false, message: checkinState.reason || 'Pointage fermé.' };
    }

    let participant = eventRepository.getParticipant(params.eventId, params.userId);
    if (!participant) {
      // Auto-register on checkin
      participant = {
        userId: params.userId,
        username: params.username,
        displayName: params.displayName || params.username,
        avatarUrl: params.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
        rsvp: 'GOING',
        joinedAt: new Date().toISOString(),
        attendance: 'ATTENDED',
        checkedInAt: new Date().toISOString(),
        checkinMethod: params.method || 'DISCORD_BUTTON',
        ticketNumber: `#EVT-${Math.floor(1000 + Math.random() * 9000)}`,
      };
    } else {
      participant.attendance = 'ATTENDED';
      participant.checkedInAt = new Date().toISOString();
      participant.checkinMethod = params.method || 'DISCORD_BUTTON';
      if (participant.rsvp !== 'GOING') {
        participant.rsvp = 'GOING';
      }
    }

    eventRepository.saveParticipant(params.eventId, participant);
    EventRSVPService.recalculateStats(event);

    logger.info(`[EventsCheckinService] Check-in validé pour ${params.username} sur "${event.title}"`);
    return { success: true, message: 'Pointage validé avec succès ! Votre présence est enregistrée.', participant };
  }

  /**
   * Manual check-in by admin/staff
   */
  public static manualCheckIn(
    guildId: string,
    eventId: string,
    userId: string,
    attendance: AttendanceStatus
  ): { success: boolean; message: string; participant?: EventParticipant } {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event) {
      return { success: false, message: 'Événement introuvable.' };
    }

    const participant = eventRepository.getParticipant(eventId, userId);
    if (!participant) {
      return { success: false, message: 'Ce membre n’est pas inscrit à cet événement.' };
    }

    participant.attendance = attendance;
    if (attendance === 'ATTENDED') {
      participant.checkedInAt = new Date().toISOString();
      participant.checkinMethod = 'MANUAL_STAFF';
    } else {
      participant.checkedInAt = undefined;
      participant.checkinMethod = undefined;
    }

    eventRepository.saveParticipant(eventId, participant);
    EventRSVPService.recalculateStats(event);

    return { success: true, message: `Statut de présence mis à jour : ${attendance}`, participant };
  }

  /**
   * Auto check-in for members in voice channel
   */
  public static autoCheckinVoiceMembers(
    guildId: string,
    eventId: string,
    voiceMembers: Array<{ id: string; username: string; displayName?: string; avatarUrl?: string }>
  ): { count: number; checkedInUsers: string[] } {
    const event = eventRepository.getEventById(guildId, eventId);
    if (!event || event.location.type !== 'VOICE' || !event.location.channelId) {
      return { count: 0, checkedInUsers: [] };
    }

    let count = 0;
    const checkedInUsers: string[] = [];

    for (const member of voiceMembers) {
      const res = this.checkInUser({
        guildId,
        eventId,
        userId: member.id,
        username: member.username,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        method: 'VOICE_PRESENCE',
      });
      if (res.success) {
        count++;
        checkedInUsers.push(member.id);
      }
    }

    return { count, checkedInUsers };
  }
}

export const eventsCheckinService = EventsCheckinService;
