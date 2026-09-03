import { ChannelType, Guild, PermissionFlagsBits, TextChannel } from 'discord.js';
import { securityStorage } from '../storage/securityStorage.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class SecurityEngine {
  // Fenêtres glissantes en mémoire (guildId -> timestamps[])
  private joinsHistory = new Map<string, number[]>();
  private messagesHistory = new Map<string, number[]>();

  // État Raid Mode en mémoire (guildId -> timestamp d'expiration)
  private activeRaidModes = new Map<string, number>();

  public recordJoin(guildId: string): number {
    const now = Date.now();
    let timestamps = this.joinsHistory.get(guildId) || [];
    timestamps = timestamps.filter((t) => now - t <= 60000); // Garder 1 minute
    timestamps.push(now);
    this.joinsHistory.set(guildId, timestamps);
    return timestamps.length;
  }

  public recordMessage(guildId: string): number {
    const now = Date.now();
    let timestamps = this.messagesHistory.get(guildId) || [];
    timestamps = timestamps.filter((t) => now - t <= 60000); // Garder 1 minute
    timestamps.push(now);
    this.messagesHistory.set(guildId, timestamps);
    return timestamps.length;
  }

  public getJoinsInWindow(guildId: string, seconds: number): number {
    const now = Date.now();
    const timestamps = this.joinsHistory.get(guildId) || [];
    return timestamps.filter((t) => now - t <= seconds * 1000).length;
  }

  public getJoinsLastMinute(guildId: string): number {
    return this.getJoinsInWindow(guildId, 60);
  }

  public getMessagesLastMinute(guildId: string): number {
    const now = Date.now();
    const timestamps = this.messagesHistory.get(guildId) || [];
    return timestamps.filter((t) => now - t <= 60000).length;
  }

  public isRaidModeActive(guildId: string): boolean {
    const expires = this.activeRaidModes.get(guildId);
    if (!expires) return false;
    if (Date.now() > expires) {
      this.activeRaidModes.delete(guildId);
      return false;
    }
    return true;
  }

  public activateRaidMode(guild: Guild, durationMinutes = 10): void {
    const expires = Date.now() + durationMinutes * 60 * 1000;
    this.activeRaidModes.set(guild.id, expires);

    logService.log(guild, {
      category: 'moderation',
      type: 'MOD_SANCTION',
      title: '🚨 RAID MODE ACTIVÉ',
      description: `Le mode Raid a été activé sur **${guild.name}** pour une durée de ${durationMinutes} minutes.`,
      color: '#EF4444',
      fields: [
        { name: 'Statut', value: '🔴 Attaque détectée', inline: true },
        { name: 'Durée', value: `${durationMinutes} minutes`, inline: true },
      ],
    });
  }

  // ==========================================
  // SYSTÈME DE LOCKDOWN (VERROUILLAGE D'URGENCE)
  // ==========================================
  public async triggerLockdown(
    guild: Guild,
    durationMinutes: number,
    reason: string
  ): Promise<{ success: boolean; lockedCount: number }> {
    const config = securityStorage.getConfig(guild.id);
    let lockedCount = 0;

    const everyoneRole = guild.roles.everyone;
    const exemptChannels = new Set(config.whitelist.exemptChannelIds);

    for (const [, channel] of guild.channels.cache) {
      if (channel.type === ChannelType.GuildText && !exemptChannels.has(channel.id)) {
        try {
          const textChannel = channel as TextChannel;
          await textChannel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
          });
          lockedCount++;
        } catch (err) {
          logger.error(`[Lockdown] Impossible de verrouiller #${channel.name} :`, err);
        }
      }
    }

    const now = new Date();
    const expires = new Date(now.getTime() + durationMinutes * 60 * 1000);

    securityStorage.updateConfig(guild.id, {
      lockdown: {
        active: true,
        reason,
        activatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      },
    });

    securityStorage.addIncident(guild.id, {
      guildId: guild.id,
      type: 'LOCKDOWN_ACTIVATED',
      severity: 'critical',
      title: '🔒 Verrouillage d’urgence (Lockdown)',
      description: `Le serveur a été verrouillé (${lockedCount} salons). Motif : ${reason}`,
      actionTaken: `Lockdown activé pour ${durationMinutes} min`,
      affectedCount: lockedCount,
      status: 'open',
    });

    await logService.log(guild, {
      category: 'moderation',
      type: 'MOD_SANCTION',
      title: '🔒 LOCKDOWN ACTIVÉ',
      description: `Le serveur a été placé sous verrouillage d'urgence (${lockedCount} salons protégés).`,
      color: '#EF4444',
      fields: [
        { name: 'Motif', value: reason, inline: false },
        { name: 'Salons verrouillés', value: `${lockedCount}`, inline: true },
        { name: 'Expiration', value: expires.toLocaleTimeString('fr-FR'), inline: true },
      ],
    });

    return { success: true, lockedCount };
  }

  public async releaseLockdown(guild: Guild): Promise<{ success: boolean; unlockedCount: number }> {
    const config = securityStorage.getConfig(guild.id);
    let unlockedCount = 0;
    const everyoneRole = guild.roles.everyone;

    for (const [, channel] of guild.channels.cache) {
      if (channel.type === ChannelType.GuildText) {
        try {
          const textChannel = channel as TextChannel;
          await textChannel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: null, // Restauration par défaut
          });
          unlockedCount++;
        } catch (err) {
          logger.error(`[Lockdown] Impossible de déverrouiller #${channel.name} :`, err);
        }
      }
    }

    securityStorage.updateConfig(guild.id, {
      lockdown: {
        active: false,
        reason: null,
        activatedAt: null,
        expiresAt: null,
      },
    });

    await logService.log(guild, {
      category: 'moderation',
      type: 'MOD_SANCTION',
      title: '🔓 LOCKDOWN LEVÉ',
      description: `Le verrouillage d'urgence a été levé. Les permissions normales ont été restaurées.`,
      color: '#10B981',
      fields: [{ name: 'Salons déverrouillés', value: `${unlockedCount}`, inline: true }],
    });

    return { success: true, unlockedCount };
  }
}

export const securityEngine = new SecurityEngine();
