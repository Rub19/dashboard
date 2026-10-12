import {
  LastFmAlbum,
  LastFmArtist,
  LastFmProfile,
  LastFmTasteComparison,
  LastFmTrack,
} from "../types/lastfmTypes.js";
import { logger } from "../../../utils/logger.js";

const WORKER_ORIGIN = "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || "";

class LastFmService {
  public async getNowPlaying(username: string): Promise<LastFmTrack | null> {
    try {
      const url = `${WORKER_ORIGIN}/api/now-playing?source=lastfm&username=${encodeURIComponent(username)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as any;
        if (body?.ok && body?.data?.track) {
          const t = body.data.track;
          return {
            name: t.name || "Titre inconnu",
            artist: t.artist || "Artiste inconnu",
            album: t.album || "",
            artworkUrl: t.artworkUrl || "",
            profileUrl: t.profileUrl || `https://www.last.fm/user/${encodeURIComponent(username)}`,
            playCount: Number(t.playCount || 0),
            playing: Boolean(t.playing),
            playedAt: t.playedAt || undefined,
          };
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching now-playing via worker:", err);
    }

    try {
      const directUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(
        username
      )}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        const tracks = data?.recenttracks?.track;
        const first = Array.isArray(tracks) ? tracks[0] : tracks;
        if (first) {
          const isPlaying = first["@attr"]?.nowplaying === "true";
          const images = Array.isArray(first.image) ? first.image : [];
          const artwork = images[images.length - 1]?.["#text"] || "";
          return {
            name: first.name || "Titre inconnu",
            artist: typeof first.artist === "object" ? first.artist?.["#text"] : first.artist || "",
            album: typeof first.album === "object" ? first.album?.["#text"] : first.album || "",
            artworkUrl: artwork,
            profileUrl: first.url || `https://www.last.fm/user/${encodeURIComponent(username)}`,
            playCount: 0,
            playing: isPlaying,
            playedAt: first.date?.uts ? new Date(Number(first.date.uts) * 1000).toISOString() : undefined,
          };
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching now-playing directly:", err);
    }

