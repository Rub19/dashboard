import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import { Track, TrackRequester } from '../types/music.js';
import { logger } from '../../../utils/logger.js';
import { createYtDlpPcmStream, ytDlpLookup, ytDlpSearch, YtDlpEntry } from './ytdlpStream.js';
import { expandPlaylist, isPlaylistUrl, getSpotifyToken } from './playlistResolver.js';
import { config } from '../../../config.js';
import { lavalinkManager } from '../services/lavalinkManager.js';

/**
 * Every "real" source goes through yt-dlp, both for metadata (search /
 * lookup) and for audio. play-dl is gone entirely: its SoundCloud search
 * returned wrong tracks ("Love Can Do" for "another love") with dead
 * api.soundcloud.com URLs that produced 0 ms of audio — the exact
 * "bot joins, Now Playing looks fine, no sound" report.
 */
async function streamWithYtDlp(input: string, label: string): Promise<AudioResource | null> {
  try {
    // 48 kHz s16le stereo from our own ffmpeg (see createYtDlpPcmStream) —
    // @discordjs/voice only has to Opus-encode it, nothing hidden in between.
    const stream = await createYtDlpPcmStream(input);
    if (!stream) return null;
    return createAudioResource(stream, { inputType: StreamType.Raw, inlineVolume: true });
  } catch (err) {
    logger.warn(`[${label}] yt-dlp stream error :`, err);
    return null;
  }
}

const THUMB_FALLBACK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

function stamp(requestedBy: TrackRequester): Pick<Track, 'requestedBy' | 'addedAt'> {
  return { requestedBy, addedAt: new Date().toISOString() };
}

function entryToTrack(e: YtDlpEntry, requestedBy: TrackRequester, source: Track['source'], album: string): Track {
  return {
    id: `${source.toLowerCase()}-${e.id}`,
    title: e.title,
    artist: e.artist,
    album,
    duration: e.duration,
    thumbnail: e.thumbnail || THUMB_FALLBACK,
    url: e.url,
    source,
    ...stamp(requestedBy),
  };
}

// Words that make a YouTube search return the *song* rather than a live,
// a 10-hour loop or a reaction video. Applied only to free-text queries.
function musicQuery(query: string): string {
  const q = query.trim();
  return /\b(official|audio|lyrics|live|cover|remix|mix|radio|album|full)\b/i.test(q) ? q : `${q} official audio`;
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

function curated(requestedBy: TrackRequester, limit: number): Track[] {
  return CURATED_TRACKS.slice(0, limit).map((t) => ({ ...t, ...stamp(requestedBy) }));
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
        ...stamp(requestedBy),
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

// --- 2. Spotify Bridge Provider (Spotify metadata → YouTube audio) ---
export class SpotifyBridgeProvider implements IMusicProvider {
  public name = 'Spotify';

  public canHandle(query: string): boolean {
    return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|playlist|album)\/.+$/i.test(query);
  }

  public async search(query: string, requestedBy: TrackRequester): Promise<Track[]> {
    const track = await this.resolveTrack(query, requestedBy);
    return track ? [track] : [];
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    const trackId = query.match(/open\.spotify\.com\/(?:[a-z-]+\/)?track\/([A-Za-z0-9]+)/i)?.[1];
    let fullTitle: string | null = null;
    let artist: string | null = null;
    let album: string | null = null;
    let durationSeconds: number | null = null;
    let thumbnail: string | null = null;

    if (trackId) {
      try {
        const token = await getSpotifyToken();
        if (token) {
          const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = (await res.json()) as { name?: string; duration_ms?: number; artists?: Array<{ name?: string }>; album?: { name?: string; images?: Array<{ url?: string }> } };
            fullTitle = data.name || null;
            artist = (data.artists || []).map((a) => a.name).filter(Boolean).join(', ') || null;
            album = data.album?.name || null;
            durationSeconds = data.duration_ms ? Math.round(data.duration_ms / 1000) : null;
            thumbnail = data.album?.images?.[0]?.url || null;
          }
        }
      } catch (err) {
        logger.warn('[SpotifyBridgeProvider] Erreur résolution Spotify Web API :', err);
      }
    }

    try {
      if (!fullTitle || !artist) {
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = (await res.json()) as any;
          fullTitle = fullTitle || data.title || null;
          artist = artist || data.author_name || null;
          thumbnail = thumbnail || data.thumbnail_url || null;
        }
      }
      if (!fullTitle) return null;

      // Spotify serves no audio: find the same song on YouTube — through
      // Lavalink when that backend is active, yt-dlp otherwise.
      const q = `${fullTitle} ${artist || ''}`.trim();
      const [hit] =
        config.musicBackend === 'lavalink'
          ? await lavalinkManager.resolve(q, requestedBy, { limit: 1 }).then((ts) => ts.map((t) => ({ url: t.url, artist: t.artist, duration: t.duration, thumbnail: t.thumbnail, encoded: t.encoded })))
          : await ytDlpSearch(q, 1);
      if (!hit) return null;
      return {
        id: `sp-${trackId || Date.now().toString(36)}`,
        title: fullTitle,
        artist: artist || hit.artist,
        album: album || 'Spotify',
        duration: durationSeconds || hit.duration,
        thumbnail: thumbnail || hit.thumbnail || THUMB_FALLBACK,
        url: hit.url,
        source: 'SPOTIFY',
        ...('encoded' in hit && hit.encoded ? { encoded: hit.encoded } : {}),
        ...stamp(requestedBy),
      };
    } catch (err) {
      logger.warn('[SpotifyBridgeProvider] Erreur résolution Spotify :', err);
    }
    return null;
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'SpotifyBridgeProvider');
  }
}

