import fs from 'fs';
import path from 'path';
import { LevelingConfig, LevelingConfigSchema } from '../types/levelingConfig.js';
import { LevelReward, LevelRewardSchema } from '../types/levelReward.js';
import { XpBoost, XpBoostSchema } from '../types/xpBoost.js';
import { LeaderboardEntry } from '../types/userXp.js';
import { xpWriteBuffer } from './xpWriteBuffer.js';
import { LevelCalculator } from '../services/levelCalculator.js';
import { logger } from '../../../utils/logger.js';

class LevelingStorage {
  private configPath = path.resolve(process.cwd(), 'data', 'leveling_configs.json');
  private rewardsPath = path.resolve(process.cwd(), 'data', 'leveling_rewards.json');
  private boostsPath = path.resolve(process.cwd(), 'data', 'leveling_boosts.json');

  private configs = new Map<string, LevelingConfig>();
  private rewards = new Map<string, LevelReward[]>(); // guildId -> rewards
  private boosts = new Map<string, XpBoost[]>(); // guildId -> boosts

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          const res = LevelingConfigSchema.safeParse(val);
          if (res.success) this.configs.set(gid, res.data);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement leveling_configs.json :', err);
    }

    try {
      if (fs.existsSync(this.rewardsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.rewardsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.rewards.set(gid, list as LevelReward[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement leveling_rewards.json :', err);
    }

    try {
      if (fs.existsSync(this.boostsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.boostsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.boosts.set(gid, list as XpBoost[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement leveling_boosts.json :', err);
    }
  }

  private saveConfigs() {
    try {
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde leveling_configs.json :', err);
    }
  }

  private saveRewards() {
    try {
      const obj = Object.fromEntries(this.rewards.entries());
      fs.writeFileSync(this.rewardsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde leveling_rewards.json :', err);
    }
  }

  private saveBoosts() {
    try {
      const obj = Object.fromEntries(this.boosts.entries());
      fs.writeFileSync(this.boostsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde leveling_boosts.json :', err);
    }
  }

  public getConfig(guildId: string): LevelingConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = LevelingConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public updateConfig(guildId: string, update: Partial<LevelingConfig>): LevelingConfig {
    const current = this.getConfig(guildId);
    const valid = LevelingConfigSchema.parse({ ...current, ...update });
    this.configs.set(guildId, valid);
    this.saveConfigs();
    return valid;
  }

  // ==========================================
  // Récompenses de Rôles
  // ==========================================
  public getRewards(guildId: string): LevelReward[] {
    let list = this.rewards.get(guildId);
    if (!list) {
      list = [];
      this.rewards.set(guildId, list);
    }
    return list.sort((a, b) => a.level - b.level);
  }

  public saveReward(guildId: string, data: Partial<LevelReward>): LevelReward {
    const list = this.getRewards(guildId);
    const id = data.id || `rew_${Date.now()}`;
    const valid = LevelRewardSchema.parse({ ...data, id, guildId });

    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) {
      list[idx] = valid;
    } else {
      list.push(valid);
    }

    this.rewards.set(guildId, list);
    this.saveRewards();
    return valid;
  }

  public deleteReward(guildId: string, rewardId: string): boolean {
    const list = this.getRewards(guildId);
    const filtered = list.filter((r) => r.id !== rewardId);
    this.rewards.set(guildId, filtered);
    this.saveRewards();
    return true;
  }

  // ==========================================
  // XP Boosts & Multiplicateurs
  // ==========================================
  public getBoosts(guildId: string): XpBoost[] {
    let list = this.boosts.get(guildId);
    if (!list) {
      list = [];
      this.boosts.set(guildId, list);
    }
    return list;
  }

  public saveBoost(guildId: string, data: Partial<XpBoost>): XpBoost {
    const list = this.getBoosts(guildId);
    const id = data.id || `boost_${Date.now()}`;
    const valid = XpBoostSchema.parse({ ...data, id, guildId });

    const idx = list.findIndex((b) => b.id === id);
    if (idx >= 0) {
      list[idx] = valid;
    } else {
      list.push(valid);
    }

    this.boosts.set(guildId, list);
    this.saveBoosts();
    return valid;
  }

  public deleteBoost(guildId: string, boostId: string): boolean {
    const list = this.getBoosts(guildId);
    const filtered = list.filter((b) => b.id !== boostId);
    this.boosts.set(guildId, filtered);
    this.saveBoosts();
    return true;
  }

  // ==========================================
  // Classement (Leaderboard) & Vue d'ensemble
  // ==========================================
  public getLeaderboard(guildId: string, search?: string, limit = 100): LeaderboardEntry[] {
    const allUsers = xpWriteBuffer.getUsersForGuild(guildId);

    // Trier par totalXp décroissant
    allUsers.sort((a, b) => b.totalXp - a.totalXp);

    let filtered = allUsers;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) => u.username.toLowerCase().includes(q) || u.userId.includes(q)
      );
    }

    return filtered.slice(0, limit).map((user, idx) => {
      const prog = LevelCalculator.getProgress(user.totalXp);
      return {
        ...user,
        rank: idx + 1,
        currentLevelXp: prog.currentLevelXp,
        nextLevelXp: prog.nextLevelXp,
        progressPercentage: prog.progressPercentage,
      };
    });
  }

  public getOverview(guildId: string) {
    const config = this.getConfig(guildId);
    const allUsers = xpWriteBuffer.getUsersForGuild(guildId);
    allUsers.sort((a, b) => b.totalXp - a.totalXp);

    const activeMembersCount = allUsers.length;
    const totalXpDistributed = allUsers.reduce((sum, u) => sum + u.totalXp, 0);
    const totalLevels = allUsers.reduce((sum, u) => sum + u.level, 0);
    const topUser = allUsers[0] || null;

    return {
      enabled: config.enabled,
      activeMembersCount,
      totalXpDistributed,
      totalLevels,
      topUser: topUser
        ? {
            userId: topUser.userId,
            username: topUser.username,
            avatarUrl: topUser.avatarUrl,
            level: topUser.level,
            totalXp: topUser.totalXp,
          }
        : null,
      config,
    };
  }
}

export const levelingStorage = new LevelingStorage();
