import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';
import { autoModCache } from '../services/autoModCache.js';

export class RegexDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const regConf = config.regex;
    if (!regConf.enabled || regConf.rules.length === 0) {
      return { detectorName: 'RegexDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const content = message.content || '';

    for (const rule of regConf.rules) {
      if (!rule.enabled) continue;

      const matches = autoModCache.safeTestRegex(rule.pattern, rule.flags || 'i', content);
      if (matches) {
        return {
          detectorName: 'RegexDetector',
          triggered: true,
          riskPoints: 25,
          reason: `Règle Regex déclenchée : "${rule.name}"`,
          matchedContent: rule.pattern,
          actions: rule.actions,
        };
      }
    }

    return { detectorName: 'RegexDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
