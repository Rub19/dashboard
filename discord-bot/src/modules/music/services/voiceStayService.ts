import { PermissionFlagsBits, type Client, type Guild, type VoiceBasedChannel, type VoiceState } from 'discord.js';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import { musicPersistence } from '../storage/musicPersistence.js';
import type { IGuildMusicPlayer } from './guildMusicPlayer.js';
import { lavalinkManager } from './lavalinkManager.js';

type PlayerGetter = (guildId: string) => IGuildMusicPlayer | null;

const CHECK_INTERVAL_MS = 30_000;
const FIRST_CHECK_DELAY_MS = 8_000;
const MAX_BACKOFF_MS = 5 * 60_000;

/**
 * Mode « 24h/24 » : le bot reste dans un salon vocal choisi avec /join et y revient tout seul
 * s'il en est sorti (redémarrage du bot, redémarrage de Lavalink, déplacement/exclusion par un
 * modérateur, coupure réseau…). Le salon est mémorisé dans les réglages musique
 * (`stayChannelId`) ; /disconnect le retire.
 */
class VoiceStayService {
  private timer: NodeJS.Timeout | null = null;
  private client: Client | null = null;
  private getPlayer: PlayerGetter | null = null;

  /** Moment où le bot est arrivé dans son salon actuel (pour « connecté depuis… »). */
  private joinedAt = new Map<string, number>();
  private failures = new Map<string, number>();
  private nextTryAt = new Map<string, number>();
  private busy = new Set<string>();
  private warned = new Set<string>();
  /** Retours programmés après une sortie / un déplacement du bot (un seul en attente par serveur). */
  private pending = new Map<string, NodeJS.Timeout>();

  public start(client: Client, getPlayer: PlayerGetter): void {
    if (this.timer) return;
    this.client = client;
    this.getPlayer = getPlayer;
    setTimeout(() => void this.tick(), FIRST_CHECK_DELAY_MS).unref?.();
    this.timer = setInterval(() => void this.tick(), CHECK_INTERVAL_MS);
    this.timer.unref?.();
    logger.info('[VoiceStay] Surveillance du mode 24h/24 démarrée.');
  }

  /**
   * Mémorise le salon où le bot vient d'arriver (n'importe quel moyen : /join, /play, dashboard…) :
   * à partir de là il y revient tout seul, et ne le quitte que sur /disconnect. Sans effet si un salon
   * est déjà mémorisé (un déplacement voulu passe par /join).
   */
  public remember(guildId: string, channelId: string): void {
    if (this.getStayChannelId(guildId)) return;
    try {
      musicPersistence.updateSettings(guildId, { stayChannelId: channelId });
    } catch (err) {
      logger.warn(`[VoiceStay] Salon non mémorisé (guild ${guildId}) :`, err);
    }
  }

