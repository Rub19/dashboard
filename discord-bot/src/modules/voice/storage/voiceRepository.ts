import fs from 'fs';
import path from 'path';
import {
  VoiceHub,
  TemporaryVoiceRoom,
  VoiceSession,
  VoiceTimelineEvent,
  VoiceTrackerSettings,
  VoiceOverviewKpis,
  UserVoicePreferences,
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
  creationTextChannelId: null,
  creationPanelMessageId: null,
  roomCategory: null,
  defaultRoomNameTemplate: '🔊 Salon de {username}',
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
  private prefsPath = path.resolve(this.dataDir, 'voice_user_prefs.json');

  private hubs: VoiceHub[] = [];
  private rooms: TemporaryVoiceRoom[] = [];
  private sessions: VoiceSession[] = [];
  private settings = new Map<string, VoiceTrackerSettings>();
  private timeline: VoiceTimelineEvent[] = [];
  private userPreferences = new Map<string, UserVoicePreferences>();

  constructor() {
    this.ensureDir();
    this.loadData();
    this.purgeDemoData();
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
        Object.entries(raw).forEach(([gId, set]) => this.settings.set(gId, { ...DEFAULT_VOICE_SETTINGS, ...(set as any) }));
      }
      if (fs.existsSync(this.timelinePath)) {
        this.timeline = JSON.parse(fs.readFileSync(this.timelinePath, 'utf8'));
      }
      if (fs.existsSync(this.prefsPath)) {
        const rawPrefs = JSON.parse(fs.readFileSync(this.prefsPath, 'utf8'));
        Object.entries(rawPrefs).forEach(([uId, pref]) => this.userPreferences.set(uId, pref as UserVoicePreferences));
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

      const prefObj: Record<string, any> = {};
      this.userPreferences.forEach((v, k) => (prefObj[k] = v));
      fs.writeFileSync(this.prefsPath, JSON.stringify(prefObj, null, 2), 'utf8');
    } catch (e) {
      logger.error('[VoiceRepository] Erreur lors de la sauvegarde des données:', e);
    }
  }

  /**
   * Anciennes versions du bot injectaient des données de démonstration (hubs « Gaming Hub », salons et
   * sessions d'Alex/Lucas/Sarah, etc.) dans le serveur réel. On retire ces entrées précises, repérées
   * par leurs identifiants factices, et on ne crée plus rien tout seul.
   */
  private purgeDemoData() {
    const demoHubIds = new Set(['hub_gaming', 'hub_chill', 'hub_ranked', 'hub_vip']);
    const demoRoomIds = new Set(['room_alex_gaming', 'room_chill_lounge']);
    const demoSessionIds = new Set(['sess_1', 'sess_2']);
    const demoTimelineIds = new Set(['tl_1', 'tl_2', 'tl_3', 'tl_4', 'tl_5']);
    const before = this.hubs.length + this.rooms.length + this.sessions.length + this.timeline.length;

    this.hubs = this.hubs.filter((h) => !(demoHubIds.has(h.id) && String(h.channelId).startsWith('vc_create_')));
    this.rooms = this.rooms.filter((r) => !demoRoomIds.has(r.id));
    this.sessions = this.sessions.filter((s) => !demoSessionIds.has(s.id));
    this.timeline = this.timeline.filter((e) => !demoTimelineIds.has(e.id));

    let changed = before !== this.hubs.length + this.rooms.length + this.sessions.length + this.timeline.length;
    if (this.userPreferences.delete('usr_alex')) changed = true;
    for (const [guildId, s] of this.settings) {
      if (s.creationTextChannelId === 'chan_voice_panel') {
        this.settings.set(guildId, { ...s, creationTextChannelId: null });
        changed = true;
      }
    }
    if (changed) {
      logger.info('[VoiceRepository] Données de démonstration retirées.');
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
    if (!room.whitelist) room.whitelist = room.allowedUserIds || [];
    if (!room.banlist) room.banlist = room.blockedUserIds || [];
    if (!room.allowedUserIds) room.allowedUserIds = room.whitelist;
    if (!room.blockedUserIds) room.blockedUserIds = room.banlist;

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

  // --- Whitelist & Banlist Management ---
  addToWhitelist(roomId: string, userId: string, actorId: string = 'system', actorTag: string = 'ETHONE'): TemporaryVoiceRoom | null {
    const room = this.getRoomById(roomId);
    if (!room || room.status === 'DELETED') return null;

    if (!room.allowedUserIds) room.allowedUserIds = [];
    if (!room.whitelist) room.whitelist = [];
    if (!room.blockedUserIds) room.blockedUserIds = [];
    if (!room.banlist) room.banlist = [];

    if (!room.allowedUserIds.includes(userId)) {
      room.allowedUserIds.push(userId);
    }
    if (!room.whitelist.includes(userId)) {
      room.whitelist.push(userId);
    }

    // Remove from banlist if present
    room.blockedUserIds = room.blockedUserIds.filter((id) => id !== userId);
    room.banlist = room.banlist.filter((id) => id !== userId);

    this.saveRoom(room);
    this.addTimelineEvent({
      roomId: room.id,
      guildId: room.guildId,
      type: 'USER_WHITELISTED',
      actorId,
      actorTag,
      targetId: userId,
      details: `Ajouté à la liste blanche`,
    });
    return room;
  }

  removeFromWhitelist(roomId: string, userId: string): TemporaryVoiceRoom | null {
    const room = this.getRoomById(roomId);
    if (!room || room.status === 'DELETED') return null;

    room.allowedUserIds = (room.allowedUserIds || []).filter((id) => id !== userId);
    room.whitelist = (room.whitelist || []).filter((id) => id !== userId);
    this.saveRoom(room);
    return room;
  }

  addToBanlist(roomId: string, userId: string, actorId: string = 'system', actorTag: string = 'ETHONE'): TemporaryVoiceRoom | null {
    const room = this.getRoomById(roomId);
    if (!room || room.status === 'DELETED') return null;

    if (!room.allowedUserIds) room.allowedUserIds = [];
    if (!room.whitelist) room.whitelist = [];
    if (!room.blockedUserIds) room.blockedUserIds = [];
    if (!room.banlist) room.banlist = [];

    if (!room.blockedUserIds.includes(userId)) {
      room.blockedUserIds.push(userId);
    }
    if (!room.banlist.includes(userId)) {
      room.banlist.push(userId);
    }

    // Remove from whitelist if present
    room.allowedUserIds = room.allowedUserIds.filter((id) => id !== userId);
    room.whitelist = room.whitelist.filter((id) => id !== userId);

    this.saveRoom(room);
    this.addTimelineEvent({
      roomId: room.id,
      guildId: room.guildId,
      type: 'USER_BANNED',
      actorId,
      actorTag,
      targetId: userId,
      details: `Ajouté à la liste noire (banni du salon)`,
    });
    return room;
  }

  removeFromBanlist(roomId: string, userId: string): TemporaryVoiceRoom | null {
    const room = this.getRoomById(roomId);
    if (!room || room.status === 'DELETED') return null;

    room.blockedUserIds = (room.blockedUserIds || []).filter((id) => id !== userId);
    room.banlist = (room.banlist || []).filter((id) => id !== userId);
    this.saveRoom(room);
    return room;
  }

  // --- User Preferences ---
  getUserPreferences(userId: string): UserVoicePreferences | undefined {
    return this.userPreferences.get(userId);
  }

  saveUserPreferences(prefs: UserVoicePreferences): UserVoicePreferences {
    this.userPreferences.set(prefs.userId, {
      ...prefs,
      updatedAt: new Date().toISOString(),
    });
    this.saveData();
    return this.userPreferences.get(prefs.userId)!;
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
    const current = this.settings.get(guildId)!;
    return { ...DEFAULT_VOICE_SETTINGS, ...current };
  }

  updateSettings(guildId: string, newSettings: Partial<VoiceTrackerSettings>): VoiceTrackerSettings {
    const current = this.getSettings(guildId);
    const updated: VoiceTrackerSettings = { ...current, ...newSettings };
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
        peakConcurrentUsers: Math.max(usersInVoice, ...this.rooms.filter((r) => r.guildId === guildId).map((r) => r.peakUsers || 0)),
        totalVoiceTimeMinutes: Math.round(totalSeconds / 60),
        averageSessionMinutes: avgMinutes,
      },
      hubs,
      activeRooms,
    };
  }
}

export const voiceRepository = new VoiceRepository();
