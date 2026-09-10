import {
  EmbedBuilder,
  Message,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  User,
  TextChannel,
  NewsChannel,
  ThreadChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { starboardStorage } from '../storage/starboardStorage.js';
import { StarboardConfig } from '../types/starboard.js';
import { logger } from '../../../utils/logger.js';

type StarboardTextChannel = TextChannel | NewsChannel | ThreadChannel;

const MAX_DESCRIPTION = 3800;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

class StarboardService {
  /**
   * Compare l'emoji d'une réaction avec l'emoji configuré.
   * Gère l'unicode (`⭐`) et les emojis custom (`<:name:id>`, `name:id`, ou juste l'`id`).
   */
  private emojiMatches(reactionEmoji: { id: string | null; name: string | null }, configured: string): boolean {
    const conf = configured.trim();
    if (reactionEmoji.id) {
      // Emoji custom : matcher sur l'ID, quel que soit le format stocké.
      const idInConf = conf.replace(/^<a?:\w+:/, '').replace(/>$/, '').split(':').pop();
      return idInConf === reactionEmoji.id || conf === reactionEmoji.id;
    }
    return reactionEmoji.name === conf;
  }

  private isTextChannel(channel: unknown): channel is StarboardTextChannel {
    return (
      !!channel &&
      typeof channel === 'object' &&
      'isTextBased' in channel &&
      typeof (channel as { isTextBased: () => boolean }).isTextBased === 'function' &&
      (channel as { isTextBased: () => boolean }).isTextBased()
    );
  }

  /** Décompte fiable des réactions valides sur le message source. */
  private async countStars(message: Message, config: StarboardConfig): Promise<{ count: number; ids: string[] }> {
    const reaction = message.reactions.cache.find((r) => this.emojiMatches(r.emoji, config.emoji));
    if (!reaction) return { count: 0, ids: [] };

    let users;
    try {
      users = await reaction.users.fetch({ limit: 100 });
    } catch {
      return { count: reaction.count ?? 0, ids: [] };
    }

    const ids: string[] = [];
    for (const [, user] of users) {
      if (config.ignoreBots && user.bot) continue;
      if (!config.selfStarAllowed && user.id === message.author.id) continue;
      ids.push(user.id);
    }
    return { count: ids.length, ids };
  }

  private buildEmbed(message: Message, config: StarboardConfig, starCount: number): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor((config.color as `#${string}`) ?? '#F5B301')
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp(message.createdAt)
      .setFooter({ text: `${starCount} ⭐ • #${'name' in message.channel ? message.channel.name : 'salon'}` });

    const content = message.content?.slice(0, MAX_DESCRIPTION) ?? '';
    const parts: string[] = [];
    if (content) parts.push(content);
    parts.push(`\n[→ Aller au message](${message.url})`);
    embed.setDescription(parts.join('\n'));

    // Première image jointe / première image d'un embed existant.
    const imageAttachment = message.attachments.find(
      (a) => (a.contentType?.startsWith('image/') ?? false) || IMAGE_EXT.test(a.name ?? '')
    );
    if (imageAttachment) {
      embed.setImage(imageAttachment.url);
    } else {
      const embedImage = message.embeds.find((e) => e.image || e.thumbnail);
      if (embedImage?.image) embed.setImage(embedImage.image.url);
      else if (embedImage?.thumbnail) embed.setImage(embedImage.thumbnail.url);
    }

    const nonImageAttachment = message.attachments.find(
      (a) => !((a.contentType?.startsWith('image/') ?? false) || IMAGE_EXT.test(a.name ?? ''))
    );
    if (nonImageAttachment) {
      embed.addFields({ name: 'Pièce jointe', value: `[${nonImageAttachment.name}](${nonImageAttachment.url})` });
    }

    return embed;
  }

  private headerLine(config: StarboardConfig, starCount: number, sourceChannelId: string): string {
    const emoji = config.emoji.includes(':') || config.emoji.startsWith('<') ? config.emoji : config.emoji;
    return `${emoji} **${starCount}** • <#${sourceChannelId}>`;
  }

  /**
   * Recalcule le nombre d'étoiles d'un message et crée / met à jour / supprime
   * l'entrée correspondante sur le starboard.
   */
  public async syncMessage(message: Message): Promise<void> {
    if (!message.guild || !message.author) return;
    const guildId = message.guild.id;
    const config = starboardStorage.getConfig(guildId);

    if (!config.enabled || !config.channelId) return;
    if (message.channel.id === config.channelId) return; // ne pas étoiler le starboard lui-même
    if (config.ignoredChannelIds.includes(message.channel.id)) return;
    if ('nsfw' in message.channel && message.channel.nsfw && !config.allowNsfw) return;
    if (message.author.id === message.client.user?.id) return; // pas les messages du bot

    const starboardChannel = await message.guild.channels
      .fetch(config.channelId)
      .catch(() => null);
    if (!this.isTextChannel(starboardChannel)) {
      logger.warn(`[Starboard] Salon ${config.channelId} introuvable ou non textuel (guilde ${guildId}).`);
      return;
    }

    const me = message.guild.members.me;
    if (
      me &&
      !starboardChannel.permissionsFor(me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])
    ) {
      logger.warn(`[Starboard] Permissions insuffisantes dans #${starboardChannel.name} (guilde ${guildId}).`);
      return;
    }

    const { count, ids } = await this.countStars(message, config);
    const existing = starboardStorage.getEntry(guildId, message.id);

    const entry =
      existing ??
      starboardStorage.upsertEntry({
        guildId,
        sourceChannelId: message.channel.id,
        sourceMessageId: message.id,
        starboardMessageId: null,
        authorId: message.author.id,
        starCount: 0,
        starrerIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    // Sous le seuil : retirer l'entrée du starboard si demandé.
    if (count < config.threshold) {
      if (entry.starboardMessageId && config.removeBelowThreshold) {
        await starboardChannel.messages.delete(entry.starboardMessageId).catch(() => {});
        starboardStorage.upsertEntry({ ...entry, starboardMessageId: null, starCount: count, starrerIds: ids });
      } else {
        starboardStorage.upsertEntry({ ...entry, starCount: count, starrerIds: ids });
      }
      return;
    }

    const embed = this.buildEmbed(message, config, count);
    const header = this.headerLine(config, count, message.channel.id);

    // Édition si le message starboard existe encore.
    if (entry.starboardMessageId) {
      const posted = await starboardChannel.messages.fetch(entry.starboardMessageId).catch(() => null);
      if (posted) {
        await posted.edit({ content: header, embeds: [embed] }).catch(() => {});
        starboardStorage.upsertEntry({ ...entry, starCount: count, starrerIds: ids });
        return;
      }
    }

    // Sinon : nouvelle publication.
    const sent = await starboardChannel
      .send({ content: header, embeds: [embed] })
      .catch((err) => {
        logger.error(`[Starboard] Échec de publication (guilde ${guildId}) :`, err);
        return null;
      });

    starboardStorage.upsertEntry({
      ...entry,
      starboardMessageId: sent?.id ?? entry.starboardMessageId ?? null,
      starCount: count,
      starrerIds: ids,
    });
  }

  private async resolveReaction(
    reaction: MessageReaction | PartialMessageReaction
  ): Promise<MessageReaction | null> {
    try {
      const full = reaction.partial ? await reaction.fetch() : reaction;
      if (full.message.partial) await full.message.fetch();
      return full;
    } catch {
      return null;
    }
  }

  public async handleReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (user.bot) return;
    const full = await this.resolveReaction(reaction);
    if (!full || !full.message.guild) return;

    const config = starboardStorage.getConfig(full.message.guild.id);
    if (!config.enabled || !config.channelId) return;
    if (!this.emojiMatches(full.emoji, config.emoji)) return;

    await this.syncMessage(full.message as Message).catch((err) =>
      logger.error('[Starboard] handleReactionAdd :', err)
    );
  }

  public async handleReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (user.bot) return;
    const full = await this.resolveReaction(reaction);
    if (!full || !full.message.guild) return;

    const config = starboardStorage.getConfig(full.message.guild.id);
    if (!config.enabled || !config.channelId) return;
    if (!this.emojiMatches(full.emoji, config.emoji)) return;

    await this.syncMessage(full.message as Message).catch((err) =>
      logger.error('[Starboard] handleReactionRemove :', err)
    );
  }

  public async handleReactionClear(message: Message | PartialMessage): Promise<void> {
    try {
      const full = message.partial ? await message.fetch() : message;
      if (!full.guild) return;
      const config = starboardStorage.getConfig(full.guild.id);
      if (!config.enabled || !config.channelId) return;
      await this.syncMessage(full as Message);
    } catch (err) {
      logger.error('[Starboard] handleReactionClear :', err);
    }
  }

  /** Message source supprimé → retirer l'entrée + le message starboard associé. */
  public async handleMessageDelete(message: Message | PartialMessage): Promise<void> {
    const guildId = message.guild?.id;
    if (!guildId) return;
    const entry = starboardStorage.getEntry(guildId, message.id);
    if (!entry) return;

    const config = starboardStorage.getConfig(guildId);
    if (entry.starboardMessageId && config.channelId) {
      const channel = await message.guild!.channels.fetch(config.channelId).catch(() => null);
      if (this.isTextChannel(channel)) {
        await channel.messages.delete(entry.starboardMessageId).catch(() => {});
      }
    }
    starboardStorage.deleteEntry(guildId, message.id);
  }
}

export const starboardService = new StarboardService();
