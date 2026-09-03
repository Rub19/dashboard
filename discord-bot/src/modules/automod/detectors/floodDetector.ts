import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class FloodDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const floodConf = config.flood;
    if (!floodConf.enabled) {
      return { detectorName: 'FloodDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const content = message.content || '';

    // 1. Longueur maximale de message
    if (content.length > floodConf.maxMessageLength) {
      return {
        detectorName: 'FloodDetector',
        triggered: true,
        riskPoints: 15,
        reason: `Message trop long (${content.length} caractères, max: ${floodConf.maxMessageLength})`,
        matchedContent: `${content.length} caractères`,
        actions: floodConf.actions,
      };
    }

    // 2. Répétition excessive d'un même caractère (ex: aaaaaaaa, !!!!!!!!, ????????)
    const charRepeatRegex = new RegExp(`(.)\\1{${floodConf.maxCharacterRepeats},}`, 'i');
    const charMatch = content.match(charRepeatRegex);
    if (charMatch) {
      return {
        detectorName: 'FloodDetector',
        triggered: true,
        riskPoints: 15,
        reason: `Répétition excessive du caractère "${charMatch[1]}" (${charMatch[0].length} fois)`,
        matchedContent: charMatch[0].slice(0, 30),
        actions: floodConf.actions,
      };
    }

    // 3. Répétition de mots (ex: "test test test test test")
    const words = content.split(/\s+/).filter(Boolean);
    if (words.length >= floodConf.maxWordRepeats) {
      const counts = new Map<string, number>();
      for (const w of words) {
        const lower = w.toLowerCase();
        counts.set(lower, (counts.get(lower) || 0) + 1);
        if (counts.get(lower)! >= floodConf.maxWordRepeats) {
          return {
            detectorName: 'FloodDetector',
            triggered: true,
            riskPoints: 15,
            reason: `Mot "${w}" répété ${counts.get(lower)} fois`,
            matchedContent: w,
            actions: floodConf.actions,
          };
        }
      }
    }

    return { detectorName: 'FloodDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
