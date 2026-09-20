import { z } from 'zod';

export type MusicSource = 'YOUTUBE' | 'SPOTIFY' | 'SOUNDCLOUD' | 'DIRECT' | 'CUSTOM';
export type PlayerStatus = 'PLAYING' | 'PAUSED' | 'IDLE' | 'BUFFERING';
export type RepeatMode = 'OFF' | 'SONG' | 'QUEUE';

export interface TrackRequester {
  id: string;
  tag: string;
  avatar?: string | null;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration: number; // in seconds
  thumbnail: string;
  url: string;
  source: MusicSource;
  requestedBy: TrackRequester;
  addedAt: string; // ISO
  /** Lavalink backend only: the server-side encoded track, ready to play. */
  encoded?: string;
}

export interface VoiceChannelInfo {
  id: string;
  name: string;
}

export interface GuildMusicState {
  guildId: string;
  voiceChannel: VoiceChannelInfo | null;
  status: PlayerStatus;
  currentTrack: Track | null;
  position: number; // seconds
  duration: number; // seconds
  volume: number; // 0 to 100
  muted: boolean;
  previousVolume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  queue: Track[];
  queueLength: number;
  history: Track[];
  canSeek: boolean;
  updatedAt: string; // ISO
}

// The plain-data shape of a guild's live queue, persisted so it survives a
// bot restart (see musicPersistence.ts's saveQueueState/getQueueState).
export interface MusicQueueSnapshot {
  queue: Track[];
  history: Track[];
  currentTrack: Track | null;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
}

export interface MusicQueueState {
  guildId: string;
  snapshot: MusicQueueSnapshot;
  voiceChannelId: string | null;
  status: PlayerStatus;
  savedAt: string; // ISO
}

export interface MusicPlaylist {
  id: string;
  name: string;
  guildId: string;
  createdBy: TrackRequester;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
}

export interface MusicSettings {
  maxQueueSize: number;
  allowDuplicates: boolean;
  allowUserRemoveOwn: boolean;
  allowUserSkip: boolean;
  allowUserChangeVolume: boolean;
  djMode: boolean;
  djRoleId: string | null;
  autoDisconnectSeconds: number; // 0 = disabled, 300 = 5 min
  autoplay: boolean;
  defaultVolume: number;
}

export interface TopTrackStat {
  title: string;
  artist: string;
  count: number;
  thumbnail?: string;
}

export interface TopRequesterStat {
  userId: string;
  userTag: string;
  count: number;
}

export interface MusicStats {
  totalTracksPlayed: number;
  totalListeningSeconds: number;
  topTracks: TopTrackStat[];
  topRequesters: TopRequesterStat[];
}

export const MusicSettingsSchema = z.object({
  maxQueueSize: z.number().min(5).max(1000).default(500),
  allowDuplicates: z.boolean().default(true),
  allowUserRemoveOwn: z.boolean().default(true),
  allowUserSkip: z.boolean().default(true),
  allowUserChangeVolume: z.boolean().default(true),
  djMode: z.boolean().default(false),
  djRoleId: z.string().nullable().default(null),
  autoDisconnectSeconds: z.number().min(0).max(3600).default(300),
  autoplay: z.boolean().default(false),
  defaultVolume: z.number().min(0).max(100).default(75),
});
