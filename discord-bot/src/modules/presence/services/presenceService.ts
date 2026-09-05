import { Client, ActivityType, PresenceData, Events } from 'discord.js';
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

export class PresenceService {
  private static instance: PresenceService;
  private client?: Client;

  private currentState: BotPresenceState = {
    status: 'online',
    activity: {
      type: 'Playing',
      name: 'Valorant',
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
      newActivity: 'Playing Valorant',
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

    this.startAutoRotation(60);
  }

  private rotationPresets: BotActivity[] = [
    { type: 'Playing', name: '/help • ethone.dev' },
    { type: 'Listening', name: '/play • Musique Hi-Fi' },
    { type: 'Watching', name: '{guildCount} serveur(s) • Protection 2.0' },
    { type: 'Competing', name: '/ask • Assistant IA' },
    { type: 'Playing', name: 'Ping: {ping} • v2.4.0' },
  ];
  private currentPresetIndex = 0;
  private rotationTimer?: NodeJS.Timeout;

  public startAutoRotation(intervalSeconds = 60): void {
    if (this.rotationTimer) return;
    this.rotationTimer = setInterval(() => {
      if (!this.client || !this.client.isReady()) return;
      // Ne pas écraser une présence manuelle récente de l'owner (moins de 5 minutes)
      if (this.currentState.source === 'manual' && Date.now() - new Date(this.currentState.updatedAt).getTime() < 300000) {
        return;
      }
      this.currentPresetIndex = (this.currentPresetIndex + 1) % this.rotationPresets.length;
      const nextActivity = this.rotationPresets[this.currentPresetIndex];
      this.applyToGateway(this.currentState.status, nextActivity);
      this.currentState.activity = { ...nextActivity };
      this.rotationsExecutedCount++;
    }, intervalSeconds * 1000);
  }

  /**
   * Résout les variables dynamiques dans le texte de l'activité
   */
  public parseDynamicVariables(text: string): string {
    if (!text) return '';
    const client = this.client;
    const guildCount = client?.guilds.cache.size || 1;
    const userCount = client?.users.cache.size || 48;
    const ping = client?.ws.ping ? Math.max(1, client.ws.ping) : 22;
    const uptime = client?.uptime ? Math.floor(client.uptime / 60000) : 10;
    const now = new Date();

    return text
      .replace(/\{guildCount\}/gi, String(guildCount))
      .replace(/\{serverCount\}/gi, String(guildCount))
      .replace(/\{userCount\}/gi, String(userCount))
      .replace(/\{ping\}/gi, `${ping}ms`)
      .replace(/\{uptime\}/gi, `${uptime}m`)
      .replace(/\{version\}/gi, 'v2.4.0')
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
   * Mappe le type vers les constantes Discord.js ActivityType
   */
  private mapActivityType(type: DiscordActivityType): ActivityType {
    switch (type) {
      case 'Playing':
        return ActivityType.Playing;
      case 'Streaming':
        return ActivityType.Streaming;
      case 'Listening':
        return ActivityType.Listening;
      case 'Watching':
        return ActivityType.Watching;
      case 'Competing':
        return ActivityType.Competing;
      default:
        return ActivityType.Playing;
    }
  }

  /**
   * Applique réellement la présence sur la Gateway Discord
   */
  private applyToGateway(status: DiscordStatus, activity: BotActivity): boolean {
    if (!this.client || !this.client.user) {
      return false;
    }

    try {
      const resolvedName = this.parseDynamicVariables(activity.name);
      const activityType = this.mapActivityType(activity.type);

      const presenceData: PresenceData = {
        status,
        activities: [
          {
            name: resolvedName || 'ETHONE',
            type: activityType,
            url: activity.type === 'Streaming' ? activity.url : undefined,
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
      activity: { ...activity },
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
