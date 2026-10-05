import { z } from 'zod';

export const StreamPlatformSchema = z.enum(['twitch', 'youtube', 'kick']);
export type StreamPlatform = z.infer<typeof StreamPlatformSchema>;

export const StreamerItemSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  platform: StreamPlatformSchema,
  username: z.string().min(1).max(100),
  displayName: z.string().optional(),
  channelId: z.string().nullable().default(null),
  pingRoleId: z.string().nullable().default(null),
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
  defaultChannelId: z.string().nullable().default(null),
  defaultPing: z.enum(['none', 'here', 'everyone', 'role']).default('none'),
  defaultRoleId: z.string().nullable().default(null),
  liveRoleId: z.string().nullable().default(null),
  autoLiveRoleEnabled: z.boolean().default(false),
  cleanUpFinishedStreams: z.boolean().default(false),
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
  liveRoleId: string | null;
  autoLiveRoleEnabled: boolean;
  totalStreamers: number;
  liveCount: number;
  streamers: StreamerItem[];
}
