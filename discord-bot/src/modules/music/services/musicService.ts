import { Client, Guild, GuildMember, VoiceBasedChannel } from 'discord.js';
import { GuildMusicPlayer, IGuildMusicPlayer } from './guildMusicPlayer.js';
import { LavalinkMusicPlayer } from './lavalinkMusicPlayer.js';
import { lavalinkManager } from './lavalinkManager.js';
import { config } from '../../../config.js';
import { GuildMusicState, MusicPlaylist, MusicSettings, MusicStats, RepeatMode, Track } from '../types/music.js';
import { musicPersistence } from '../storage/musicPersistence.js';
import { musicProviderManager } from '../providers/musicProvider.js';
import { describeYtDlpConfig } from '../providers/ytdlpStream.js';
import { MusicPermissionService } from './musicPermissionService.js';
import { musicEventBus } from './musicEventBus.js';
import { musicNotifier } from './musicNotifier.js';
import { voiceStayService } from './voiceStayService.js';
import { logger } from '../../../utils/logger.js';

class MusicService {
  private client: Client | null = null;
  private players = new Map<string, IGuildMusicPlayer>();

  public async initialize(client: Client): Promise<void> {
    this.client = client;
    musicNotifier.initialize(client);
    logger.info(`[MusicService] Initialisé — backend audio : ${config.musicBackend}`);
    if (config.musicBackend === 'lavalink') {
      lavalinkManager.initialize(client);
    } else {
      logger.info(`[MusicService] yt-dlp → ${describeYtDlpConfig()}`);
    }
    await this.restoreQueuesFromDisk(client);
    // Mode 24h/24 (/join) : remet le bot dans son salon au démarrage puis toutes les 30 s si besoin.
    voiceStayService.start(client, (guildId) => this.getPlayer(guildId, true));
  }

  // Restart survival: reload every guild's saved queue into memory, and for
  // a guild that was actually playing/paused (not just idle-with-leftovers),
  // best-effort rejoin its last voice channel and resume the current track
  // FROM THE START (exact-position resume isn't attempted — see the music
  // improvement plan). If the channel is gone or now empty, the queue is
  // still restored in memory so the next /play or dashboard action has it,
  // it just won't auto-rejoin to an empty room.
  private async restoreQueuesFromDisk(client: Client): Promise<void> {
    const states = musicPersistence.getAllQueueStates();
    for (const state of states) {
      try {
        const guild = client.guilds.cache.get(state.guildId);
        if (!guild) continue;

        const player = this.getPlayer(state.guildId, true)!;
        player.queue.restoreFromSnapshot(state.snapshot);

        const hasContent = Boolean(state.snapshot.currentTrack) || state.snapshot.queue.length > 0;
        if (!hasContent) continue;
        if (state.status !== 'PLAYING' && state.status !== 'PAUSED') continue;
        if (!state.voiceChannelId) continue;

        const channel = guild.channels.cache.get(state.voiceChannelId);
        if (!channel || !channel.isVoiceBased()) continue;
        const hasRealMembers = channel.members.some((m) => !m.user.bot);
        if (!hasRealMembers) continue;

        const connected = await player.connect(channel);
        if (!connected) continue;

        const resumeTrack = player.queue.getCurrentTrack() || player.queue.next();
        if (resumeTrack) {
          await player.playTrack(resumeTrack);
          logger.success(`[MusicService] File d'attente restaurée et lecture reprise pour la guilde ${state.guildId}.`);
        }
      } catch (err) {
        logger.warn(`[MusicService] Échec de restauration de la file pour la guilde ${state.guildId} :`, err);
      }
    }
  }

  public getPlayer(guildId: string, autoCreate: boolean = true): IGuildMusicPlayer | null {
    let player = this.players.get(guildId);
    if (!player && autoCreate) {
      const onState = (state: GuildMusicState) => musicEventBus.emitStateUpdate(state);
      player = config.musicBackend === 'lavalink' ? new LavalinkMusicPlayer(guildId, onState) : new GuildMusicPlayer(guildId, onState);
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
    options?: { playNext?: boolean; shuffle?: boolean; channelId?: string; textChannelId?: string | null }
  ): Promise<{ success: boolean; track?: Track; queuePosition?: number; playlistCount?: number; error?: string }> {
    musicNotifier.rememberChannel(guild.id, options?.textChannelId);
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
        // Si la requête provient d'un membre Discord mais qu'il n'est dans aucun salon vocal
        if (member) {
          return {
            success: false,
            error: 'Vous devez impérativement être connecté dans un salon vocal pour lancer la musique.',
          };
        }

        // En mode dashboard externe sans membre explicite, chercher un salon vocal accessible
        // On privilégie le salon où il y a le plus de monde (celui de la personne qui
        // clique sur le site), sinon le premier salon accessible.
        const defaultVoice = guild.channels.cache
          .filter((c) => c.isVoiceBased() && c.permissionsFor(guild.members.me!)?.has('Connect'))
          .sort((x, y) => (y.isVoiceBased() ? y.members.filter((m) => !m.user.bot).size : 0) - (x.isVoiceBased() ? x.members.filter((m) => !m.user.bot).size : 0))
          .first();
        if (defaultVoice && defaultVoice.isVoiceBased()) {
          voiceChannel = defaultVoice;
        } else {
          return {
            success: false,
            error: 'Aucun salon vocal disponible ou accessible pour lancer la lecture.',
          };
        }
      }
    }

