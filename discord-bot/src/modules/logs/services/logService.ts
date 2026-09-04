import { Client, Guild } from 'discord.js';
import { AuditActor, AuditChannel, AuditEvent, AuditModule, AuditSeverity, AuditTarget } from '../types/auditEvent.js';
import { logQueue } from './logQueue.js';
import { PriorityEngine } from './priorityEngine.js';
import { DiscordLogService } from './discordLogService.js';
import { LogRetentionService } from './logRetentionService.js';
import { LogEntry } from '../types/logEvent.js';
import { logStorage } from '../storage/logStorage.js';
import { logger } from '../../../utils/logger.js';

export interface EmitEventParams {
  guildId: string;
  module: AuditModule;
  type: string;
  severity?: AuditSeverity;
  actor: AuditActor;
  target?: AuditTarget;
  channel?: AuditChannel;
  reason?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: AuditEvent['diff'];
  metadata?: Record<string, any>;
  caseId?: number | string;
  incidentId?: string;
  correlationId?: string;
}

export class LogService {
  private client: Client | null = null;

  public initialize(client: Client): void {
    this.client = client;
    DiscordLogService.initialize(client);
    LogRetentionService.startScheduler();
    logger.info('[LogService] Logs & Audit Center 2.0 Engine initialisé.');
  }

  public emit(params: EmitEventParams): AuditEvent {
    // 1. Calcul de la sévérité intelligente
    const calc = PriorityEngine.calculateSeverity({
      guildId: params.guildId,
      module: params.module,
      type: params.type,
      actorId: params.actor.id,
      targetId: params.target?.id,
      metadata: params.metadata,
    });

    const severity: AuditSeverity = params.severity || calc.severity;

    const id = `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const timestamp = new Date().toISOString();

    const event: AuditEvent = {
      id,
      guildId: params.guildId,
      module: params.module,
      type: params.type,
      severity,
      actor: params.actor,
      target: params.target,
      channel: params.channel,
      reason: params.reason,
      before: params.before,
      after: params.after,
      diff: params.diff,
      metadata: {
        ...(params.metadata || {}),
        burstElevated: calc.burstElevated,
      },
      caseId: params.caseId,
      incidentId: params.incidentId,
      correlationId: params.correlationId,
      timestamp,
    };

    // 2. Envoi non-bloquant dans la file asynchrone
    logQueue.enqueue(event);

    // 3. Routage vers salons Discord en tâche de fond (fire-and-forget)
    DiscordLogService.dispatchToDiscord(event).catch((err) => {
      logger.error(`Erreur dispatch Discord log pour ${event.id}:`, err);
    });

    return event;
  }

  // --- Helpers Spécialisés ---

  public security(
    guildId: string,
    type: string,
    options: Omit<EmitEventParams, 'guildId' | 'module' | 'type'>
  ): AuditEvent {
    return this.emit({
      guildId,
      module: 'SECURITY',
      type,
      ...options,
    });
  }

  public moderation(
    guildId: string,
    type: string,
    options: Omit<EmitEventParams, 'guildId' | 'module' | 'type'>
  ): AuditEvent {
    return this.emit({
      guildId,
      module: 'MODERATION',
      type,
      ...options,
    });
  }

  public automod(
    guildId: string,
    type: string,
    options: Omit<EmitEventParams, 'guildId' | 'module' | 'type'>
  ): AuditEvent {
    return this.emit({
      guildId,
      module: 'AUTOMOD',
      type,
      ...options,
    });
  }

  public raid(
    guildId: string,
    type: string,
    options: Omit<EmitEventParams, 'guildId' | 'module' | 'type'>
  ): AuditEvent {
    return this.emit({
      guildId,
      module: 'SECURITY',
      type: `RAID_${type}`,
      ...options,
    });
  }

  public system(
    guildId: string,
    type: string,
    options: Omit<EmitEventParams, 'guildId' | 'module' | 'type'>
  ): AuditEvent {
    return this.emit({
      guildId,
      module: 'SYSTEM',
      type,
      ...options,
    });
  }

  // --- Compatibilité Rétroactive avec les anciens gestionnaires ---
  public async log(
    guild: Guild,
    entryData: Omit<LogEntry, 'id' | 'createdAt' | 'guildId'>
  ): Promise<void> {
    try {
      const moduleMap: Record<string, AuditModule> = {
        members: 'MEMBERS',
        messages: 'MESSAGES',
        roles: 'ROLES',
        channels: 'CHANNELS',
        moderation: 'MODERATION',
        tickets: 'SYSTEM',
        voice: 'VOICE',
        server: 'SERVER',
      };

      const module = moduleMap[entryData.category] || 'SYSTEM';

      this.emit({
        guildId: guild.id,
        module,
        type: entryData.type,
        actor: {
          id: entryData.userId || 'system',
          tag: entryData.userTag || 'Système',
        },
        target: entryData.userId
          ? {
              id: entryData.userId,
              type: 'USER',
              name: entryData.userTag || entryData.userId,
              tag: entryData.userTag || undefined,
            }
          : undefined,
        channel: entryData.channelId
          ? {
              id: entryData.channelId,
              name: entryData.channelName || 'salon',
            }
          : undefined,
        reason: entryData.description || entryData.title,
        metadata: entryData.metadata,
      });

      // Garder l'ancien format synchronisé si nécessaire
      const id = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      logStorage.saveEntry({
        ...entryData,
        id,
        guildId: guild.id,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Erreur rétrocompatible LogService.log :', err);
    }
  }
}

export const logService = new LogService();
