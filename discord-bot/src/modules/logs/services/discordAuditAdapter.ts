import { AuditLogEvent, Guild, PermissionFlagsBits } from 'discord.js';
import { AuditActor } from '../types/auditEvent.js';
import { logger } from '../../../utils/logger.js';

export class DiscordAuditAdapter {
  /**
   * Tente de retrouver l'exécuteur d'une action administrative dans les Audit Logs natifs Discord.
   */
  public static async resolveExecutor(
    guild: Guild,
    auditType: AuditLogEvent,
    targetId?: string
  ): Promise<{ actor?: AuditActor; reason?: string }> {
    try {
      const me = guild.members.me;
      if (!me || !me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        return {};
      }

      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: auditType,
      });

      const entry = fetchedLogs.entries.first();
      if (!entry) return {};

      // Vérifier que l'entrée est très récente (< 5 secondes)
      const now = Date.now();
      const entryTime = entry.createdTimestamp;
      if (Math.abs(now - entryTime) > 5000) {
        return {};
      }

      // Vérifier la correspondance de cible si fournie
      if (targetId && entry.targetId && entry.targetId !== targetId) {
        return {};
      }

      if (entry.executor) {
        return {
          actor: {
            id: entry.executor.id,
            tag: entry.executor.tag || entry.executor.username || 'Inconnu',
            username: entry.executor.username || undefined,
            avatar: entry.executor.displayAvatarURL(),
            isBot: entry.executor.bot,
          },
          reason: entry.reason || undefined,
        };
      }
    } catch (err) {
      logger.warn(`Impossible de résoudre l'Audit Log pour la guilde ${guild.id}:`, err);
    }

    return {};
  }
}
