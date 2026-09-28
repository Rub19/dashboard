import {
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildBasedChannel,
  User,
} from 'discord.js';
import { Ticket } from '../types/ticket.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { canBotSendTo, isSendableTarget, sendToConfiguredChannel } from '../../../utils/channelSend.js';

export class TicketLogger {
  private static getLogChannel(guild: Guild, configuredLogChannelId?: string | null): GuildBasedChannel | null {
    if (configuredLogChannelId) {
      const ch = guild.channels.cache.get(configuredLogChannelId);
      if (ch && isSendableTarget(ch)) return ch;
    }

    const fallback = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        (c.name.includes('ticket-log') || c.name.includes('mod-log') || c.name.includes('audit'))
    );

    return fallback || null;
  }

  public static async logEvent(
    guild: Guild,
    logChannelId: string | null,
    title: string,
    color: string,
    fields: { name: string; value: string; inline?: boolean }[],
    attachment?: AttachmentBuilder
  ): Promise<void> {
    try {
      const channel = this.getLogChannel(guild, logChannelId);
      if (!channel || !canBotSendTo(channel, guild.members.me)) {
        return;
      }

      const guildConfig = guildConfigService.getConfig(guild.id);
      const embed = baseEmbed('default', { color, footerText: `${guildConfig.botName} • Support Tickets` })
        .setTitle(title)
        .addFields(fields);

      const payload: { embeds: EmbedBuilder[]; files?: AttachmentBuilder[] } = {
        embeds: [embed],
      };

      if (attachment) {
        payload.files = [attachment];
      }

      await sendToConfiguredChannel(channel, payload, { postTitle: title });
    } catch (err) {
      logger.error('Erreur lors du logging Ticket :', err);
    }
  }
}
