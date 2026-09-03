import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class CapsDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const capsConf = config.caps;
    if (!capsConf.enabled) {
      return { detectorName: 'CapsDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const content = message.content || '';
    // Ignorer les messages trop courts
    if (content.length < capsConf.minMessageLength) {
      return { detectorName: 'CapsDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    // Filtrer les lettres uniquement
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length < capsConf.minMessageLength) {
      return { detectorName: 'CapsDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const upperCount = (letters.match(/[A-Z]/g) || []).length;
    const percentage = Math.round((upperCount / letters.length) * 100);

    if (percentage >= capsConf.maxCapsPercentage) {
      return {
        detectorName: 'CapsDetector',
        triggered: true,
        riskPoints: 15,
        reason: `Utilisation excessive de majuscules (${percentage}%, max: ${capsConf.maxCapsPercentage}%)`,
        matchedContent: `${percentage}% majuscules`,
        actions: capsConf.actions,
      };
    }

    return { detectorName: 'CapsDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