  /**
   * Réaction immédiate quand le bot est exclu ou déplacé (par un modérateur, ou par Discord vers le
   * salon AFK) : il revient dans son salon en ~1,5 s au lieu d'attendre le prochain contrôle (30 s).
   */
  public onVoiceStateUpdate(_old: VoiceState, next: VoiceState): void {
    const client = this.client;
    if (!client?.user || next.id !== client.user.id) return;
    const guild = next.guild;
    const stayId = this.getStayChannelId(guild.id);
    if (!stayId) return;

    if (next.channelId === stayId) {
      if (!this.joinedAt.has(guild.id)) this.markJoined(guild.id);
      return;
    }
    this.joinedAt.delete(guild.id);
    const previous = this.pending.get(guild.id);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      this.pending.delete(guild.id);
      this.nextTryAt.delete(guild.id);
      void this.ensure(guild, stayId).catch((err) => logger.warn(`[VoiceStay] Retour impossible (guild ${guild.id}) :`, err));
    }, 1500);
    timer.unref?.();
    this.pending.set(guild.id, timer);
  }

  public getStayChannelId(guildId: string): string | null {
    return musicPersistence.getSettings(guildId).stayChannelId ?? null;
  }

  public getJoinedAt(guildId: string): number | null {
    return this.joinedAt.get(guildId) ?? null;
  }

  public markJoined(guildId: string): void {
    this.joinedAt.set(guildId, Date.now());
    this.failures.delete(guildId);
    this.nextTryAt.delete(guildId);
  }

  public markLeft(guildId: string): void {
    const timer = this.pending.get(guildId);
    if (timer) clearTimeout(timer);
    this.pending.delete(guildId);
    this.joinedAt.delete(guildId);
    this.failures.delete(guildId);
    this.nextTryAt.delete(guildId);
    this.warned.delete(guildId);
  }

  /** Le bot est-il réellement dans ce salon (et, avec Lavalink, son lecteur existe-t-il) ? */
  public isConnected(guild: Guild, channelId: string): boolean {
    if (guild.members.me?.voice.channelId !== channelId) return false;
    return config.musicBackend !== 'lavalink' || Boolean(lavalinkManager.getPlayer(guild.id));
  }

  private warnOnce(guildId: string, message: string): void {
    if (this.warned.has(guildId)) return;
    this.warned.add(guildId);
    logger.warn(`[VoiceStay] ${message} (guild ${guildId})`);
  }

  private async tick(): Promise<void> {
    const client = this.client;
    if (!client?.isReady()) return;
    for (const guild of client.guilds.cache.values()) {
      const channelId = this.getStayChannelId(guild.id);
      if (!channelId) continue;
      try {
        await this.ensure(guild, channelId);
      } catch (err) {
        logger.warn(`[VoiceStay] Vérification impossible (guild ${guild.id}) :`, err);
      }
    }
  }

  /** Remet le bot dans son salon 24h/24 s'il n'y est pas. Renvoie true s'il y est à la fin. */
  public async ensure(guild: Guild, channelId: string): Promise<boolean> {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) {
      this.warnOnce(guild.id, `Salon 24h/24 introuvable (${channelId}) — refais /join pour en choisir un autre.`);
      return false;
    }
    const vc = channel as VoiceBasedChannel;
    const me = guild.members.me;
    if (!me) return false;

    if (this.isConnected(guild, vc.id)) {
      if (!this.joinedAt.has(guild.id)) this.joinedAt.set(guild.id, Date.now());
      this.failures.delete(guild.id);
      return true;
    }

    const perms = vc.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
      this.warnOnce(guild.id, `Permissions Connexion/Parler manquantes dans « ${vc.name} ».`);
      return false;
    }
    if ((this.nextTryAt.get(guild.id) ?? 0) > Date.now() || this.busy.has(guild.id)) return false;
    if (config.musicBackend === 'lavalink' && !lavalinkManager.ready) return false;

    this.busy.add(guild.id);
    try {
      const player = this.getPlayer?.(guild.id);
      const ok = player ? await player.connect(vc) : false;
      if (ok) {
        this.markJoined(guild.id);
        this.warned.delete(guild.id);
        logger.info(`[VoiceStay] Reconnecté à « ${vc.name} » (guild ${guild.id}).`);
        return true;
      }
      this.fail(guild.id);
      return false;
    } catch (err) {
      logger.warn(`[VoiceStay] Reconnexion à « ${vc.name} » impossible (guild ${guild.id}) :`, err);
      this.fail(guild.id);
      return false;
    } finally {
      this.busy.delete(guild.id);
    }
  }

  private fail(guildId: string): void {
    const n = (this.failures.get(guildId) ?? 0) + 1;
    this.failures.set(guildId, n);
    // 30 s, 60 s, 2 min, 4 min, puis 5 min entre deux essais.
    this.nextTryAt.set(guildId, Date.now() + Math.min(MAX_BACKOFF_MS, CHECK_INTERVAL_MS * 2 ** (n - 1)));
  }
}

export const voiceStayService = new VoiceStayService();
