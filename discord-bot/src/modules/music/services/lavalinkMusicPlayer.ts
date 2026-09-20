import { VoiceBasedChannel } from 'discord.js';
import type { Player } from 'shoukaku';
import { GuildMusicState, PlayerStatus, Track, VoiceChannelInfo } from '../types/music.js';
import { MusicQueue } from './musicQueue.js';
import { musicPersistence } from '../storage/musicPersistence.js';
import { musicProviderManager } from '../providers/musicProvider.js';
import { lavalinkManager } from './lavalinkManager.js';
import { logger } from '../../../utils/logger.js';
import { musicNotifier } from './musicNotifier.js';
import type { IGuildMusicPlayer } from './guildMusicPlayer.js';

/**
 * Same public surface as GuildMusicPlayer (native backend) so musicService,
 * the dashboard routes and the slash commands don't know which backend is
 * running. Audio is entirely handled by the Lavalink server.
 */
export class LavalinkMusicPlayer implements IGuildMusicPlayer {
  public readonly guildId: string;
  public readonly queue: MusicQueue;

  private player: Player | null = null;
  private currentVoiceChannel: VoiceChannelInfo | null = null;
  private status: PlayerStatus = 'IDLE';
  private volume = 75;
  private muted = false;
  private previousVolume = 75;
  private position = 0; // ms, from Lavalink playerUpdate
  private positionAt = 0; // Date.now() when `position` was sampled
  private disconnectTimer: NodeJS.Timeout | null = null;
  private onStateChangeCallback?: (state: GuildMusicState) => void;
  private listenersBound = false;
  private lastException = '';
  private fallbackTried = new Set<string>();

  constructor(guildId: string, onStateChange?: (state: GuildMusicState) => void) {
    this.guildId = guildId;
    this.queue = new MusicQueue(guildId);
    this.onStateChangeCallback = onStateChange;
    const settings = musicPersistence.getSettings(guildId);
    this.volume = settings.defaultVolume || 75;
    this.previousVolume = this.volume;
  }

  public setStateCallback(cb: (state: GuildMusicState) => void): void {
    this.onStateChangeCallback = cb;
  }

  private emitState(): void {
    const state = this.getState();
    this.onStateChangeCallback?.(state);
    if (this.status === 'IDLE' && this.queue.isEmpty() && !state.currentTrack) {
      musicPersistence.clearQueueState(this.guildId);
    } else {
      musicPersistence.saveQueueState(this.guildId, this.queue.toSnapshot(), this.currentVoiceChannel?.id || null, this.status);
    }
  }

  private currentPositionSeconds(): number {
    const base = this.position;
    const extra = this.status === 'PLAYING' && this.positionAt ? Date.now() - this.positionAt : 0;
    return Math.max(0, Math.floor((base + extra) / 1000));
  }

  public getState(): GuildMusicState {
    const currentTrack = this.queue.getCurrentTrack();
    return {
      guildId: this.guildId,
      voiceChannel: this.currentVoiceChannel,
      status: this.status,
      currentTrack,
      position: currentTrack ? this.currentPositionSeconds() : 0,
      duration: currentTrack ? currentTrack.duration : 0,
      volume: this.volume,
      muted: this.muted,
      previousVolume: this.previousVolume,
      repeatMode: this.queue.getRepeatMode(),
      shuffle: this.queue.isShuffle(),
      queue: this.queue.getTracks(),
      queueLength: this.queue.size(),
      history: this.queue.getHistory(),
      canSeek: currentTrack ? currentTrack.duration > 0 : false,
      updatedAt: new Date().toISOString(),
    };
  }

  public async connect(channel: VoiceBasedChannel): Promise<boolean> {
    try {
      const player = await lavalinkManager.join(this.guildId, channel.id);
      if (!player) {
        logger.error(`[Lavalink] Impossible de rejoindre ${channel.name} (guild ${this.guildId}) — nœud absent ?`);
        return false;
      }
      this.player = player;
      this.currentVoiceChannel = { id: channel.id, name: channel.name };
      this.bindListeners(player);
      await player.setGlobalVolume(this.muted ? 0 : this.volume).catch((err) => logger.warn(`[Lavalink] setGlobalVolume a échoué (guild ${this.guildId}) :`, err));
      this.cancelDisconnectTimer();
      this.emitState();
      logger.info(`[Lavalink] Connecté à "${channel.name}" (guild ${this.guildId}, ping ${player.ping} ms)`);
      return true;
    } catch (err) {
      logger.error(`[Lavalink] Erreur connexion vocale guild ${this.guildId} :`, err);
      return false;
    }
  }

