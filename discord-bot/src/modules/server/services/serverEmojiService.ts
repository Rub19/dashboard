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

    // Image envoyée par le tableau de bord en base64 uniquement : le bot ne télécharge aucune URL venue de l'extérieur.
    const name = String(payload?.name ?? '').trim();
    if (!/^[A-Za-z0-9_]{2,32}$/.test(name)) return { success: false, error: 'Nom : 2 à 32 caractères, lettres, chiffres ou « _ ».' };
    const m = String(payload?.imageBase64OrUrl ?? '').match(/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return { success: false, error: 'Image invalide : PNG, JPG, GIF ou WebP.' };
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > 256 * 1024) return { success: false, error: 'Image trop lourde : 256 Ko maximum pour un émoji Discord.' };

    try {
      const created = await guild.emojis.create({
        attachment: bytes,
        name,
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
      const code = Number(err?.code);
      const error =
        code === 50013
          ? "Le bot n'a pas la permission « Gérer les expressions » sur ce serveur."
          : code === 30008
            ? "Ce serveur a atteint son nombre maximum d'émojis (les boosts en débloquent davantage)."
            : code === 50035 || code === 50045
              ? 'Discord a refusé cette image (format ou taille).'
              : "Impossible d'ajouter cet émoji pour le moment.";
      return { success: false, error };
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
      guild.emojis.cache.delete(emojiId);

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

  /**
   * Updates/renames an existing emoji.
   */
  public static async updateEmoji(
    client: Client,
    guildId: string,
    emojiId: string,
    payload: { name: string }
  ): Promise<{ success: boolean; emoji?: ServerEmojiItem; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const emoji = guild.emojis.cache.get(emojiId) || (await guild.emojis.fetch(emojiId).catch(() => null));
    if (!emoji) return { success: false, error: 'Émoji introuvable.' };

    const name = String(payload?.name ?? '').trim();
    if (!/^[A-Za-z0-9_]{2,32}$/.test(name)) {
      return { success: false, error: 'Nom : 2 à 32 caractères, lettres, chiffres ou « _ ».' };
    }

    try {
      const oldName = emoji.name;
      const updated = await emoji.edit({ name, reason: 'Renommé via ETHONE Dashboard' });

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'EMOJI_UPDATE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Renommage de l'emoji :${oldName}: en :${updated.name}:`,
      });

      return {
        success: true,
        emoji: {
          id: updated.id,
          name: updated.name || name,
          animated: !!updated.animated,
          url: updated.imageURL(),
          managed: updated.managed,
          roles: Array.from(updated.roles.cache.keys()),
          createdAt: updated.createdAt.toISOString(),
        },
      };
    } catch (err: any) {
      logger.error('[ServerEmojiService] Erreur renommage emoji:', err);
      const code = Number(err?.code);
      const error =
        code === 50013
          ? "Le bot n'a pas la permission « Gérer les expressions » sur ce serveur."
          : code === 50035
            ? 'Nom d’émoji invalide pour Discord.'
            : 'Impossible de renommer cet émoji pour le moment.';
      return { success: false, error };
    }
  }
}
