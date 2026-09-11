import { EmbedBuilder, Message } from 'discord.js';
import { highlightStorage } from '../storage/highlightStorage.js';
import { boldKeyword, matchesKeyword } from './matching.js';
import { logger } from '../../../utils/logger.js';

/** Anti-spam : un même (utilisateur, mot-clé) ne redéclenche pas un DM avant ce délai. */
const COOLDOWN_MINUTES = 15;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

const MAX_CONTENT_PREVIEW = 400;

class HighlightService {
  /** key: `${guildId}:${userId}:${keyword.toLowerCase()}` → timestamp (ms) du dernier DM. */
  private cooldownCache = new Map<string, number>();

  private cooldownKey(guildId: string, userId: string, keyword: string): string {
    return `${guildId}:${userId}:${keyword.toLowerCase()}`;
  }

  private isOnCooldown(guildId: string, userId: string, keyword: string, now: number): boolean {
    const last = this.cooldownCache.get(this.cooldownKey(guildId, userId, keyword));
    return last !== undefined && now - last < COOLDOWN_MS;
  }

  private markNotified(guildId: string, userId: string, keyword: string, now: number): void {
    this.cooldownCache.set(this.cooldownKey(guildId, userId, keyword), now);
  }

  /**
   * Traite un message humain envoyé dans un serveur : scanne les mots-clés de tous les
   * membres du serveur et DM ceux qui matchent (hors cooldown, hors config).
   * Ne lève jamais — chaque échec de DM est capturé et ignoré (cf. events/messageCreate.ts).
   */
  public async handleMessage(message: Message): Promise<void> {
    if (!message.guild || !message.guildId) return; // Serveur uniquement.
    if (message.author.bot) return; // Jamais de highlight sur un bot.
    if (!message.content) return;

    const guildId = message.guildId;
    const keywords = highlightStorage.listForGuild(guildId);
    if (keywords.length === 0) return;

    const now = Date.now();
    for (const entry of keywords) {
      if (entry.userId === message.author.id) continue; // Jamais son propre message.
      if (!matchesKeyword(message.content, entry.keyword)) continue;

      const config = highlightStorage.getConfig(guildId, entry.userId);
      if (!config.enabled) continue;
      if (config.ignoredChannelIds.includes(message.channelId)) continue;
      if (this.isOnCooldown(guildId, entry.userId, entry.keyword, now)) continue;

      this.markNotified(guildId, entry.userId, entry.keyword, now);
      await this.notify(message, entry.userId, entry.keyword).catch((err) => {
        logger.warn(`[Highlights] Notification échouée pour ${entry.userId} :`, err);
      });
    }
  }

  private async notify(message: Message, userId: string, keyword: string): Promise<void> {
    const user = await message.client.users.fetch(userId).catch(() => null);
    if (!user) return;

    const preview = message.content.length > MAX_CONTENT_PREVIEW
      ? `${message.content.slice(0, MAX_CONTENT_PREVIEW)}…`
      : message.content;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .setTitle(`👁️ Mot-clé surveillé : "${keyword}"`)
      .setDescription(boldKeyword(preview, keyword))
      .addFields(
        { name: 'Serveur', value: message.guild!.name, inline: true },
        { name: 'Salon', value: `<#${message.channelId}>`, inline: true }
      )
      .addFields({ name: 'Lien', value: `[Aller au message](${message.url})` })
      .setTimestamp(message.createdAt);

    // Fermé aux DM, permissions manquantes, utilisateur bloqué le bot… on échoue en silence.
    await user.send({ embeds: [embed] }).catch(() => {});
  }

  /** Exposé pour les tests : vide le cache de cooldown entre deux scénarios. */
  public _resetCooldownCacheForTests(): void {
    this.cooldownCache.clear();
  }
}

export const highlightService = new HighlightService();
export { COOLDOWN_MINUTES };
