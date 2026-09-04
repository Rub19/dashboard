import {
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
} from 'discord.js';
import { Ticket } from '../types/ticket.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';

export class TicketLogger {
  private static getLogChannel(guild: Guild, configuredLogChannelId?: string | null): TextChannel | null {
    if (configuredLogChannelId) {
      const ch = guild.channels.cache.get(configuredLogChannelId);
      if (ch && ch.type === ChannelType.GuildText) return ch as TextChannel;
    }

    const fallback = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        (c.name.includes('ticket-log') || c.name.includes('mod-log') || c.name.includes('audit'))
    );

    return (fallback as TextChannel) || null;
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
      if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
        return;
      }

      const guildConfig = guildConfigService.getConfig(guild.id);
      const embed = new EmbedBuilder()
        .setColor(color as `#${string}`)
        .setTitle(title)
        .addFields(fields)
        .setFooter({ text: `${guildConfig.botName} • Support Tickets` })
        .setTimestamp();

      const payload: { embeds: EmbedBuilder[]; files?: AttachmentBuilder[] } = {
        embeds: [embed],
      };

      if (attachment) {
        payload.files = [attachment];
      }

      await channel.send(payload);
    } catch (err) {
      logger.error('Erreur lors du logging Ticket :', err);
    }
  }
}
