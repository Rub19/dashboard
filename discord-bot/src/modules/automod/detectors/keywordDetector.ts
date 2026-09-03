import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class KeywordDetector {
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[@4]/g, 'a')
      .replace(/[$5]/g, 's')
      .replace(/[1!|]/g, 'i')
      .replace(/[0]/g, 'o')
      .replace(/[3]/g, 'e')
      .replace(/[+]/g, 't')
      .replace(/[\s\-_.]+/g, ' '); // Remplacer ponctuation / espacements par des espaces simples
  }

  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const keyConf = config.keywords;
    if (!keyConf.enabled || keyConf.blacklist.length === 0) {
      return { detectorName: 'KeywordDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const rawContent = message.content || '';
    const normalized = this.normalizeText(rawContent);

    // 1. Vérifier si le message correspond à une exception whitelistée
    for (const white of keyConf.whitelist) {
      if (normalized.includes(white.toLowerCase())) {
        return { detectorName: 'KeywordDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
      }
    }

    // 2. Parcourir la liste noire
    for (const item of keyConf.blacklist) {
      const term = item.trim().toLowerCase();
      if (!term) continue;

      let matched = false;
      if (keyConf.wildcardsEnabled && (term.startsWith('*') || term.endsWith('*'))) {
        // Wildcard match
        const regexStr = term.replace(/\*/g, '.*');
        const reg = new RegExp(`\\b${regexStr}\\b|${regexStr}`, 'i');
        matched = reg.test(normalized);
      } else {
        // Mot entier ou substring si entouré
        const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
        matched = wordRegex.test(normalized) || normalized.includes(term);
      }

      if (matched) {
        return {
          detectorName: 'KeywordDetector',
          triggered: true,
          riskPoints: 25,
          reason: `Mot ou expression interdite détectée : "${term}"`,
          matchedContent: term,
          actions: keyConf.actions,
        };
      }
    }

    return { detectorName: 'KeywordDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
