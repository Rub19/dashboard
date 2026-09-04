import fs from 'fs';
import path from 'path';
import {
  MusicPlaylist,
  MusicSettings,
  MusicSettingsSchema,
  MusicStats,
  Track,
} from '../types/music.js';
import { logger } from '../../../utils/logger.js';

export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  maxQueueSize: 100,
  allowDuplicates: true,
  allowUserRemoveOwn: true,
  allowUserSkip: true,
  allowUserChangeVolume: true,
  djMode: false,
  djRoleId: null,
  autoDisconnectSeconds: 300,
  autoplay: false,
  defaultVolume: 75,
};

class MusicPersistence {
  private dataDir = path.resolve(process.cwd(), 'data');
  private playlistsFile = path.resolve(this.dataDir, 'music_playlists.json');
  private favoritesFile = path.resolve(this.dataDir, 'music_favorites.json');
  private historyFile = path.resolve(this.dataDir, 'music_history.json');
  private settingsFile = path.resolve(this.dataDir, 'music_settings.json');
  private statsFile = path.resolve(this.dataDir, 'music_stats.json');

  private playlists = new Map<string, MusicPlaylist[]>(); // guildId -> playlists
  private favorites = new Map<string, Map<string, Track[]>>(); // guildId -> userId -> favorites
  private history = new Map<string, Track[]>(); // guildId -> history
  private settings = new Map<string, MusicSettings>(); // guildId -> settings
  private stats = new Map<string, MusicStats>(); // guildId -> stats