    // 3. Résolution du titre — lancée EN PARALLÈLE de la connexion vocale
    // (les deux sont indépendantes : l'une ouvre le socket audio, l'autre
    // interroge l'API du fournisseur). Auparavant séquentiel, ce qui ajoutait
    // le temps de connexion vocale ET le temps de résolution des métadonnées
    // à chaque lecture au lieu du plus long des deux seulement.
    const requestedBy = {
      id: member?.id || 'dashboard',
      tag: member?.user.tag || 'Dashboard User',
      avatar: member?.user.displayAvatarURL?.() || null,
    };

    let connected = true;
    let tracks: Track[];
    if (voiceChannel) {
      [connected, tracks] = await Promise.all([
        player.connect(voiceChannel),
        musicProviderManager.resolveMany(queryOrUrl, requestedBy),
      ]);
    } else {
      tracks = await musicProviderManager.resolveMany(queryOrUrl, requestedBy);
    }

    if (!connected) {
      return { success: false, error: 'Impossible de se connecter au salon vocal.' };
    }
    if (tracks.length === 0) {
      if (/open\.spotify\.com\/(?:[a-z-]+\/)?(?:playlist|album)\//i.test(queryOrUrl)) {
        return {
          success: false,
          error:
            "Impossible de lire cette playlist/album Spotify (privée, vide ou inaccessible). Vérifie qu'elle est publique et réessaie.",
        };
      }
      return { success: false, error: 'Aucun titre correspondant trouvé.' };
    }
    // Mode aléatoire : on mélange la playlist importée (Fisher-Yates) avant de la mettre en file.
    if (options?.shuffle && tracks.length > 1) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }
    const track = tracks[0];
    const isPlaylist = tracks.length > 1;

    const settings = musicPersistence.getSettings(guild.id);
    const state = player.getState();

    // 4. Premier titre : lecture directe si rien ne joue, sinon file d'attente.
    let queuePosition: number;
    if (state.status === 'IDLE' && !state.currentTrack) {
      const startPromise = player.playTrack(track);
      if (config.musicBackend === 'lavalink') {
        // Préparer la source audio peut prendre plusieurs secondes (recherche + flux yt-dlp) : la commande répond
        // au bout de 2,5 s au plus au lieu de rester en « réflexion ». En cas d'échec tardif, le bot le signale
        // dans le salon (musicNotifier) et passe au titre suivant.
        const outcome = await Promise.race([startPromise, new Promise<'pending'>((r) => setTimeout(() => r('pending'), 2500))]);
        if (outcome === false) return { success: false, error: 'Échec du lancement audio.' };
        if (outcome === 'pending') startPromise.catch((err) => logger.warn('[MusicService] Lancement tardif en échec :', err));
      } else if (!(await startPromise)) {
        return { success: false, error: 'Échec du lancement audio.' };
      }
      queuePosition = 0;
    } else if (options?.playNext) {
      player.queue.addNext(track);
      queuePosition = 1;
    } else {
      const addRes = player.queue.add(track, settings.maxQueueSize, settings.allowDuplicates);
      if (!addRes.success) return { success: false, error: addRes.error };
      queuePosition = player.queue.size();
    }

    // 5. Reste de la playlist -> file d'attente (on s'arrête si elle est pleine).
    let queuedFromPlaylist = 0;
    // L'ancienne limite par défaut (100) coupait les grosses playlists : pour un import
    // on autorise jusqu'à 500 titres tant que l'admin n'a pas choisi une valeur plus haute.
    const importCap = settings.maxQueueSize <= 100 ? 500 : settings.maxQueueSize;
    for (let i = 1; i < tracks.length; i++) {
      const addRes = player.queue.add(tracks[i], importCap, settings.allowDuplicates);
      if (!addRes.success) break;
      queuedFromPlaylist += 1;
    }

    return {
      success: true,
      track,
      queuePosition,
      ...(isPlaylist ? { playlistCount: 1 + queuedFromPlaylist } : {}),
    };
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

  // Resolves a Spotify/YouTube playlist or album URL and saves the result as
  // a real, persisted ETHONE playlist — previously `/play <url>` could only
  // queue a collection transiently, with no way to keep it for later.
  public async importPlaylist(
    guildId: string,
    name: string,
    createdBy: { id: string; tag: string },
    sourceUrl: string
  ): Promise<{ success: boolean; playlist?: MusicPlaylist; count: number; error?: string }> {
    const requestedBy = { id: createdBy.id, tag: createdBy.tag, avatar: null };
    const tracks = await musicProviderManager.resolveMany(sourceUrl, requestedBy);
    if (tracks.length === 0) {
      return { success: false, count: 0, error: "Impossible de résoudre cette playlist (lien invalide, ou identifiants Spotify non configurés côté bot)." };
    }
    const playlist = this.createPlaylist(guildId, name, createdBy, tracks);
    return { success: true, playlist, count: tracks.length };
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
