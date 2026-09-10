import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import play from 'play-dl';
import { Track, TrackRequester } from '../types/music.js';
import { logger } from '../../../utils/logger.js';
import { createYtDlpStream } from './ytdlpStream.js';

/**
 * Single audio path for every "real" provider (Spotify bridge, YouTube,
 * SoundCloud): pull the bytes with yt-dlp, hand them to ffmpeg via
 * @discordjs/voice. Replaces play.stream(), which no longer returns usable
 * audio (see ytdlpStream.ts). Returns null if yt-dlp isn't installed or the
 * extraction failed, so the caller can fall back.
 */
async function streamWithYtDlp(input: string, label: string): Promise<AudioResource | null> {
  try {
    const stream = await createYtDlpStream(input);
    if (!stream) return null;
    return createAudioResource(stream, { inputType: StreamType.Arbitrary });
  } catch (err) {
    logger.warn(`[${label}] yt-dlp stream error :`, err);
    return null;
  }
}

export interface IMusicProvider {
  name: string;
  canHandle(query: string): boolean;
  search(query: string, requestedBy: TrackRequester, limit?: number): Promise<Track[]>;
  resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null>;
  getStream(track: Track): Promise<AudioResource | null>;
}

// Curated library of 100% reliable 24/7 web audio streams (no 403, no anti-bot blocks)
const CURATED_TRACKS: Array<Omit<Track, 'requestedBy' | 'addedAt'>> = [
  {
    id: 'lofi-1',
    title: 'Groove Salad (Ambient Chill Beats)',
    artist: 'SomaFM',
    album: 'Groove Salad',
    duration: 0,
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    source: 'DIRECT',
  },
  {
    id: 'lofi-2',
    title: 'DEF CON Chill Synthwave',
    artist: 'DEF CON Radio',
    album: 'Cyber Neon Nights',
    duration: 0,
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    url: 'https://ice2.somafm.com/defcon-128-mp3',
    source: 'DIRECT',
  },
  {
    id: 'lofi-3',
    title: 'Beat Blender Electronic Beats',
    artist: 'Beat Blender',
    album: 'Level Up',
    duration: 0,
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    url: 'https://ice4.somafm.com/beatblender-128-mp3',
    source: 'DIRECT',
  },
  {
    id: 'lofi-4',
    title: 'Lush Acoustic & Vocals',
    artist: 'Lush Radio',
    album: 'Pure Calm',
    duration: 0,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    url: 'https://ice6.somafm.com/lush-128-mp3',
    source: 'DIRECT',
  },
  {
    id: 'lofi-5',
    title: 'Drone Zone Deep Ambient',
    artist: 'Drone Zone',
    album: 'Deep Space',
    duration: 0,
    thumbnail: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500&auto=format&fit=crop&q=80',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
    source: 'DIRECT',
  },
];

let soundCloudClientReady = false;

async function ensureSoundCloud(): Promise<boolean> {
  if (soundCloudClientReady) return true;
  try {
    const clientId = await play.getFreeClientID();
    await play.setToken({ soundcloud: { client_id: clientId } });
    soundCloudClientReady = true;
    return true;
  } catch (err) {
    logger.warn('[MusicProvider] Impossible de récupérer le client ID SoundCloud :', err);
    return false;
  }
}

// --- 1. Direct Stream Provider (HTTP MP3/WAV/OGG/Icecast) ---
export class DirectStreamProvider implements IMusicProvider {
  public name = 'DirectStream';

  public canHandle(query: string): boolean {
    return /^https?:\/\/.*\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(query) ||
      /^https?:\/\/.*somafm\.com/i.test(query);
  }

