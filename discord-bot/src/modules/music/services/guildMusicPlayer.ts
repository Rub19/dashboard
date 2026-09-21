import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, VoiceBasedChannel } from 'discord.js';
import { GuildMusicState, PlayerStatus, RepeatMode, Track, VoiceChannelInfo } from '../types/music.js';
import { MusicQueue } from './musicQueue.js';
import { musicPersistence } from '../storage/musicPersistence.js';
import { musicProviderManager } from '../providers/musicProvider.js';
import { logger } from '../../../utils/logger.js';

// How long before a track is expected to end that the NEXT track's audio
// resource gets prefetched. Deliberately short (not "as soon as the current
// track starts") — an AudioResource's underlying yt-dlp stream sitting
// unconsumed for a long time is unverified territory here (no live Discord
// voice connection or yt-dlp binary in this environment); ~10s is an
// ordinary amount of idle time for a piped child process, comparable to the
// spawn-then-immediately-consume latency this whole feature already accepts
// today.
export const PREFETCH_LEAD_MS = 10_000;
const MIN_PREFETCH_TRACK_SECONDS = 20;

interface PrefetchedResource {
  trackId: string;
  resource: AudioResource;
}

// Pure so this can be unit-tested without a real timer, player, or track —
// see test_music_v1.ts. Repeat modes are skipped entirely: SONG/QUEUE change
// what "next" even means (queue.next()'s compound logic, like re-pushing the
// finished track for QUEUE mode), and peeking the queue array without
// calling next() can't safely replicate that — falls back to the existing
// synchronous path in those modes, no regression, just no latency win there.
export function shouldPrefetch(track: Pick<Track, 'duration'> | null | undefined, repeatMode: RepeatMode): boolean {
  if (!track) return false;
  if (repeatMode !== 'OFF') return false;
  return track.duration >= MIN_PREFETCH_TRACK_SECONDS;
}

export function prefetchDelayMs(track: Pick<Track, 'duration'>): number {
  return Math.max(0, track.duration * 1000 - PREFETCH_LEAD_MS);
}

/**
 * Backend-agnostic contract shared by the native (@discordjs/voice) and the
 * Lavalink players — everything above this layer (musicService, routes,
 * commands, dashboard) only ever talks to this interface.
 */
export interface IGuildMusicPlayer {
  readonly guildId: string;
  readonly queue: MusicQueue;
  setStateCallback(cb: (state: GuildMusicState) => void): void;
  getState(): GuildMusicState;
  connect(channel: VoiceBasedChannel): Promise<boolean>;
  playTrack(track: Track): Promise<boolean>;
  pause(): boolean;
  resume(): boolean;
  skip(): Promise<Track | null>;
  previous(): Promise<Track | null>;
  stop(): void;
  seek(positionSeconds: number): boolean;
  setVolume(vol: number): void;
  toggleMute(): void;
  disconnect(): void;
}

export class GuildMusicPlayer implements IGuildMusicPlayer {
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

