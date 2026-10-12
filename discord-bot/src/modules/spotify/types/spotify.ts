export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  url: string;
  device?: SpotifyDevice;
  isSaved?: boolean;
}

export interface SpotifyQueueItem {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  durationMs: number;
  url: string;
}

export interface SpotifyQueue {
  current: SpotifyTrack | null;
  queue: SpotifyQueueItem[];
}

export interface SpotifyTopTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  url: string;
  durationMs: number;
  albumArt?: string;
}

export interface SpotifyTopArtist {
  id: string;
  name: string;
  url: string;
  genres: string[];
  image?: string;
}
