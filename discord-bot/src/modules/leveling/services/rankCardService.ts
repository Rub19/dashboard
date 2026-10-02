import type { Guild, User } from 'discord.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from './levelCalculator.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { renderRankCard } from '../images/rankCard.js';
import type { RankCardStyle } from '../types/levelingConfig.js';

/** Carte de rang d'un membre avec ses vraies stats ; `overrides` sert aux aperçus (commande /xp carte, dashboard). */
export async function renderRankCardFor(
  guild: Guild,
  user: User,
  overrides: { accent?: string; style?: Partial<RankCardStyle> } = {}
): Promise<Buffer> {
  const config = levelingStorage.getConfig(guild.id);
  const userData = xpWriteBuffer.getUser(guild.id, user.id);
  const progress = LevelCalculator.getProgress(userData.totalXp);
  const leaderboard = levelingStorage.getLeaderboard(guild.id);
  const rank = leaderboard.findIndex((u) => u.userId === user.id) + 1 || leaderboard.length + 1;
  const nextReward = levelingStorage
    .getRewards(guild.id)
    .filter((r) => r.enabled && r.level > progress.level)
    .sort((a, b) => a.level - b.level)[0];
  return renderRankCard({
    username: user.username,
    avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
    rank,
    totalMembers: leaderboard.length,
    level: progress.level,
    totalXp: userData.totalXp,
    currentLevelXp: progress.currentLevelXp,
    nextLevelXp: progress.nextLevelXp,
    progressPercentage: progress.progressPercentage,
    messages: userData.messagesCount,
    accent: overrides.accent ?? config.accentColor,
    style: { ...config.rankCard, ...(overrides.style ?? {}) },
    nextReward: nextReward ? { name: guild.roles.cache.get(nextReward.roleId)?.name ?? 'rôle', level: nextReward.level } : null,
  });
}
