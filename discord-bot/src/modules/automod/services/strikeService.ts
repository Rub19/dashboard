import { autoModRepository } from '../storage/autoModRepository.js';
import { AutoModAction, ProgressiveSanctionStep, StrikeConfig, UserStrikeRecord } from '../types/autoMod.js';

export class StrikeService {
  public static getActiveStrikes(guildId: string, userId: string): UserStrikeRecord[] {
    return autoModRepository.getUserStrikes(guildId, userId);
  }

  public static addStrike(
    guildId: string,
    userId: string,
    reason: string,
    addedBy = 'AUTOMOD',
    expirationDays = 7
  ): UserStrikeRecord {
    return autoModRepository.addStrike(guildId, userId, reason, addedBy, expirationDays);
  }

  public static clearStrikes(guildId: string, userId: string): number {
    return autoModRepository.clearUserStrikes(guildId, userId);
  }

  public static evaluateProgressiveSanction(
    strikeConfig: StrikeConfig,
    activeStrikesCount: number
  ): ProgressiveSanctionStep | null {
    if (!strikeConfig.enabled || activeStrikesCount <= 0) return null;

    // Trouver le palier correspondant exactement ou le palier le plus élevé inférieur ou égal
    const sorted = [...strikeConfig.progressiveSteps].sort((a, b) => b.strikeCount - a.strikeCount);
    const step = sorted.find((s) => activeStrikesCount >= s.strikeCount);
    return step || null;
  }
}
