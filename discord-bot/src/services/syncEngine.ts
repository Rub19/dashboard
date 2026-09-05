import { Response } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export type SyncSource = 'DASHBOARD' | 'DISCORD_COMMAND' | 'DISCORD_EVENT' | 'BOT' | 'OWNER' | 'SYSTEM';
export type MutationStatus = 'REQUESTED' | 'SYNCING' | 'CONFIRMED' | 'FAILED' | 'TIMEOUT' | 'PARTIAL';
export type SyncEventType =
  | 'CONFIG_UPDATED'
  | 'DISCORD_EVENT'
  | 'TELEMETRY'
  | 'PRESENCE_CHANGED'
  | 'AUDIT_LOG'
  | 'HEARTBEAT'
  | 'MUTATION_CONFIRMED';

export interface SyncEvent {
  id: string;
  type: SyncEventType;
  guildId?: string;
  source: SyncSource;
  actorId?: string;
  originId?: string; // For anti-loop protection
  version: number;
  timestamp: number;
  payload: any;
}

export interface SyncMutation {
  id: string;
  guildId?: string;
  module: string;
  path: string;
  value: any;
  previousValue?: any;
  source: SyncSource;
  actorId?: string;
  timestamp: number;
  version?: number;
}

export interface SyncAuditEntry {
  id: string;
  timestamp: string;
  guildId?: string;
  module: string;
  action: string;
  actor: string;
  actorId: string;
  source: SyncSource;
  previousValue: any;
  newValue: any;
  status: MutationStatus;
  error?: string;
}

interface SSEClient {
  id: string;
  guildId?: string; // If set, only receives this guild + global events
  res: Response;
  userId?: string;
  isOwner: boolean;
  connectedAt: number;
}

export class DiscordSyncEngine {
  private static instance: DiscordSyncEngine;

