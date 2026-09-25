import type { Client, Message, VoiceState } from 'discord.js';
import { statsStorage, dayKey } from '../storage/statsStorage.js';
import { logger } from '../../../utils/logger.js';

interface VoiceSession {
  channelId: string;
  lastCreditAt: number;
}

/**
 * Collecte des statistiques : messages, temps vocal (tous les salons vocaux, pas seulement les salons temporaires),
 * arrivées / départs et nombre de membres. Rien n'est compté tant que le module est désactivé sur le serveur.
 */
class StatsCollector {
  private sessions = new Map<string, VoiceSession>(); // `${guildId}:${userId}`
  private client: Client | null = null;
  private ticker: NodeJS.Timeout | null = null;
  private lastDay = dayKey();

  /** Reprend les sessions vocales déjà en cours au démarrage du bot, puis lance le crédit périodique (chaque minute). */
  public init(client: Client): void {
    this.client = client;
    const now = Date.now();
    for (const guild of client.guilds.cache.values()) {
      for (const state of guild.voiceStates.cache.values()) {
        if (state.channelId && state.member && !state.member.user.bot && state.channelId !== guild.afkChannelId) {
          this.sessions.set(`${guild.id}:${state.id}`, { channelId: state.channelId, lastCreditAt: now });
        }
      }
    }
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = setInterval(() => this.tick(), 60_000);
    this.ticker.unref?.();
    logger.info(`[Stats] Collecte initialisée (${this.sessions.size} session(s) vocale(s) en cours).`);
  }

  public recordMessage(message: Message): void {
    if (!message.guild || message.author.bot) return;
    const guildId = message.guild.id;
    if (!statsStorage.isEnabled(guildId)) return;
    const d = statsStorage.day(guildId);
    const user = message.author.id;
    const channel = message.channelId;
    d.messages += 1;
    d.byHour[new Date().getUTCHours()] += 1;
    d.byChannel[channel] = (d.byChannel[channel] ?? 0) + 1;
    d.byUser[user] = (d.byUser[user] ?? 0) + 1;
    statsStorage.bumpPair(d.byUserChannel, `${user}|${channel}`, 1);
  }

  public recordJoin(guildId: string, memberCount?: number): void {
    if (!statsStorage.isEnabled(guildId)) return;
    const d = statsStorage.day(guildId);
    d.joins += 1;
    if (memberCount !== undefined) d.members = memberCount;
  }

  public recordLeave(guildId: string, memberCount?: number): void {
    if (!statsStorage.isEnabled(guildId)) return;
    const d = statsStorage.day(guildId);
    d.leaves += 1;
    if (memberCount !== undefined) d.members = memberCount;
  }

  /** Crédite `seconds` de vocal à un membre dans un salon (jour courant). */
  public recordVoiceSeconds(guildId: string, channelId: string, userId: string, seconds: number, at = new Date()): void {
    if (seconds <= 0 || !statsStorage.isEnabled(guildId)) return;
    const d = statsStorage.day(guildId, dayKey(at));
    d.voiceSec += seconds;
    d.voiceByHour[at.getUTCHours()] += seconds;
    d.voiceByChannel[channelId] = (d.voiceByChannel[channelId] ?? 0) + seconds;
    d.voiceByUser[userId] = (d.voiceByUser[userId] ?? 0) + seconds;
    statsStorage.bumpPair(d.voiceByUserChannel, `${userId}|${channelId}`, seconds);
  }

  /** À brancher sur VoiceStateUpdate : ouvre, ferme ou déplace la session vocale du membre. */
  public onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;
    const guild = newState.guild;
    const key = `${guild.id}:${member.id}`;
    const now = Date.now();
    const session = this.sessions.get(key);
    const nextChannel = newState.channelId && newState.channelId !== guild.afkChannelId ? newState.channelId : null;

    if (session && session.channelId === nextChannel) return; // mute / deaf / caméra : le salon ne change pas

    if (session) {
      this.recordVoiceSeconds(guild.id, session.channelId, member.id, Math.round((now - session.lastCreditAt) / 1000));
      this.sessions.delete(key);
    }
    if (nextChannel) this.sessions.set(key, { channelId: nextChannel, lastCreditAt: now });
  }

  /** Crédit périodique des sessions en cours (une longue session apparaît au fil de l'eau) + nombre de membres du jour. */
  private tick(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      const [guildId, userId] = key.split(':');
      this.recordVoiceSeconds(guildId, session.channelId, userId, Math.round((now - session.lastCreditAt) / 1000));
      session.lastCreditAt = now;
    }
    if (this.client) {
      for (const guild of this.client.guilds.cache.values()) {
        if (statsStorage.isEnabled(guild.id)) statsStorage.day(guild.id).members = guild.memberCount;
      }
    }
    const today = dayKey();
    if (today !== this.lastDay) {
      this.lastDay = today;
      statsStorage.prune();
    }
  }

  public activeVoiceSessions(): number {
    return this.sessions.size;
  }
}

export const statsCollector = new StatsCollector();
