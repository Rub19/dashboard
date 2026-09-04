export interface ServerKpis {
  totalMembers: number;
  humans: number;
  bots: number;
  onlineMembers: number;
  channelsCount: number;
  categoriesCount: number;
  textChannelsCount: number;
  voiceChannelsCount: number;
  rolesCount: number;
  activeVoiceUsers: number;
  activeInvitesCount: number;
  serverBoostLevel: number;
  boostCount: number;
  emojisCount: number;
  stickersCount: number;
  activeModerationCases: number;
  securityScore: number;
  healthScore: number;
}

export interface SecurityScoreBreakdown {
  score: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  factors: Array<{
    title: string;
    impact: number;
    positive: boolean;
    description: string;
  }>;
}

export interface HealthScoreBreakdown {
  score: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  components: {
    discordGateway: { status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'; pingMs: number };
    database: { status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'; latencyMs: number };
    realtime: { status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'; connected: boolean };
    eventBus: { status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'; queueLength: number };
    scheduler: { status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'; activeJobs: number };
    memory: { status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'; heapUsedMb: number; heapTotalMb: number };
  };
}

export interface ServerOverviewData {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    banner: string | null;
    description: string | null;
    ownerId: string;
    ownerTag: string;
    createdAt: string;
    preferredLocale: string;
    verificationLevel: number;
  };
  kpis: ServerKpis;
  security: SecurityScoreBreakdown;
  health: HealthScoreBreakdown;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    type: string;
    actor: { id: string; tag: string };
    details?: string;
  }>;
}

export interface ServerMemberItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bot: boolean;
  joinedAt: string | null;
  createdAt: string;
  roles: Array<{ id: string; name: string; color: string }>;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  voiceChannelId: string | null;
  voiceMuted: boolean;
  communicationDisabledUntil: string | null;
  riskScore: number;
}

export interface ServerMemberProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bot: boolean;
  joinedAt: string | null;
  createdAt: string;
  roles: Array<{ id: string; name: string; color: string; position: number }>;
  permissions: string[];
  isOwner: boolean;
  isAdmin: boolean;
  isTimedOut: boolean;
  timedOutUntil: string | null;
  voice: {
    channelId: string | null;
    channelName: string | null;
    muted: boolean;
    deafened: boolean;
    streaming: boolean;
  };
  moderationHistory: {
    warningsCount: number;
    timeoutsCount: number;
    kicksCount: number;
    bansCount: number;
    recentCases: Array<{
      id: string;
      type: string;
      reason: string;
      moderatorTag: string;
      createdAt: string;
    }>;
  };
  security: {
    accountAgeDays: number;
    serverStayDays: number;
    riskScore: number;
    flags: string[];
  };
}

export interface ChannelPermissionOverride {
  id: string;
  type: 'role' | 'member';
  name: string;
  allow: string[];
  deny: string[];
}

export interface ChannelItem {
  id: string;
  name: string;
  type: number; // 0 = Text, 2 = Voice, 4 = Category, 5 = Announcement, 13 = Stage, 15 = Forum
  parentId: string | null;
  position: number;
  topic?: string | null;
  nsfw?: boolean;
  rateLimitPerUser?: number; // Slowmode
  bitrate?: number;
  userLimit?: number;
  permissionOverwritesCount: number;
}

export interface CategoryTreeItem {
  id: string;
  name: string;
  position: number;
  channels: ChannelItem[];
}

export interface ChannelTreeData {
  categories: CategoryTreeItem[];
  orphanChannels: ChannelItem[];
}

export interface RoleItem {
  id: string;
  name: string;
  color: string;
  position: number;
  hoist: boolean;
  mentionable: boolean;
  managed: boolean;
  isBotRole: boolean;
  memberCount: number;
  permissions: string[];
  isEditableByBot: boolean;
}

export interface PermissionMatrixItem {
  permission: string;
  name: string;
  category: 'General' | 'Membership' | 'Text' | 'Voice' | 'Moderation' | 'Management' | 'Advanced';
  roles: Record<string, boolean>; // roleId -> granted
}

export interface PermissionDebugStep {
  step: string;
  level: 'SERVER_OWNER' | 'ADMINISTRATOR' | 'EVERYONE_OVERWRITE' | 'ROLE_OVERWRITE' | 'MEMBER_OVERWRITE' | 'ROLE_PERMISSIONS' | 'DEFAULT';
  effect: 'ALLOW' | 'DENY' | 'NEUTRAL';
  description: string;
}

export interface PermissionDebugResult {
  userId: string;
  userTag: string;
  channelId: string;
  channelName: string;
  permission: string;
  isAllowed: boolean;
  reason: string;
  steps: PermissionDebugStep[];
}

export interface ServerEmojiItem {
  id: string;
  name: string;
  animated: boolean;
  url: string;
  managed: boolean;
  roles: string[];
  createdAt: string;
}

export interface ServerStickerItem {
  id: string;
  name: string;
  description: string | null;
  tags: string;
  url: string;
}

export interface ServerWebhookItem {
  id: string;
  name: string;
  channelId: string;
  channelName: string;
  avatarUrl: string | null;
  creatorTag: string;
  createdAt: string;
}

export interface ServerSettingsData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  banner: string | null;
  verificationLevel: number;
  defaultMessageNotifications: number;
  explicitContentFilter: number;
  afkChannelId: string | null;
  afkTimeout: number;
  systemChannelId: string | null;
  rulesChannelId: string | null;
  publicUpdatesChannelId: string | null;
  preferredLocale: string;
  premiumTier: number;
  premiumSubscriptionCount: number;
  vanityURLCode: string | null;
}
