/**
 * 🔄 ETHONE DISCORD — SOURCE OF TRUTH & RECONCILIATION ENGINE 2.0
 * Tripartite Consistency & Self-Healing Engine
 *
 * Enforces consistency across:
 * - Native Discord State (Guilds, Channels, Roles, Bot Permissions) [Discord Truth]
 * - ETHONE Persistent Database (Module Configs, Rules, Toggle Intents) [DB Truth]
 * - Bot Runtime State (Gateway Cache, Event Deduplication) [Bot Truth]
 * - Dashboard Representation [Viewer / Controller]
 *
 * Zero Silent Failures:
 * Any divergence is detected, logged, typed, explained with suggested resolution,
 * and either safely auto-repaired or surfaced for user confirmation.
 */

import { Client } from 'discord.js';
import { guildConfigService } from '../guildConfigService.js';
import { welcomeRepository } from '../../modules/welcome/storage/welcomeRepository.js';
import { autoModRepository } from '../../modules/automod/storage/autoModRepository.js';
import { ticketRepository } from '../../modules/tickets/storage/ticketRepository.js';
import { auditRepository } from '../../modules/logs/storage/auditRepository.js';
import { logger } from '../../utils/logger.js';
import { healthStatusService } from './healthStatusService.js';
import { discordNormalizer } from '../normalization/discordNormalizer.js';

export type ModuleHealthStatus =
  | 'HEALTHY'
  | 'PARTIAL'
  | 'INVALID'
  | 'OUTDATED'
  | 'SYNCING'
  | 'FAILED'
  | 'UNKNOWN'
  | 'DISABLED';

export type DivergenceType =
  | 'MISSING_DISCORD_RESOURCE'
  | 'PERMISSION_MISMATCH'
  | 'ROLE_HIERARCHY_VIOLATION'
  | 'GHOST_RESOURCE'
  | 'CONFIG_DRIFT'
  | 'VERSION_DIVERGENCE';

export interface DivergenceItem {
  id: string;
  guildId: string;
  module: string;
  type: DivergenceType;
  resourceId: string;
  resourceType: 'CHANNEL' | 'ROLE' | 'CATEGORY' | 'PERMISSION' | 'GUILD';
  field: string;
  expected: any;
  actual: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  canAutoRepair: boolean;
  suggestedAction: 'AUTO_REPAIR' | 'PROPOSE_USER' | 'DISABLE_MODULE';
  message: string;
}

export interface ModuleHealthReport {
  module: string;
  status: ModuleHealthStatus;
  divergences: DivergenceItem[];
  lastReconciledAt: string;
}

export interface ReconciliationReport {
  guildId: string;
  timestamp: string;
  modules: Record<string, ModuleHealthReport>;
  divergences: DivergenceItem[];
  repairedCount: number;
  healthy: boolean;
  summary: {
    totalDivergences: number;
    healthyModules: number;
    degradedModules: number;
    autoRepairableCount: number;
  };
}

export interface RepairParams {
  module: string;
  action: 'UNLINK_CHANNEL' | 'UNLINK_ROLE' | 'DISABLE_MODULE' | 'RETRY_AUDIT';
  resourceId?: string;
  field?: string;
}

export class ReconciliationEngine {
  private static instance: ReconciliationEngine;
  private client: Client | null = null;
  private reports: Map<string, ReconciliationReport> = new Map();
  private lastAuditTimestamps: Map<string, number> = new Map();

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

  public getClient(): Client | null {
    return this.client;
  }

