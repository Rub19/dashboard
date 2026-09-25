import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

const CUSTOM_EMOJI = /<a?:\w{2,32}:\d{5,25}>/g;
// Présentation emoji seulement : © ® ™ et les chiffres restent du texte ; une séquence (peau, ZWJ) compte pour un seul émoji.
const UNICODE_EMOJI = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️)\p{Emoji_Modifier}?(?:‍(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️?)\p{Emoji_Modifier}?)*/gu;

export const countEmojis = (content: string): number => {
  const custom = content.match(CUSTOM_EMOJI)?.length ?? 0;
  const unicode = content.replace(CUSTOM_EMOJI, '').match(UNICODE_EMOJI)?.length ?? 0;
  return custom + unicode;
};

export class EmojiDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const conf = config.emojis;
    const none: DetectionResult = { detectorName: 'EmojiDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    if (!conf.enabled) return none;
    const count = countEmojis(message.content || '');
    if (count <= conf.maxEmojis) return none;
    return {
      detectorName: 'EmojiDetector',
      triggered: true,
      riskPoints: 10,
      reason: `Trop d'émojis (${count}, maximum ${conf.maxEmojis})`,
      matchedContent: `${count} émojis`,
      actions: conf.actions,
    };
  }
}
