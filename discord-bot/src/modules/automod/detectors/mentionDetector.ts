import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult } from '../types/autoMod.js';

export class MentionDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const mentionConf = config.mentions;
    if (!mentionConf.enabled) {
      return { detectorName: 'MentionDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    }

    // 1. Détection @everyone / @here
    if (mentionConf.blockEveryoneHere && message.mentions.everyone) {
      return {
        detectorName: 'MentionDetector',
        triggered: true,
        riskPoints: 35,
        reason: 'Tentative de mention @everyone ou @here interdite',
        matchedContent: '@everyone / @here',
        actions: mentionConf.actions,
      };
    }

    // 2. Mentions d'utilisateurs
    const userMentions = message.mentions.users.size;
    if (userMentions >= mentionConf.maxUserMentions) {
      return {
        detectorName: 'MentionDetector',
        triggered: true,
        riskPoints: 25,
        reason: `Nombre excessif de mentions d'utilisateurs (${userMentions} mentions, max: ${mentionConf.maxUserMentions})`,
        matchedContent: `${userMentions} utilisateurs`,
        actions: mentionConf.actions,
      };
    }

    // 3. Mentions de rôles
    const roleMentions = message.mentions.roles.size;
    if (roleMentions >= mentionConf.maxRoleMentions) {
      return {
        detectorName: 'MentionDetector',
        triggered: true,
        riskPoints: 20,
        reason: `Nombre excessif de mentions de rôles (${roleMentions} rôles, max: ${mentionConf.maxRoleMentions})`,
        matchedContent: `${roleMentions} rôles`,
        actions: mentionConf.actions,
      };
    }

    // 4. Mentions totales
    const totalMentions = userMentions + roleMentions;
    if (totalMentions >= mentionConf.maxTotalMentions) {
      return {
        detectorName: 'MentionDetector',
        triggered: true,
        riskPoints: 25,
        reason: `Total des mentions trop élevé (${totalMentions} mentions, max: ${mentionConf.maxTotalMentions})`,
        matchedContent: `${totalMentions} mentions`,
        actions: mentionConf.actions,
      };
    }

    return { detectorName: 'MentionDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
  }
}