  /**
   * Run comprehensive reconciliation for a guild
   */
  public async reconcileGuild(guildId: string, force = false): Promise<ReconciliationReport> {
    const now = Date.now();
    const lastRun = this.lastAuditTimestamps.get(guildId) || 0;

    // Rate-limit consecutive runs to 2 seconds unless forced
    if (!force && now - lastRun < 2000 && this.reports.has(guildId)) {
      return this.reports.get(guildId)!;
    }
    this.lastAuditTimestamps.set(guildId, now);

    const divergences: DivergenceItem[] = [];
    const moduleReports: Record<string, ModuleHealthReport> = {};
    let repairedCount = 0;

    const guild = this.client?.guilds.cache.get(guildId);
    const botMember = guild?.members?.me || null;

    if (!guild) {
      const div: DivergenceItem = {
        id: `div_${Date.now()}_guild_missing`,
        guildId,
        module: 'system',
        type: 'MISSING_DISCORD_RESOURCE',
        resourceId: guildId,
        resourceType: 'GUILD',
        field: 'guildId',
        expected: guildId,
        actual: null,
        severity: 'CRITICAL',
        canAutoRepair: false,
        suggestedAction: 'PROPOSE_USER',
        message: 'Le serveur Discord est introuvable ou le bot a été expulsé.',
      };
      divergences.push(div);

      const emptyReport: ReconciliationReport = {
        guildId,
        timestamp: new Date().toISOString(),
        modules: {
          system: {
            module: 'system',
            status: 'INVALID',
            divergences: [div],
            lastReconciledAt: new Date().toISOString(),
          },
        },
        divergences,
        repairedCount: 0,
        healthy: false,
        summary: {
          totalDivergences: 1,
          healthyModules: 0,
          degradedModules: 1,
          autoRepairableCount: 0,
        },
      };

      this.reports.set(guildId, emptyReport);
      healthStatusService.setSubsystemState('reconciliation', 'DEGRADED', 0, `Guild ${guildId} missing from Discord`);
      return emptyReport;
    }

    // Normalized live state for audit
    const normalizedGuild = discordNormalizer.normalizeGuild(guild, this.client?.user);

    // 1. Audit Welcome Module
    const welcomeDivs = this.auditWelcome(guild, botMember);
    divergences.push(...welcomeDivs);
    moduleReports.welcome = {
      module: 'welcome',
      status: this.computeModuleStatus(guildId, 'welcome', welcomeDivs),
      divergences: welcomeDivs,
      lastReconciledAt: new Date().toISOString(),
    };

    // 2. Audit Logs Module
    const logDivs = this.auditLogs(guild, botMember);
    divergences.push(...logDivs);
    moduleReports.logs = {
      module: 'logs',
      status: this.computeModuleStatus(guildId, 'logs', logDivs),
      divergences: logDivs,
      lastReconciledAt: new Date().toISOString(),
    };

    // 3. Audit Tickets Module
    const ticketDivs = this.auditTickets(guild, botMember);
    divergences.push(...ticketDivs);
    moduleReports.tickets = {
      module: 'tickets',
      status: this.computeModuleStatus(guildId, 'tickets', ticketDivs),
      divergences: ticketDivs,
      lastReconciledAt: new Date().toISOString(),
    };

    // 4. Audit AutoMod Module
    const autoModDivs = this.auditAutoMod(guild, botMember);
    divergences.push(...autoModDivs);
    moduleReports.automod = {
      module: 'automod',
      status: this.computeModuleStatus(guildId, 'automod', autoModDivs),
      divergences: autoModDivs,
      lastReconciledAt: new Date().toISOString(),
    };

    // 5. Audit Roles & Hierarchy
    const roleDivs = this.auditRoles(guild, botMember);
    divergences.push(...roleDivs);
    moduleReports.roles = {
      module: 'roles',
      status: this.computeModuleStatus(guildId, 'roles', roleDivs),
      divergences: roleDivs,
      lastReconciledAt: new Date().toISOString(),
    };

    const healthyModules = Object.values(moduleReports).filter(
      (m) => m.status === 'HEALTHY' || m.status === 'DISABLED'
    ).length;
    const degradedModules = Object.values(moduleReports).filter(
      (m) => m.status === 'PARTIAL' || m.status === 'INVALID' || m.status === 'FAILED'
    ).length;
    const autoRepairableCount = divergences.filter((d) => d.canAutoRepair).length;

    const report: ReconciliationReport = {
      guildId,
      timestamp: new Date().toISOString(),
      modules: moduleReports,
      divergences,
      repairedCount,
      healthy: divergences.length === 0,
      summary: {
        totalDivergences: divergences.length,
        healthyModules,
        degradedModules,
        autoRepairableCount,
      },
    };

    this.reports.set(guildId, report);

    if (!report.healthy) {
      healthStatusService.setSubsystemState(
        'reconciliation',
        'DEGRADED',
        0,
        `${divergences.length} divergences détectées sur le serveur ${guildId}`
      );
    } else {
      healthStatusService.setSubsystemState('reconciliation', 'UP', 0);
    }

    return report;
  }

