export type VoiceAccessMode = 'public' | 'locked' | 'role_only' | 'invite_only';
export type OwnershipTransferStrategy = 'FIRST_REMAINING' | 'RANDOM_REMAINING' | 'HIGHEST_ROLE' | 'OWNERLESS' | 'DELETE_ROOM';
export type RoomStatus = 'ACTIVE' | 'EMPTY_COUNTDOWN' | 'DELETED';

export interface VoiceHub {
  id: string;
  guildId: string;
  name: string;
  categoryId?: string | null;
  channelId: string; // The Join-to-Create trigger channel ID
  type: 'voice' | 'stage';
  namingTemplate: string; // e.g. '🎮 {username}'s Room', 'Room #{number}'
  userLimit: number; // 0 = unlimited
  bitrate: number; // in bps, e.g. 64000, 96000
  region?: string | null;
  allowedRoles: string[];
  excludedRoles: string[];
  roleRequirementMode: 'any' | 'all';
  accessMode: VoiceAccessMode;
  autoNumbering: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface TemporaryVoiceRoom {
  id: string; // Discord Voice Channel ID
  guildId: string;
  hubId: string;
  hubName: string;
  name: string;
  ownerId: string;
  ownerTag: string;
  userLimit: number;
  bitrate: number;
  isLocked: boolean;
  isHidden: boolean;
  allowedUserIds: string[];
  blockedUserIds: string[];
  createdAt: string;
  lastEmptyAt?: string | null;
  status: RoomStatus;
  currentUsers: Array<{
    id: string;
    tag: string;
    avatar?: string | null;
    joinedAt: string;
    isMuted?: boolean;
    isDeafened?: boolean;
    isStreaming?: boolean;
  }>;
  peakUsers: number;
  totalSecondsActive: number;
}

export interface VoiceSession {
  id: string;
  guildId: string;
  channelId: string;
  roomName: string;
  hubId: string;
  userId: string;
  userTag: string;
  joinedAt: string;
  leftAt?: string | null;
  durationSeconds: number;
}

export interface VoiceTimelineEvent {
  id: string;
  roomId: string;
  guildId: string;
  type:
    | 'ROOM_CREATED'
    | 'USER_JOINED'
    | 'USER_LEFT'
    | 'OWNER_TRANSFERRED'
    | 'ROOM_LOCKED'
    | 'ROOM_UNLOCKED'
    | 'ROOM_HIDDEN'
    | 'ROOM_UNHIDDEN'
    | 'USER_KICKED'
    | 'USER_BANNED'
    | 'LIMIT_CHANGED'
    | 'ROOM_RENAMED'
    | 'ROOM_DELETED';
  timestamp: string;
  actorId: string;
  actorTag: string;
  targetId?: string;
  targetTag?: string;
  details?: string;
}

export interface VoiceAutomationRule {
  id: string;
  name: string;
  trigger: 'USER_JOIN' | 'USER_LEAVE' | 'ROOM_CREATED' | 'ROOM_DELETED' | 'ROOM_EMPTY' | 'ROOM_FULL' | 'ROOM_LOCKED';
  action: 'SEND_MESSAGE' | 'GIVE_ROLE' | 'REMOVE_ROLE' | 'LOG_AUDIT';
  targetChannelId?: string | null;
  roleId?: string | null;
  messageTemplate?: string;
  enabled: boolean;
}

export interface VoiceTrackerSettings {
  enabled: boolean;
  defaultCategoryId?: string | null;
  defaultHubId?: string | null;
  emptyDeletionDelaySeconds: number; // 0, 30, 60, 300, 600, 1800
  ownershipTransferStrategy: OwnershipTransferStrategy;
  maxRoomsPerGuild: number;
  maxRoomsPerUser: number;
  creationCooldownSeconds: number;
  panelChannelId?: string | null;
  sendControlPanelInRoom: boolean;
  automationsEnabled: boolean;
  automations: VoiceAutomationRule[];
  defaultBitrate: number;
  notifyOnRoomCreation: boolean;
}

export interface VoiceOverviewKpis {
  activeVoiceChannelsCount: number;
  usersInVoiceCount: number;
  temporaryChannelsCount: number;
  sessionsTodayCount: number;
  peakConcurrentUsers: number;
  totalVoiceTimeMinutes: number;
  averageSessionMinutes: number;
}