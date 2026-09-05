import { PresenceProfile, ScheduledPresenceSlot } from '../types/index.js';
import { PresenceService } from './presenceService.js';
import { logger } from '../../../utils/logger.js';

export class PresenceSchedulerService {
  private static instance: PresenceSchedulerService;
  private timer: NodeJS.Timeout | null = null;

  private defaultProfiles: PresenceProfile[] = [
    {
      id: 'prof_gaming',
      name: 'Gaming Session',
      icon: '🎮',
      category: 'gaming',
      status: 'online',
      activityType: 'Playing',
      activityText: 'Valorant',
      description: 'Idéal lors des sessions de jeu actives avec la communauté.',
    },
    {
      id: 'prof_music',
      name: 'Music Vibes',
      icon: '🎧',
      category: 'music',
      status: 'online',
      activityType: 'Listening',
      activityText: 'Spotify',
      description: 'Profil musical détendu quand le bot joue de la musique.',
    },
    {
      id: 'prof_maintenance',
      name: 'Maintenance Mode',
      icon: '🛠️',
      category: 'maintenance',
      status: 'dnd',
      activityType: 'Watching',
      activityText: 'ETHONE Maintenance en cours...',
      description: 'Signale immédiatement aux membres que des mises à jour ont lieu.',
    },
    {
      id: 'prof_night',
      name: 'Night Calm',
      icon: '🌙',
      category: 'night',
      status: 'idle',
      activityType: 'Watching',
      activityText: 'Le serveur dormir paisiblement',
      description: 'Statut discret pour les heures creuses de la nuit.',
    },
    {
      id: 'prof_community',
      name: 'Community Watch',
      icon: '👀',
      category: 'community',
      status: 'online',
      activityType: 'Watching',
      activityText: '{guildCount} serveurs & {userCount} membres',
      description: 'Affiche en temps réel le nombre de serveurs et membres gérés.',
    },
  ];

  private slots: ScheduledPresenceSlot[] = [
    {
      id: 'slot_night',
      name: 'Nuit Paisible',
      enabled: false,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startHour: 0,
      endHour: 8,
      status: 'idle',
      activityType: 'Watching',
      activityText: 'Le serveur dormir...',
      timezone: 'Europe/Paris',
    },
    {
      id: 'slot_day',
      name: 'Journée Active',
      enabled: false,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 18,
      status: 'online',
      activityType: 'Watching',
      activityText: '{guildCount} serveurs Discord',
      timezone: 'Europe/Paris',
    },
    {
      id: 'slot_evening',
      name: 'Soirée Gaming',
      enabled: false,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startHour: 18,
      endHour: 24,
      status: 'online',
      activityType: 'Playing',
      activityText: 'Valorant avec le staff',
      timezone: 'Europe/Paris',
    },
  ];

  private constructor() {
    // Vérification du calendrier toutes les 5 minutes
    this.timer = setInterval(() => {
      this.evaluateActiveSlot();
    }, 300000);
  }

  public static getInstance(): PresenceSchedulerService {
    if (!PresenceSchedulerService.instance) {
      PresenceSchedulerService.instance = new PresenceSchedulerService();
    }
    return PresenceSchedulerService.instance;
  }

  public getProfiles(): PresenceProfile[] {
    return [...this.defaultProfiles];
  }

  public applyProfile(profileId: string, actor = 'Bot Owner'): boolean {
    const prof = this.defaultProfiles.find((p) => p.id === profileId);
    if (!prof) return false;

    const presenceService = PresenceService.getInstance();
    presenceService.updatePresence(
      prof.status,
      {
        type: prof.activityType,
        name: prof.activityText,
        url: prof.streamingUrl,
      },
      actor,
      'profile_applier',
      'preset',
      `Profil prédéfini appliqué : ${prof.name}`
    );

    logger.info(`[PresenceScheduler] Profil appliqué : ${prof.name}`);
    return true;
  }

  public getSlots(): ScheduledPresenceSlot[] {
    return [...this.slots];
  }

  public updateSlots(slots: ScheduledPresenceSlot[]): ScheduledPresenceSlot[] {
    this.slots = slots;
    this.evaluateActiveSlot();
    return [...this.slots];
  }

  public evaluateActiveSlot() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();

    const activeSlot = this.slots.find((s) => {
      if (!s.enabled) return false;
      if (!s.daysOfWeek.includes(currentDay)) return false;
      return currentHour >= s.startHour && currentHour < s.endHour;
    });

    if (activeSlot) {
      const presenceService = PresenceService.getInstance();
      presenceService.updatePresence(
        activeSlot.status,
        {
          type: activeSlot.activityType,
          name: activeSlot.activityText,
          url: activeSlot.streamingUrl,
        },
        'Scheduler Engine',
        'system_scheduler',
        'schedule',
        `Créneau planifié : ${activeSlot.name}`
      );
    }
  }
}