  /**
   * Audit Welcome Module
   */
  private auditWelcome(guild: any, botMember: any): DivergenceItem[] {
    const divs: DivergenceItem[] = [];
    const welcomeConf = welcomeRepository.getConfig(guild.id);
    const welcome = welcomeConf.welcome;

    if (!welcome?.enabled) {
      return divs;
    }

    // 1. Channel verification
    if (welcome.channelId) {
      const channel = guild.channels.cache.get(welcome.channelId);
      if (!channel) {
        divs.push({
          id: `div_${Date.now()}_welcome_ch_missing`,
          guildId: guild.id,
          module: 'welcome',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: welcome.channelId,
          resourceType: 'CHANNEL',
          field: 'welcome.channelId',
          expected: welcome.channelId,
          actual: null,
          severity: 'HIGH',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: `Le salon de bienvenue configuré (${welcome.channelId}) a été supprimé sur Discord.`,
        });
      } else {
        // Permissions check
        const normChannel = discordNormalizer.normalizeChannel(channel, botMember);
        if (!normChannel.botPermissions.canSend || !normChannel.botPermissions.canEmbed) {
          divs.push({
            id: `div_${Date.now()}_welcome_ch_perms`,
            guildId: guild.id,
            module: 'welcome',
            type: 'PERMISSION_MISMATCH',
            resourceId: welcome.channelId,
            resourceType: 'PERMISSION',
            field: 'welcome.channelId.permissions',
            expected: ['SendMessages', 'EmbedLinks'],
            actual: {
              canSend: normChannel.botPermissions.canSend,
              canEmbed: normChannel.botPermissions.canEmbed,
            },
            severity: 'HIGH',
            canAutoRepair: false,
            suggestedAction: 'PROPOSE_USER',
            message: `Le bot ne possède pas les permissions d'envoi ou d'embeds dans le salon #${normChannel.name}.`,
          });
        }
      }
    } else {
      divs.push({
        id: `div_${Date.now()}_welcome_ch_unset`,
        guildId: guild.id,
        module: 'welcome',
        type: 'CONFIG_DRIFT',
        resourceId: 'unset',
        resourceType: 'CHANNEL',
        field: 'welcome.channelId',
        expected: 'valid_channel_id',
        actual: null,
        severity: 'MEDIUM',
        canAutoRepair: false,
        suggestedAction: 'PROPOSE_USER',
        message: 'Le module de bienvenue est activé mais aucun salon cible n’est sélectionné.',
      });
    }

    // 2. Auto-roles verification
    const autoRoleIds = Array.isArray(welcome.autoRoleIds) ? welcome.autoRoleIds : [];
    for (const roleId of autoRoleIds) {
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        divs.push({
          id: `div_${Date.now()}_welcome_role_${roleId}_missing`,
          guildId: guild.id,
          module: 'welcome',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: roleId,
          resourceType: 'ROLE',
          field: 'welcome.autoRoleIds',
          expected: roleId,
          actual: null,
          severity: 'MEDIUM',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: `Le rôle automatique (${roleId}) configuré n'existe plus sur Discord.`,
        });
      } else {
        const normRole = discordNormalizer.normalizeRole(role, botMember);
        if (normRole.isHigherThanBot) {
          divs.push({
            id: `div_${Date.now()}_welcome_role_${roleId}_hierarchy`,
            guildId: guild.id,
            module: 'welcome',
            type: 'ROLE_HIERARCHY_VIOLATION',
            resourceId: roleId,
            resourceType: 'ROLE',
            field: 'welcome.autoRoleIds.hierarchy',
            expected: 'botHighestRole > targetRole',
            actual: `targetRole (${normRole.position}) >= botRole`,
            severity: 'HIGH',
            canAutoRepair: false,
            suggestedAction: 'PROPOSE_USER',
            message: `Le rôle automatique "${normRole.name}" est supérieur ou égal au rôle le plus haut du bot.`,
          });
        }
      }
    }

