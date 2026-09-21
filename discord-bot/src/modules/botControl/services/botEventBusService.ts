import { BotEventBusStats, BotEventTypeStat } from '../types/index.js';

const WINDOW_MS = 60_000;
const MAX_RECENT = 20_000;

interface TypeState {
  stat: BotEventTypeStat;
  /** Horodatages des événements de la dernière minute (sert au débit réel). */
  recent: number[];
}

/**
 * Statistiques des événements de la passerelle, alimentées par le vrai flux d'événements du client
 * (voir handlers/eventHandler.ts). Tout part de zéro au démarrage ; le débit est calculé sur les
 * 60 dernières secondes, et la durée est le temps de distribution synchrone aux écouteurs.
 */
export class BotEventBusService {
  private static instance: BotEventBusService;
  private types: Map<string, TypeState> = new Map();
  private totalProcessed = 0;
  private failedCount = 0;
  private recentAll: number[] = [];

  private constructor() {}

  public static getInstance(): BotEventBusService {
    if (!BotEventBusService.instance) {
      BotEventBusService.instance = new BotEventBusService();
    }
    return BotEventBusService.instance;
  }

  private static trim(list: number[], now: number) {
    let i = 0;
    while (i < list.length && now - list[i] > WINDOW_MS) i++;
    if (i > 0) list.splice(0, i);
    if (list.length > MAX_RECENT) list.splice(0, list.length - MAX_RECENT);
  }

  public recordEvent(type: string, processTimeMs: number, success = true) {
    const now = Date.now();
    this.totalProcessed++;
    if (!success) this.failedCount++;

    let state = this.types.get(type);
    if (!state) {
      state = {
        stat: { eventType: type, totalHandled: 0, perMinute: 0, avgProcessTimeMs: processTimeMs, errorsCount: 0, lastSeenAt: new Date(now).toISOString() },
        recent: [],
      };
      this.types.set(type, state);
    }
    const s = state.stat;
    s.totalHandled++;
    s.avgProcessTimeMs = Math.round(((s.avgProcessTimeMs * 9 + processTimeMs) / 10) * 10) / 10;
    s.lastSeenAt = new Date(now).toISOString();
    if (!success) s.errorsCount++;
    state.recent.push(now);
    this.recentAll.push(now);
    BotEventBusService.trim(state.recent, now);
    BotEventBusService.trim(this.recentAll, now);
  }

  public getEventBusStats(): BotEventBusStats {
    const now = Date.now();
    BotEventBusService.trim(this.recentAll, now);
    const topEvents = Array.from(this.types.values())
      .map((st) => {
        BotEventBusService.trim(st.recent, now);
        return { ...st.stat, perMinute: st.recent.length };
      })
      .sort((a, b) => b.totalHandled - a.totalHandled)
      .slice(0, 20);
    return {
      totalProcessed: this.totalProcessed,
      eventsPerSec: Math.round((this.recentAll.length / (WINDOW_MS / 1000)) * 10) / 10,
      queueDepth: 0,
      failedEventsCount: this.failedCount,
      topEvents,
    };
  }
}
