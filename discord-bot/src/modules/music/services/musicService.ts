import { Client, Guild, GuildMember, VoiceBasedChannel } from 'discord.js';
import { GuildMusicPlayer } from './guildMusicPlayer.js';
import { GuildMusicState, MusicPlaylist, MusicSettings, MusicStats, RepeatMode, Track } from '../types/music.js';
import { musicPersistence } from '../storage/musicPersistence.js';
import { musicProviderManager } from '../providers/musicProvider.js';
import { MusicPermissionService } from './musicPermissionService.js';
import { musicEventBus } from './musicEventBus.js';
import { logger } from '../../../utils/logger.js';

class MusicService {
  private client: Client | null = null;
  private players = new Map<string, GuildMusicPlayer>();

  public initialize(client: Client): void {
    this.client = client;
    logger.info('[MusicService] Initialisé et synchronisé avec le client Discord.');
  }

  public getPlayer(guildId: string, autoCreate: boolean = true): GuildMusicPlayer | null {
    let player = this.players.get(guildId);
    if (!player && autoCreate) {
      player = new GuildMusicPlayer(guildId, (state) => {
        musicEventBus.emitStateUpdate(state);
      });
      this.players.set(guildId, player);
    }
    return player || null;
  }

  public getState(guildId: string): GuildMusicState {
    const player = this.getPlayer(guildId, true)!;
    return player.getState();
  }

  public async play(
    guild: Guild,
    member: GuildMember | null,
    queryOrUrl: string,
    options?: { playNext?: boolean; channelId?: string }
  ): Promise<{ success: boolean; track?: Track; queuePosition?: number; error?: string }> {
    // 1. Permissions
    const permCheck = MusicPermissionService.canExecuteAction(member, guild.id, 'PLAY');
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    // 2. Salon vocal
    let voiceChannel: VoiceBasedChannel | null = null;
    if (member?.voice.channel) {
      voiceChannel = member.voice.channel;
    } else if (options?.channelId) {
      const ch = guild.channels.cache.get(options.channelId);
      if (ch?.isVoiceBased()) voiceChannel = ch;
    }

    const player = this.getPlayer(guild.id, true)!;

    if (!voiceChannel) {
      // Vérifier si le bot est déjà connecté dans un salon
      const state = player.getState();
      if (!state.voiceChannel) {
        // En mode dashboard, se connecter au premier salon vocal disponible
        const defaultVoice = guild.channels.cache.find(
          (c) => c.isVoiceBased() && c.permissionsFor(guild.members.me!)?.has('Connect')
        );
        if (defaultVoice && defaultVoice.isVoiceBased()) {
          voiceChannel = defaultVoice;
        } else {
          return {
            success: false,
            error: 'Veuillez rejoindre un salon vocal ou spécifier un salon pour lancer la lecture.',
          };
        }
      }
    }

    if (voiceChannel) {
      const connected = await player.connect(voiceChannel);
      if (!connected) {
        return { success: false, error: 'Impossible de se connecter au salon vocal.' };
      }
    }

    // 3. Résolution du titre
    const requestedBy = {
      id: member?.id || 'dashboard',
      tag: member?.user.tag || 'Dashboard User',
      avatar: member?.user.displayAvatarURL?.() || null,
    };

    const track = await musicProviderManager.resolve(queryOrUrl, requestedBy);
    if (!track) {
      return { success: false, error: 'Aucun titre correspondant trouvé.' };
    }

    const settings = musicPersistence.getSettings(guild.id);
    const state = player.getState();

    // 4. Si rien ne joue actuellement, lecture directe
    if (state.status === 'IDLE' && !state.currentTrack) {
      const started = await player.playTrack(track);
      if (started) {
        return { success: true, track, queuePosition: 0 };
      }
      return { success: false, error: 'Échec du lancement audio.' };
    }

    // 5. Sinon, ajout en file d'attente
    if (options?.playNext) {
      player.queue.addNext(track);
      return { success: true, track, queuePosition: 1 };
    }

    const addRes = player.queue.add(track, settings.maxQueueSize, settings.allowDuplicates);
    if (!addRes.success) {
      return { success: false, error: addRes.error };
    }

    return { success: true, track, queuePosition: player.queue.size() };
  }

  public pause(guildId: string, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'PAUSE');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif sur ce serveur.' };

