import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { eventRepository } from '../../modules/events/eventsRepository.js';
import { EventService } from '../../modules/events/eventsService.js';
import { EventRSVPService } from '../../modules/events/eventsRsvpService.js';
import { EventsCheckinService } from '../../modules/events/eventsCheckinService.js';
import { RSVPStatus, AttendanceStatus } from '../../modules/events/eventsTypes.js';

export function createEventRouter(client?: Client): Router {
  const router = Router({ mergeParams: true });

  // GET /api/guilds/:guildId/events
  router.get('/', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const { status, category, limit } = req.query;

      let events = eventRepository.getEventsByGuild(guildId);

      if (status && typeof status === 'string') {
        events = events.filter((e) => e.status === status.toUpperCase());
      }
      if (category && typeof category === 'string') {
        events = events.filter((e) => e.category === category.toUpperCase());
      }
      if (limit) {
        events = events.slice(0, parseInt(limit as string, 10));
      }

      res.json({ success: true, events, count: events.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/events/stats/overview
  router.get('/stats/overview', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const stats = eventRepository.getOverviewStats(guildId);
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/events/templates
  router.get('/templates', (_req: Request, res: Response) => {
    try {
      const templates = eventRepository.getTemplates();
      res.json({ success: true, templates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/events/:eventId
  router.get('/:eventId', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);
      const event = eventRepository.getEventById(guildId, eventId);

      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.json({ success: true, event });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/guilds/:guildId/events
  router.post('/', async (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventData = req.body;

      if (!eventData.title || !eventData.startDate) {
        return res.status(400).json({ success: false, error: 'title and startDate are required' });
      }

      const created = EventService.createEvent({
        ...eventData,
        guildId,
      });

      if (client && eventData.syncToDiscord) {
        await EventService.syncToDiscordScheduledEvent(created, client).catch(() => null);
      }

      res.status(201).json({ success: true, event: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/events/:eventId
  router.put('/:eventId', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);
      const updates = req.body;

      const updated = EventService.updateEvent(guildId, eventId, updates);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.json({ success: true, event: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/guilds/:guildId/events/:eventId
  router.delete('/:eventId', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);
      const reason = req.body?.reason;

      const result = EventService.cancelEvent(guildId, eventId, reason);
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/guilds/:guildId/events/:eventId/reschedule
  router.post('/:eventId/reschedule', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);
      const { newStartDate, newEndDate } = req.body;

      if (!newStartDate || !newEndDate) {
        return res.status(400).json({ success: false, error: 'newStartDate and newEndDate are required' });
      }

      const result = EventService.rescheduleEvent(guildId, eventId, newStartDate, newEndDate);
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/guilds/:guildId/events/:eventId/duplicate
  router.post('/:eventId/duplicate', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);

      const duplicated = EventService.duplicateEvent(guildId, eventId);
      if (!duplicated) {
        return res.status(404).json({ success: false, error: 'Source event not found' });
      }

      res.status(201).json({ success: true, event: duplicated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/events/:eventId/participants
  router.get('/:eventId/participants', (req: Request, res: Response) => {
    try {
      const eventId = String(req.params.eventId);
      const { rsvp } = req.query;

      let participants = eventRepository.getParticipants(eventId);
      if (rsvp && typeof rsvp === 'string') {
        participants = participants.filter((p) => p.rsvp === rsvp.toUpperCase());
      }

      res.json({ success: true, participants, count: participants.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/guilds/:guildId/events/:eventId/participants/rsvp
  router.post('/:eventId/participants/rsvp', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);
      const { userId, username, displayName, avatarUrl, status } = req.body;

      if (!userId || !username || !status) {
        return res.status(400).json({ success: false, error: 'userId, username, and status are required' });
      }

      const result = EventRSVPService.handleRSVP(
        guildId,
        eventId,
        { id: userId, username, displayName, avatarUrl },
        status.toUpperCase() as RSVPStatus
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/guilds/:guildId/events/:eventId/participants/:userId/checkin
  router.post('/:eventId/participants/:userId/checkin', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);
      const userId = String(req.params.userId);
      const { attendance = 'ATTENDED', username, displayName, avatarUrl, method } = req.body;

      if (method || !eventRepository.getParticipant(eventId, userId)) {
        const result = EventsCheckinService.checkInUser({
          guildId,
          eventId,
          userId,
          username: username || 'User',
          displayName,
          avatarUrl,
          method: method || 'MANUAL_STAFF',
        });
        return res.json(result);
      }

      const result = EventsCheckinService.manualCheckIn(guildId, eventId, userId, attendance.toUpperCase() as AttendanceStatus);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/guilds/:guildId/events/:eventId/participants/:userId
  router.delete('/:eventId/participants/:userId', (req: Request, res: Response) => {
    try {
      const eventId = String(req.params.eventId);
      const userId = String(req.params.userId);

      const removed = eventRepository.removeParticipant(eventId, userId);
      res.json({ success: removed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/events/:eventId/analytics
  router.get('/:eventId/analytics', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const eventId = String(req.params.eventId);

      const event = eventRepository.getEventById(guildId, eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      const participants = eventRepository.getParticipants(eventId);
      const totalRsvps = participants.length;
      const goingCount = event.stats.goingCount;
      const attendedCount = event.stats.attendedCount;
      const attendanceRate = goingCount > 0 ? Math.round((attendedCount / goingCount) * 100) : 0;
      const noShowRate = goingCount > 0 ? Math.max(0, 100 - attendanceRate) : 0;

      // Group registrations by day
      const timelineMap: Record<string, number> = {};
      for (const p of participants) {
        const dateKey = p.joinedAt.slice(0, 10);
        timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
      }
      const timeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

      res.json({
        success: true,
        analytics: {
          eventId,
          stats: event.stats,
          totalRsvps,
          attendanceRate,
          noShowRate,
          maxCapacity: !event.capacity.unlimited ? event.capacity.maxParticipants : null,
          fillRate: !event.capacity.unlimited && event.capacity.maxParticipants > 0
            ? Math.min(100, Math.round((goingCount / event.capacity.maxParticipants) * 100))
            : null,
          timeline,
          peakVoiceAttendance: event.stats.peakVoiceAttendance || (event.location.type === 'VOICE' ? attendedCount : 0),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
