/**
 * 🔄 ETHONE DISCORD — RESILIENCE 2.0
 * Reconciliation Engine
 *
 * Tripartite Consistency Engine:
 * - Compares DB Configuration vs Discord Live State vs Dashboard Expectations
 * - Flags Ghost States (e.g. welcome enabled in DB but channel deleted on Discord)
 * - Resolves Unknown States (queries live Discord state to determine outcome)
 * - Handles Partial Success & Compensation Rollback
 */

import { Client } from 'discord.js';
import { guildConfigService } from '../guildConfigService.js';
import { welcomeRepository } from '../../modules/welcome/storage/welcomeRepository.js';
import { logger } from '../../utils/logger.js';
import { healthStatusService } from './healthStatusService.js';

export interface DivergenceItem {
  guildId: string;
  module: string;
  type: 'MISSING_DISCORD_RESOURCE' | 'GHOST_RESOURCE' | 'PERMISSION_MISMATCH' | 'CONFIG_DRIFT';
  resourceId: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedAction: 'AUTO_REPAIR' | 'NOTIFY_USER' | 'DISABLE_MODULE';
}

export interface ReconciliationReport {
  guildId: string;
  timestamp: string;
  divergences: DivergenceItem[];
  repairedCount: number;
  healthy: boolean;
}

export class ReconciliationEngine {
  private static instance: ReconciliationEngine;
  private client: Client | null = null;
  private reports: Map<string, ReconciliationReport> = new Map();

  private constructor() {}

  public static getInstance(): ReconciliationEngine {
    if (!ReconciliationEngine.instance) {
      ReconciliationEngine.instance = new ReconciliationEngine();
    }
    return ReconciliationEngine.instance;
  }

  public setClient(client: Client): void {
    this.client = client;
  }

  /**
   * Run reconciliation for a specific guild
   */
  public async reconcileGuild(guildId: string): Promise<ReconciliationReport> {
    const divergences: DivergenceItem[] = [];
    let repairedCount = 0;

    const guild = this.client?.guilds.cache.get(guildId);
    const config = guildConfigService.getConfig(guildId);

    if (!guild) {
      divergences.push({
        guildId,
        module: 'system',
        type: 'MISSING_DISCORD_RESOURCE',
        resourceId: guildId,
        description: 'Guild is present in DB configuration but bot is not present on the Discord server.',
        severity: 'HIGH',
        suggestedAction: 'NOTIFY_USER',
      });

      return {
        guildId,
        timestamp: new Date().toISOString(),
        divergences,
        repairedCount: 0,
        healthy: false,
      };
    }

    // 1. Reconcile Welcome Channel from real WelcomeRepository
    const welcomeConfig = welcomeRepository.getConfig(guildId);
    if (welcomeConfig.welcome?.enabled && welcomeConfig.welcome.channelId) {
      const channelExists = guild.channels.cache.has(welcomeConfig.welcome.channelId);
      if (!channelExists) {
        divergences.push({
          guildId,
          module: 'welcome',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: welcomeConfig.welcome.channelId,
          description: 'Welcome module is enabled but target channel was deleted from Discord.',
          severity: 'HIGH',
          suggestedAction: 'AUTO_REPAIR',
        });

        // Auto-repair: disable or clear invalid channelId to prevent runtime crash
        welcomeConfig.welcome.channelId = null;
        welcomeConfig.welcome.enabled = false;
        welcomeRepository.saveConfig(guildId, welcomeConfig);
        repairedCount++;
        logger.warn(`[ReconciliationEngine] Auto-repaired welcome module for guild ${guildId}: disabled invalid channel.`);
      }
    }

    // 2. Reconcile Logs Channel
    if (config.logs?.enabled && config.logs.channelId) {
      const channelExists = guild.channels.cache.has(config.logs.channelId);
      if (!channelExists) {
        divergences.push({
          guildId,
          module: 'logs',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: config.logs.channelId,
          description: 'Logs module is enabled but log channel was deleted from Discord.',
          severity: 'HIGH',
          suggestedAction: 'AUTO_REPAIR',
        });

        config.logs.channelId = null;
        config.logs.enabled = false;
        guildConfigService.saveConfig(guildId, config);
        repairedCount++;
      }
    }

    // 3. Reconcile Autoroles
    if (config.welcome?.autoRoleId) {
      const roleExists = guild.roles.cache.has(config.welcome.autoRoleId);
      if (!roleExists) {
        divergences.push({
          guildId,
          module: 'roles',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: config.welcome.autoRoleId,
          description: 'Auto-role configured in DB does not exist on Discord.',
          severity: 'MEDIUM',
          suggestedAction: 'AUTO_REPAIR',
        });

        config.welcome.autoRoleId = null;
        guildConfigService.saveConfig(guildId, config);
        repairedCount++;
      }
    }

    const report: ReconciliationReport = {
      guildId,
      timestamp: new Date().toISOString(),
      divergences,
      repairedCount,
      healthy: divergences.length === 0,
    };

    this.reports.set(guildId, report);
    if (!report.healthy) {
      healthStatusService.setSubsystemState(
        'reconciliation',
        'DEGRADED',
        0,
        `${divergences.length} divergences detected in guild ${guildId}`
      );
    } else {
      healthStatusService.setSubsystemState('reconciliation', 'UP', 0);
    }

    return report;
  }

  /**
   * Resolves an UNKNOWN state by querying Discord live resources
   */
  public async resolveUnknownAction<T>(params: {
    guildId: string;
    checkFn: () => Promise<boolean>;
    onConfirmed: () => Promise<T>;
    onFailed: () => Promise<T>;
  }): Promise<{ status: 'CONFIRMED' | 'ROLLEDBACK'; data: T }> {
    try {
      const actuallyExists = await params.checkFn();
      if (actuallyExists) {
        const res = await params.onConfirmed();
        return { status: 'CONFIRMED', data: res };
      } else {
        const res = await params.onFailed();
        return { status: 'ROLLEDBACK', data: res };
      }
    } catch (err) {
      const res = await params.onFailed();
      return { status: 'ROLLEDBACK', data: res };
    }
  }

  /**
   * Execute with automatic compensation rollback on partial failure
   */
  public async executeWithRollback<T>(
    forwardStep1: () => Promise<any>,
    forwardStep2: () => Promise<T>,
    compensationStep1: () => Promise<void>
  ): Promise<T> {
    const step1Result = await forwardStep1();
    try {
      return await forwardStep2();
    } catch (err: any) {
      logger.error(`[ReconciliationEngine] Step 2 failed (${err.message}). Triggering compensation rollback.`);
      try {
        await compensationStep1();
      } catch (rollbackErr: any) {
        logger.error(`[ReconciliationEngine] Compensation rollback failed!`, rollbackErr);
      }
      throw new Error(`Transaction failed: ${err.message} (Compensation executed)`);
    }
  }

  public getReport(guildId: string): ReconciliationReport | null {
    return this.reports.get(guildId) || null;
  }

  public getAllReports(): ReconciliationReport[] {
    return Array.from(this.reports.values());
  }
}

export const reconciliationEngine = ReconciliationEngine.getInstance();
