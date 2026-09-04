import { EmbedBuilder, Guild, TextChannel, ChannelType, User } from 'discord.js';
import { Sanction } from '../types/sanction.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { logger } from '../../../utils/logger.js';

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

      let color = guildConfig.primaryColor;
      let titleIcon = '🛡️';
      let titleName = 'Sanction appliquée';

      switch (sanction.type) {
        case 'warn':
          color = '#F59E0B';
          titleIcon = '⚠️';
          titleName = 'Avertissement';
          break;
        case 'timeout':
          color = '#8B5CF6';
          titleIcon = '🔇';
          titleName = 'Mise en sourdine (Timeout)';
          break;
        case 'untimeout':
          color = guildConfig.successColor;
          titleIcon = '🔊';
          titleName = 'Fin de sourdine (Untimeout)';
          break;
        case 'kick':
          color = '#F97316';
          titleIcon = '👢';
          titleName = 'Expulsion (Kick)';
          break;
        case 'ban':
          color = guildConfig.errorColor;
          titleIcon = '🔨';
          titleName = 'Bannissement (Ban)';
          break;
        case 'unban':
          color = guildConfig.successColor;
          titleIcon = '🔓';
          titleName = 'Débannissement (Unban)';
          break;
      }

      const embed = new EmbedBuilder()
        .setColor(color as `#${string}`)
        .setTitle(`${titleIcon} ${titleName} • #${sanction.id}`)
        .addFields([
          { name: 'Membre', value: `**${sanction.userTag}**\n\`${sanction.userId}\``, inline: true },
          { name: 'Modérateur', value: `**${sanction.moderatorTag}**\n\`${sanction.moderatorId}\``, inline: true },
          { name: 'Raison', value: sanction.reason || 'Aucune raison spécifiée', inline: false },
        ]);

      if (sanction.durationSeconds) {
        const mins = Math.floor(sanction.durationSeconds / 60);
        embed.addFields([{ name: 'Durée', value: `${mins} minute(s)`, inline: true }]);
      }

      embed
        .setFooter({ text: `${guildConfig.botName} Modération` })
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

      const embed = new EmbedBuilder()
        .setColor('#EC4899') // Rose néon AutoMod
        .setTitle(`🤖 AutoMod • Règle déclenchée : ${ruleName}`)
        .addFields([
          { name: 'Membre', value: `**${user.tag}** (${user.id})`, inline: true },
          { name: 'Action effectuée', value: `\`${actionTaken.toUpperCase()}\``, inline: true },
        ]);

      if (messageSnippet) {
        embed.addFields([
          {
            name: 'Extrait du message',
            value: messageSnippet.length > 500 ? messageSnippet.slice(0, 500) + '...' : messageSnippet,
          },
        ]);
      }

      embed
        .setFooter({ text: `${guildConfig.botName} AutoMod Protection` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Erreur lors du logging AutoMod :', err);
    }
  }
}