  constructor() {
    this.ensureDir();
    this.loadAll();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadAll(): void {
    try {
      if (fs.existsSync(this.playlistsFile)) {
        const data = JSON.parse(fs.readFileSync(this.playlistsFile, 'utf-8'));
        for (const [gid, list] of Object.entries(data)) {
          this.playlists.set(gid, list as MusicPlaylist[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement music_playlists.json :', err);
    }

    try {
      if (fs.existsSync(this.favoritesFile)) {
        const data = JSON.parse(fs.readFileSync(this.favoritesFile, 'utf-8'));
        for (const [gid, userMap] of Object.entries(data)) {
          const m = new Map<string, Track[]>();
          for (const [uid, tracks] of Object.entries(userMap as Record<string, Track[]>)) {
            m.set(uid, tracks);
          }
          this.favorites.set(gid, m);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement music_favorites.json :', err);
    }

    try {
      if (fs.existsSync(this.historyFile)) {
        const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
        for (const [gid, list] of Object.entries(data)) {
          this.history.set(gid, list as Track[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement music_history.json :', err);
    }

    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = JSON.parse(fs.readFileSync(this.settingsFile, 'utf-8'));
        for (const [gid, conf] of Object.entries(data)) {
          const parsed = MusicSettingsSchema.safeParse(conf);
          if (parsed.success) {
            this.settings.set(gid, parsed.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement music_settings.json :', err);
    }

    try {
      if (fs.existsSync(this.statsFile)) {
        const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
        for (const [gid, s] of Object.entries(data)) {
          this.stats.set(gid, s as MusicStats);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement music_stats.json :', err);
    }
  }

  // --- PLAYLISTS ---
  public getPlaylists(guildId: string): MusicPlaylist[] {
    return this.playlists.get(guildId) || [];
  }

  public savePlaylist(guildId: string, playlist: MusicPlaylist): void {
    const list = this.getPlaylists(guildId);
    const existingIndex = list.findIndex((p) => p.id === playlist.id);
    if (existingIndex >= 0) {
      list[existingIndex] = playlist;
    } else {
      list.push(playlist);
    }
    this.playlists.set(guildId, list);
    this.persistPlaylists();
  }

  public deletePlaylist(guildId: string, playlistId: string): boolean {
    const list = this.getPlaylists(guildId);
    const filtered = list.filter((p) => p.id !== playlistId);
    if (filtered.length !== list.length) {
      this.playlists.set(guildId, filtered);
      this.persistPlaylists();
      return true;
    }
    return false;
  }

  private persistPlaylists(): void {
    try {
      const obj: Record<string, MusicPlaylist[]> = {};
      for (const [gid, list] of this.playlists.entries()) {
        obj[gid] = list;
      }
      fs.writeFileSync(this.playlistsFile, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde music_playlists.json :', err);
    }
  }

  // --- FAVORITES ---
  public getFavorites(guildId: string, userId: string): Track[] {
    return this.favorites.get(guildId)?.get(userId) || [];
  }

  public toggleFavorite(guildId: string, userId: string, track: Track): { isFavorite: boolean; favorites: Track[] } {
    if (!this.favorites.has(guildId)) {
      this.favorites.set(guildId, new Map());
    }
    const userMap = this.favorites.get(guildId)!;
    const current = userMap.get(userId) || [];

    const existingIndex = current.findIndex((t) => t.id === track.id || t.url === track.url);
    let isFavorite = false;
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
      isFavorite = false;
    } else {
      current.unshift(track);
      if (current.length > 200) current.pop();
      isFavorite = true;
    }

    userMap.set(userId, current);
    this.persistFavorites();
    return { isFavorite, favorites: current };
  }

  private persistFavorites(): void {
    try {
      const obj: Record<string, Record<string, Track[]>> = {};
      for (const [gid, userMap] of this.favorites.entries()) {
        obj[gid] = {};
        for (const [uid, tracks] of userMap.entries()) {
          obj[gid][uid] = tracks;
        }
      }
      fs.writeFileSync(this.favoritesFile, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde music_favorites.json :', err);
    }
  }

  // --- HISTORY ---
  public getHistory(guildId: string): Track[] {
    return this.history.get(guildId) || [];
  }

  public addHistory(guildId: string, track: Track): void {
    const list = this.getHistory(guildId);
    // Supprimer doublon récent
    const filtered = list.filter((t) => t.id !== track.id && t.url !== track.url);
    filtered.unshift(track);
    if (filtered.length > 100) filtered.pop();
    this.history.set(guildId, filtered);
    this.persistHistory();
    this.recordTrackStats(guildId, track);
  }

  private persistHistory(): void {
    try {
      const obj: Record<string, Track[]> = {};
      for (const [gid, list] of this.history.entries()) {
        obj[gid] = list;
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde music_history.json :', err);
    }
  }

  // --- SETTINGS ---
  public getSettings(guildId: string): MusicSettings {
    const existing = this.settings.get(guildId);
    if (!existing) {
      const fresh = { ...DEFAULT_MUSIC_SETTINGS };
      this.settings.set(guildId, fresh);
      return fresh;
    }
    return existing;
  }

  public updateSettings(guildId: string, patch: Partial<MusicSettings>): MusicSettings {
    const current = this.getSettings(guildId);
    const updated = { ...current, ...patch };
    this.settings.set(guildId, updated);
    this.persistSettings();
    return updated;
  }

  private persistSettings(): void {
    try {
      const obj: Record<string, MusicSettings> = {};
      for (const [gid, s] of this.settings.entries()) {
        obj[gid] = s;
      }
      fs.writeFileSync(this.settingsFile, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde music_settings.json :', err);
    }
  }

  // --- STATS ---
  public getStats(guildId: string): MusicStats {
    return (
      this.stats.get(guildId) || {
        totalTracksPlayed: 0,
        totalListeningSeconds: 0,
        topTracks: [],
        topRequesters: [],
      }
    );
  }

  public recordTrackStats(guildId: string, track: Track): void {
    const current = this.getStats(guildId);
    current.totalTracksPlayed += 1;
    current.totalListeningSeconds += track.duration || 180;

    // Top Tracks
    const existingTrack = current.topTracks.find(
      (t) => t.title.toLowerCase() === track.title.toLowerCase()
    );
    if (existingTrack) {
      existingTrack.count += 1;
    } else {
      current.topTracks.push({
        title: track.title,
        artist: track.artist,
        count: 1,
        thumbnail: track.thumbnail,
      });
    }
    current.topTracks.sort((a, b) => b.count - a.count);
    if (current.topTracks.length > 10) current.topTracks = current.topTracks.slice(0, 10);

    // Top Requesters
    const requester = track.requestedBy;
    if (requester && requester.id) {
      const existingUser = current.topRequesters.find((u) => u.userId === requester.id);
      if (existingUser) {
        existingUser.count += 1;
      } else {
        current.topRequesters.push({
          userId: requester.id,
          userTag: requester.tag,
          count: 1,
        });
      }
      current.topRequesters.sort((a, b) => b.count - a.count);
      if (current.topRequesters.length > 10) current.topRequesters = current.topRequesters.slice(0, 10);
    }

    this.stats.set(guildId, current);
    this.persistStats();
  }

  private persistStats(): void {
    try {
      const obj: Record<string, MusicStats> = {};
      for (const [gid, s] of this.stats.entries()) {
        obj[gid] = s;
      }
      fs.writeFileSync(this.statsFile, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde music_stats.json :', err);
    }
  }
}

export const musicPersistence = new MusicPersistence();
