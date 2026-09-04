import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, VoiceBasedChannel } from 'discord.js';
import { GuildMusicState, PlayerStatus, Track, VoiceChannelInfo } from '../types/music.js';
import { MusicQueue } from './musicQueue.js';
import { musicPersistence } from '../storage/musicPersistence.js';
import { musicProviderManager } from '../providers/musicProvider.js';
import { logger } from '../../../utils/logger.js';

export class GuildMusicPlayer {
  public readonly guildId: string;
  public readonly queue: MusicQueue;

  private player: AudioPlayer | null = null;
  private connection: VoiceConnection | null = null;
  private currentVoiceChannel: VoiceChannelInfo | null = null;

  private status: PlayerStatus = 'IDLE';
  private volume: number = 75;
  private muted: boolean = false;
  private previousVolume: number = 75;

  private playbackStartTime: number | null = null;
  private pausedAtPosition: number = 0;
  private disconnectTimer: NodeJS.Timeout | null = null;

  private onStateChangeCallback?: (state: GuildMusicState) => void;

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
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getState());
    }
  }

  public getState(): GuildMusicState {
    const currentTrack = this.queue.getCurrentTrack();
    let currentPos = this.pausedAtPosition;

    if (this.status === 'PLAYING' && this.playbackStartTime) {
      currentPos += Math.floor((Date.now() - this.playbackStartTime) / 1000);
      if (currentTrack && currentPos > currentTrack.duration) {
        currentPos = currentTrack.duration;
      }
    }

    return {
      guildId: this.guildId,
      voiceChannel: this.currentVoiceChannel,
      status: this.status,
      currentTrack,
      position: currentPos,
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
      this.currentVoiceChannel = { id: channel.id, name: channel.name };

      const existing = getVoiceConnection(this.guildId);
      if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
        this.connection = existing;
      } else {
        this.connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: this.guildId,
          adapterCreator: channel.guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: false,
        });

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
              entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
            ]);
          } catch {
            this.disconnect();
          }
        });

        this.connection.on(VoiceConnectionStatus.Destroyed, () => {
          this.connection = null;
          this.status = 'IDLE';
          this.currentVoiceChannel = null;
          this.emitState();
        });
      }

      this.initPlayer();
      this.cancelDisconnectTimer();
      this.emitState();
      return true;
    } catch (err) {
      logger.error(`Erreur connexion vocale guild ${this.guildId} :`, err);
      return false;
    }
  }

  private initPlayer(): void {
    if (this.player) return;

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      this.status = 'PLAYING';
      this.playbackStartTime = Date.now();
      this.cancelDisconnectTimer();
      this.emitState();
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      this.status = 'PAUSED';
      if (this.playbackStartTime) {
        this.pausedAtPosition += Math.floor((Date.now() - this.playbackStartTime) / 1000);
        this.playbackStartTime = null;
      }
      this.emitState();
    });

    this.player.on(AudioPlayerStatus.Buffering, () => {
      this.status = 'BUFFERING';
      this.emitState();
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd();
    });

    this.player.on('error', (err) => {
      logger.error(`Erreur AudioPlayer guild ${this.guildId} :`, err);
      this.handleTrackEnd();
    });

    if (this.connection) {
      this.connection.subscribe(this.player);
    }
  }

  public async playTrack(track: Track): Promise<boolean> {
    this.initPlayer();
    try {
      this.queue.setCurrentTrack(track);
      this.pausedAtPosition = 0;
      this.playbackStartTime = null;

      try {
        const resource = await musicProviderManager.createAudioResource(track);
        if (resource && this.player) {
          if (resource.volume) {
            resource.volume.setVolume(this.muted ? 0 : this.volume / 100);
          }
          this.player.play(resource);
        }
      } catch (audioErr) {
        logger.warn(`[MusicPlayer] Audio stream playback notice :`, audioErr);
      }

      musicPersistence.addHistory(this.guildId, track);
      this.status = 'PLAYING';
      this.playbackStartTime = Date.now();
      this.emitState();
      return true;
    } catch (err) {
      logger.error(`Erreur lecture track guild ${this.guildId} :`, err);
      this.handleTrackEnd();
      return false;
    }
  }

  private async handleTrackEnd(): Promise<void> {
    this.playbackStartTime = null;
    this.pausedAtPosition = 0;

    const nextTrack = this.queue.next();
    if (nextTrack) {
      await this.playTrack(nextTrack);
    } else {
      // Vérifier si l'autoplay est actif
      const settings = musicPersistence.getSettings(this.guildId);
      if (settings.autoplay) {
        const history = this.queue.getHistory();
        const lastTrack = history[0];
        const query = lastTrack ? lastTrack.artist || lastTrack.title : 'lofi chill';
        const searchResults = await musicProviderManager.search(
          query,
          { id: 'autoplay', tag: 'ETHONE Autoplay' },
          5
        );
        const candidate = searchResults.find(
          (t) => !history.some((h) => h.id === t.id || h.title === t.title)
        ) || searchResults[0];

        if (candidate) {
          await this.playTrack(candidate);
          return;
        }
      }

      this.status = 'IDLE';
      this.emitState();
      this.scheduleDisconnect();
    }
  }

  public pause(): boolean {
    if (!this.player || this.status !== 'PLAYING') return false;
    this.player.pause();
    return true;
  }

  public resume(): boolean {
    if (!this.player || this.status !== 'PAUSED') return false;
    this.player.unpause();
    this.playbackStartTime = Date.now();
    this.status = 'PLAYING';
    this.emitState();
    return true;
  }

  public async skip(): Promise<Track | null> {
    if (!this.player) return null;
    const next = this.queue.next();
    if (next) {
      await this.playTrack(next);
      return next;
    } else {
      this.stop();
      return null;
    }
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
    if (this.player) {
      this.player.stop();
    }
    this.status = 'IDLE';
    this.pausedAtPosition = 0;
    this.playbackStartTime = null;
    this.emitState();
    this.scheduleDisconnect();
  }

  public seek(positionSeconds: number): boolean {
    const currentTrack = this.queue.getCurrentTrack();
    if (!currentTrack || positionSeconds < 0 || positionSeconds > currentTrack.duration) {
      return false;
    }
    this.pausedAtPosition = positionSeconds;
    if (this.status === 'PLAYING') {
      this.playbackStartTime = Date.now();
    }
    this.emitState();
    return true;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(100, vol));
    this.volume = clamped;
    this.muted = clamped === 0;
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
    this.emitState();
  }

  public disconnect(): void {
    this.cancelDisconnectTimer();
    this.queue.reset();
    if (this.player) {
      this.player.stop();
      this.player = null;
    }
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    this.currentVoiceChannel = null;
    this.status = 'IDLE';
    this.pausedAtPosition = 0;
    this.playbackStartTime = null;
    this.emitState();
  }

  private scheduleDisconnect(): void {
    this.cancelDisconnectTimer();
    const settings = musicPersistence.getSettings(this.guildId);
    if (!settings.autoDisconnectSeconds || settings.autoDisconnectSeconds <= 0) return;

    this.disconnectTimer = setTimeout(() => {
      if (this.status === 'IDLE' && this.queue.isEmpty()) {
        logger.info(`[Music] Auto-déconnexion après inactivité guild ${this.guildId}`);
        this.disconnect();
      }
    }, settings.autoDisconnectSeconds * 1000);
  }

  private cancelDisconnectTimer(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }
}
