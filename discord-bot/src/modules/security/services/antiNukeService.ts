import {
  AuditLogEvent,
  Guild,
  GuildAuditLogsEntry,
  GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import { securityStorage } from '../storage/securityStorage.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

interface ActionLogRecord {
  userId: string;
  timestamp: number;
}

class AntiNukeService {
  private channelDeletes = new Map<string, ActionLogRecord[]>();
  private channelCreates = new Map<string, ActionLogRecord[]>();
  private roleDeletes = new Map<string, ActionLogRecord[]>();
  private roleCreates = new Map<string, ActionLogRecord[]>();
  private bans = new Map<string, ActionLogRecord[]>();
  private kicks = new Map<string, ActionLogRecord[]>();

  private isTrusted(guildId: string, member: GuildMember): boolean {
    if (member.id === member.guild.ownerId) return true;
    const config = securityStorage.getConfig(guildId);
    if (config.whitelist.trustedUserIds.includes(member.id)) return true;
    for (const rId of config.whitelist.trustedRoleIds) {
      if (member.roles.cache.has(rId)) return true;
    }
    return false;
  }

  private async fetchAuditLogPerpetrator(
    guild: Guild,
    type: AuditLogEvent
  ): Promise<GuildMember | null> {
    try {
      const logs = await guild.fetchAuditLogs({ limit: 1, type });
      const entry = logs.entries.first();
      if (!entry || !entry.executor) return null;
      // Ignorer si l'exécuteur est le bot lui-même
      if (entry.executor.id === guild.client.user?.id) return null;
      return await guild.members.fetch(entry.executor.id).catch(() => null);
    } catch {
      return null;
    }
  }

  private recordAndCheck(
    map: Map<string, ActionLogRecord[]>,
    guildId: string,
    userId: string,
    maxLimit: number,
    windowSec: number
  ): boolean {
    const now = Date.now();
    let list = map.get(guildId) || [];
    list = list.filter((r) => now - r.timestamp <= windowSec * 1000);
    list.push({ userId, timestamp: now });
    map.set(guildId, list);

    const userActions = list.filter((r) => r.userId === userId).length;
    return userActions >= maxLimit;
  }

  private async applySanctionOnPerpetrator(
    guild: Guild,
    perpetrator: GuildMember,
    reason: string
  ): Promise<string> {
    const config = securityStorage.getConfig(guild.id);
    const action = config.antiNuke.action;

    if (action === 'ban') {
      try {
        await perpetrator.ban({ reason: `Protection Anti-Nuke : ${reason}` });
        return 'Bannissement immédiat';
      } catch (err) {
        logger.error('[AntiNuke] Impossible de bannir le suspect :', err);
      }
    }

    if (action === 'strip_roles') {
      try {
        // Retirer tous les rôles administratifs ou modérateurs
        const rolesToRemove = perpetrator.roles.cache.filter((r) =>
          r.permissions.has(PermissionFlagsBits.Administrator) ||
          r.permissions.has(PermissionFlagsBits.ManageGuild) ||
          r.permissions.has(PermissionFlagsBits.ManageChannels) ||
          r.permissions.has(PermissionFlagsBits.ManageRoles) ||
          r.permissions.has(PermissionFlagsBits.BanMembers) ||
          r.permissions.has(PermissionFlagsBits.KickMembers)
        );

        for (const [, role] of rolesToRemove) {
          await perpetrator.roles.remove(role, `Anti-Nuke : ${reason}`).catch(() => {});
        }
        return `Rôles administratifs retirés (${rolesToRemove.size} rôle(s))`;
      } catch (err) {
        logger.error('[AntiNuke] Impossible de retirer les rôles du suspect :', err);
      }
    }

    return 'Alerte enregistrée';
  }

  // ==========================================
  // Intercepteurs Anti-Nuke
  // ==========================================
  public async handleChannelDelete(guild: Guild): Promise<void> {
    const config = securityStorage.getConfig(guild.id);
    if (!config.antiNuke.enabled) return;

    const perpetrator = await this.fetchAuditLogPerpetrator(
      guild,
      AuditLogEvent.ChannelDelete
    );
    if (!perpetrator || this.isTrusted(guild.id, perpetrator)) return;

    const breached = this.recordAndCheck(
      this.channelDeletes,
      guild.id,
      perpetrator.id,
      config.antiNuke.maxChannelDeletes,
      config.antiNuke.timeWindowSeconds
    );

    if (breached) {
      const sanction = await this.applySanctionOnPerpetrator(
        guild,
        perpetrator,
        'Suppressions massives de salons'
      );

      securityStorage.addIncident(guild.id, {
        guildId: guild.id,
        type: 'MASS_CHANNEL_DELETE',
        severity: 'critical',
        title: '💣 Tentative de Nuke (Salons)',
        description: `Le membre **${perpetrator.user.tag}** a supprimé ${config.antiNuke.maxChannelDeletes}+ salons en ${config.antiNuke.timeWindowSeconds}s.`,
        perpetratorId: perpetrator.id,
        perpetratorTag: perpetrator.user.tag,
        affectedCount: config.antiNuke.maxChannelDeletes,
        actionTaken: sanction,
        status: 'open',
      });

      await logService.log(guild, {
        category: 'moderation',
        type: 'MOD_SANCTION',
        title: '💣 ANTI-NUKE : Salons Massifs Supprimés',
        description: `Action suspecte bloquée sur **${perpetrator.user.tag}**.`,
        color: '#EF4444',
        fields: [
          { name: 'Auteur', value: `${perpetrator.user.tag} (<@${perpetrator.id}>)`, inline: true },
          { name: 'Sanction', value: sanction, inline: true },
        ],
      });
    }
  }

  public async handleRoleDelete(guild: Guild): Promise<void> {
    const config = securityStorage.getConfig(guild.id);
    if (!config.antiNuke.enabled) return;

    const perpetrator = await this.fetchAuditLogPerpetrator(
      guild,
      AuditLogEvent.RoleDelete
    );
    if (!perpetrator || this.isTrusted(guild.id, perpetrator)) return;

    const breached = this.recordAndCheck(
      this.roleDeletes,
      guild.id,
      perpetrator.id,
      config.antiNuke.maxRoleDeletes,
      config.antiNuke.timeWindowSeconds
    );

    if (breached) {
      const sanction = await this.applySanctionOnPerpetrator(
        guild,
        perpetrator,
        'Suppressions massives de rôles'
      );

      securityStorage.addIncident(guild.id, {
        guildId: guild.id,
        type: 'MASS_ROLE_DELETE',
        severity: 'critical',
        title: '💣 Tentative de Nuke (Rôles)',
        description: `Le membre **${perpetrator.user.tag}** a supprimé ${config.antiNuke.maxRoleDeletes}+ rôles en ${config.antiNuke.timeWindowSeconds}s.`,
        perpetratorId: perpetrator.id,
        perpetratorTag: perpetrator.user.tag,
        affectedCount: config.antiNuke.maxRoleDeletes,
        actionTaken: sanction,
        status: 'open',
      });
    }
  }

  public async handleBanAdd(guild: Guild): Promise<void> {
    const config = securityStorage.getConfig(guild.id);
    if (!config.antiNuke.enabled) return;

    const perpetrator = await this.fetchAuditLogPerpetrator(
      guild,
      AuditLogEvent.MemberBanAdd
    );
    if (!perpetrator || this.isTrusted(guild.id, perpetrator)) return;

    const breached = this.recordAndCheck(
      this.bans,
      guild.id,
      perpetrator.id,
      config.antiNuke.maxBans,
      config.antiNuke.timeWindowSeconds
    );

    if (breached) {
      const sanction = await this.applySanctionOnPerpetrator(
        guild,
        perpetrator,
        'Bannissements massifs'
      );

      securityStorage.addIncident(guild.id, {
        guildId: guild.id,
        type: 'MASS_BAN',
        severity: 'critical',
        title: '💣 Mass Ban Détecté',
        description: `Le membre **${perpetrator.user.tag}** a banni ${config.antiNuke.maxBans}+ personnes en ${config.antiNuke.timeWindowSeconds}s.`,
        perpetratorId: perpetrator.id,
        perpetratorTag: perpetrator.user.tag,
        affectedCount: config.antiNuke.maxBans,
        actionTaken: sanction,
        status: 'open',
      });
    }
  }
}

export const antiNukeService = new AntiNukeService();