    const ok = player.pause();
    return { success: ok };
  }

  public resume(guildId: string, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'RESUME');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif sur ce serveur.' };

    const ok = player.resume();
    return { success: ok };
  }

  public async skip(guildId: string, member: GuildMember | null): Promise<{ success: boolean; nextTrack?: Track | null; error?: string }> {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'SKIP');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif sur ce serveur.' };

    const nextTrack = await player.skip();
    return { success: true, nextTrack };
  }

  public async previous(guildId: string, member: GuildMember | null): Promise<{ success: boolean; prevTrack?: Track | null; error?: string }> {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'SKIP');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif sur ce serveur.' };

    const prevTrack = await player.previous();
    return { success: true, prevTrack };
  }

  public stop(guildId: string, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'STOP');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif sur ce serveur.' };

    player.stop();
    return { success: true };
  }

  public seek(guildId: string, positionSeconds: number, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'SEEK');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif sur ce serveur.' };

    const ok = player.seek(positionSeconds);
    return { success: ok };
  }

  public setVolume(guildId: string, volume: number, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'VOLUME');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, true)!;
    player.setVolume(volume);
    return { success: true };
  }

  public toggleMute(guildId: string, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'VOLUME');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, true)!;
    player.toggleMute();
    return { success: true };
  }

  public shuffle(guildId: string, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'SHUFFLE');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif.' };

    player.queue.shuffle();
    player.setStateCallback((s) => musicEventBus.emitStateUpdate(s));
    musicEventBus.emitStateUpdate(player.getState());
    return { success: true };
  }

  public setRepeatMode(guildId: string, mode: RepeatMode, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'REPEAT');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, true)!;
    player.queue.setRepeatMode(mode);
    musicEventBus.emitStateUpdate(player.getState());
    return { success: true };
  }

  public reorderQueue(guildId: string, fromIndex: number, toIndex: number, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'REMOVE');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif.' };

    const ok = player.queue.reorder(fromIndex, toIndex);
    if (ok) musicEventBus.emitStateUpdate(player.getState());
    return { success: ok };
  }

  public removeFromQueue(guildId: string, index: number, member: GuildMember | null): { success: boolean; removed?: Track | null; error?: string } {
    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif.' };

    const track = player.queue.getTracks()[index];
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'REMOVE', track?.requestedBy?.id);
    if (!perm.allowed) return { success: false, error: perm.reason };

    const removed = player.queue.remove(index);
    if (removed) musicEventBus.emitStateUpdate(player.getState());
    return { success: !!removed, removed };
  }

  public clearQueue(guildId: string, member: GuildMember | null): { success: boolean; error?: string } {
    const perm = MusicPermissionService.canExecuteAction(member, guildId, 'CLEAR');
    if (!perm.allowed) return { success: false, error: perm.reason };

    const player = this.getPlayer(guildId, false);
    if (!player) return { success: false, error: 'Aucun lecteur actif.' };

    player.queue.clear();
    musicEventBus.emitStateUpdate(player.getState());
    return { success: true };
  }

  public async search(query: string, member: GuildMember | null, limit: number = 8): Promise<Track[]> {
    const requestedBy = {
      id: member?.id || 'search',
      tag: member?.user.tag || 'User',
      avatar: member?.user.displayAvatarURL?.() || null,
    };
    return musicProviderManager.search(query, requestedBy, limit);
  }

  // Playlists
  public getPlaylists(guildId: string): MusicPlaylist[] {
    return musicPersistence.getPlaylists(guildId);
  }

  public createPlaylist(guildId: string, name: string, createdBy: { id: string; tag: string }, initialTracks: Track[] = []): MusicPlaylist {
    const pl: MusicPlaylist = {
      id: `pl-${Date.now().toString(36)}`,
      name,
      guildId,
      createdBy,
      tracks: initialTracks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    musicPersistence.savePlaylist(guildId, pl);
    return pl;
  }

  public deletePlaylist(guildId: string, playlistId: string): boolean {
    return musicPersistence.deletePlaylist(guildId, playlistId);
  }

  public async playPlaylist(guild: Guild, member: GuildMember | null, playlistId: string): Promise<{ success: boolean; count: number; error?: string }> {
    const list = this.getPlaylists(guild.id);
    const pl = list.find((p) => p.id === playlistId);
    if (!pl || pl.tracks.length === 0) {
      return { success: false, count: 0, error: 'Playlist introuvable ou vide.' };
    }

    let count = 0;
    for (let i = 0; i < pl.tracks.length; i++) {
      const t = pl.tracks[i];
      const res = await this.play(guild, member, t.url || t.title);
      if (res.success) count++;
    }

    return { success: count > 0, count };
  }

  // Favorites
  public getFavorites(guildId: string, userId: string): Track[] {
    return musicPersistence.getFavorites(guildId, userId);
  }

  public toggleFavorite(guildId: string, userId: string, track: Track): { isFavorite: boolean; favorites: Track[] } {
    return musicPersistence.toggleFavorite(guildId, userId, track);
  }

  // History & Stats & Settings
  public getHistory(guildId: string): Track[] {
    return musicPersistence.getHistory(guildId);
  }

  public getStats(guildId: string): MusicStats {
    return musicPersistence.getStats(guildId);
  }

  public getSettings(guildId: string): MusicSettings {
    return musicPersistence.getSettings(guildId);
  }

  public updateSettings(guildId: string, patch: Partial<MusicSettings>): MusicSettings {
    return musicPersistence.updateSettings(guildId, patch);
  }
}

export const musicService = new MusicService();
