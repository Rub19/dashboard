import {
  DiscordEvent,
  EventParticipant,
  EventTemplate,
  EventOverviewStats,
  RSVPStatus,
  AttendanceStatus,
} from './eventsTypes.js';

class EventRepository {
  private eventsByGuild = new Map<string, Map<string, DiscordEvent>>();
  private participantsByEvent = new Map<string, Map<string, EventParticipant>>();
  private templates: EventTemplate[] = [];

  constructor() {
    this.seedTemplates();
    this.seedDemoEvents();
  }

  private seedTemplates() {
    this.templates = [
      {
        id: "tpl-gaming",
        name: "Gaming Night",
        description: "Soirée jeux communautaires (Valorant, Minecraft, Lethal Company, etc.) avec salon vocal et rôles temporaires.",
        category: "GAMING",
        emoji: "🎮",
        defaultDurationMinutes: 180,
        locationType: "VOICE",
        defaultCapacity: 25,
        defaultReminders: [1440, 60, 15],
        defaultAutomations: ["CREATE_THREAD", "ASSIGN_ROLE"],
        tags: ["gaming", "fun", "vocal", "multijoueur"],
      },
      {
        id: "tpl-tournament",
        name: "Tournoi Compétitif",
        description: "Tournoi éliminatoire avec tableau de matchs, check-in obligatoire et liste d'attente.",
        category: "TOURNAMENT",
        emoji: "🏆",
        defaultDurationMinutes: 240,
        locationType: "VOICE",
        defaultCapacity: 32,
        defaultReminders: [2880, 1440, 120, 15],
        defaultAutomations: ["CREATE_THREAD", "ASSIGN_ROLE", "NOTIFY_STAFF"],
        tags: ["esport", "compétition", "récompenses", "bracket"],
      },
      {
        id: "tpl-staff",
        name: "Réunion Staff / Modération",
        description: "Point d'équipe réservé au staff pour faire le bilan du mois et discuter des règles.",
        category: "STAFF",
        emoji: "🛡️",
        defaultDurationMinutes: 90,
        locationType: "VOICE",
        defaultCapacity: 15,
        defaultReminders: [1440, 60],
        defaultAutomations: ["NOTIFY_STAFF"],
        tags: ["staff", "modération", "privé", "organisation"],
      },
      {
        id: "tpl-watchparty",
        name: "Watch Party Communautaire",
        description: "Diffusion live d'animés, films ou conférences technologiques avec tchat dédié.",
        category: "WATCH_PARTY",
        emoji: "🍿",
        defaultDurationMinutes: 150,
        locationType: "STAGE",
        defaultCapacity: 100,
        defaultReminders: [1440, 60, 10],
        defaultAutomations: ["CREATE_THREAD"],
        tags: ["cinema", "anime", "chill", "stream"],
      },
      {
        id: "tpl-voicechill",
        name: "Session Vocale & Podcast",
        description: "Échange libre et chill avec les membres et invités sur des sujets variés.",
        category: "VOICE",
        emoji: "🎙️",
        defaultDurationMinutes: 120,
        locationType: "VOICE",
        defaultCapacity: 50,
        defaultReminders: [60, 15],
        defaultAutomations: ["CREATE_THREAD"],
        tags: ["podcast", "discussion", "chill", "vocal"],
      },
      {
        id: "tpl-giveaway",
        name: "Événement Tirage au Sort Live",
        description: "Distribution de clés Steam, Discord Nitro ou goodies en direct avec les participants connectés.",
        category: "GIVEAWAY",
        emoji: "🎉",
        defaultDurationMinutes: 60,
        locationType: "STAGE",
        defaultCapacity: 200,
        defaultReminders: [1440, 60, 15],
        defaultAutomations: ["CREATE_THREAD", "ASSIGN_ROLE"],
        tags: ["concours", "nitro", "cadeaux", "live"],
      },
    ];
  }

  private seedDemoEvents(targetGuildId: string = '1128633164290596884') {
    const demoGuildId = targetGuildId;

    const now = new Date();
    // Event 1: in 2 days at 20h
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 2);
    d1.setHours(20, 0, 0, 0);
    const end1 = new Date(d1);
    end1.setHours(23, 0, 0, 0);

    // Event 2: in 5 days (Tournament)
    const d2 = new Date(now);
    d2.setDate(d2.getDate() + 5);
    d2.setHours(15, 0, 0, 0);
    const end2 = new Date(d2);
    end2.setHours(19, 0, 0, 0);

    // Event 3: in 1 day (Staff meeting)
    const d3 = new Date(now);
    d3.setDate(d3.getDate() + 1);
    d3.setHours(21, 0, 0, 0);
    const end3 = new Date(d3);
    end3.setHours(22, 30, 0, 0);