    return null;
  }

  public async getRecentTracks(username: string, limit = 5): Promise<LastFmTrack[]> {
    try {
      const url = `${WORKER_ORIGIN}/api/lastfm/recent-tracks?username=${encodeURIComponent(username)}&limit=${limit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as any;
        if (body?.ok && Array.isArray(body?.data)) {
          return body.data.map((t: any) => ({
            name: t.name || "",
            artist: t.artist || "",
            album: t.album || "",
            artworkUrl: t.artworkUrl || "",
            profileUrl: t.profileUrl || "",
            playCount: Number(t.playCount || 0),
            playing: Boolean(t.playing),
            playedAt: t.playedAt || undefined,
          }));
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching recent tracks via worker:", err);
    }

    try {
      const directUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(
        username
      )}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        const tracks = data?.recenttracks?.track;
        const list = Array.isArray(tracks) ? tracks : tracks ? [tracks] : [];
        return list.slice(0, limit).map((t: any) => {
          const images = Array.isArray(t.image) ? t.image : [];
          const artwork = images[images.length - 1]?.["#text"] || "";
          return {
            name: t.name || "",
            artist: typeof t.artist === "object" ? t.artist?.["#text"] : t.artist || "",
            album: typeof t.album === "object" ? t.album?.["#text"] : t.album || "",
            artworkUrl: artwork,
            profileUrl: t.url || "",
            playCount: 0,
            playing: t["@attr"]?.nowplaying === "true",
            playedAt: t.date?.uts ? new Date(Number(t.date.uts) * 1000).toISOString() : undefined,
          };
        });
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching recent tracks directly:", err);
    }

    return [];
  }

  public async getTopArtists(username: string, period = "7day", limit = 5): Promise<LastFmArtist[]> {
    try {
      const url = `${WORKER_ORIGIN}/api/lastfm/top-artists?username=${encodeURIComponent(
        username
      )}&period=${period}&limit=${limit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as any;
        if (body?.ok && Array.isArray(body?.data)) {
          return body.data.map((a: any) => ({
            name: a.name || "",
            playCount: Number(a.playCount || 0),
            artworkUrl: a.artworkUrl || "",
            profileUrl: a.profileUrl || "",
          }));
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching top artists via worker:", err);
    }

    try {
      const directUrl = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(
        username
      )}&period=${period}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        const artists = data?.topartists?.artist;
        const list = Array.isArray(artists) ? artists : artists ? [artists] : [];
        return list.slice(0, limit).map((a: any) => ({
          name: a.name || "",
          playCount: Number(a.playcount || 0),
          artworkUrl: "",
          profileUrl: a.url || "",
        }));
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching top artists directly:", err);
    }

    return [];
  }

  public async getTopTracks(username: string, period = "7day", limit = 5): Promise<LastFmTrack[]> {
    try {
      const url = `${WORKER_ORIGIN}/api/lastfm/top-tracks?username=${encodeURIComponent(
        username
      )}&period=${period}&limit=${limit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as any;
        if (body?.ok && Array.isArray(body?.data)) {
          return body.data.map((t: any) => ({
            name: t.name || "",
            artist: t.artist || "",
            album: "",
            artworkUrl: t.artworkUrl || "",
            profileUrl: t.profileUrl || "",
            playCount: Number(t.playCount || 0),
            playing: false,
          }));
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching top tracks via worker:", err);
    }

    return [];
  }

  public async getTopAlbums(username: string, period = "7day", limit = 5): Promise<LastFmAlbum[]> {
    try {
      const url = `${WORKER_ORIGIN}/api/lastfm/top-albums?username=${encodeURIComponent(
        username
      )}&period=${period}&limit=${limit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as any;
        if (body?.ok && Array.isArray(body?.data)) {
          return body.data.map((a: any) => ({
            name: a.name || "",
            artist: a.artist || "",
            playCount: Number(a.playCount || 0),
            artworkUrl: a.artworkUrl || "",
            profileUrl: a.profileUrl || "",
          }));
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching top albums via worker:", err);
    }

    return [];
  }

  public async getProfile(username: string): Promise<LastFmProfile | null> {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(
        username
      )}&api_key=${LASTFM_API_KEY}&format=json`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as any;
        const u = data?.user;
        if (u) {
          const images = Array.isArray(u.image) ? u.image : [];
          const avatar = images[images.length - 1]?.["#text"] || "";
          return {
            username: u.name || username,
            realName: u.realname || undefined,
            playCount: Number(u.playcount || 0),
            artistCount: Number(u.artist_count || 0),
            registeredAt: u.registered?.unixtime
              ? new Date(Number(u.registered.unixtime) * 1000).toISOString()
              : undefined,
            profileUrl: u.url || `https://www.last.fm/user/${encodeURIComponent(username)}`,
            avatarUrl: avatar || undefined,
            country: u.country || undefined,
          };
        }
      }
    } catch (err) {
      logger.error("[LastFmService] Error fetching user profile:", err);
    }

    return null;
  }

  public async compareTaste(user1: string, user2: string): Promise<LastFmTasteComparison> {
    const [artists1, artists2] = await Promise.all([
      this.getTopArtists(user1, "overall", 30),
      this.getTopArtists(user2, "overall", 30),
    ]);

    const set1 = new Set(artists1.map((a) => a.name.toLowerCase()));
    const common = artists2.filter((a) => set1.has(a.name.toLowerCase())).map((a) => a.name);

    const total = Math.max(artists1.length, artists2.length, 1);
    const score = Math.min(100, Math.round((common.length / total) * 100 * 1.8));

    return {
      user1,
      user2,
      compatibility: score,
      commonArtists: common.slice(0, 5),
    };
  }
}

export const lastFmService = new LastFmService();