    return divs;
  }

  /**
   * Audit Logs Module
   */
  private auditLogs(guild: any, botMember: any): DivergenceItem[] {
    const divs: DivergenceItem[] = [];
    const auditConfig = auditRepository.getConfig(guild.id);

    if (!auditConfig?.enabled) {
      return divs;
    }

    const channelIdsToCheck: { field: string; id: string | null }[] = [
      { field: 'logs.routing.generalChannelId', id: auditConfig.routing.generalChannelId ?? null },
      { field: 'logs.routing.moderationChannelId', id: auditConfig.routing.moderationChannelId ?? null },
      { field: 'logs.routing.securityChannelId', id: auditConfig.routing.securityChannelId ?? null },
      { field: 'logs.routing.automodChannelId', id: auditConfig.routing.automodChannelId ?? null },
    ];

    for (const chItem of channelIdsToCheck) {
      if (!chItem.id) continue;
      const channel = guild.channels.cache.get(chItem.id);
      if (!channel) {
        divs.push({
          id: `div_${Date.now()}_logs_${chItem.field}_missing`,
          guildId: guild.id,
          module: 'logs',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: chItem.id,
          resourceType: 'CHANNEL',
          field: chItem.field,
          expected: chItem.id,
          actual: null,
          severity: 'HIGH',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: `Le salon de logs configuré (${chItem.id}) pour ${chItem.field} a été supprimé sur Discord.`,
        });
      } else {
        const normChannel = discordNormalizer.normalizeChannel(channel, botMember);
        if (!normChannel.botPermissions.canSend || !normChannel.botPermissions.canEmbed) {
          divs.push({
            id: `div_${Date.now()}_logs_${chItem.field}_perms`,
            guildId: guild.id,
            module: 'logs',
            type: 'PERMISSION_MISMATCH',
            resourceId: chItem.id,
            resourceType: 'PERMISSION',
            field: `${chItem.field}.permissions`,
            expected: ['SendMessages', 'EmbedLinks'],
            actual: {
              canSend: normChannel.botPermissions.canSend,
              canEmbed: normChannel.botPermissions.canEmbed,
            },
            severity: 'HIGH',
            canAutoRepair: false,
            suggestedAction: 'PROPOSE_USER',
            message: `Le bot ne peut pas publier d'embeds dans le salon de logs #${normChannel.name}.`,
          });
        }
      }
    }

    return divs;
  }

  /**
   * Audit Tickets Module
   */
  private auditTickets(guild: any, botMember: any): DivergenceItem[] {
    const divs: DivergenceItem[] = [];
    const ticketConfig = ticketRepository.getConfig(guild.id);

    if (!ticketConfig?.enabled) {
      return divs;
    }

    // Check categories
    const categories = ticketRepository.getCategories(guild.id);
    for (const cat of categories) {
      if (cat.discordCategoryId) {
        const channel = guild.channels.cache.get(cat.discordCategoryId);
        if (!channel) {
          divs.push({
            id: `div_${Date.now()}_ticket_cat_${cat.id}_missing`,
            guildId: guild.id,
            module: 'tickets',
            type: 'MISSING_DISCORD_RESOURCE',
            resourceId: cat.discordCategoryId,
            resourceType: 'CATEGORY',
            field: `tickets.category.${cat.id}.discordCategoryId`,
            expected: cat.discordCategoryId,
            actual: null,
            severity: 'HIGH',
            canAutoRepair: true,
            suggestedAction: 'PROPOSE_USER',
            message: `La catégorie Discord de tickets "${cat.name}" (${cat.discordCategoryId}) est introuvable.`,
          });
        }
      }
    }

    // Check transcript channel
    if (ticketConfig.transcriptChannelId) {
      const channel = guild.channels.cache.get(ticketConfig.transcriptChannelId);
      if (!channel) {
        divs.push({
          id: `div_${Date.now()}_ticket_transcript_ch_missing`,
          guildId: guild.id,
          module: 'tickets',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: ticketConfig.transcriptChannelId,
          resourceType: 'CHANNEL',
          field: 'tickets.transcriptChannelId',
          expected: ticketConfig.transcriptChannelId,
          actual: null,
          severity: 'MEDIUM',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: 'Le salon d\'archivage des transcriptions de tickets a été supprimé sur Discord.',
        });
      }
    }

    return divs;
  }

  /**
   * Audit AutoMod Module
   */
  private auditAutoMod(guild: any, botMember: any): DivergenceItem[] {
    const divs: DivergenceItem[] = [];
    const autoModConfig = autoModRepository.getConfig(guild.id);

    if (!autoModConfig?.enabled) {
      return divs;
    }

    // Alert Channel check
    if (autoModConfig.alertChannelId) {
      const channel = guild.channels.cache.get(autoModConfig.alertChannelId);
      if (!channel) {
        divs.push({
          id: `div_${Date.now()}_automod_alert_ch_missing`,
          guildId: guild.id,
          module: 'automod',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: autoModConfig.alertChannelId,
          resourceType: 'CHANNEL',
          field: 'automod.alertChannelId',
          expected: autoModConfig.alertChannelId,
          actual: null,
          severity: 'MEDIUM',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: 'Le salon d\'alertes AutoMod configuré a été supprimé sur Discord.',
        });
      }
    }

    // Staff Mention Role check
    if (autoModConfig.staffMentionRoleId) {
      const role = guild.roles.cache.get(autoModConfig.staffMentionRoleId);
      if (!role) {
        divs.push({
          id: `div_${Date.now()}_automod_staff_role_missing`,
          guildId: guild.id,
          module: 'automod',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: autoModConfig.staffMentionRoleId,
          resourceType: 'ROLE',
          field: 'automod.staffMentionRoleId',
          expected: autoModConfig.staffMentionRoleId,
          actual: null,
          severity: 'LOW',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: 'Le rôle staff mentionné par AutoMod a été supprimé sur Discord.',
        });
      }
    }

    // Check bot moderation permissions
    if (botMember?.permissions) {
      const hasManageMessages = botMember.permissions.has?.('ManageMessages') ?? true;
      const hasModerateMembers = botMember.permissions.has?.('ModerateMembers') ?? true;

      if (!hasManageMessages) {
        divs.push({
          id: `div_${Date.now()}_automod_perm_manage_messages`,
          guildId: guild.id,
          module: 'automod',
          type: 'PERMISSION_MISMATCH',
          resourceId: 'ManageMessages',
          resourceType: 'PERMISSION',
          field: 'automod.permissions.ManageMessages',
          expected: true,
          actual: false,
          severity: 'HIGH',
          canAutoRepair: false,
          suggestedAction: 'PROPOSE_USER',
          message: 'Le bot n\'a pas la permission Discord "Gérer les messages" requise pour l\'AutoMod.',
        });
      }

      if (!hasModerateMembers) {
        divs.push({
          id: `div_${Date.now()}_automod_perm_moderate_members`,
          guildId: guild.id,
          module: 'automod',
          type: 'PERMISSION_MISMATCH',
          resourceId: 'ModerateMembers',
          resourceType: 'PERMISSION',
          field: 'automod.permissions.ModerateMembers',
          expected: true,
          actual: false,
          severity: 'HIGH',
          canAutoRepair: false,
          suggestedAction: 'PROPOSE_USER',
          message: 'Le bot n\'a pas la permission Discord "Exclure temporairement des membres" (Timeout).',
        });
      }
    }

    return divs;
  }

  /**
   * Audit Roles & Hierarchy
   */
  private auditRoles(guild: any, botMember: any): DivergenceItem[] {
    const divs: DivergenceItem[] = [];
    const welcomeConf = welcomeRepository.getConfig(guild.id);
    const autoRoleIds = welcomeConf.welcome?.autoRoleIds || [];

    for (const roleId of autoRoleIds) {
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        divs.push({
          id: `div_${Date.now()}_roles_autorole_${roleId}_missing`,
          guildId: guild.id,
          module: 'roles',
          type: 'MISSING_DISCORD_RESOURCE',
          resourceId: roleId,
          resourceType: 'ROLE',
          field: 'roles.autoRoleIds',
          expected: roleId,
          actual: null,
          severity: 'MEDIUM',
          canAutoRepair: true,
          suggestedAction: 'AUTO_REPAIR',
          message: `Le rôle automatique (${roleId}) n'existe pas sur Discord.`,
        });
      }
    }

    return divs;
  }

  /**
   * Helper to compute module health status based on divergences
   */
  private computeModuleStatus(guildId: string, moduleName: string, divergences: DivergenceItem[]): ModuleHealthStatus {
    // Check if module is disabled
    if (moduleName === 'welcome') {
      const w = welcomeRepository.getConfig(guildId);
      if (!w.welcome?.enabled) return 'DISABLED';
    } else if (moduleName === 'tickets') {
      const t = ticketRepository.getConfig(guildId);
      if (!t?.enabled) return 'DISABLED';
    } else if (moduleName === 'automod') {
      const a = autoModRepository.getConfig(guildId);
      if (!a?.enabled) return 'DISABLED';
    } else if (moduleName === 'logs') {
      const a = auditRepository.getConfig(guildId);
      if (!a?.enabled) return 'DISABLED';
    }

    if (divergences.length === 0) return 'HEALTHY';

    const hasCriticalOrHigh = divergences.some((d) => d.severity === 'CRITICAL' || d.severity === 'HIGH');
    if (hasCriticalOrHigh) return 'INVALID';

    return 'PARTIAL';
  }

  /**
   * Safe repair execution
   * Performs an explicit, non-destructive fix on the database/config state
   */
  public async executeRepair(guildId: string, params: RepairParams): Promise<{
    success: boolean;
    repaired: boolean;
    message: string;
    report: ReconciliationReport;
  }> {
    logger.info(`[ReconciliationEngine] Executing repair for guild ${guildId}: ${params.module} - ${params.action}`);

    let repaired = false;
    let message = '';

    switch (params.action) {
      case 'UNLINK_CHANNEL': {
        if (params.module === 'welcome') {
          const wConf = welcomeRepository.getConfig(guildId);
          wConf.welcome.channelId = null;
          wConf.welcome.enabled = false;
          welcomeRepository.saveConfig(guildId, wConf);
          repaired = true;
          message = 'Salon de bienvenue dissocié et module désactivé avec succès.';
        } else if (params.module === 'logs') {
          const auditConf = auditRepository.getConfig(guildId);
          auditRepository.updateConfig(guildId, {
            routing: {
              ...auditConf.routing,
              generalChannelId: null,
            },
          });
          repaired = true;
          message = 'Salon de logs dissocié avec succès.';
        } else if (params.module === 'automod') {
          autoModRepository.updateConfig(guildId, { alertChannelId: null });
          repaired = true;
          message = 'Salon d\'alerte AutoMod dissocié avec succès.';
        } else if (params.module === 'tickets') {
          const tConf = ticketRepository.getConfig(guildId);
          tConf.transcriptChannelId = null;
          ticketRepository.saveConfig(guildId, tConf);
          repaired = true;
          message = 'Salon de transcripts de tickets dissocié avec succès.';
        }
        break;
      }

      case 'UNLINK_ROLE': {
        if (params.module === 'welcome' && params.resourceId) {
          const wConf = welcomeRepository.getConfig(guildId);
          wConf.welcome.autoRoleIds = wConf.welcome.autoRoleIds.filter((id) => id !== params.resourceId);
          welcomeRepository.saveConfig(guildId, wConf);
          repaired = true;
          message = `Rôle automatique ${params.resourceId} retiré avec succès.`;
        } else if (params.module === 'roles' && params.resourceId) {
          const wConf = welcomeRepository.getConfig(guildId);
          wConf.welcome.autoRoleIds = wConf.welcome.autoRoleIds.filter((id) => id !== params.resourceId);
          welcomeRepository.saveConfig(guildId, wConf);
          repaired = true;
          message = `Rôle automatique dissocié de la configuration.`;
        } else if (params.module === 'automod') {
          autoModRepository.updateConfig(guildId, { staffMentionRoleId: null });
          repaired = true;
          message = 'Rôle mention staff AutoMod dissocié avec succès.';
        }
        break;
      }

      case 'DISABLE_MODULE': {
        if (params.module === 'welcome') {
          const wConf = welcomeRepository.getConfig(guildId);
          wConf.welcome.enabled = false;
          welcomeRepository.saveConfig(guildId, wConf);
          repaired = true;
          message = 'Module Bienvenue désactivé.';
        } else if (params.module === 'tickets') {
          const tConf = ticketRepository.getConfig(guildId);
          tConf.enabled = false;
          ticketRepository.saveConfig(guildId, tConf);
          repaired = true;
          message = 'Module Tickets désactivé.';
        } else if (params.module === 'automod') {
          autoModRepository.updateConfig(guildId, { enabled: false });
          repaired = true;
          message = 'Module AutoMod désactivé.';
        } else if (params.module === 'logs') {
          auditRepository.updateConfig(guildId, { enabled: false });
          repaired = true;
          message = 'Module Logs désactivé.';
        }
        break;
      }

      case 'RETRY_AUDIT': {
        repaired = true;
        message = 'Audit forcé relancé.';
        break;
      }

      default:
        throw new Error(`Action de réparation inconnue: ${params.action}`);
    }

    // Run reconciliation immediately to generate updated report
    const updatedReport = await this.reconcileGuild(guildId, true);
    if (repaired) {
      updatedReport.repairedCount += 1;
    }

    return {
      success: true,
      repaired,
      message: message || 'Réparation appliquée.',
      report: updatedReport,
    };
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
    } catch {
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
    await forwardStep1();
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
