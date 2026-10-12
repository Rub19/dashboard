export interface LastFmUserLink {
  discordUserId: string;
  username: string;
  linkedAt: string;
  color?: string;
  embedMode?: "simple" | "detailed";
}

export interface LastFmTrack {
  name: string;
  artist: string;
  album: string;
  artworkUrl: string;
  profileUrl: string;
  playCount: number;
  playing: boolean;
  playedAt?: string;
}

export interface LastFmArtist {
  name: string;
  playCount: number;
  artworkUrl?: string;
  profileUrl: string;
}

export interface LastFmAlbum {
  name: string;
  artist: string;
  playCount: number;
  artworkUrl?: string;
  profileUrl: string;
}

export interface LastFmProfile {
  username: string;
  realName?: string;
  playCount: number;
  artistCount?: number;
  registeredAt?: string;
  profileUrl: string;
  avatarUrl?: string;
  country?: string;
}

export interface LastFmTasteComparison {
  user1: string;
  user2: string;
  compatibility: number;
  commonArtists: string[];
}