    // Event 4: yesterday (Completed)
    const d4 = new Date(now);
    d4.setDate(d4.getDate() - 1);
    d4.setHours(20, 30, 0, 0);
    const end4 = new Date(d4);
    end4.setHours(23, 0, 0, 0);

    const demoEvents: DiscordEvent[] = [
      {
        id: 'evt-gaming-night',
        guildId: demoGuildId,
        title: '🎮 Friday Gaming Night — Valorant & Lethal Company',
        description: 'Rejoignez la communauté ce vendredi pour 3 heures de sessions gaming intenses ! Des salons vocaux dédiés seront créés pour chaque escouade.',
        category: 'GAMING',
        status: 'SCHEDULED',
        organizer: {
          id: 'usr-alex',
          username: 'AlexDev#0001',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80',
        },
        startDate: d1.toISOString(),
        endDate: end1.toISOString(),
        timezone: 'Europe/Paris',
        durationMinutes: 180,
        location: {
          type: 'VOICE',
          channelId: '123456789012345678',
          channelName: '🔊 Soirée-Gaming',
        },
        accessType: 'PUBLIC',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=80',
        emoji: '🎮',
        tags: ['gaming', 'valorant', 'lethal-company', 'vocal'],
        capacity: {
          unlimited: false,
          maxParticipants: 24,
          waitlistEnabled: true,
        },
        eventRoleId: 'role-gaming-night',
        eventRoleAction: 'ASSIGN_ON_RSVP',
        removeRoleAfterEvent: true,
        recurrence: {
          frequency: 'WEEKLY',
          daysOfWeek: [5], // Friday
          endType: 'NEVER',
          currentOccurrence: 12,
        },
        reminders: [
          { id: 'rem-1', triggerMinutesBefore: 1440, channel: 'DISCORD_CHANNEL', executed: false },
          { id: 'rem-2', triggerMinutesBefore: 60, channel: 'DISCORD_DM', executed: false },
          { id: 'rem-3', triggerMinutesBefore: 15, channel: 'DISCORD_CHANNEL', executed: false },
        ],
        automations: [
          { id: 'aut-1', trigger: 'ON_START', actions: [{ type: 'CREATE_THREAD' }, { type: 'ASSIGN_ROLE' }], enabled: true },
        ],
        stats: {
          goingCount: 20,
          maybeCount: 6,
          notGoingCount: 2,
          waitlistCount: 3,
          attendedCount: 0,
          noShowCount: 0,
        },
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'evt-rocket-tournament',
        guildId: demoGuildId,
        title: '🏆 Grand Tournoi Rocket League 2v2 (Cashprize Nitro)',
        description: 'Tournoi officiel du serveur ETHONE en arbre à double élimination ! Inscription par équipe ou en solo pour être assigné à un coéquipier.',
        category: 'TOURNAMENT',
        status: 'SCHEDULED',
        organizer: {
          id: 'usr-event-lead',
          username: 'Kylian_Gamer#9912',
          avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80',
        },
        startDate: d2.toISOString(),
        endDate: end2.toISOString(),
        timezone: 'Europe/Paris',
        durationMinutes: 240,
        location: {
          type: 'VOICE',
          channelId: '123456789012345679',
          channelName: '🏆 Arène-Tournois',
        },
        accessType: 'PUBLIC',
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=100&auto=format&fit=crop&q=80',
        emoji: '🏆',
        tags: ['esport', 'rocketleague', 'tournoi', 'nitro'],
        capacity: {
          unlimited: false,
          maxParticipants: 16,
          waitlistEnabled: true,
        },
        eventRoleId: 'role-tournament-player',
        eventRoleAction: 'ASSIGN_ON_CHECKIN',
        removeRoleAfterEvent: true,
        reminders: [
          { id: 'rem-t1', triggerMinutesBefore: 1440, channel: 'DISCORD_CHANNEL', executed: false },
          { id: 'rem-t2', triggerMinutesBefore: 120, channel: 'DISCORD_DM', executed: false },
          { id: 'rem-t3', triggerMinutesBefore: 15, channel: 'DISCORD_CHANNEL', executed: false },
        ],
        automations: [
          { id: 'aut-t1', trigger: 'ON_START', actions: [{ type: 'CREATE_THREAD' }, { type: 'NOTIFY_STAFF' }], enabled: true },
        ],
        stats: {
          goingCount: 16,
          maybeCount: 4,
          notGoingCount: 1,
          waitlistCount: 5,
          attendedCount: 0,
          noShowCount: 0,
        },
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'evt-staff-sync',
        guildId: demoGuildId,
        title: '🛡️ Réunion Staff Mensuelle — Modération & Règlements',
        description: 'Bilan de sécurité mensuel, revue des sanctions, nouvelles règles AutoMod et préparation des événements du mois prochain.',
        category: 'STAFF',
        status: 'SCHEDULED',
        organizer: {
          id: 'usr-owner',
          username: 'Owner ETHONE',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80',
        },
        startDate: d3.toISOString(),
        endDate: end3.toISOString(),
        timezone: 'Europe/Paris',
        durationMinutes: 90,
        location: {
          type: 'VOICE',
          channelId: '123456789012345680',
          channelName: '🔒 Vocal-Staff',
        },
        accessType: 'STAFF_ONLY',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
        emoji: '🛡️',
        tags: ['staff', 'modération', 'sécurité', 'privé'],
        capacity: {
          unlimited: true,
          maxParticipants: 0,
          waitlistEnabled: false,
        },
        reminders: [
          { id: 'rem-s1', triggerMinutesBefore: 1440, channel: 'DISCORD_CHANNEL', executed: false },
          { id: 'rem-s2', triggerMinutesBefore: 60, channel: 'DISCORD_DM', executed: false },
        ],
        automations: [],
        stats: {
          goingCount: 8,
          maybeCount: 2,
          notGoingCount: 0,
          waitlistCount: 0,
          attendedCount: 0,
          noShowCount: 0,
        },
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'evt-watch-party-anime',
        guildId: demoGuildId,
        title: '🍿 Watch Party Anime — Jujutsu Kaisen Arc Final',
        description: 'Diffusion live sur le Stage Discord avec partage d\'écran haute définition et discussion en direct.',
        category: 'WATCH_PARTY',
        status: 'COMPLETED',
        organizer: {
          id: 'usr-elena',
          username: 'Elena_Design#0077',
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&auto=format&fit=crop&q=80',
        },
        startDate: d4.toISOString(),
        endDate: end4.toISOString(),
        timezone: 'Europe/Paris',
        durationMinutes: 150,
        location: {
          type: 'STAGE',
          channelId: '123456789012345681',
          channelName: '🎭 Stage-Cinema',
        },
        accessType: 'PUBLIC',
        imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        emoji: '🍿',
        tags: ['watchparty', 'anime', 'stream', 'chill'],
        capacity: {
          unlimited: true,
          maxParticipants: 0,
          waitlistEnabled: false,
        },
        reminders: [],
        automations: [],
        stats: {
          goingCount: 42,
          maybeCount: 8,
          notGoingCount: 3,
          waitlistCount: 0,
          attendedCount: 38,
          noShowCount: 4,
          peakVoiceAttendance: 45,
        },
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    for (const evt of demoEvents) {
      this.saveEvent(evt);
      this.seedParticipantsForEvent(evt.id);
    }
  }

  private seedParticipantsForEvent(eventId: string) {
    const participantsMap = new Map<string, EventParticipant>();

    const users = [
      { id: 'usr-1', username: 'Nocturne#4412', displayName: 'Nocturne', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80', rsvp: 'GOING' as RSVPStatus, attendance: 'ATTENDED' as AttendanceStatus },
      { id: 'usr-2', username: 'AlexDev#0001', displayName: 'AlexDev', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80', rsvp: 'GOING' as RSVPStatus, attendance: 'ATTENDED' as AttendanceStatus },
      { id: 'usr-3', username: 'ShadowGamer#1337', displayName: 'Shadow', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80', rsvp: 'GOING' as RSVPStatus, attendance: 'ATTENDED' as AttendanceStatus },
      { id: 'usr-4', username: 'Sarah_T#2048', displayName: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80', rsvp: 'GOING' as RSVPStatus, attendance: 'REGISTERED' as AttendanceStatus },
      { id: 'usr-5', username: 'Kylian_Gamer#9912', displayName: 'Kylian', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80', rsvp: 'GOING' as RSVPStatus, attendance: 'REGISTERED' as AttendanceStatus },
      { id: 'usr-6', username: 'Lucas92#4412', displayName: 'Lucas', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80', rsvp: 'MAYBE' as RSVPStatus, attendance: 'REGISTERED' as AttendanceStatus },
      { id: 'usr-7', username: 'Elena_Design#0077', displayName: 'Elena', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&auto=format&fit=crop&q=80', rsvp: 'MAYBE' as RSVPStatus, attendance: 'REGISTERED' as AttendanceStatus },
      { id: 'usr-8', username: 'Zephyr#0042', displayName: 'Zephyr', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80', rsvp: 'WAITLIST' as RSVPStatus, attendance: 'REGISTERED' as AttendanceStatus, waitlistPos: 1 },
      { id: 'usr-9', username: 'Vortex#1109', displayName: 'Vortex', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&auto=format&fit=crop&q=80', rsvp: 'WAITLIST' as RSVPStatus, attendance: 'REGISTERED' as AttendanceStatus, waitlistPos: 2 },
    ];

    users.forEach((u, i) => {
      participantsMap.set(u.id, {
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatar,
        rsvp: u.rsvp,
        joinedAt: new Date(Date.now() - 3600000 * (i + 1)).toISOString(),
        attendance: u.attendance,
        ticketNumber: `#EVT-${1000 + i}`,
        waitlistPosition: u.waitlistPos,
        checkinMethod: u.attendance === 'ATTENDED' ? 'DISCORD_BUTTON' : undefined,
        checkedInAt: u.attendance === 'ATTENDED' ? new Date().toISOString() : undefined,
      });
    });

    this.participantsByEvent.set(eventId, participantsMap);
  }

  // Multi-Guild Storage
  private getGuildEventsMap(guildId: string): Map<string, DiscordEvent> {
    if (!this.eventsByGuild.has(guildId)) {
      this.eventsByGuild.set(guildId, new Map());
      this.seedDemoEvents(guildId);
    }
    return this.eventsByGuild.get(guildId)!;
  }

  public getEvents(guildId: string): DiscordEvent[] {
    return Array.from(this.getGuildEventsMap(guildId).values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  public getEventById(guildId: string, eventId: string): DiscordEvent | null {
    const map = this.getGuildEventsMap(guildId);
    return map.get(eventId) || null;
  }

  public saveEvent(event: DiscordEvent): void {
    const map = this.getGuildEventsMap(event.guildId);
    event.updatedAt = new Date().toISOString();
    map.set(event.id, event);
  }

  public deleteEvent(guildId: string, eventId: string): boolean {
    const map = this.getGuildEventsMap(guildId);
    const deleted = map.delete(eventId);
    this.participantsByEvent.delete(eventId);
    return deleted;
  }

  // Participants & RSVPs
  public getParticipants(eventId: string): EventParticipant[] {
    const map = this.participantsByEvent.get(eventId);
    if (!map) return [];
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );
  }

  public getParticipant(eventId: string, userId: string): EventParticipant | null {
    const map = this.participantsByEvent.get(eventId);
    if (!map) return null;
    return map.get(userId) || null;
  }

  public saveParticipant(eventId: string, participant: EventParticipant): void {
    if (!this.participantsByEvent.has(eventId)) {
      this.participantsByEvent.set(eventId, new Map());
    }
    this.participantsByEvent.get(eventId)!.set(participant.userId, participant);
  }

  public removeParticipant(eventId: string, userId: string): boolean {
    const map = this.participantsByEvent.get(eventId);
    if (!map) return false;
    return map.delete(userId);
  }

  // Templates
  public getTemplates(): EventTemplate[] {
    return this.templates;
  }

  public getTemplateById(id: string): EventTemplate | null {
    return this.templates.find((t) => t.id === id) || null;
  }

  // KPIs & Overview
  public getOverviewStats(guildId: string): EventOverviewStats {
    const events = this.getEvents(guildId);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const upcomingCount = events.filter(
      (e) => (e.status === 'SCHEDULED' || e.status === 'LIVE') && new Date(e.endDate) > now
    ).length;

    const activeCount = events.filter((e) => e.status === 'LIVE').length;

    const eventsThisMonth = events.filter((e) => {
      const d = new Date(e.startDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const totalParticipants = events.reduce((acc, e) => acc + e.stats.goingCount, 0);

    const completedWithAttendance = events.filter((e) => e.status === 'COMPLETED' && e.stats.goingCount > 0);
    const averageAttendanceRate =
      completedWithAttendance.length > 0
        ? Math.round(
            completedWithAttendance.reduce(
              (acc, e) => acc + (e.stats.attendedCount / e.stats.goingCount) * 100,
              0
            ) / completedWithAttendance.length
          )
        : 88;

    return {
      upcomingCount,
      activeCount,
      totalParticipants,
      averageAttendanceRate,
      eventsThisMonth,
      totalEvents: events.length,
    };
  }

  public getEventsByGuild(guildId: string): DiscordEvent[] {
    return this.getEvents(guildId);
  }

  public getAllEvents(): DiscordEvent[] {
    const all: DiscordEvent[] = [];
    for (const map of Array.from(this.eventsByGuild.values())) {
      all.push(...Array.from(map.values()));
    }
    return all;
  }
}

export const eventRepository = new EventRepository();
export const eventsRepo = eventRepository;
