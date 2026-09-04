import { Client, Guild } from 'discord.js';
import { ServerEmojiItem, ServerStickerItem } from '../types/index.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ServerEmojiService {
  /**
   * Retrieves server emojis and stickers with quota breakdown.
   */
  public static getEmojisAndStickers(client: Client, guildId: string): {
    emojis: ServerEmojiItem[];
    stickers: ServerStickerItem[];
    quota: {
      usedStatic: number;
      usedAnimated: number;
      maxStatic: number;
      maxAnimated: number;
      usedStickers: number;
      maxStickers: number;
      boostTier: number;
    };
  } {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return {
        emojis: [],
        stickers: [],
        quota: { usedStatic: 0, usedAnimated: 0, maxStatic: 50, maxAnimated: 50, usedStickers: 0, maxStickers: 5, boostTier: 0 },
      };
    }

    const emojis: ServerEmojiItem[] = guild.emojis.cache.map((e) => ({
      id: e.id,
      name: e.name || 'emoji',
      animated: !!e.animated,
      url: e.imageURL(),
      managed: e.managed,
      roles: Array.from(e.roles.cache.keys()),
      createdAt: e.createdAt.toISOString(),
    }));

    const stickers: ServerStickerItem[] = guild.stickers.cache.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      tags: s.tags || '',
      url: s.url,
    }));

    // Quotas according to Discord Boost Tier
    const tier = guild.premiumTier || 0;
    let maxEmojis = 50;
    let maxStickers = 5;
    if (tier === 1) {
      maxEmojis = 100;
      maxStickers = 15;
    } else if (tier === 2) {
      maxEmojis = 150;
      maxStickers = 30;
    } else if (tier === 3) {
      maxEmojis = 250;
      maxStickers = 60;
    }

    const usedStatic = emojis.filter((e) => !e.animated).length;
    const usedAnimated = emojis.filter((e) => e.animated).length;

    return {
      emojis,
      stickers,
      quota: {
        usedStatic,
        usedAnimated,
        maxStatic: maxEmojis,
        maxAnimated: maxEmojis,
        usedStickers: stickers.length,
        maxStickers,
        boostTier: tier,
      },
    };
  }

  /**
   * Uploads/creates a new emoji.
   */
  public static async createEmoji(
    client: Client,
    guildId: string,
    payload: { name: string; imageBase64OrUrl: string }
  ): Promise<{ success: boolean; emoji?: ServerEmojiItem; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    try {
      const created = await guild.emojis.create({
        attachment: payload.imageBase64OrUrl,
        name: payload.name.trim(),
        reason: 'Ajouté via ETHONE Emoji Center 2.0',
      });

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'EMOJI_CREATE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Nouvel emoji :${created.name}:`,
      });

      return {
        success: true,
        emoji: {
          id: created.id,
          name: created.name || payload.name,
          animated: !!created.animated,
          url: created.imageURL(),
          managed: created.managed,
          roles: [],
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: any) {
      logger.error('[ServerEmojiService] Erreur création emoji:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes an emoji.
   */
  public static async deleteEmoji(
    client: Client,
    guildId: string,
    emojiId: string
  ): Promise<{ success: boolean; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const emoji = guild.emojis.cache.get(emojiId);
    if (!emoji) return { success: false, error: 'Emoji introuvable.' };

    try {
      const name = emoji.name;
      await emoji.delete('Supprimé via ETHONE Dashboard');

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'EMOJI_DELETE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Suppression de l'emoji :${name}:`,
      });

      return { success: true };
    } catch (err: any) {
      logger.error('[ServerEmojiService] Erreur suppression emoji:', err);
      return { success: false, error: err.message };
    }
  }
}
