import { ActivityType, Guild, GuildMember } from 'discord.js';
import { spotifyStorage } from '../storage/spotifyStorage.js';
import {
  SpotifyDevice,
  SpotifyQueue,
  SpotifyTokens,
  SpotifyTopArtist,
  SpotifyTopTrack,
  SpotifyTrack,
} from '../types/spotify.js';
import { musicService } from '../../music/services/musicService.js';
import { logger } from '../../../utils/logger.js';
import { trg } from '../../../utils/tr.js';

const SPOTIFY_CLIENT_ID = '6619fbf6315e4e68948dc08532251912';
const REDIRECT_URI = 'https://ethone.dev/';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'user-library-modify',
  'user-top-read',
  'user-read-recently-played',
].join(' ');

class SpotifyService {
  public getTokens(userId: string): SpotifyTokens | null {
    return spotifyStorage.get(userId);
  }

  public setTokens(userId: string, tokens: SpotifyTokens): void {
    spotifyStorage.set(userId, tokens);
  }

  public removeTokens(userId: string): boolean {
    return spotifyStorage.delete(userId);
  }

  public isConnected(userId: string): boolean {
    return spotifyStorage.has(userId);
  }

  public getLoginUrl(discordUserId: string): string {
    const statePayload = JSON.stringify({
      provider: 'spotify',
      discordUserId,
      ts: Date.now(),
    });
    const stateEncoded = Buffer.from(statePayload).toString('base64url');
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state: stateEncoded,
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  public async getValidAccessToken(userId: string): Promise<string | null> {
    const tokens = this.getTokens(userId);
    if (!tokens) return null;

    if (Date.now() < tokens.expiresAt - 30000) {
      return tokens.accessToken;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      });

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          this.removeTokens(userId);
        }
        return null;
      }

      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
        scope?: string;
      };

      const updatedTokens: SpotifyTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        scope: data.scope || tokens.scope,
      };

      this.setTokens(userId, updatedTokens);
      return updatedTokens.accessToken;
    } catch (err) {
      logger.error(`[SpotifyService] Refresh error for user ${userId}:`, err);
      return null;
    }
  }

  public async getPlaybackState(userId: string): Promise<SpotifyTrack | null> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return null;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player?additional_types=track,episode', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204 || res.status === 404) {
        const currentRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (currentRes.status === 204 || !currentRes.ok) return null;
        const currentData = (await currentRes.json()) as any;
        return this.parseTrackPayload(currentData, token);
      }

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      return this.parseTrackPayload(data, token);
    } catch (err) {
      logger.error(`[SpotifyService] Playback fetch error for ${userId}:`, err);
      return null;
    }
  }

  private async parseTrackPayload(payload: any, token: string): Promise<SpotifyTrack | null> {
    const item = payload?.item;
    if (!item) return null;

    const artists = Array.isArray(item.artists)
      ? item.artists.map((a: any) => a?.name || '').filter(Boolean)
      : [];
    const images = Array.isArray(item.album?.images)
      ? item.album.images
      : Array.isArray(item.images)
      ? item.images
      : [];
    const albumArt = images[0]?.url || undefined;

    let isSaved = false;
    if (item.id && token) {
      try {
        const savedRes = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${item.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (savedRes.ok) {
          const savedData = (await savedRes.json()) as boolean[];
          isSaved = Boolean(savedData[0]);
        }
      } catch {}
    }

    const device: SpotifyDevice | undefined = payload?.device
      ? {
          id: payload.device.id,
          name: payload.device.name,
          type: payload.device.type,
          is_active: payload.device.is_active,
          volume_percent: payload.device.volume_percent ?? 50,
        }
      : undefined;

    return {
      id: item.id || '',
      name: item.name || '',
      artists,
      album: item.album?.name || item.show?.name || '',
      albumArt,
      durationMs: item.duration_ms || 0,
      progressMs: payload.progress_ms || 0,
      isPlaying: payload.is_playing === true,
      url: item.external_urls?.spotify || (item.id ? `https://open.spotify.com/track/${item.id}` : ''),
      device,
      isSaved,
    };
  }

  public getDiscordPresenceSpotify(member: GuildMember): SpotifyTrack | null {
    const activities = member.presence?.activities;
    if (!activities || activities.length === 0) return null;

    const spot = activities.find(
      (a) => a.name === 'Spotify' && a.type === ActivityType.Listening
    );
    if (!spot) return null;

    const trackId = spot.syncId || '';
    const name = spot.details || '';
    const artist = spot.state || '';
    const album = spot.assets?.largeText || '';
    let albumArt: string | undefined;

    if (spot.assets?.largeImage) {
      if (spot.assets.largeImage.startsWith('spotify:')) {
        const imageId = spot.assets.largeImage.replace('spotify:', '');
        albumArt = `https://i.scdn.co/image/${imageId}`;
      } else {
        albumArt = spot.assets.largeImageURL() || undefined;
      }
    }

    const start = spot.timestamps?.start ? spot.timestamps.start.getTime() : 0;
    const end = spot.timestamps?.end ? spot.timestamps.end.getTime() : 0;
    const now = Date.now();
    const durationMs = end > start ? end - start : 0;
    const progressMs = start > 0 ? Math.max(0, Math.min(durationMs, now - start)) : 0;

    return {
      id: trackId,
      name,
      artists: artist ? artist.split('; ') : [],
      album,
      albumArt,
      durationMs,
      progressMs,
      isPlaying: true,
      url: trackId ? `https://open.spotify.com/track/${trackId}` : '',
    };
  }

  public async play(userId: string, queryOrUri?: string): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé ou session expirée. Tapez `/spotify login`.' };

    try {
      let body: any = {};
      if (queryOrUri) {
        if (queryOrUri.startsWith('spotify:track:') || queryOrUri.startsWith('https://open.spotify.com/track/')) {
          const uri = queryOrUri.startsWith('spotify:')
            ? queryOrUri
            : `spotify:track:${queryOrUri.split('/track/')[1]?.split('?')[0]}`;
          body = { uris: [uri] };
        } else if (
          queryOrUri.startsWith('spotify:album:') ||
          queryOrUri.startsWith('spotify:playlist:') ||
          queryOrUri.startsWith('https://open.spotify.com/album/') ||
          queryOrUri.startsWith('https://open.spotify.com/playlist/')
        ) {
          const type = queryOrUri.includes('album') ? 'album' : 'playlist';
          const id = queryOrUri.includes('https://')
            ? queryOrUri.split(`/${type}/`)[1]?.split('?')[0]
            : queryOrUri.replace(`spotify:${type}:`, '');
          body = { context_uri: `spotify:${type}:${id}` };
        } else {
          const found = await this.searchTrack(token, queryOrUri);
          if (!found) return { success: false, error: `Aucun titre Spotify trouvé pour "${queryOrUri}".` };
          body = { uris: [found.uri] };
        }
      }

      let res = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });

      if (res.status === 404 || res.status === 403) {
        const devices = await this.getDevices(userId);
        const target = devices.find((d) => d.is_active) || devices[0];
        if (target) {
          await this.transferPlayback(userId, target.id);
          res = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
          });
        }
      }

      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de lancer la lecture Spotify.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau avec l\'API Spotify.' };
    }
  }

  public async pause(userId: string): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de mettre en pause.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async resume(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.play(userId);
  }

  public async next(userId: string): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de passer au titre suivant.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async previous(userId: string): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de revenir au titre précédent.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async seek(userId: string, seconds: number): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const positionMs = Math.max(0, Math.round(seconds * 1000));
      const res = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de déplacer la lecture.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async setVolume(userId: string, percent: number): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const vol = Math.max(0, Math.min(100, Math.round(percent)));
      const res = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de régler le volume.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async setRepeat(userId: string, mode: 'track' | 'context' | 'off'): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de modifier le mode de répétition.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async setShuffle(userId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${enabled}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de modifier la lecture aléatoire.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async addToQueue(userId: string, queryOrUri: string): Promise<{ success: boolean; trackName?: string; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      let uri = queryOrUri;
      let trackName = queryOrUri;
      if (!queryOrUri.startsWith('spotify:track:')) {
        if (queryOrUri.includes('/track/')) {
          const trackId = queryOrUri.split('/track/')[1]?.split('?')[0];
          uri = `spotify:track:${trackId}`;
        } else {
          const found = await this.searchTrack(token, queryOrUri);
          if (!found) return { success: false, error: `Titre non trouvé sur Spotify.` };
          uri = found.uri;
          trackName = `${found.name} — ${found.artists[0]?.name}`;
        }
      }

      const res = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) return { success: true, trackName };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible d\'ajouter à la file Spotify.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async getQueue(userId: string): Promise<SpotifyQueue | null> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return null;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const current = data.currently_playing ? await this.parseTrackPayload({ item: data.currently_playing, is_playing: true }, token) : null;
      const queue = Array.isArray(data.queue)
        ? data.queue.slice(0, 10).map((item: any) => ({
            id: item.id || '',
            name: item.name || '',
            artists: Array.isArray(item.artists) ? item.artists.map((a: any) => a?.name || '').filter(Boolean) : [],
            album: item.album?.name || '',
            albumArt: item.album?.images?.[0]?.url || undefined,
            durationMs: item.duration_ms || 0,
            url: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
          }))
        : [];
      return { current, queue };
    } catch {
      return null;
    }
  }

  public async likeTrack(userId: string, trackId?: string): Promise<{ success: boolean; trackTitle?: string; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      let targetId = trackId;
      let title = '';
      if (!targetId) {
        const state = await this.getPlaybackState(userId);
        if (!state?.id) return { success: false, error: 'Aucun titre en cours d\'écoute sur Spotify.' };
        targetId = state.id;
        title = `${state.name} (${state.artists.join(', ')})`;
      }

      const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${targetId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 200) return { success: true, trackTitle: title };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible d\'ajouter aux titres likés.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async unlikeTrack(userId: string, trackId?: string): Promise<{ success: boolean; trackTitle?: string; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      let targetId = trackId;
      let title = '';
      if (!targetId) {
        const state = await this.getPlaybackState(userId);
        if (!state?.id) return { success: false, error: 'Aucun titre en cours d\'écoute sur Spotify.' };
        targetId = state.id;
        title = `${state.name} (${state.artists.join(', ')})`;
      }

      const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 200) return { success: true, trackTitle: title };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de retirer des titres likés.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async getDevices(userId: string): Promise<SpotifyDevice[]> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return [];

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { devices?: any[] };
      return Array.isArray(data.devices)
        ? data.devices.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            is_active: Boolean(d.is_active),
            volume_percent: d.volume_percent ?? 50,
          }))
        : [];
    } catch {
      return [];
    }
  }

  public async transferPlayback(userId: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return { success: false, error: 'Compte Spotify non associé.' };

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: true }),
      });
      if (res.ok || res.status === 204) return { success: true };
      const errJson = (await res.json().catch(() => ({}))) as any;
      return { success: false, error: errJson?.error?.message || 'Impossible de transférer la lecture.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau.' };
    }
  }

  public async getTopTracks(
    userId: string,
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
  ): Promise<SpotifyTopTrack[]> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return [];

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: any[] };
      return Array.isArray(data.items)
        ? data.items.map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(', ') || '',
            album: t.album?.name || '',
            url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
            durationMs: t.duration_ms || 0,
            albumArt: t.album?.images?.[0]?.url || undefined,
          }))
        : [];
    } catch {
      return [];
    }
  }

  public async getTopArtists(
    userId: string,
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
  ): Promise<SpotifyTopArtist[]> {
    const token = await this.getValidAccessToken(userId);
    if (!token) return [];

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: any[] };
      return Array.isArray(data.items)
        ? data.items.map((a: any) => ({
            id: a.id,
            name: a.name,
            url: a.external_urls?.spotify || `https://open.spotify.com/artist/${a.id}`,
            genres: Array.isArray(a.genres) ? a.genres.slice(0, 3) : [],
            image: a.images?.[0]?.url || undefined,
          }))
        : [];
    } catch {
      return [];
    }
  }

  private async searchTrack(token: string, query: string): Promise<{ uri: string; name: string; artists: any[] } | null> {
    try {
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const track = data.tracks?.items?.[0];
      if (!track) return null;
      return { uri: track.uri, name: track.name, artists: track.artists || [] };
    } catch {
      return null;
    }
  }

  public async streamToVoice(
    guild: Guild,
    member: GuildMember
  ): Promise<{ success: boolean; trackTitle?: string; channelName?: string; error?: string }> {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return { success: false, error: trg(guild, 'Vous devez être connecté dans un salon vocal pour diffuser votre musique Spotify.') };
    }

    let track = await this.getPlaybackState(member.id);
    if (!track) {
      track = this.getDiscordPresenceSpotify(member);
    }

    if (!track || !track.name) {
      return { success: false, error: trg(guild, 'Aucun titre Spotify détecté (lancez Spotify sur votre appareil ou associez votre compte via `/spotify login`).') };
    }

    const searchQuery = track.url || `${track.name} ${track.artists.join(' ')}`;
    const playRes = await musicService.play(guild, member, searchQuery, {
      playNext: true,
      channelId: voiceChannel.id,
    });

    if (!playRes.success) {
      return { success: false, error: playRes.error || 'Impossible de lancer la lecture dans le salon vocal.' };
    }

    return {
      success: true,
      trackTitle: `${track.name} — ${track.artists.join(', ')}`,
      channelName: voiceChannel.name,
    };
  }
}

export const spotifyService = new SpotifyService();
