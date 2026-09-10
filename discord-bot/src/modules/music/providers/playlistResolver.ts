import { spawn } from 'node:child_process';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import type { Track, TrackRequester } from '../types/music.js';
import { ytDlpAvailable } from './ytdlpStream.js';

const YT_DLP_PATH = process.env.YT_DLP_PATH || 'yt-dlp';
const COOKIES_FILE = process.env.YT_DLP_COOKIES_FILE || '';
// Guard rails so one `/play <playlist>` can't enqueue thousands of tracks.
const MAX_PLAYLIST_TRACKS = 100;

const THUMB_FALLBACK = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

/** youtube.com/...&list=... or youtu.be/...?list=... (a bare watch?v= with no list is NOT a playlist). */
export function isYouTubePlaylistUrl(query: string): boolean {
  return /(?:youtube\.com|youtu\.be)\/.*[?&]list=([A-Za-z0-9_-]+)/i.test(query);
}

/** open.spotify.com/playlist/{id} or /album/{id} (optionally with a locale segment or ?si=). */
export function isSpotifyCollectionUrl(query: string): boolean {
  return /open\.spotify\.com\/(?:[a-z-]+\/)?(playlist|album)\/[A-Za-z0-9]+/i.test(query);
}

export function isPlaylistUrl(query: string): boolean {
  return isYouTubePlaylistUrl(query) || isSpotifyCollectionUrl(query);
}

function requester(base: TrackRequester): Pick<Track, 'requestedBy' | 'addedAt'> {
  return { requestedBy: base, addedAt: new Date().toISOString() };
}

// --- YouTube ------------------------------------------------------------

interface FlatEntry {
  id?: string;
  url?: string;
  title?: string;
  duration?: number;
  uploader?: string;
  channel?: string;
}

export async function expandYouTubePlaylist(url: string, requestedBy: TrackRequester): Promise<Track[]> {
  if (!(await ytDlpAvailable())) return [];

  const json = await new Promise<string>((resolve) => {
    const args = [
      '--flat-playlist',
      '--dump-single-json',
      '--no-warnings',
      '--quiet',
      '--playlist-end',
      String(MAX_PLAYLIST_TRACKS),
      ...(COOKIES_FILE ? ['--cookies', COOKIES_FILE] : []),
      url,
    ];
    const proc = spawn(YT_DLP_PATH, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    proc.stdout?.on('data', (c: Buffer) => (out += c.toString()));
    proc.on('error', () => resolve(''));
    proc.on('close', () => resolve(out));
  });

  if (!json.trim()) return [];
  let parsed: { entries?: FlatEntry[]; title?: string };
  try {
    parsed = JSON.parse(json);
  } catch {
    logger.warn('[playlist] YouTube: JSON yt-dlp illisible');
    return [];
  }

  const entries = Array.isArray(parsed.entries) ? parsed.entries.slice(0, MAX_PLAYLIST_TRACKS) : [];
  return entries
    .filter((e) => e && (e.id || e.url))
    .map((e) => {
      const id = e.id || '';
      const videoUrl = e.url && /^https?:/.test(e.url) ? e.url : `https://www.youtube.com/watch?v=${id}`;
      return {
        id: `ytpl-${id || Math.random().toString(36).slice(2)}`,
        title: e.title || 'Titre YouTube',
        artist: e.uploader || e.channel || 'YouTube',
        album: parsed.title || 'Playlist YouTube',
        duration: Math.round(e.duration || 0),
        thumbnail: id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : THUMB_FALLBACK,
        url: videoUrl,
        source: 'YOUTUBE' as const,
        ...requester(requestedBy),
      };
    });
}

// --- Spotify -----------------------------------------------------------

let spotifyToken: { value: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  if (!config.spotifyClientId || !config.spotifyClientSecret) return null;
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 10_000) return spotifyToken.value;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      logger.warn(`[playlist] Spotify token: HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    spotifyToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
    return spotifyToken.value;
  } catch (err) {
    logger.warn('[playlist] Spotify token error :', err);
    return null;
  }
}

interface SpotifyTrackObj {
  name?: string;
  duration_ms?: number;
  artists?: Array<{ name?: string }>;
  album?: { images?: Array<{ url?: string }> };
}

export async function expandSpotifyCollection(url: string, requestedBy: TrackRequester): Promise<Track[]> {
  const match = url.match(/open\.spotify\.com\/(?:[a-z-]+\/)?(playlist|album)\/([A-Za-z0-9]+)/i);
  if (!match) return [];
  const [, kind, id] = match;

  const token = await getSpotifyToken();
  if (!token) {
    logger.warn('[playlist] Spotify: SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET manquants — playlist ignorée');
    return [];
  }

  const authHeaders = { Authorization: `Bearer ${token}` };
  const collected: SpotifyTrackObj[] = [];
  // /playlists/{id}/tracks returns { items: [{ track }] }; /albums/{id}/tracks returns { items: [track] }.
  let next: string | null =
    kind === 'album'
      ? `https://api.spotify.com/v1/albums/${id}/tracks?limit=50`
      : `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100&fields=next,items(track(name,duration_ms,artists(name),album(images)))`;

  try {
    while (next && collected.length < MAX_PLAYLIST_TRACKS) {
      const res: Response = await fetch(next, { headers: authHeaders });
      if (!res.ok) {
        logger.warn(`[playlist] Spotify ${kind}: HTTP ${res.status}`);
        break;
      }
      const page = (await res.json()) as { next?: string | null; items?: Array<{ track?: SpotifyTrackObj } | SpotifyTrackObj> };
      for (const item of page.items || []) {
        const t = (item as { track?: SpotifyTrackObj }).track ?? (item as SpotifyTrackObj);
        if (t && t.name) collected.push(t);
      }
      next = page.next || null;
    }
  } catch (err) {
    logger.warn('[playlist] Spotify fetch error :', err);
  }

  return collected.slice(0, MAX_PLAYLIST_TRACKS).map((t, i) => {
    const artist = (t.artists || []).map((a) => a.name).filter(Boolean).join(', ') || 'Spotify';
    return {
      id: `sppl-${id}-${i}`,
      title: t.name || 'Titre Spotify',
      artist,
      album: 'Spotify',
      duration: Math.round((t.duration_ms || 0) / 1000),
      thumbnail: t.album?.images?.[0]?.url || THUMB_FALLBACK,
      // Streamed from YouTube (Spotify itself serves no audio) — yt-dlp
      // resolves this search term and plays the top hit.
      url: `ytsearch1:${t.name} ${artist}`,
      source: 'SPOTIFY' as const,
      ...requester(requestedBy),
    };
  });
}

/**
 * Expands a playlist/album URL into its tracks. Returns [] for a
 * non-playlist query (caller falls back to single-track resolve) or when
 * expansion isn't possible (yt-dlp missing, Spotify creds missing).
 */
export async function expandPlaylist(query: string, requestedBy: TrackRequester): Promise<Track[]> {
  if (isSpotifyCollectionUrl(query)) return expandSpotifyCollection(query, requestedBy);
  if (isYouTubePlaylistUrl(query)) return expandYouTubePlaylist(query, requestedBy);
  return [];
}