  private bindListeners(player: Player): void {
    if (this.listenersBound) return;
    this.listenersBound = true;

    player.on('start', (data) => {
      this.status = 'PLAYING';
      this.position = 0;
      this.positionAt = Date.now();
      this.cancelDisconnectTimer();
      logger.info(`[Lavalink] ▶ "${data.track.info.title}" (guild ${this.guildId})`);
      this.emitState();
    });

    player.on('update', (data) => {
      this.position = data.state.position || 0;
      this.positionAt = Date.now();
    });

    player.on('end', (data) => {
      // 'replaced' = we called playTrack again, 'stopped' = we called stop():
      // both are driven by us, only natural ends advance the queue.
      if (data.reason === 'replaced' || data.reason === 'stopped' || data.reason === 'cleanup') return;
      if (data.reason === 'loadFailed') {
        logger.error(`[Lavalink] Chargement impossible pour "${data.track.info.title}" (guild ${this.guildId}).`);
        void this.recoverFromLoadFailure();
        return;
      }
      void this.handleTrackEnd();
    });

    player.on('exception', (data) => {
      logger.error(`[Lavalink] Exception (${data.exception.severity}) guild ${this.guildId} : ${data.exception.message} — ${data.exception.cause}`);
      // Pas de message ici : le 'end' (loadFailed) qui suit tente d'abord un
      // repli SoundCloud et n'alerte que si celui-ci échoue aussi.
      this.lastException = `${data.exception.message}${data.exception.cause ? ` — ${data.exception.cause}` : ''}`;
    });

    player.on('stuck', (data) => {
      logger.warn(`[Lavalink] Lecture bloquée ${data.thresholdMs} ms sur "${data.track.info.title}" (guild ${this.guildId}) — titre suivant.`);
      void this.handleTrackEnd();
    });

    player.on('closed', (data) => {
      logger.warn(`[Lavalink] WebSocket vocal fermé (${data.code}${data.byRemote ? ', par Discord' : ''}) ${data.reason || ''} (guild ${this.guildId})`);
      if (data.code === 4014 || data.code === 4006) {
        // Kicked / channel deleted / session invalid: reflect it in state.
        this.player = null;
        this.listenersBound = false;
        this.currentVoiceChannel = null;
        this.status = 'IDLE';
        this.emitState();
      }
    });
  }

  public async playTrack(track: Track): Promise<boolean> {
    if (!this.player) {
      logger.error(`[Lavalink] playTrack sans connexion vocale (guild ${this.guildId})`);
      return false;
    }
    try {
      const ready = await lavalinkManager.ensureEncoded(track, track.requestedBy);
      if (!ready?.encoded) {
        logger.error(`[Lavalink] Impossible d’encoder "${track.title}" (${track.url}) — titre suivant.`);
        void musicNotifier.error(this.guildId, track.title, "Aucune source Lavalink n'a pu charger ce titre (recherche vide ou refusée).");
        void this.handleTrackEnd();
        return false;
      }
      this.queue.setCurrentTrack(ready);
      this.position = 0;
      this.positionAt = Date.now();
      await this.player.playTrack({ track: { encoded: ready.encoded } });
      await this.player.setGlobalVolume(this.muted ? 0 : this.volume);
      musicPersistence.addHistory(this.guildId, ready);
      this.status = 'PLAYING';
      this.emitState();
      return true;
    } catch (err) {
      logger.error(`[Lavalink] Erreur lecture "${track.title}" guild ${this.guildId} :`, err);
      void this.handleTrackEnd();
      return false;
    }
  }

  /**
   * YouTube a trouvé le titre mais refuse de le streamer (IP de datacenter
   * bloquée, connexion exigée…). On retente une fois sur SoundCloud, qui n'a
   * pas ce blocage ; si ça échoue aussi, on prévient dans le salon et on passe
   * au titre suivant.
   */
  private async recoverFromLoadFailure(): Promise<void> {
    const current = this.queue.getCurrentTrack();
    if (current && (current.source === 'YOUTUBE' || current.source === 'SPOTIFY') && this.player && !this.fallbackTried.has(current.id)) {
      this.fallbackTried.add(current.id);
      if (this.fallbackTried.size > 50) this.fallbackTried.clear();
      const alt = await lavalinkManager.resolveSoundCloudFallback(current, current.requestedBy);
      if (alt?.encoded) {
        try {
          this.queue.setCurrentTrack(alt);
          this.position = 0;
          this.positionAt = Date.now();
          await this.player.playTrack({ track: { encoded: alt.encoded } });
          lavalinkManager.markYoutubeBlocked();
          logger.info(`[Lavalink] Repli SoundCloud pour "${current.title}" (guild ${this.guildId})`);
          void musicNotifier.notice(
            this.guildId,
            current.title,
            "Spotify et YouTube ne fournissent pas l'audio à ce serveur : le titre est joué depuis SoundCloud (même morceau, choisi par durée)."
          );
          return;
        } catch (err) {
          logger.warn('[Lavalink] Repli SoundCloud impossible :', err);
        }
      }
    }
    void musicNotifier.error(this.guildId, current?.title ?? 'Titre inconnu', this.lastException || 'Chargement impossible.');
    void this.handleTrackEnd();
  }

