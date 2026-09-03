import { Message, PartialMessage, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { logger } from '../utils/logger.js';

export async function onMessageDelete(message: Message | PartialMessage): Promise<void> {
  try {
    if (!message.guild || message.author?.bot) return;

    const config = guildConfigService.getConfig(message.guild.id);

    // Module Logs (Message supprimé)
    if (config.modules.logging) {
      const logChannel = message.guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          (c.name.includes('log') || c.name.includes('audit'))
      ) as TextChannel | undefined;

      if (logChannel && logChannel.permissionsFor(message.guild.members.me!)?.has('SendMessages')) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.errorColor as `#${string}`)
          .setTitle('🗑️ Message supprimé')
          .setDescription(`Un message de ${message.author} a été supprimé dans ${message.channel}.`)
          .addFields([
            {
              name: 'Contenu',
              value: message.content ? message.content.slice(0, 1024) : '*[Contenu non disponible ou média]*',
            },
          ])
          .setFooter({ text: `${config.botName}` })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    logger.error('Erreur dans messageDelete :', err);
  }
}
