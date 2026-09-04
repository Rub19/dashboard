import { Client, EmbedBuilder, Colors, TextChannel } from 'discord.js';
import { ModerationCase } from '../types/case.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { logger } from '../../../utils/logger.js';

export class ModerationLogger {
  public static async logCase(discordClient: Client, modCase: ModerationCase): Promise<void> {
    try {
      const settings = moderationRepository.getSettings(modCase.guildId);
      if (!settings.logChannelId) return;

      const guild = discordClient.guilds.cache.get(modCase.guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(settings.logChannelId);
      if (!channel || !channel.isTextBased()) return;

      let color: number = Colors.Orange;
      if (modCase.action === 'BAN' || modCase.action === 'SOFTBAN') color = Colors.Red;
      if (modCase.action === 'UNBAN') color = Colors.Green;
      if (modCase.action === 'WARN') color = Colors.Yellow;
      if (modCase.action === 'TIMEOUT') color = Colors.DarkOrange;
      if (modCase.action === 'QUARANTINE') color = Colors.DarkPurple;

      const durationStr = modCase.durationSeconds
        ? `${Math.round(modCase.durationSeconds / 60)} min`
        : 'Permanent';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`👮 Case #${modCase.caseNumber} — ${modCase.action}`)
        .setDescription(`Sanction appliquée à <@${modCase.userId}> (${modCase.userTag})`)
        .addFields(
          { name: '👤 Utilisateur', value: `<@${modCase.userId}> (\`${modCase.userId}\`)`, inline: true },
          { name: '🛡️ Modérateur', value: `<@${modCase.moderatorId}> (\`${modCase.moderatorTag}\`)`, inline: true },
          { name: '⚡ Source', value: `\`${modCase.source}\``, inline: true },
          { name: '📝 Motif', value: modCase.reason || 'Aucun motif', inline: false }
        );

      if (modCase.durationSeconds) {
        embed.addFields({ name: '⏱️ Durée', value: durationStr, inline: true });
      }
      if (modCase.expiresAt) {
        embed.addFields({
          name: '⌛ Expiration',
          value: `<t:${Math.floor(new Date(modCase.expiresAt).getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      embed.setFooter({ text: `ID: ${modCase.id} • ETHONE Moderation Center 2.0` });
      embed.setTimestamp(new Date(modCase.createdAt));

      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (err) {
      logger.error('[ModerationLogger] Erreur envoi log case :', err);
    }
  }

  public static async logRevert(
    discordClient: Client,
    modCase: ModerationCase,
    revertedBy: string,
    revertReason: string
  ): Promise<void> {
    try {
      const settings = moderationRepository.getSettings(modCase.guildId);
      if (!settings.logChannelId) return;

      const guild = discordClient.guilds.cache.get(modCase.guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(settings.logChannelId);
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle(`↩️ Révocation — Case #${modCase.caseNumber} (${modCase.action})`)
        .setDescription(
          `La sanction sur <@${modCase.userId}> a été annulée/révoquée par **${revertedBy}**.`
        )
        .addFields(
          { name: 'Motif initial', value: modCase.reason, inline: true },
          { name: 'Motif de révocation', value: revertReason || 'Aucun motif spécifié', inline: true }
        )
        .setFooter({ text: `Case #${modCase.caseNumber} • Révocation` })
        .setTimestamp();

      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (err) {
      logger.error('[ModerationLogger] Erreur envoi log revert :', err);
    }
  }
}
