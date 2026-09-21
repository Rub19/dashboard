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

  // Multi-Guild Storage
  private getGuildEventsMap(guildId: string): Map<string, DiscordEvent> {
    if (!this.eventsByGuild.has(guildId)) {
      this.eventsByGuild.set(guildId, new Map());
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