  private async handleTrackEnd(): Promise<void> {
    this.position = 0;
    this.positionAt = 0;
    const nextTrack = this.queue.next();
    if (nextTrack) {
      await this.playTrack(nextTrack);
      return;
    }
    const settings = musicPersistence.getSettings(this.guildId);
    if (settings.autoplay) {
      const history = this.queue.getHistory();
      const last = history[0];
      const query = last ? `${last.artist} ${last.title}`.trim() : 'lofi chill';
      const results = await musicProviderManager.search(query, { id: 'autoplay', tag: 'ETHONE Autoplay' }, 5);
      const candidate = results.find((t) => !history.some((h) => h.id === t.id || h.title === t.title)) || results[0];
      if (candidate) {
        await this.playTrack(candidate);
        return;
      }
    }
    this.status = 'IDLE';
    this.emitState();
    this.scheduleDisconnect();
  }

  public pause(): boolean {
    if (!this.player || this.status !== 'PLAYING') return false;
    this.position = this.currentPositionSeconds() * 1000;
    this.positionAt = 0;
    this.status = 'PAUSED';
    void this.player.setPaused(true).catch((err) => logger.warn('[Lavalink] pause :', err));
    this.emitState();
    return true;
  }

  public resume(): boolean {
    if (!this.player || this.status !== 'PAUSED') return false;
    this.positionAt = Date.now();
    this.status = 'PLAYING';
    void this.player.setPaused(false).catch((err) => logger.warn('[Lavalink] resume :', err));
    this.emitState();
    return true;
  }

  public async skip(): Promise<Track | null> {
    if (!this.player) return null;
    const next = this.queue.next();
    if (next) {
      await this.playTrack(next);
      return next;
    }
    this.stop();
    return null;
  }

  public async previous(): Promise<Track | null> {
    const prev = this.queue.previous();
    if (prev) {
      await this.playTrack(prev);
      return prev;
    }
    return null;
  }

  public stop(): void {
    this.queue.reset();
    void this.player?.stopTrack().catch(() => {});
    this.status = 'IDLE';
    this.position = 0;
    this.positionAt = 0;
    this.emitState();
    this.scheduleDisconnect();
  }

  public seek(positionSeconds: number): boolean {
    const current = this.queue.getCurrentTrack();
    if (!this.player || !current || positionSeconds < 0 || (current.duration > 0 && positionSeconds > current.duration)) return false;
    this.position = positionSeconds * 1000;
    this.positionAt = this.status === 'PLAYING' ? Date.now() : 0;
    void this.player.seekTo(positionSeconds * 1000).catch((err) => logger.warn('[Lavalink] seek :', err));
    this.emitState();
    return true;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(100, vol));
    this.volume = clamped;
    this.muted = clamped === 0;
    void this.player?.setGlobalVolume(clamped).catch((err) => logger.warn('[Lavalink] volume :', err));
    this.emitState();
  }

  public toggleMute(): void {
    if (this.muted) {
      this.volume = this.previousVolume || 75;
      this.muted = false;
    } else {
      this.previousVolume = this.volume;
      this.volume = 0;
      this.muted = true;
    }
    void this.player?.setGlobalVolume(this.volume).catch(() => {});
    this.emitState();
  }

  public disconnect(): void {
    this.cancelDisconnectTimer();
    this.queue.reset();
    void lavalinkManager.leave(this.guildId);
    this.player = null;
    this.listenersBound = false;
    this.currentVoiceChannel = null;
    this.status = 'IDLE';
    this.position = 0;
    this.positionAt = 0;
    this.emitState();
  }

  private scheduleDisconnect(): void {
    this.cancelDisconnectTimer();
    const settings = musicPersistence.getSettings(this.guildId);
    if (!settings.autoDisconnectSeconds || settings.autoDisconnectSeconds <= 0) return;
    this.disconnectTimer = setTimeout(() => {
      if (this.status === 'IDLE' && this.queue.isEmpty()) {
        logger.info(`[Lavalink] Auto-déconnexion après inactivité guild ${this.guildId}`);
        this.disconnect();
      }
    }, settings.autoDisconnectSeconds * 1000);
    this.disconnectTimer.unref();
  }

  private cancelDisconnectTimer(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }
}
