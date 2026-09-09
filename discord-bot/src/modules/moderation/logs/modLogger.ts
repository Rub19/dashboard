import { EmbedBuilder, Guild, TextChannel, ChannelType, User } from 'discord.js';
import { Sanction } from '../types/sanction.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export class ModLogger {
  private static getLogChannel(guild: Guild): TextChannel | null {
    const modConfig = sanctionService.getConfig(guild.id);

    // 1. Salon explicitement configuré
    if (modConfig.modLogChannelId) {
      const ch = guild.channels.cache.get(modConfig.modLogChannelId);
      if (ch && ch.type === ChannelType.GuildText) return ch as TextChannel;
    }

    // 2. Fallback automatique sur un salon nommé 'mod-logs', 'logs', ou 'audit'
    const fallback = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        (c.name.includes('mod-log') || c.name.includes('logs') || c.name.includes('audit'))
    );

    return (fallback as TextChannel) || null;
  }

  public static async logSanction(guild: Guild, sanction: Sanction): Promise<void> {
    try {
      const channel = this.getLogChannel(guild);
      if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
        return;
      }

      const guildConfig = guildConfigService.getConfig(guild.id);
      const t = getTranslation(guildConfig.language);

      let color = guildConfig.primaryColor;
      let titleIcon = '🛡️';
      let titleName = t.modlog_type_default;

      switch (sanction.type) {
        case 'warn':
          color = '#F59E0B';
          titleIcon = '⚠️';
          titleName = t.modlog_type_warn;
          break;
        case 'timeout':
          color = '#8B5CF6';
          titleIcon = '🔇';
          titleName = t.modlog_type_timeout;
          break;
        case 'untimeout':
          color = guildConfig.successColor;
          titleIcon = '🔊';
          titleName = t.modlog_type_untimeout;
          break;
        case 'kick':
          color = '#F97316';
          titleIcon = '👢';
          titleName = t.modlog_type_kick;
          break;
        case 'ban':
          color = guildConfig.errorColor;
          titleIcon = '🔨';
          titleName = t.modlog_type_ban;
          break;
        case 'unban':
          color = guildConfig.successColor;
          titleIcon = '🔓';
          titleName = t.modlog_type_unban;
          break;
      }

      // Avatar de la cible en thumbnail : repère visuel rapide dans un salon de logs
      // qui défile vite. Best-effort — un échec de fetch ne doit jamais bloquer le log.
      const targetAvatarUrl = await guild.client.users
        .fetch(sanction.userId)
        .then((u) => u.displayAvatarURL({ size: 128 }))
        .catch(() => null);

      const fields: { name: string; value: string; inline?: boolean }[] = [
        { name: t.modlog_field_member, value: `<@${sanction.userId}>\n**${sanction.userTag}**\n\`${sanction.userId}\``, inline: true },
        { name: t.modlog_field_moderator, value: `<@${sanction.moderatorId}>\n**${sanction.moderatorTag}**\n\`${sanction.moderatorId}\``, inline: true },
      ];

      if (sanction.durationSeconds) {
        const mins = Math.floor(sanction.durationSeconds / 60);
        fields.push({ name: t.modlog_field_duration, value: formatString(t.modlog_duration_value, { minutes: mins }), inline: true });
      }

      fields.push({ name: t.modlog_field_reason, value: sanction.reason || t.modlog_reason_none, inline: false });

      const embed = new EmbedBuilder()
        .setColor(color as `#${string}`)
        .setTitle(`${titleIcon} ${titleName} • #${sanction.id}`)
        .setThumbnail(targetAvatarUrl)
        .addFields(fields)
        .setFooter({ text: formatString(t.modlog_footer, { botName: guildConfig.botName }) })
        .setTimestamp(new Date(sanction.timestamp));

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Erreur lors du logging de modération :', err);
    }
  }

  public static async logAutoMod(
    guild: Guild,
    user: User,
    ruleName: string,
    actionTaken: string,
    messageSnippet?: string
  ): Promise<void> {
    try {
      const channel = this.getLogChannel(guild);
      if (!channel || !channel.permissionsFor(guild.members.me!)?.has('SendMessages')) {
        return;
      }

      const guildConfig = guildConfigService.getConfig(guild.id);
      const t = getTranslation(guildConfig.language);

      const embed = baseEmbed('warning', { footerText: formatString(t.modlog_automod_footer, { botName: guildConfig.botName }) })
        .setTitle(formatString(t.modlog_automod_title, { ruleName }))
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields([
          { name: t.modlog_automod_field_member, value: `<@${user.id}>\n**${user.tag}**\n\`${user.id}\``, inline: true },
          { name: t.modlog_automod_field_action, value: `\`${actionTaken.toUpperCase()}\``, inline: true },
        ]);

      if (messageSnippet) {
        embed.addFields([
          {
            name: t.modlog_automod_field_excerpt,
            value: messageSnippet.length > 500 ? messageSnippet.slice(0, 500) + '...' : messageSnippet,
          },
        ]);
      }

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Erreur lors du logging AutoMod :', err);
    }
  }
}
