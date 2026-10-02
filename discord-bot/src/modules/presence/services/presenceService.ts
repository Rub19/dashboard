import { Client, ActivityType, PresenceData, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import {
  BotActivity,
  BotPresenceState,
  DiscordActivityType,
  DiscordStatus,
  PresenceAuditEntry,
  PresenceStats,
} from '../types/index.js';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import { syncEngine } from '../../../services/syncEngine.js';


// Version publiée d'ETHONE pour {version} : package.json du dashboard (même dépôt), sinon celui du bot.
const ETHONE_VERSION = (() => {
  for (const p of [path.resolve(process.cwd(), '..', 'ethone-next', 'package.json'), path.resolve(process.cwd(), 'package.json')]) {
    try {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')).version;
      if (typeof v === 'string') return `v${v}`;
    } catch { /* fichier absent */ }
  }
  return '';
})();
export class PresenceService {
  private static instance: PresenceService;
  private client?: Client;

  private currentState: BotPresenceState = {
    status: 'online',
    activity: {
      type: 'Watching',
      name: 'ETHONE • /help',
    },
    updatedAt: new Date().toISOString(),
    actor: 'System',
    source: 'manual',
    fallbackActive: false,
    rateLimited: false,
    gatewayConnected: true,
    scope: 'global',
  };

  private auditHistory: PresenceAuditEntry[] = [];
  private updateTimestamps: number[] = [];
  private maxUpdatesPerMinute = 5; // Limite Discord Gateway : 5 updates/min par connexion
  private totalChangesCount = 1;
  private rotationsExecutedCount = 0;
  private failedUpdatesCount = 0;
  private rateLimitHitsCount = 0;

  private constructor() {
    this.auditHistory.push({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'System Boot',
      actorId: 'system',
      previousStatus: 'invisible',
      newStatus: 'online',
      previousActivity: 'None',
      newActivity: 'Watching ETHONE • /help',
      reason: 'Initial bot gateway boot',
      scope: 'global',
    });
  }

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  public initialize(client: Client) {
    this.client = client;
    this.currentState.gatewayConnected = client.isReady();

    // Hook gateway ready/reconnect to re-apply presence safely
    client.on(Events.ClientReady, () => {
      this.currentState.gatewayConnected = true;
      this.applyToGateway(this.currentState.status, this.currentState.activity);
    });

    client.on(Events.ShardResume, () => {
      this.currentState.gatewayConnected = true;
      this.applyToGateway(this.currentState.status, this.currentState.activity);
    });

    client.on(Events.ShardDisconnect, () => {
      this.currentState.gatewayConnected = false;
    });

    if (client.isReady()) {
      this.applyToGateway(this.currentState.status, this.currentState.activity);
    }
  }

  /**
   * Résout {guildCount}/{ping}/etc. dans le nom ET l'état d'une activité, pour que ce qui est
   * stocké dans currentState (donc exposé au dashboard) ne garde jamais un template brut —
   * seul applyToGateway() résolvait jusqu'ici, uniquement pour l'appel à Discord.
   */
  private resolveActivity(activity: BotActivity): BotActivity {
    return {
      ...activity,
      name: this.parseDynamicVariables(activity.name),
      state: activity.state ? this.parseDynamicVariables(activity.state) : activity.state,
    };
  }

  /** Texte affiché pour un type d'activité : « Listening to Spotify », « Playing Valorant »…
   * Si le texte commence déjà par un verbe (saisi tel quel dans le dashboard), on ne le double pas. */
  public static formatActivityText(type: DiscordActivityType, name: string, state?: string): string {
    const verb: Record<DiscordActivityType, string> = {
      Playing: 'Playing',
      Streaming: 'Streaming',
      Listening: 'Listening to',
      Watching: 'Watching',
      Competing: 'Competing in',
    };
    const prefix = verb[type] ?? '';
    const already = prefix && name.toLowerCase().startsWith(prefix.toLowerCase());
    const main = already || !prefix ? name : `${prefix} ${name}`;
    return (state ? `${main} • ${state}` : main).slice(0, 128);
  }

  /**
   * Résout les variables dynamiques dans le texte de l'activité
   */
  public parseDynamicVariables(text: string): string {
    if (!text) return '';
    const client = this.client;
    // Valeurs réelles uniquement (avant : 48 membres, 22 ms, v2.4.0… inventés quand l'info manquait).
    const guildCount = client?.guilds.cache.size ?? 0;
    let userCount = 0;
    for (const g of client?.guilds.cache.values() ?? []) userCount += g.memberCount || 0;
    const ping = client && client.ws.ping >= 0 ? `${Math.round(client.ws.ping)}ms` : '—';
    const uptime = client?.uptime ? Math.floor(client.uptime / 60000) : 0;
    const now = new Date();

    return text
      .replace(/\{guildCount\}/gi, String(guildCount))
      .replace(/\{serverCount\}/gi, String(guildCount))
      .replace(/\{userCount\}/gi, userCount.toLocaleString('fr-FR'))
      .replace(/\{ping\}/gi, ping)
      .replace(/\{uptime\}/gi, `${uptime}m`)
      .replace(/\{version\}/gi, ETHONE_VERSION)
      .replace(/\{time\}/gi, now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\{date\}/gi, now.toLocaleDateString('fr-FR'));
  }

  /**
   * Vérifie et applique la protection contre le spam / rate limit Discord Gateway
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    this.updateTimestamps = this.updateTimestamps.filter((t) => now - t < 60000);

    if (this.updateTimestamps.length >= this.maxUpdatesPerMinute) {
      this.rateLimitHitsCount++;
      this.currentState.rateLimited = true;
      logger.warn('[PresenceService] Limite de débit Gateway atteinte (5 updates / 60s). Requête différée.');
      return false;
    }

    this.updateTimestamps.push(now);
    this.currentState.rateLimited = false;
    return true;
  }

  /**
   * Applique réellement la présence sur la Gateway Discord
   */
  private applyToGateway(status: DiscordStatus, activity: BotActivity): boolean {
    if (!this.client || !this.client.user) {
      return false;
    }

    try {
      const resolvedName = this.parseDynamicVariables(activity.name) || 'ETHONE';
      const resolvedState = activity.state ? this.parseDynamicVariables(activity.state) : undefined;

      // Streaming garde le type natif (bouton « Regarder » + lien). Pour les autres, Discord n'affichait
      // que le nom dans la liste des membres (« Spotify » au lieu de « Listening to Spotify ») : on passe
      // par le statut personnalisé, affiché tel quel, avec le verbe écrit par nous.
      const presenceData: PresenceData =
        activity.type === 'Streaming'
          ? {
              status,
              activities: [{ name: resolvedName, type: ActivityType.Streaming, url: activity.url, state: resolvedState }],
            }
          : {
              status,
              activities: [
                {
                  name: 'Custom Status',
                  type: ActivityType.Custom,
                  state: PresenceService.formatActivityText(activity.type, resolvedName, resolvedState),
                },
              ],
            };

      this.client.user.setPresence(presenceData);
      this.currentState.fallbackActive = false;
      return true;
    } catch (err: any) {
      this.failedUpdatesCount++;
      logger.error('[PresenceService] Erreur lors de l\'application de la présence Gateway:', err);

      // Fallback de secours : maintenir au minimum le statut sans faire planter le bot
      try {
        this.client.user.setPresence({ status });
        this.currentState.fallbackActive = true;
      } catch {
        // Silencieux
      }
      return false;
    }
  }

  public clearRateLimits(): void {
    this.updateTimestamps = [];
    this.currentState.rateLimited = false;
  }

  /**
   * Met à jour la présence (manuelle, rotation, schedule, etc.)
   */
  public updatePresence(
    status: DiscordStatus,
    activity: BotActivity,
    actor = 'Bot Owner',
    actorId = config.botOwnerId,
    source: BotPresenceState['source'] = 'manual',
    reason = 'Mise à jour de la présence',
    force = false
  ): { success: boolean; state: BotPresenceState; rateLimited: boolean } {
    if (!force && !this.checkRateLimit()) {
      return { success: false, state: this.currentState, rateLimited: true };
    }

    // Validation spécifique pour Streaming
    if (activity.type === 'Streaming' && (!activity.url || !activity.url.startsWith('http'))) {
      activity.url = 'https://www.twitch.tv/discord';
    }

    const prevStatus = this.currentState.status;
    const prevActivity = `${this.currentState.activity.type} ${this.currentState.activity.name}`;

    const applied = this.applyToGateway(status, activity);

    this.currentState = {
      status,
      activity: this.resolveActivity(activity),
      updatedAt: new Date().toISOString(),
      actor,
      source,
      fallbackActive: !applied,
      rateLimited: false,
      gatewayConnected: this.client?.isReady() ?? true,
      scope: 'global',
    };

    this.totalChangesCount++;

    // Notification au moteur de synchronisation temps réel
    syncEngine.emit(
      'PRESENCE_CHANGED',
      this.currentState,
      undefined,
      source === 'manual' ? 'DASHBOARD' : 'BOT',
      actorId
    );

    // Enregistrement dans l'historique d'audit
    this.auditHistory.unshift({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      actorId,
      previousStatus: prevStatus,
      newStatus: status,
      previousActivity: prevActivity,
      newActivity: `${activity.type} ${activity.name}`,
      reason,
      scope: 'global',
    });

    if (this.auditHistory.length > 50) {
      this.auditHistory.pop();
    }

    return { success: applied, state: this.currentState, rateLimited: false };
  }

  public recordRotationExecuted() {
    this.rotationsExecutedCount++;
  }

  public getCurrentState(): BotPresenceState {
    if (this.client) {
      this.currentState.gatewayConnected = this.client.isReady();
    }
    return { ...this.currentState };
  }

  public getAuditHistory(): PresenceAuditEntry[] {
    return [...this.auditHistory];
  }

  public getStats(): PresenceStats {
    return {
      totalChanges: this.totalChangesCount,
      mostUsedActivity: `${this.currentState.activity.type} ${this.currentState.activity.name}`,
      averageActivityDurationMinutes: 145,
      rotationsExecuted: this.rotationsExecutedCount,
      failedUpdates: this.failedUpdatesCount,
      lastChangedAt: this.currentState.updatedAt,
      rateLimitHits: this.rateLimitHitsCount,
    };
  }
}
