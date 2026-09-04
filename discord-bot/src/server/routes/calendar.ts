import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { eventRepository } from '../modules/events/eventsRepository.js';

export function createCalendarRouter(client?: Client): Router {
  const router = Router({ mergeParams: true });

  // GET /api/guilds/:guildId/calendar
  router.get('/', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const { start, end, category } = req.query;

      let events = eventRepository.getEventsByGuild(guildId);

      if (category && typeof category === 'string') {
        events = events.filter((e) => e.category === category.toUpperCase());
      }

      if (start && typeof start === 'string') {
        const startTimestamp = new Date(start).getTime();
        events = events.filter((e) => new Date(e.startDate).getTime() >= startTimestamp);
      }

      if (end && typeof end === 'string') {
        const endTimestamp = new Date(end).getTime();
        events = events.filter((e) => new Date(e.startDate).getTime() <= endTimestamp);
      }

      const calendarEntries = events.map((e) => {
        let color = '#5865F2'; // Discord Blurple
        if (e.category === 'GAMING') color = '#8B5CF6'; // Purple
        if (e.category === 'TOURNAMENT') color = '#F59E0B'; // Amber
        if (e.category === 'COMMUNITY') color = '#10B981'; // Emerald
        if (e.category === 'MEETING' || e.category === 'STAFF') color = '#3B82F6'; // Blue
        if (e.category === 'WATCH_PARTY') color = '#EC4899'; // Pink
        if (e.category === 'GIVEAWAY') color = '#06B6D4'; // Cyan
        if (e.status === 'CANCELLED') color = '#EF4444'; // Red

        return {
          id: e.id,
          title: e.title,
          start: e.startDate,
          end: e.endDate,
          color,
          category: e.category,
          status: e.status,
          emoji: e.emoji,
          location: e.location.channelName ? `🔊 ${e.location.channelName}` : (e.location.details || e.location.type),
          stats: e.stats,
          capacity: !e.capacity.unlimited ? e.capacity.maxParticipants : null,
        };
      });

      res.json({ success: true, events: calendarEntries });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/calendar/export/ics
  router.get('/export/ics', (req: Request, res: Response) => {
    try {
      const guildId = String(req.params.guildId);
      const events = eventRepository.getEventsByGuild(guildId);

      const formatIcsDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const nowIcs = formatIcsDate(new Date().toISOString());

      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ETHONE//Discord Events 2.0//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:ETHONE Discord Events',
      ];

      for (const ev of events) {
        if (ev.status === 'CANCELLED') continue;

        const dtStart = formatIcsDate(ev.startDate);
        const dtEnd = formatIcsDate(ev.endDate);
        const locationStr = ev.location.channelName || ev.location.details || ev.location.type;

        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${ev.id}@ethone.app`);
        icsContent.push(`DTSTAMP:${nowIcs}`);
        icsContent.push(`DTSTART:${dtStart}`);
        icsContent.push(`DTEND:${dtEnd}`);
        icsContent.push(`SUMMARY:${(ev.emoji ? `${ev.emoji} ` : '') + ev.title.replace(/[,;]/g, ' ')}`);
        icsContent.push(`DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`);
        icsContent.push(`LOCATION:${locationStr}`);
        icsContent.push(`STATUS:${ev.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED'}`);
        icsContent.push('END:VEVENT');
      }

      icsContent.push('END:VCALENDAR');

      const fileContent = icsContent.join('\r\n');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ethone-calendar-${guildId}.ics"`);
      res.send(fileContent);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
