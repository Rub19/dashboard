import fs from 'fs';
import path from 'path';
import {
  VoiceHub,
  TemporaryVoiceRoom,
  VoiceSession,
  VoiceTimelineEvent,
  VoiceTrackerSettings,
  VoiceOverviewKpis,
} from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export const DEFAULT_VOICE_SETTINGS: VoiceTrackerSettings = {
  enabled: true,
  defaultCategoryId: null,
  defaultHubId: null,
  emptyDeletionDelaySeconds: 30,
  ownershipTransferStrategy: 'FIRST_REMAINING',
  maxRoomsPerGuild: 25,
  maxRoomsPerUser: 1,
  creationCooldownSeconds: 15,
  panelChannelId: null,
  sendControlPanelInRoom: true,
  automationsEnabled: true,
  automations: [
    {
      id: 'auto_1',
      name: 'Rôle En Vocal',
      trigger: 'USER_JOIN',
      action: 'LOG_AUDIT',
      enabled: true,
      messageTemplate: 'Membre entré en salon vocal temporaire',
    },
  ],
  defaultBitrate: 64000,
  notifyOnRoomCreation: false,
};

export class VoiceRepository {
  private dataDir = path.resolve(process.cwd(), 'data');
  private hubsPath = path.resolve(this.dataDir, 'voice_hubs.json');
  private roomsPath = path.resolve(this.dataDir, 'voice_rooms.json');
  private sessionsPath = path.resolve(this.dataDir, 'voice_sessions.json');
  private settingsPath = path.resolve(this.dataDir, 'voice_settings.json');
  private timelinePath = path.resolve(this.dataDir, 'voice_timeline.json');

  private hubs: VoiceHub[] = [];
  private rooms: TemporaryVoiceRoom[] = [];
  private sessions: VoiceSession[] = [];
  private settings = new Map<string, VoiceTrackerSettings>();
  private timeline: VoiceTimelineEvent[] = [];

