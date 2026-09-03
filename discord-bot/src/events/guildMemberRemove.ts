import { GuildMember, EmbedBuilder, TextChannel, ChannelType, PartialGuildMember } from 'discord.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { welcomeService } from '../modules/welcome/services/welcomeService.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { logger } from '../utils/logger.js';

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  try {
    const config = guildConfigService.getConfig(member.guild.id);

    // Anti-Raid 2.0 (Détection des vagues de départs)
    if ('guild' in member && member.guild) {
      raidDetectionService.handleMemberRemove(member as GuildMember);
    }

    // 1. Module Goodbye (Message, Embed, Image)
    await welcomeService.handleMemberRemove(member);

    // 2. Analytics
    analyticsService.recordLeave(member.guild.id, member.id);

    // 2. Module Logs de Départ
    if (config.modules.logging) {
      const logChannel = member.guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name.includes('log') || c.name.includes('audit'))
      ) as TextChannel | undefined;

      if (logChannel && logChannel.permissionsFor(member.guild.members.me!)?.has('SendMessages')) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.errorColor as `#${string}`)
          .setTitle('📤 Départ d’un membre')
          .setDescription(`**${member.user?.tag || 'Membre inconnu'}** (${member.id}) a quitté le serveur.`)
          .setFooter({ text: `${config.botName}` })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    logger.error('Erreur dans guildMemberRemove :', err);
  }
}