  private clients: Map<string, SSEClient> = new Map();
  private auditHistory: SyncAuditEntry[] = [];
  private versionMatrix: Map<string, number> = new Map(); // key: `${guildId || 'global'}:${module}`
  private pendingMutations: Map<string, { mutation: SyncMutation; timer: NodeJS.Timeout; resolve: (res: any) => void }> = new Map();
  private rapidChangeQueues: Map<
    string,
    {
      timer: NodeJS.Timeout | null;
      lastMutation: SyncMutation;
      lastApplyFn: (val: any) => Promise<any> | any;
      resolvers: Array<(res: any) => void>;
    }
  > = new Map();

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): DiscordSyncEngine {
    if (!DiscordSyncEngine.instance) {
      DiscordSyncEngine.instance = new DiscordSyncEngine();
    }
    return DiscordSyncEngine.instance;
  }

  /**
   * Démarre les pulsations SSE toutes les 15 secondes
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        id: `hb_${Date.now()}`,
        type: 'HEARTBEAT',
        source: 'SYSTEM',
        version: 1,
        timestamp: Date.now(),
        payload: {
          uptimeSeconds: process.uptime(),
          connectedClients: this.clients.size,
          timestamp: new Date().toISOString(),
        },
      });
    }, 15000);
    // Don't keep process alive in CLI/tests
    this.heartbeatInterval.unref?.();
  }

  /**
   * Clé de versionnement par scope et module
   */
  private getVersionKey(guildId: string | undefined, module: string): string {
    return `${guildId || 'global'}:${module}`;
  }

  /**
   * Obtient la version incrémentale d'un module
   */
  public getVersion(guildId: string | undefined, module: string): number {
    return this.versionMatrix.get(this.getVersionKey(guildId, module)) || 1;
  }

  /**
   * Incrémente la version après une mutation confirmée
   */
  private incrementVersion(guildId: string | undefined, module: string): number {
    const key = this.getVersionKey(guildId, module);
    const next = (this.versionMatrix.get(key) || 1) + 1;
    this.versionMatrix.set(key, next);
    return next;
  }

  /**
   * Enregistre un nouveau client SSE
   */
  public registerClient(
    clientId: string,
    res: Response,
    guildId?: string,
    userId?: string
  ): void {
    const isOwner = userId === config.botOwnerId;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const client: SSEClient = {
      id: clientId,
      guildId,
      res,
      userId,
      isOwner,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);
    logger.info(`[SyncEngine] Client SSE connecté : ${clientId} (Guild: ${guildId || 'Global'}, Owner: ${isOwner})`);

    // Message d'accueil SSE immédiat
    this.sendToClient(client, {
      id: `init_${Date.now()}`,
      type: 'HEARTBEAT',
      source: 'SYSTEM',
      version: 1,
      timestamp: Date.now(),
      payload: {
        status: 'CONNECTED',
        clientId,
        guildId: guildId || null,
        isOwner,
        authenticated: true,
      },
    });

    res.on('close', () => {
      this.clients.delete(clientId);
      logger.info(`[SyncEngine] Client SSE déconnecté : ${clientId}`);
    });
  }

  /**
   * Envoie un événement à un client spécifique
   */
  private sendToClient(client: SSEClient, event: SyncEvent): void {
    try {
      client.res.write(`id: ${event.id}\n`);
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      logger.error(`[SyncEngine] Erreur d'envoi vers client ${client.id}:`, err);
      this.clients.delete(client.id);
    }
  }

  /**
   * Diffuse un événement à tous les clients éligibles (avec isolation de guilde)
   */
  public broadcast(event: SyncEvent): void {
    for (const client of this.clients.values()) {
      // Si l'événement cible une guilde spécifique, seuls les clients de cette guilde
      // OU les clients globaux (Bot Owner) reçoivent l'événement.
      if (event.guildId) {
        if (client.guildId && client.guildId !== event.guildId) {
          continue; // Isolation stricte : ne pas faire fuiter vers une autre guilde
        }
      }

      this.sendToClient(client, event);
    }
  }

  /**
   * Enregistre et émet un événement externe ou d'interaction Discord
   */
  public emit(
    type: SyncEventType,
    payload: any,
    guildId?: string,
    source: SyncSource = 'DISCORD_EVENT',
    actorId?: string,
    originId?: string
  ): SyncEvent {
    const version = this.incrementVersion(guildId, payload?.module || 'system');
    const event: SyncEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      guildId,
      source,
      actorId,
      originId,
      version,
      timestamp: Date.now(),
      payload,
    };

    this.broadcast(event);
    return event;
  }

  /**
   * Pipeline de mutation bidirectionnelle sécurisée avec réconciliation
   * Dashboard -> SyncEngine -> Bot -> Discord
   */
  public async submitMutation(
    mutation: SyncMutation,
    applyFn: (val: any) => Promise<any> | any
  ): Promise<{
    success: boolean;
    status: MutationStatus;
    version: number;
    mutationId: string;
    result?: any;
    error?: string;
  }> {
    const key = this.getVersionKey(mutation.guildId, mutation.module);

    return new Promise((resolve) => {
      let queue = this.rapidChangeQueues.get(key);
      if (queue?.timer) {
        clearTimeout(queue.timer);
      }

      if (!queue) {
        queue = {
          timer: null,
          lastMutation: mutation,
          lastApplyFn: applyFn,
          resolvers: [resolve],
        };
        this.rapidChangeQueues.set(key, queue);
      } else {
        queue.lastMutation = mutation;
        queue.lastApplyFn = applyFn;
        queue.resolvers.push(resolve);
      }

      queue.timer = setTimeout(async () => {
        const currentQueue = this.rapidChangeQueues.get(key);
        this.rapidChangeQueues.delete(key);
        if (!currentQueue) return;

        const res = await this.executeMutationInternal(
          currentQueue.lastMutation,
          currentQueue.lastApplyFn
        );

        for (const r of currentQueue.resolvers) {
          r(res);
        }
      }, 50);
    });
  }

  private async executeMutationInternal(
    mutation: SyncMutation,
    applyFn: (val: any) => Promise<any> | any
  ): Promise<{
    success: boolean;
    status: MutationStatus;
    version: number;
    mutationId: string;
    result?: any;
    error?: string;
  }> {
    const version = this.incrementVersion(mutation.guildId, mutation.module);

    const auditEntry: SyncAuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      guildId: mutation.guildId,
      module: mutation.module,
      action: `MUTATE_${mutation.path}`,
      actor: mutation.source === 'DASHBOARD' ? 'Dashboard User' : 'Discord Actor',
      actorId: mutation.actorId || 'system',
      source: mutation.source,
      previousValue: mutation.previousValue,
      newValue: mutation.value,
      status: 'SYNCING',
    };

    try {
      // 1. Exécution de l'action dans le bot / DB
      const result = await applyFn(mutation.value);

      auditEntry.status = 'CONFIRMED';
      this.recordAudit(auditEntry);

      // 2. Notification temps réel aux clients avec tag originId anti-boucle
      this.broadcast({
        id: `conf_${Date.now()}`,
        type: 'MUTATION_CONFIRMED',
        guildId: mutation.guildId,
        source: mutation.source,
        actorId: mutation.actorId,
        originId: mutation.id, // Permet au dashboard appelant de savoir que c'est son propre changement
        version,
        timestamp: Date.now(),
        payload: {
          mutationId: mutation.id,
          module: mutation.module,
          path: mutation.path,
          value: mutation.value,
          result,
          status: 'CONFIRMED',
        },
      });

      return {
        success: true,
        status: 'CONFIRMED',
        version,
        mutationId: mutation.id,
        result,
      };
    } catch (err: any) {
      auditEntry.status = 'FAILED';
      auditEntry.error = err.message || 'Erreur d\'application';
      this.recordAudit(auditEntry);

      logger.error(`[SyncEngine] Échec de la mutation ${mutation.id} (${mutation.module}):`, err);

      return {
        success: false,
        status: 'FAILED',
        version,
        mutationId: mutation.id,
        error: err.message || 'Erreur lors de la synchronisation',
      };
    }
  }

  /**
   * Enregistre une entrée d'audit de synchronisation
   */
  private recordAudit(entry: SyncAuditEntry): void {
    this.auditHistory.unshift(entry);
    if (this.auditHistory.length > 500) {
      this.auditHistory = this.auditHistory.slice(0, 500);
    }
  }

  /**
   * Récupère l'historique d'audit filtré
   */
  public getAuditHistory(guildId?: string, limit = 50): SyncAuditEntry[] {
    if (!guildId) {
      return this.auditHistory.slice(0, limit);
    }
    return this.auditHistory
      .filter((e) => !e.guildId || e.guildId === guildId)
      .slice(0, limit);
  }

  /**
   * Nombre de clients connectés
   */
  public getConnectedClientsCount(guildId?: string): number {
    if (!guildId) return this.clients.size;
    let count = 0;
    for (const c of this.clients.values()) {
      if (!c.guildId || c.guildId === guildId) count++;
    }
    return count;
  }

  /**
   * Nettoie les ressources (utile pour les tests et l'arrêt propre)
   */
  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch {}
    }
    this.clients.clear();
  }
}

export const syncEngine = DiscordSyncEngine.getInstance();
