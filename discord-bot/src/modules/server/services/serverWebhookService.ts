import { Client, Guild, TextChannel, Webhook } from 'discord.js';
import { ServerWebhookItem } from '../types/index.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ServerWebhookService {
  /**
   * Returns all webhooks with tokens redacted for security.
   */
  public static async getWebhooks(client: Client, guildId: string): Promise<ServerWebhookItem[]> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    try {
      const webhooks = await guild.fetchWebhooks();
      return webhooks.map((wh) => {
        const channel = guild.channels.cache.get(wh.channelId);
        return {
          id: wh.id,
          name: wh.name,
          channelId: wh.channelId,
          channelName: channel ? channel.name : 'inconnu',
          avatarUrl: wh.avatarURL(),
          creatorTag: wh.owner ? (wh.owner as any).tag || (wh.owner as any).username : 'Inconnu',
          createdAt: wh.createdAt.toISOString(),
          // Note: Token is explicitly not returned to frontend
        };
      });
    } catch (err: any) {
      logger.error('[ServerWebhookService] Erreur récupération webhooks:', err);
      return [];
    }
  }

  /**
   * Creates a new webhook on a channel.
   */
  public static async createWebhook(
    client: Client,
    guildId: string,
    payload: { channelId: string; name: string; avatar?: string }
  ): Promise<{ success: boolean; webhook?: ServerWebhookItem; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const channel = guild.channels.cache.get(payload.channelId) as TextChannel | undefined;
    if (!channel || !('createWebhook' in channel)) {
      return { success: false, error: 'Salon textuel non éligible pour un webhook.' };
    }

    try {
      const created = await channel.createWebhook({
        name: payload.name.trim(),
        avatar: payload.avatar || undefined,
        reason: 'Créé via ETHONE Webhook Center 2.0',
      });

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'WEBHOOK_CREATE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Webhook "${created.name}" créé sur #${channel.name}`,
      });

      return {
        success: true,
        webhook: {
          id: created.id,
          name: created.name,
          channelId: created.channelId,
          channelName: channel.name,
          avatarUrl: created.avatarURL(),
          creatorTag: 'ETHONE Dashboard',
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: any) {
      logger.error('[ServerWebhookService] Erreur création webhook:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes a webhook safely.
   */
  public static async deleteWebhook(
    client: Client,
    guildId: string,
    webhookId: string
  ): Promise<{ success: boolean; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    try {
      const webhooks = await guild.fetchWebhooks();
      const target = webhooks.get(webhookId);
      if (!target) return { success: false, error: 'Webhook introuvable.' };

      const whName = target.name;
      await target.delete('Supprimé via ETHONE Dashboard');

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'WEBHOOK_DELETE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Suppression du webhook "${whName}"`,
      });

      return { success: true };
    } catch (err: any) {
      logger.error('[ServerWebhookService] Erreur suppression webhook:', err);
      return { success: false, error: err.message };
    }
  }
}
