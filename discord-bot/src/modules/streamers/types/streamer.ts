import { z } from 'zod';

export const StreamPlatformSchema = z.enum(['twitch', 'youtube', 'kick']);
export type StreamPlatform = z.infer<typeof StreamPlatformSchema>;

export const StreamerPingModeSchema = z.enum(['default', 'none', 'here', 'everyone', 'role']);
export type StreamerPingMode = z.infer<typeof StreamerPingModeSchema>;

export const StreamerItemSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  platform: StreamPlatformSchema,
  username: z.string().min(1).max(100),
  displayName: z.string().optional(),
  channelId: z.string().nullable().default(null),
  pingMode: StreamerPingModeSchema.default('default'),
  pingRoleId: z.string().nullable().default(null),
  discordUserId: z.string().nullable().default(null),
  gameFilter: z.string().nullable().default(null),
  minViewers: z.number().int().min(0).default(0),
  customColor: z.string().nullable().default(null),
  paused: z.boolean().default(false),
  customMessage: z.string().nullable().default(null),
  isLive: z.boolean().default(false),
  lastStreamId: z.string().nullable().default(null),
  lastAlertMessageId: z.string().nullable().default(null),
  lastAlertChannelId: z.string().nullable().default(null),
  lastLiveAt: z.string().nullable().default(null),
  title: z.string().nullable().default(null),
  game: z.string().nullable().default(null),
  viewers: z.number().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
  avatarUrl: z.string().nullable().default(null),
  streamUrl: z.string().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type StreamerItem = z.infer<typeof StreamerItemSchema>;

export const StreamerConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(true),
  // Salons personnalisés globaux et par plateforme
  defaultChannelId: z.string().nullable().default(null),
  twitchChannelId: z.string().nullable().default(null),
  youtubeChannelId: z.string().nullable().default(null),
  kickChannelId: z.string().nullable().default(null),
  // Pings et rôles globaux et par plateforme
  defaultPing: z.enum(['none', 'here', 'everyone', 'role']).default('none'),
  defaultRoleId: z.string().nullable().default(null),
  twitchRoleId: z.string().nullable().default(null),
  youtubeRoleId: z.string().nullable().default(null),
  kickRoleId: z.string().nullable().default(null),
  // Rôle en direct auto
  liveRoleId: z.string().nullable().default(null),
  autoLiveRoleEnabled: z.boolean().default(false),
  // Apparence et options de l'Embed
  embedColor: z.string().nullable().default(null),
  showViewers: z.boolean().default(true),
  showGame: z.boolean().default(true),
  showThumbnail: z.boolean().default(true),
  customButtonText: z.string().max(80).nullable().default(null),
  offlineAction: z.enum(['keep', 'delete', 'update_offline']).default('update_offline'),
  cleanUpFinishedStreams: z.boolean().default(false),
  cooldownMinutes: z.number().int().min(0).max(180).default(30),
  defaultMessage: z
    .string()
    .max(1000)
    .default('🔴 **{streamer}** est en direct sur **{platform}** !\n\n**{title}**\n🎮 Jeu : {game}\n➡️ {url}'),
  checkIntervalMinutes: z.number().int().min(1).max(60).default(2),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type StreamerConfig = z.infer<typeof StreamerConfigSchema>;

export interface LiveStreamDetails {
  platform: StreamPlatform;
  username: string;
  displayName: string;
  isLive: boolean;
  streamId?: string;
  title?: string;
  game?: string;
  viewers?: number;
  thumbnailUrl?: string;
  avatarUrl?: string;
  streamUrl: string;
}

export interface StreamersOverview {
  enabled: boolean;
  defaultChannelId: string | null;
  twitchChannelId?: string | null;
  youtubeChannelId?: string | null;
  kickChannelId?: string | null;
  liveRoleId: string | null;
  autoLiveRoleEnabled: boolean;
  totalStreamers: number;
  liveCount: number;
  streamers: StreamerItem[];
}
