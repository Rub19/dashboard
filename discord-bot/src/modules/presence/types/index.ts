export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export type DiscordActivityType = 'Playing' | 'Streaming' | 'Listening' | 'Watching' | 'Competing';

export interface BotActivity {
  type: DiscordActivityType;
  name: string;
  url?: string;
  /**
   * Deuxième ligne de la présence (ex: "12 serveurs • 340 membres"). Supporte les mêmes
   * variables dynamiques que `name`. Note : c'est le seul champ additionnel qu'un compte BOT
   * peut définir sur la Gateway Discord — `details`/`assets`/`party`/`buttons` (Rich Presence
   * complète avec image et bouton "Join") ne sont accessibles qu'aux vrais clients de jeu
   * connectés en local via le Game SDK/RPC, pas aux bots.
   */
  state?: string;
}

export interface BotPresenceState {
  status: DiscordStatus;
  activity: BotActivity;
  updatedAt: string;
  actor: string;
  source: 'manual' | 'rotation' | 'schedule' | 'dynamic' | 'maintenance' | 'preset';
  fallbackActive: boolean;
  rateLimited: boolean;
  gatewayConnected: boolean;
  scope: 'global' | 'shard';
}

export interface RotationActivityItem {
  id: string;
  type: DiscordActivityType;
  text: string;
  url?: string;
  weight?: number; // pour le mode pondéré (ex: 50%)
}

export interface ActivityRotationConfig {
  enabled: boolean;
  intervalSeconds: number; // minimum 30s
  order: 'sequential' | 'random' | 'weighted';
  activities: RotationActivityItem[];
  currentIndex: number;
  nextRotationAt?: string;
  lastRotatedAt?: string;
}

export interface ScheduledPresenceSlot {
  id: string;
  name: string;
  enabled: boolean;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startHour: number; // 0-23
  endHour: number; // 0-23
  status: DiscordStatus;
  activityType: DiscordActivityType;
  activityText: string;
  streamingUrl?: string;
  timezone: string;
}

export interface PresenceProfile {
  id: string;
  name: string;
  icon: string;
  category: 'gaming' | 'music' | 'community' | 'maintenance' | 'night' | 'custom';
  status: DiscordStatus;
  activityType: DiscordActivityType;
  activityText: string;
  streamingUrl?: string;
  description: string;
}

export interface BotIdentityInfo {
  id: string;
  username: string;
  discriminator: string;
  tag: string;
  avatarUrl: string;
  bannerUrl: string | null;
  verified: boolean;
  bot: boolean;
  createdAt: string;
  ownerId: string;
  usernameChangesRemaining: number;
  avatarChangesRemaining: number;
  cooldownEndsAt?: string;
}

export interface PresenceAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorId: string;
  previousStatus: DiscordStatus;
  newStatus: DiscordStatus;
  previousActivity: string;
  newActivity: string;
  reason: string;
  scope: 'global' | 'guild_preference';
}

export interface GuildPresencePreference {
  guildId: string;
  guildName: string;
  icon: string | null;
  botPresent: boolean;
  preferredProfileId?: string;
  updatedAt: string;
  updatedBy: string;
  notice: string;
}

export interface PresenceStats {
  totalChanges: number;
  mostUsedActivity: string;
  averageActivityDurationMinutes: number;
  rotationsExecuted: number;
  failedUpdates: number;
  lastChangedAt: string;
  rateLimitHits: number;
}