// --- 3. YouTube URL Provider ---
export class YouTubeMusicProvider implements IMusicProvider {
  public name = 'YouTube';

  public canHandle(query: string): boolean {
    return /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/.+$/i.test(query);
  }

  public async search(query: string, requestedBy: TrackRequester): Promise<Track[]> {
    const track = await this.resolveTrack(query, requestedBy);
    return track ? [track] : [];
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    const [info] = await ytDlpLookup(query, 1);
    if (info) return entryToTrack(info, requestedBy, 'YOUTUBE', 'YouTube');
    // Metadata lookup failed but yt-dlp may still stream it — keep the URL.
    return {
      id: `yt-${Date.now().toString(36)}`,
      title: query,
      artist: 'YouTube',
      album: 'YouTube',
      duration: 0,
      thumbnail: THUMB_FALLBACK,
      url: query,
      source: 'YOUTUBE',
      ...stamp(requestedBy),
    };
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'YouTubeMusicProvider');
  }
}

// --- 4. SoundCloud URL Provider ---
export class SoundCloudProvider implements IMusicProvider {
  public name = 'SoundCloud';

  public canHandle(query: string): boolean {
    return /^(https?:\/\/)?((www|m|on)\.)?soundcloud\.com\/.+$/i.test(query);
  }

  public async search(query: string, requestedBy: TrackRequester): Promise<Track[]> {
    const track = await this.resolveTrack(query, requestedBy);
    return track ? [track] : [];
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    const [info] = await ytDlpLookup(query, 1);
    return info ? entryToTrack(info, requestedBy, 'SOUNDCLOUD', 'SoundCloud') : null;
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'SoundCloudProvider');
  }
}

// --- 5. Free-text search → YouTube (via yt-dlp) ---
export class YouTubeSearchProvider implements IMusicProvider {
  public name = 'YouTubeSearch';

  public canHandle(query: string): boolean {
    return !/^https?:\/\//i.test(query.trim()) && query.trim().length > 0;
  }

  public async search(query: string, requestedBy: TrackRequester, limit: number = 5): Promise<Track[]> {
    const q = query.trim();
    // "radio", "lofi radio"… → the curated 24/7 streams, otherwise YouTube.
    if (/^(radio|lofi radio|somafm)$/i.test(q)) return curated(requestedBy, limit);

    const hits = await ytDlpSearch(musicQuery(q), limit);
    return hits.map((h) => entryToTrack(h, requestedBy, 'YOUTUBE', 'YouTube'));
  }