  private prefetchedResource: PrefetchedResource | null = null;
  private prefetchTimer: NodeJS.Timeout | null = null;

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
    const state = this.getState();
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
    // Persisted here (not only from musicService.ts's command wrappers) so a
    // track ending naturally and auto-advancing — driven internally by the
    // AudioPlayer's Idle event, never going through musicService — still
    // gets its queue snapshot saved. Cheap enough: this only fires on real
    // discrete transitions (play/pause/skip/volume/...), never on a per-tick
    // timer.
    if (this.status === 'IDLE' && this.queue.isEmpty() && !state.currentTrack) {
      musicPersistence.clearQueueState(this.guildId);
    } else {
      musicPersistence.saveQueueState(this.guildId, this.queue.toSnapshot(), this.currentVoiceChannel?.id || null, this.status);
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

      let connection = getVoiceConnection(this.guildId);
      if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
        connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: this.guildId,
          adapterCreator: channel.guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: false,
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(connection!, VoiceConnectionStatus.Signalling, 5_000),
              entersState(connection!, VoiceConnectionStatus.Connecting, 5_000),
            ]);
          } catch {
            this.disconnect();
          }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
          this.connection = null;
          this.status = 'IDLE';
          this.currentVoiceChannel = null;
          this.emitState();
        });

        // Diagnostic trail for "joined but silent" reports: every voice
        // connection transition + the UDP/DAVE details once Ready.
        connection.on('stateChange', (oldState, newState) => {
          logger.info(`[MusicPlayer] Voice ${oldState.status} → ${newState.status} (guild ${this.guildId})`);
          if (newState.status === VoiceConnectionStatus.Ready) {
            const net = (newState as any).networking?.state;
            const udp = net?.udp?.remote;
            logger.info(
              `[MusicPlayer] Voice Ready — encryption=${net?.connectionData?.encryptionMode ?? '?'} udp=${udp ? `${udp.ip}:${udp.port}` : '?'} dave=${(newState as any).dave ? 'oui' : 'non'} (guild ${this.guildId})`,
            );
          }
        });
        connection.on('error', (err) => {
          logger.error(`[MusicPlayer] Erreur connexion vocale (guild ${this.guildId}) :`, err);
        });
      }

      this.connection = connection;
      this.initPlayer();

      // Wait for VoiceConnection to reach Ready state to ensure UDP audio socket is open
      try {
        await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
      } catch (readyErr) {
        logger.warn(`[MusicPlayer] Attente connexion Ready expirée (guild ${this.guildId}) :`, readyErr);
      }

      // Re-subscribe player whenever connecting or channel changes
      if (this.connection && this.player) {
        this.connection.subscribe(this.player);
      }

      this.cancelDisconnectTimer();
      this.emitState();
      return true;
    } catch (err) {
      logger.error(`Erreur connexion vocale guild ${this.guildId} :`, err);
      return false;
    }
  }

  private initPlayer(): void {
    if (!this.player) {
      this.player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      this.player.on(AudioPlayerStatus.Playing, () => {
        this.status = 'PLAYING';
        this.playbackStartTime = Date.now();
        this.cancelDisconnectTimer();
        this.schedulePrefetch();
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

      this.player.on('stateChange', (oldState, newState) => {
        logger.info(`[MusicPlayer] Player ${oldState.status} → ${newState.status} (guild ${this.guildId})`);
      });
    }

    if (this.connection && this.player) {
      this.connection.subscribe(this.player);
    }
  }

  private cancelPrefetchTimer(): void {
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
      this.prefetchTimer = null;
    }
  }

  // Schedules a background fetch of the next queued track's audio resource,
  // timed so it lands a few seconds before the current track ends — see
  // PREFETCH_LEAD_MS above for why not sooner. Best-effort only: any failure
  // here just means handleTrackEnd() falls back to fetching fresh, exactly
  // like it does today.
  private schedulePrefetch(): void {
    this.cancelPrefetchTimer();
    const currentTrack = this.queue.getCurrentTrack();
    if (!shouldPrefetch(currentTrack, this.queue.getRepeatMode())) return;

    this.prefetchTimer = setTimeout(() => {
      this.prefetchTimer = null;
      this.prefetchNextTrack().catch((err) => {
        logger.warn(`[MusicPlayer] Échec du préchargement du titre suivant (guild ${this.guildId}) :`, err);
      });
    }, prefetchDelayMs(currentTrack!));
  }

  private async prefetchNextTrack(): Promise<void> {
    const upcoming = this.queue.getTracks()[0];
    if (!upcoming) return;

    const resource = await musicProviderManager.createAudioResource(upcoming);
    if (!resource) return;

    // The queue may have changed while the fetch was in flight (reorder,
    // removal, a manual skip that already moved past this track) — only
    // keep the result if it's still genuinely next.
    if (this.queue.getTracks()[0]?.id !== upcoming.id) return;

    resource.playStream.on('error', (streamErr) => {
      logger.warn(`[MusicPlayer] Erreur sur le flux préchargé pour "${upcoming.title}" (guild ${this.guildId}) :`, streamErr);
      if (this.prefetchedResource?.trackId === upcoming.id) {
        this.prefetchedResource = null;
      }
    });

    this.prefetchedResource = { trackId: upcoming.id, resource };
  }

  public async playTrack(track: Track): Promise<boolean> {
    this.initPlayer();

    // Every call starts a fresh prefetch lifecycle. If a background prefetch
    // already produced this exact track's resource, consume it and skip the
    // synchronous fetch below entirely — that's the actual latency win.
    // Anything else pending (a prefetch for a track we're NOT about to play,
    // e.g. after a manual skip past it) is discarded, never leaked forward.
    this.cancelPrefetchTimer();
    const readyPrefetch = this.prefetchedResource?.trackId === track.id ? this.prefetchedResource.resource : null;
    this.prefetchedResource = null;

    try {
      this.queue.setCurrentTrack(track);
      this.pausedAtPosition = 0;
      this.playbackStartTime = null;

      // Ensure voice connection is ready and player is subscribed
      if (this.connection) {
        if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
          try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
          } catch (readyErr) {
            logger.warn(`[MusicPlayer] Attente connexion Ready avant lecture expirée :`, readyErr);
          }
        }
        if (this.player) {
          this.connection.subscribe(this.player);
        }
      }

      const resource = readyPrefetch || (await musicProviderManager.createAudioResource(track));
      if (!resource || !this.player) {
        logger.error(`[MusicPlayer] Impossible de créer la ressource audio pour "${track.title}"`);
        this.handleTrackEnd();
        return false;
      }

      if (resource.volume) {
        resource.volume.setVolume(this.muted ? 0 : this.volume / 100);
      }

      resource.playStream.on('error', (streamErr) => {
        logger.error(`[MusicPlayer] Erreur flux playStream pour "${track.title}" (guild ${this.guildId}) :`, streamErr);
        // The resource itself never threw (createAudioResource succeeds synchronously even
        // when the underlying stream is unusable, e.g. a missing/broken ffmpeg binary or a
        // dead upstream URL) — without this, playback silently hangs on the errored track
        // forever while the UI keeps reporting "PLAYING". Recover by skipping to the next
        // track (or going IDLE) so a stream failure is never silent.
        this.handleTrackEnd();
      });

      this.player.play(resource);
      logger.info(
        `[MusicPlayer] play() "${track.title}" — url=${track.url} inputType=${resource.playStream?.constructor?.name ?? '?'} subscribers=${this.player.playable.length} (guild ${this.guildId})`,
      );
      // 5 s later: did any audio actually get encoded/sent? playbackDuration
      // stuck at 0 = ffmpeg produced nothing (bad input); >0 with no sound on
      // Discord = the packets leave the box but never arrive (UDP/encryption).
      const probe = setTimeout(() => {
        const st = this.player?.state;
        const res = st && 'resource' in st ? (st as any).resource : null;
        const conn = this.connection?.state.status;
        logger.info(
          `[MusicPlayer] +5s "${track.title}" — player=${st?.status} playbackDuration=${res?.playbackDuration ?? 0}ms readable=${res?.readable ?? '?'} ended=${res?.ended ?? '?'} voice=${conn} (guild ${this.guildId})`,
        );
      }, 5_000);
      probe.unref();
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
    this.cancelPrefetchTimer();
    this.prefetchedResource = null;
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
    this.cancelPrefetchTimer();
    this.prefetchedResource = null;
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
    if (settings.stayChannelId) return; // mode 24h/24 : on reste dans le vocal
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
