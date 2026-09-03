import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';
import { autoModCache } from '../services/autoModCache.js';

export class GhostPingDetector {
  public static onMessageCreate(message: Message, config: AutoModConfig): void {
    if (!config.ghostPing.enabled) return;
    if (message.author.bot || !message.guild) return;

    const userMentions = message.mentions.users.map((u) => u.id);
    const mentionsEveryone = message.mentions.everyone;

    if (userMentions.length > 0 || mentionsEveryone) {
      autoModCache.recordPotentialGhostPing({
        messageId: message.id,
        guildId: message.guild.id,
        authorId: message.author.id,
        authorTag: message.author.tag,
        channelId: message.channel.id,
        mentionedUserIds: userMentions,
        mentionedEveryone: mentionsEveryone,
        content: message.content || '',
        timestamp: Date.now(),
      });
    }
  }

  public static onMessageDelete(
    messageId: string,
    config: AutoModConfig
  ): { triggered: boolean; result?: DetectionResult; record?: any } {
    if (!config.ghostPing.enabled) return { triggered: false };

    const record = autoModCache.checkAndConsumeGhostPing(messageId, config.ghostPing.timeWindowSeconds);
    if (!record) return { triggered: false };

    return {
      triggered: true,
      record,
      result: {
        detectorName: 'GhostPingDetector',
        triggered: true,
        riskPoints: 20,
        reason: `Ghost ping détecté par ${record.authorTag} (${record.mentionedUserIds.length} mentions)`,
        matchedContent: record.content.slice(0, 50),
        actions: config.ghostPing.actions,
      },
    };
  }
}