  public async resolveTrack(query: string, requestedBy: TrackRequester): Promise<Track | null> {
    const results = await this.search(query, requestedBy, 1);
    if (results.length > 0) return results[0];
    // yt-dlp missing or search failed — let yt-dlp resolve at stream time
    // (ytsearch1:) so /play still works even without metadata.
    return {
      id: `yts-${Date.now().toString(36)}`,
      title: query.trim(),
      artist: 'YouTube',
      album: 'Recherche',
      duration: 0,
      thumbnail: THUMB_FALLBACK,
      url: `ytsearch1:${musicQuery(query)}`,
      source: 'YOUTUBE',
      ...stamp(requestedBy),
    };
  }

  public async getStream(track: Track): Promise<AudioResource | null> {
    return streamWithYtDlp(track.url, 'YouTubeSearchProvider');
  }
}

// --- 6. Central Provider Manager ---
class MusicProviderManager {
  private providers: IMusicProvider[] = [
    new DirectStreamProvider(),
    new SpotifyBridgeProvider(),
    new YouTubeMusicProvider(),
    new SoundCloudProvider(),
    new YouTubeSearchProvider(),
  ];

  public async search(query: string, requestedBy: TrackRequester, limit: number = 8): Promise<Track[]> {
    if (!query.trim()) return curated(requestedBy, limit);
    if (config.musicBackend === 'lavalink') {
      const hits = await lavalinkManager.resolve(query, requestedBy, { limit, maxPlaylist: limit });
      return hits.length > 0 ? hits : [];
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
    return curated(requestedBy, limit);
  }

  /**
   * A YouTube/Spotify playlist or album URL expands to all its tracks; any
   * other query resolves to a single-element array (or []). The caller
   * plays the first and queues the rest.
   */
  public async resolveMany(query: string, requestedBy: TrackRequester): Promise<Track[]> {
    if (config.musicBackend === 'lavalink') {
      // Spotify collections still go through the Spotify API → each track is
      // then encoded by Lavalink at play time (ensureEncoded).
      if (/open\.spotify\.com\/(?:[a-z-]+\/)?(playlist|album)\//i.test(query)) {
        return expandPlaylist(query, requestedBy);
      }
      if (/^(https?:\/\/)?(open\.)?spotify\.com\/track\//i.test(query)) {
        const t = await new SpotifyBridgeProvider().resolveTrack(query, requestedBy);
        return t ? [t] : [];
      }
      return lavalinkManager.resolve(query, requestedBy, { limit: 1, maxPlaylist: 100 });
    }
    if (isPlaylistUrl(query)) {
      const tracks = await expandPlaylist(query, requestedBy);
      if (tracks.length > 0) return tracks;
      const single = query.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
      if (single) return this.resolveMany(`https://www.youtube.com/watch?v=${single[1]}`, requestedBy);
      return [];
    }
    const track = await this.resolve(query, requestedBy);
    return track ? [track] : [];
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
    // Nothing could resolve it (yt-dlp missing) — never silently play the
    // wrong thing: fall back to the first curated stream but say so.
    logger.warn(`[MusicProviderManager] "${query}" non résolu — lecture du flux radio de secours.`);
    return { ...CURATED_TRACKS[0], ...stamp(requestedBy) };
  }

  public async createAudioResource(track: Track): Promise<AudioResource | null> {
    for (const provider of this.providers) {
      if (provider.canHandle(track.url) || (track.url.startsWith('ytsearch') && provider.name === 'YouTubeSearch')) {
        try {
          const resource = await provider.getStream(track);
          if (resource) return resource;
        } catch (err) {
          logger.warn(`Provider ${provider.name} failed getStream :`, err);
        }
      }
    }

    // Only a provably-direct audio URL may be handed straight to ffmpeg: a
    // webpage URL would "succeed" while producing silence.
    const isDirectAudioUrl =
      !!track.url &&
      (/^https?:\/\/.*\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(track.url) || /^https?:\/\/.*somafm\.com/i.test(track.url));
    if (isDirectAudioUrl) {
      try {
        return createAudioResource(track.url, { inputType: StreamType.Arbitrary });
      } catch (directErr) {
        logger.warn('[MusicProviderManager] Direct stream fallback error :', directErr);
      }
    }

    logger.error(`[MusicProviderManager] Aucun flux audio pour "${track.title}" (${track.url}) — vérifie yt-dlp (npm run music:doctor).`);
    return null;
  }
}

export const musicProviderManager = new MusicProviderManager();