  public async search(query: string, requestedBy: TrackRequester): Promise<Track[]> {
    const track = await this.resolveTrack(query, requestedBy);
    return track ? [track] : [];
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    try {
      const urlObj = new URL(query);
      const filename = urlObj.pathname.split('/').pop() || 'Audio Stream';
      const cleanTitle = decodeURIComponent(filename).replace(/\.[^/.]+$/, '') || 'Direct Audio Stream';

      return {
        id: `direct-${Date.now().toString(36)}`,
        title: cleanTitle,
        artist: urlObj.hostname,
        album: 'Direct Stream',
        duration: 0,
        thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
        url: query,
        source: 'DIRECT',
        requestedBy,
        addedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    try {
      return createAudioResource(track.url, { inputType: StreamType.Arbitrary });
    } catch (err) {
      logger.error('Erreur getStream DirectStreamProvider :', err);
      return null;
    }
  }
}

// --- 2. Spotify Bridge Provider (oEmbed + SoundCloud Playback) ---
export class SpotifyBridgeProvider implements IMusicProvider {
  public name = 'Spotify';

  public canHandle(query: string): boolean {
    return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|playlist|album)\/.+$/i.test(query);
  }

  public async search(query: string, requestedBy: TrackRequester, limit: number = 5): Promise<Track[]> {
    const track = await this.resolveTrack(query, requestedBy);
    return track ? [track] : [];
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        const fullTitle = data.title || 'Spotify Track';
        const artist = data.author_name || 'Spotify Artist';

        await ensureSoundCloud();
        const scResults = await play.search(`${fullTitle} ${artist}`, {
          source: { soundcloud: 'tracks' },
          limit: 1,
        });

        if (scResults && scResults.length > 0) {
          const sc = scResults[0];
          return {
            id: `sp-${Date.now().toString(36)}`,
            title: fullTitle,
            artist,
            album: 'Spotify Music',
            duration: sc.durationInSec || 210,
            thumbnail: data.thumbnail_url || sc.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            url: sc.url,
            source: 'SPOTIFY',
            requestedBy,
            addedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      logger.warn('[SpotifyBridgeProvider] Erreur résolution Spotify oEmbed :', err);
    }
    return null;
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'SpotifyBridgeProvider');
  }
}

// --- 3. YouTube Music Provider (Metadata + SoundCloud Playback Bridge) ---
export class YouTubeMusicProvider implements IMusicProvider {
  public name = 'YouTube';

  public canHandle(query: string): boolean {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(query);
  }

  public async search(query: string, requestedBy: TrackRequester, limit: number = 5): Promise<Track[]> {
    const track = await this.resolveTrack(query, requestedBy);
    return track ? [track] : [];
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    try {
      let title = query;
      let artist = 'YouTube Music';
      let duration = 210;
      let thumbnail = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

      try {
        const info = await play.video_basic_info(query);
        if (info && info.video_details) {
          title = info.video_details.title || title;
          artist = info.video_details.channel?.name || artist;
          duration = info.video_details.durationInSec || duration;
          thumbnail = info.video_details.thumbnails?.[0]?.url || thumbnail;
        }
      } catch (infoErr) {
        logger.warn('[YouTubeMusicProvider] video_basic_info notice :', infoErr);
      }

      // Keep the real YouTube URL — yt-dlp streams the actual video's audio
      // directly now, so there's no reason to bridge to a SoundCloud search
      // result (which was often a cover, a remix, or nothing).
      return {
        id: `yt-${Date.now().toString(36)}`,
        title,
        artist,
        album: 'YouTube Music',
        duration,
        thumbnail,
        url: query,
        source: 'YOUTUBE',
        requestedBy,
        addedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('[YouTubeMusicProvider] Erreur résolution YouTube :', err);
    }
    return null;
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'YouTubeMusicProvider');
  }
}

// --- 4. SoundCloud Provider (Full Search & Real Streaming) ---
export class SoundCloudProvider implements IMusicProvider {
  public name = 'SoundCloud';

  public canHandle(query: string): boolean {
    return (
      /^(https?:\/\/)?(www\.)?soundcloud\.com\/.+$/i.test(query) ||
      !query.startsWith('http') // Any free-text query (e.g. "Drive by", "Lofi beats")
    );
  }

