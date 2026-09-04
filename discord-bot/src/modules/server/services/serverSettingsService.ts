import { Client, Guild } from 'discord.js';
import { ServerSettingsData } from '../types/index.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ServerSettingsService {
  /**
   * Retrieves real Discord server settings.
   */
  public static getSettings(client: Client, guildId: string): ServerSettingsData | null {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    return {
      id: guild.id,
      name: guild.name,
      description: guild.description || null,
      icon: guild.iconURL(),
      banner: guild.bannerURL(),
      verificationLevel: guild.verificationLevel,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      explicitContentFilter: guild.explicitContentFilter,
      afkChannelId: guild.afkChannelId,
      afkTimeout: guild.afkTimeout,
      systemChannelId: guild.systemChannelId,
      rulesChannelId: guild.rulesChannelId,
      publicUpdatesChannelId: guild.publicUpdatesChannelId,
      preferredLocale: guild.preferredLocale,
      premiumTier: guild.premiumTier,
      premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
      vanityURLCode: guild.vanityURLCode,
    };
  }

  /**
   * Updates real Discord server settings.
   */
  public static async updateSettings(
    client: Client,
    guildId: string,
    payload: {
      name?: string;
      description?: string | null;
      verificationLevel?: number;
      defaultMessageNotifications?: number;
      explicitContentFilter?: number;
      afkChannelId?: string | null;
      afkTimeout?: number;
      systemChannelId?: string | null;
    }
  ): Promise<{ success: boolean; settings?: ServerSettingsData; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    try {
      await guild.edit({
        name: payload.name !== undefined ? payload.name.trim() : undefined,
        description: payload.description !== undefined ? payload.description : undefined,
        verificationLevel: payload.verificationLevel !== undefined ? payload.verificationLevel : undefined,
        defaultMessageNotifications:
          payload.defaultMessageNotifications !== undefined ? payload.defaultMessageNotifications : undefined,
        explicitContentFilter:
          payload.explicitContentFilter !== undefined ? payload.explicitContentFilter : undefined,
        afkChannel: payload.afkChannelId !== undefined ? payload.afkChannelId : undefined,
        afkTimeout: payload.afkTimeout !== undefined ? payload.afkTimeout : undefined,
        systemChannel: payload.systemChannelId !== undefined ? payload.systemChannelId : undefined,
        reason: 'Modifié via ETHONE Server Management 2.0',
      });

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'SERVER_SETTINGS_UPDATE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: 'Mise à jour des paramètres du serveur Discord',
      });

      return { success: true, settings: this.getSettings(client, guildId)! };
    } catch (err: any) {
      logger.error('[ServerSettingsService] Erreur mise à jour réglages serveur:', err);
      return { success: false, error: err.message };
    }
  }
}