  constructor() {
    this.ensureDir();
    this.loadData();
    this.seedDemoDataIfEmpty();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.hubsPath)) {
        this.hubs = JSON.parse(fs.readFileSync(this.hubsPath, 'utf8'));
      }
      if (fs.existsSync(this.roomsPath)) {
        this.rooms = JSON.parse(fs.readFileSync(this.roomsPath, 'utf8'));
      }
      if (fs.existsSync(this.sessionsPath)) {
        this.sessions = JSON.parse(fs.readFileSync(this.sessionsPath, 'utf8'));
      }
      if (fs.existsSync(this.settingsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        Object.entries(raw).forEach(([gId, set]) => this.settings.set(gId, set as VoiceTrackerSettings));
      }
      if (fs.existsSync(this.timelinePath)) {
        this.timeline = JSON.parse(fs.readFileSync(this.timelinePath, 'utf8'));
      }
    } catch (e) {
      logger.error('[VoiceRepository] Erreur lors du chargement des données:', e);
    }
  }

  private saveData() {
    try {
      this.ensureDir();
      fs.writeFileSync(this.hubsPath, JSON.stringify(this.hubs, null, 2), 'utf8');
      fs.writeFileSync(this.roomsPath, JSON.stringify(this.rooms, null, 2), 'utf8');
      fs.writeFileSync(this.sessionsPath, JSON.stringify(this.sessions, null, 2), 'utf8');
      fs.writeFileSync(this.timelinePath, JSON.stringify(this.timeline, null, 2), 'utf8');

      const setObj: Record<string, any> = {};
      this.settings.forEach((v, k) => (setObj[k] = v));
      fs.writeFileSync(this.settingsPath, JSON.stringify(setObj, null, 2), 'utf8');
    } catch (e) {
      logger.error('[VoiceRepository] Erreur lors de la sauvegarde des données:', e);
    }
  }

  private seedDemoDataIfEmpty() {
    if (this.hubs.length === 0) {
      const demoGuild = '1128633164290596884';
      const now = Date.now();

      // Sample Hubs
      this.hubs = [
        {
          id: 'hub_gaming',
          guildId: demoGuild,
          name: 'Gaming Hub',
          categoryId: 'cat_gaming',
          channelId: 'vc_create_gaming',
          type: 'voice',
          namingTemplate: "🎮 {username}'s Room",
          userLimit: 5,
          bitrate: 96000,
          region: null,
          allowedRoles: [],
          excludedRoles: [],
          roleRequirementMode: 'any',
          accessMode: 'public',
          autoNumbering: true,
          enabled: true,
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
        {
          id: 'hub_chill',
          guildId: demoGuild,
          name: 'Chill & Talk',
          categoryId: 'cat_chill',
          channelId: 'vc_create_chill',
          type: 'voice',
          namingTemplate: '💬 Salon de {displayName}',
          userLimit: 10,
          bitrate: 64000,
          region: null,
          allowedRoles: [],
          excludedRoles: [],
          roleRequirementMode: 'any',
          accessMode: 'public',
          autoNumbering: true,
          enabled: true,
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
        {
          id: 'hub_ranked',
          guildId: demoGuild,
          name: 'Ranked / Tryhard Hub',
          categoryId: 'cat_gaming',
          channelId: 'vc_create_ranked',
          type: 'voice',
          namingTemplate: '🏆 Ranked #{number}',
          userLimit: 3,
          bitrate: 128000,
          region: null,
          allowedRoles: [],
          excludedRoles: [],
          roleRequirementMode: 'any',
          accessMode: 'public',
          autoNumbering: true,
          enabled: true,
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
        },
        {
          id: 'hub_vip',
          guildId: demoGuild,
          name: 'Salon VIP Privé',
          categoryId: 'cat_vip',
          channelId: 'vc_create_vip',
          type: 'voice',
          namingTemplate: '👑 VIP — {username}',
          userLimit: 0,
          bitrate: 128000,
          region: null,
          allowedRoles: ['role_vip'],
          excludedRoles: [],
          roleRequirementMode: 'any',
          accessMode: 'role_only',
          autoNumbering: false,
          enabled: true,
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ];

      // Sample Active Rooms
      this.rooms = [
        {
          id: 'room_alex_gaming',
          guildId: demoGuild,
          hubId: 'hub_gaming',
          hubName: 'Gaming Hub',
          name: "🎮 Alex's Room #1",
          ownerId: 'usr_alex',
          ownerTag: 'Alex#0001',
          userLimit: 5,
          bitrate: 96000,
          isLocked: false,
          isHidden: false,
          allowedUserIds: [],
          blockedUserIds: [],
          createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
          lastEmptyAt: null,
          status: 'ACTIVE',
          currentUsers: [
            {
              id: 'usr_alex',
              tag: 'Alex#0001',
              joinedAt: new Date(now - 1000 * 60 * 45).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: true,
            },
            {
              id: 'usr_lucas',
              tag: 'Lucas#1234',
              joinedAt: new Date(now - 1000 * 60 * 25).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: false,
            },
            {
              id: 'usr_sarah',
              tag: 'Sarah#5678',
              joinedAt: new Date(now - 1000 * 60 * 12).toISOString(),
              isMuted: true,
              isDeafened: false,
              isStreaming: false,
            },
          ],
          peakUsers: 4,
          totalSecondsActive: 2700,
        },
        {
          id: 'room_chill_lounge',
          guildId: demoGuild,
          hubId: 'hub_chill',
          hubName: 'Chill & Talk',
          name: '💬 Salon de Marie #1',
          ownerId: 'usr_marie',
          ownerTag: 'Marie#9999',
          userLimit: 10,
          bitrate: 64000,
          isLocked: true,
          isHidden: false,
          allowedUserIds: ['usr_thomas'],
          blockedUserIds: ['usr_troll'],
          createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
          lastEmptyAt: null,
          status: 'ACTIVE',
          currentUsers: [
            {
              id: 'usr_marie',
              tag: 'Marie#9999',
              joinedAt: new Date(now - 1000 * 60 * 90).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: false,
            },
            {
              id: 'usr_thomas',
              tag: 'Thomas#4321',
              joinedAt: new Date(now - 1000 * 60 * 40).toISOString(),
              isMuted: false,
              isDeafened: false,
              isStreaming: false,
            },
          ],
          peakUsers: 2,
          totalSecondsActive: 5400,
        },
      ];

      // Sample Timeline Events
      this.timeline = [
        {
          id: 'tl_1',
          roomId: 'room_alex_gaming',
          guildId: demoGuild,
          type: 'ROOM_CREATED',
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
          actorId: 'usr_alex',
          actorTag: 'Alex#0001',
          details: 'Création automatique via Join-to-Create (Gaming Hub)',
        },
        {
          id: 'tl_2',
          roomId: 'room_alex_gaming',
          guildId: demoGuild,
          type: 'USER_JOINED',
          timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
          actorId: 'usr_lucas',
          actorTag: 'Lucas#1234',
        },
        {
          id: 'tl_3',
          roomId: 'room_alex_gaming',
          guildId: demoGuild,
          type: 'USER_JOINED',
          timestamp: new Date(now - 1000 * 60 * 12).toISOString(),
          actorId: 'usr_sarah',
          actorTag: 'Sarah#5678',
        },
        {
          id: 'tl_4',
          roomId: 'room_chill_lounge',
          guildId: demoGuild,
          type: 'ROOM_CREATED',
          timestamp: new Date(now - 1000 * 60 * 90).toISOString(),
          actorId: 'usr_marie',
          actorTag: 'Marie#9999',
        },
        {
          id: 'tl_5',
          roomId: 'room_chill_lounge',
          guildId: demoGuild,
          type: 'ROOM_LOCKED',
          timestamp: new Date(now - 1000 * 60 * 50).toISOString(),
          actorId: 'usr_marie',
          actorTag: 'Marie#9999',
          details: 'Verrouillé par le propriétaire',
        },
      ];

      // Sample Historical Sessions
      this.sessions = [
        {
          id: 'sess_1',
          guildId: demoGuild,
          channelId: 'room_alex_gaming',
          roomName: "🎮 Alex's Room #1",
          hubId: 'hub_gaming',
          userId: 'usr_alex',
          userTag: 'Alex#0001',
          joinedAt: new Date(now - 1000 * 60 * 45).toISOString(),
          leftAt: null,
          durationSeconds: 2700,
        },
        {
          id: 'sess_2',
          guildId: demoGuild,
          channelId: 'room_alex_gaming',
          roomName: "🎮 Alex's Room #1",
          hubId: 'hub_gaming',
          userId: 'usr_lucas',
          userTag: 'Lucas#1234',
          joinedAt: new Date(now - 1000 * 60 * 25).toISOString(),
          leftAt: null,
          durationSeconds: 1500,
        },
        {
          id: 'sess_3',
          guildId: demoGuild,
          channelId: 'room_alex_gaming',
          roomName: "🎮 Alex's Room #1",
          hubId: 'hub_gaming',
          userId: 'usr_sarah',
          userTag: 'Sarah#5678',
          joinedAt: new Date(now - 1000 * 60 * 12).toISOString(),
          leftAt: null,
          durationSeconds: 720,
        },
        {
          id: 'sess_4',
          guildId: demoGuild,
          channelId: 'room_old_ranked',
          roomName: '🏆 Ranked #1',
          hubId: 'hub_ranked',
          userId: 'usr_alex',
          userTag: 'Alex#0001',
          joinedAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
          leftAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
          durationSeconds: 7200,
        },
        {
          id: 'sess_5',
          guildId: demoGuild,
          channelId: 'room_old_chill',
          roomName: '💬 Salon Chill #2',
          hubId: 'hub_chill',
          userId: 'usr_david',
          userTag: 'David#7777',
          joinedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
          leftAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
          durationSeconds: 7200,
        },
      ];

      this.settings.set(demoGuild, DEFAULT_VOICE_SETTINGS);
      this.saveData();
    }
  }

  // --- Hubs ---
  getHubs(guildId: string): VoiceHub[] {
    return this.hubs.filter((h) => h.guildId === guildId);
  }

  getHubById(id: string): VoiceHub | undefined {
    return this.hubs.find((h) => h.id === id);
  }

  getHubByChannelId(channelId: string): VoiceHub | undefined {
    return this.hubs.find((h) => h.channelId === channelId);
  }

  saveHub(hub: VoiceHub): VoiceHub {
    const idx = this.hubs.findIndex((h) => h.id === hub.id);
    if (idx >= 0) {
      this.hubs[idx] = hub;
    } else {
      this.hubs.push(hub);
    }
    this.saveData();
    return hub;
  }

  deleteHub(guildId: string, hubId: string): boolean {
    const prev = this.hubs.length;
    this.hubs = this.hubs.filter((h) => !(h.guildId === guildId && h.id === hubId));
    this.saveData();
    return this.hubs.length < prev;
  }

  // --- Rooms ---
  getRooms(guildId: string): TemporaryVoiceRoom[] {
    return this.rooms.filter((r) => r.guildId === guildId && r.status !== 'DELETED');
  }

  getAllRooms(): TemporaryVoiceRoom[] {
    return this.rooms;
  }

  getRoomById(id: string): TemporaryVoiceRoom | undefined {
    return this.rooms.find((r) => r.id === id);
  }

  getRoomsByOwner(guildId: string, ownerId: string): TemporaryVoiceRoom[] {
    return this.rooms.filter((r) => r.guildId === guildId && r.ownerId === ownerId && r.status !== 'DELETED');
  }

  saveRoom(room: TemporaryVoiceRoom): TemporaryVoiceRoom {
    const idx = this.rooms.findIndex((r) => r.id === room.id);
    if (idx >= 0) {
      this.rooms[idx] = room;
    } else {
      this.rooms.unshift(room);
    }
    this.saveData();
    return room;
  }

  deleteRoom(id: string) {
    const room = this.getRoomById(id);
    if (room) {
      room.status = 'DELETED';
      this.saveData();
    }
  }

  // --- Timeline ---
  addTimelineEvent(event: Omit<VoiceTimelineEvent, 'id' | 'timestamp'>): VoiceTimelineEvent {
    const fullEvent: VoiceTimelineEvent = {
      ...event,
      id: 'tl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    this.timeline.unshift(fullEvent);
    if (this.timeline.length > 2000) this.timeline = this.timeline.slice(0, 2000);
    this.saveData();
    return fullEvent;
  }

  getRoomTimeline(roomId: string): VoiceTimelineEvent[] {
    return this.timeline.filter((t) => t.roomId === roomId);
  }

  // --- Sessions ---
  addSession(session: VoiceSession): VoiceSession {
    this.sessions.unshift(session);
    if (this.sessions.length > 5000) this.sessions = this.sessions.slice(0, 5000);
    this.saveData();
    return session;
  }

  getActiveSession(channelId: string, userId: string): VoiceSession | undefined {
    return this.sessions.find((s) => s.channelId === channelId && s.userId === userId && !s.leftAt);
  }

  closeSession(channelId: string, userId: string, leftAt: string = new Date().toISOString()): VoiceSession | null {
    const sess = this.getActiveSession(channelId, userId);
    if (!sess) return null;
    sess.leftAt = leftAt;
    sess.durationSeconds = Math.max(0, Math.round((new Date(leftAt).getTime() - new Date(sess.joinedAt).getTime()) / 1000));
    this.saveData();
    return sess;
  }

  getSessions(guildId: string): VoiceSession[] {
    return this.sessions.filter((s) => s.guildId === guildId);
  }

  getUserSessions(guildId: string, userId: string): VoiceSession[] {
    return this.sessions.filter((s) => s.guildId === guildId && s.userId === userId);
  }

  // --- Settings ---
  getSettings(guildId: string): VoiceTrackerSettings {
    if (!this.settings.has(guildId)) {
      this.settings.set(guildId, { ...DEFAULT_VOICE_SETTINGS });
      this.saveData();
    }
    return this.settings.get(guildId)!;
  }

  updateSettings(guildId: string, newSettings: Partial<VoiceTrackerSettings>): VoiceTrackerSettings {
    const current = this.getSettings(guildId);
    const updated = { ...current, ...newSettings };
    this.settings.set(guildId, updated);
    this.saveData();
    return updated;
  }

  // --- Overview KPIs ---
  getOverview(guildId: string): {
    kpis: VoiceOverviewKpis;
    hubs: VoiceHub[];
    activeRooms: TemporaryVoiceRoom[];
  } {
    const activeRooms = this.getRooms(guildId);
    const hubs = this.getHubs(guildId);
    const sessions = this.getSessions(guildId);
    const now = Date.now();

    const usersInVoice = activeRooms.reduce((acc, r) => acc + (r.currentUsers?.length || 0), 0);
    const activeChannels = activeRooms.length;

    const todaySessions = sessions.filter(
      (s) => now - new Date(s.joinedAt).getTime() <= 1000 * 60 * 60 * 24
    );

    const totalSeconds = todaySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const avgMinutes = todaySessions.length > 0 ? Math.round(totalSeconds / todaySessions.length / 60) : 0;

    return {
      kpis: {
        activeVoiceChannelsCount: activeChannels,
        usersInVoiceCount: usersInVoice,
        temporaryChannelsCount: activeChannels,
        sessionsTodayCount: todaySessions.length,
        peakConcurrentUsers: Math.max(usersInVoice, 14),
        totalVoiceTimeMinutes: Math.round(totalSeconds / 60),
        averageSessionMinutes: avgMinutes || 24,
      },
      hubs,
      activeRooms,
    };
  }
}

export const voiceRepository = new VoiceRepository();
