import {
  EmbedBuilder,
  Guild,
  Message,
  NewsChannel,
  PermissionFlagsBits,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { stickyStorage } from '../storage/stickyStorage.js';
import { StickyMessage } from '../types/sticky.js';
import { logger } from '../../../utils/logger.js';

type StickyTextChannel = TextChannel | NewsChannel | ThreadChannel;

class StickyService {
  /** Un repositionnement en attente par salon (les messages rapides sont coalescés). */
  private pending = new Map<string, NodeJS.Timeout>();

  private isStickyTextChannel(channel: unknown): channel is StickyTextChannel {
    return (
      !!channel &&
      typeof channel === 'object' &&
      'isTextBased' in channel &&
      typeof (channel as { isTextBased: () => boolean }).isTextBased === 'function' &&
      (channel as { isTextBased: () => boolean }).isTextBased() &&
      'messages' in channel
    );
  }

  private buildPayload(sticky: StickyMessage): { content?: string; embeds?: EmbedBuilder[] } {
    if (!sticky.asEmbed) return { content: sticky.content };
    const embed = new EmbedBuilder()
      .setColor((sticky.color as `#${string}`) ?? '#5865F2')
      .setDescription(sticky.content);
    if (sticky.title) embed.setTitle(sticky.title);
    return { embeds: [embed] };
  }

  /**
   * Appelé pour chaque message humain reçu (cf. events/messageCreate).
   * Programme un repositionnement anti-rebond si le salon a un sticky actif.
   */
  public handleMessage(message: Message): void {
    if (!message.guild || !message.guildId) return;
    const sticky = stickyStorage.get(message.guildId, message.channelId);
    if (!sticky || !sticky.enabled) return;

    const key = `${message.guildId}:${message.channelId}`;
    if (this.pending.has(key)) return; // repositionnement déjà programmé

    const guild = message.guild;
    const channelId = message.channelId;
    const timer = setTimeout(() => {
      this.pending.delete(key);
      void this.repost(guild, channelId).catch((err) => logger.error('[Sticky] repost :', err));
    }, Math.max(2, sticky.cooldownSeconds) * 1000);

    this.pending.set(key, timer);
  }

  /** Supprime l'ancien sticky et le republie tout en bas du salon. */
  public async repost(guild: Guild, channelId: string): Promise<void> {
    const sticky = stickyStorage.get(guild.id, channelId);
    if (!sticky || !sticky.enabled) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!this.isStickyTextChannel(channel)) return;

    const me = guild.members.me;
    if (me) {
      const perms = channel.permissionsFor(me);
      const needed = [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages];
      if (sticky.asEmbed) needed.push(PermissionFlagsBits.EmbedLinks);
      if (!perms.has(needed)) {
        logger.warn(`[Sticky] Permissions insuffisantes dans #${channel.name} (guilde ${guild.id}).`);
        return;
      }
    }

    if (sticky.lastMessageId) {
      await channel.messages.delete(sticky.lastMessageId).catch(() => {});
    }

    const sent = await channel.send(this.buildPayload(sticky)).catch((err) => {
      logger.error(`[Sticky] Échec d'envoi (guilde ${guild.id}, salon ${channelId}) :`, err);
      return null;
    });
    if (!sent) return;

    stickyStorage.upsert({
      guildId: guild.id,
      channelId,
      lastMessageId: sent.id,
      repostCount: sticky.repostCount + 1,
    });
  }

  /** Repositionne immédiatement (après une modif via commande / dashboard). */
  public async forceRepost(guild: Guild, channelId: string): Promise<void> {
    const key = `${guild.id}:${channelId}`;
    const timer = this.pending.get(key);
    if (timer) {
      clearTimeout(timer);
      this.pending.delete(key);
    }
    await this.repost(guild, channelId);
  }

  /** Retire le dernier message sticky posté d'un salon (sans supprimer la config). */
  public async clearPosted(guild: Guild, channelId: string): Promise<void> {
    const sticky = stickyStorage.get(guild.id, channelId);
    if (!sticky?.lastMessageId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (this.isStickyTextChannel(channel)) {
      await channel.messages.delete(sticky.lastMessageId).catch(() => {});
    }
    stickyStorage.upsert({ guildId: guild.id, channelId, lastMessageId: null });
  }
}

export const stickyService = new StickyService();
