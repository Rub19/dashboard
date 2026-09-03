import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';
import { autoModCache } from '../services/autoModCache.js';

export class SpamDetector {
  public static check(message: Message, config: AutoModConfig, raidModeActive = false): DetectionResult {
    const spamConf = config.spam;
    if (!spamConf.enabled) {
      return { detectorName: 'SpamDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    const guildId = message.guildId!;
    const userId = message.author.id;
    const content = message.content || '';

    // Si Raid Mode actif et Smart Mode activé, abaisser le seuil de 30%
    const threshold = config.smartMode && raidModeActive
      ? Math.max(2, Math.floor(spamConf.maxMessages * 0.7))
      : spamConf.maxMessages;

    const recent = autoModCache.getUserMessagesInWindow(guildId, userId, spamConf.timeWindowSeconds);
    const count = recent.length;

    if (count >= threshold) {
      return {
        detectorName: 'SpamDetector',
        triggered: true,
        riskPoints: 25,
        reason: `Fréquence de messages anormale (${count} msgs en ${spamConf.timeWindowSeconds}s, max: ${threshold})`,
        matchedContent: `${count} messages`,
        actions: spamConf.actions,
      };
    }

    // Détection de doublons répétés
    const duplicates = autoModCache.getUserDuplicateCount(guildId, userId, content, 15);
    if (duplicates >= 3) {
      return {
        detectorName: 'SpamDetector',
        triggered: true,
        riskPoints: 20,
        reason: `Message répété à l'identique (${duplicates} fois)`,
        matchedContent: content.slice(0, 50),
        actions: spamConf.actions,
      };
    }

    return { detectorName: 'SpamDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