  public async search(query: string, requestedBy: TrackRequester, limit: number = 5): Promise<Track[]> {
    const qLower = query.toLowerCase().trim();

    // Check curated tracks first if user specifically types "lofi", "ambient", etc.
    const matchedCurated = CURATED_TRACKS.filter(
      (t) => t.title.toLowerCase().includes(qLower) || t.artist.toLowerCase().includes(qLower)
    );

    if (matchedCurated.length > 0) {
      return matchedCurated.slice(0, limit).map((t) => ({
        ...t,
        requestedBy,
        addedAt: new Date().toISOString(),
      }));
    }

    const ok = await ensureSoundCloud();
    if (!ok) return [];

    try {
      const tracks = await play.search(query, {
        source: { soundcloud: 'tracks' },
        limit,
      });

      if (!tracks || tracks.length === 0) return [];

      return tracks.map((t: any, idx: number) => ({
        id: `sc-${t.id || Date.now().toString(36) + idx}`,
        title: t.name || 'Titre inconnu',
        artist: t.user?.name || 'SoundCloud Artist',
        album: 'SoundCloud',
        duration: t.durationInSec || 180,
        thumbnail: t.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        url: t.url,
        source: 'SOUNDCLOUD',
        requestedBy,
        addedAt: new Date().toISOString(),
      }));
    } catch (err) {
      logger.warn(`[SoundCloudProvider] Erreur recherche "${query}" :`, err);
      return [];
    }
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    const results = await this.search(query, requestedBy, 1);
    if (results.length > 0) return results[0];

    // SoundCloud search found nothing (or its free client id is dead) — hand
    // the query to yt-dlp's YouTube search instead of dropping to the SomaFM
    // fallback. yt-dlp resolves `ytsearch1:` and streams the top hit.
    if (query.trim() && !query.startsWith('http')) {
      return {
        id: `yts-${Date.now().toString(36)}`,
        title: query.trim(),
        artist: 'YouTube',
        album: 'Recherche',
        duration: 0,
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        url: `ytsearch1:${query.trim()}`,
        source: 'YOUTUBE',
        requestedBy,
        addedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'SoundCloudProvider');
  }
}

// --- 5. Central Provider Manager ---
class MusicProviderManager {
  private providers: IMusicProvider[] = [
    new DirectStreamProvider(),
    new SpotifyBridgeProvider(),
    new YouTubeMusicProvider(),
    new SoundCloudProvider(),
  ];

  public async search(query: string, requestedBy: TrackRequester, limit: number = 8): Promise<Track[]> {
    if (!query.trim()) {
      return CURATED_TRACKS.slice(0, limit).map((t) => ({
        ...t,
        requestedBy,
        addedAt: new Date().toISOString(),
      }));
    }

    for (const provider of this.providers) {
      if (provider.canHandle(query)) {
        try {
          const results = await provider.search(query, requestedBy, limit);
          if (results.length > 0) return results;
        } catch (err) {
          logger.warn(`Provider ${provider.name} failed search for "${query}" :`, err);
        }
      }
    }

    // Default curated search
    return CURATED_TRACKS.slice(0, limit).map((t) => ({
      ...t,
      requestedBy,
      addedAt: new Date().toISOString(),
    }));
  }

  public async resolve(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    for (const provider of this.providers) {
      if (provider.canHandle(query)) {
        try {
          const track = await provider.resolveTrack(query, requestedBy);
          if (track) return track;
        } catch (err) {
          logger.warn(`Provider ${provider.name} failed resolve for "${query}" :`, err);
        }
      }
    }
    const defaultTrack = CURATED_TRACKS[0];
    return {
      ...defaultTrack,
      requestedBy,
      addedAt: new Date().toISOString(),
    };
  }

  public async createAudioResource(track: Track): Promise<AudioResource | null> {
    // 1. Try appropriate provider
    for (const provider of this.providers) {
      if (provider.canHandle(track.url)) {
        try {
          const resource = await provider.getStream(track);
          if (resource) return resource;
        } catch (err) {
          logger.warn(`Provider ${provider.name} failed getStream :`, err);
        }
      }
    }

    // 2. Direct playable stream attempt — ONLY if the URL is an actual direct audio
    // file/stream (mp3/wav/ogg/etc. or a known Icecast stream). Feeding a webpage URL
    // (e.g. a soundcloud.com/spotify.com track page returned when the real provider's
    // getStream() failed above) straight into ffmpeg produces no usable audio: ffmpeg
    // receives HTML, not a media stream, so the resource "succeeds" (no thrown error)
    // while producing silence — exactly the "Now Playing looks correct but no sound"
    // symptom. Only take this shortcut for URLs that are provably real audio.
    const isDirectAudioUrl =
      !!track.url &&
      (/^https?:\/\/.*\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(track.url) ||
        /^https?:\/\/.*somafm\.com/i.test(track.url));
    if (isDirectAudioUrl) {
      try {
        return createAudioResource(track.url, { inputType: StreamType.Arbitrary });
      } catch (directErr) {
        logger.warn('[MusicProviderManager] Direct stream fallback error :', directErr);
      }
    }

    // 3. Final bulletproof fallback: SomaFM curated stream
    try {
      const fallbackUrl = CURATED_TRACKS[0].url;
      return createAudioResource(fallbackUrl, { inputType: StreamType.Arbitrary });
    } catch (fallbackErr) {
      logger.error('[MusicProviderManager] Erreur critique fallback audio :', fallbackErr);
      return null;
    }
  }
}

export const musicProviderManager = new MusicProviderManager();
