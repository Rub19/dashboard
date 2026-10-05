import fs from 'fs';
import path from 'path';
import { GamesConfig, GamesConfigSchema, GameRecord, GamesOverview, ActiveQuest } from '../types/games.js';
import { logger } from '../../../utils/logger.js';

const MAX_HISTORY_PER_GUILD = 200;

export const DEFAULT_QUESTS: ActiveQuest[] = [
  {
    id: 'quest_bj_21',
    title: 'Maître du 21',
    description: 'Remporter 3 mains de Blackjack contre le croupier',
    gameType: 'blackjack',
    requiredCount: 3,
    rewardCredits: 500,
    rewardXp: 150,
  },
  {
    id: 'quest_roulette_colors',
    title: 'Flambeur de la Roulette',
    description: 'Placer 5 mises gagnantes à la Roulette Royale',
    gameType: 'roulette',
    requiredCount: 5,
    rewardCredits: 750,
    rewardXp: 200,
  },
  {
    id: 'quest_dice_champion',
    title: 'Champion des Dés',
    description: 'Remporter 2 duels de dés PvP contre un membre',
    gameType: 'dice',
    requiredCount: 2,
    rewardCredits: 1000,
    rewardXp: 300,
  },
];

class GamesStorage {
  private configPath = path.resolve(process.cwd(), 'data', 'games_configs.json');
  private historyPath = path.resolve(process.cwd(), 'data', 'games_history.json');
  private jackpotPath = path.resolve(process.cwd(), 'data', 'games_jackpot.json');

  private configs = new Map<string, GamesConfig>();
  private history = new Map<string, GameRecord[]>(); // guildId -> records (newest first)
  private jackpotPools = new Map<string, number>(); // guildId -> amount

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
          const res = GamesConfigSchema.safeParse(val);
          if (res.success) this.configs.set(gid, res.data);
        }
      }
    } catch (err) {
      logger.error('[Games] Erreur chargement games_configs.json :', err);
    }

    try {
      if (fs.existsSync(this.historyPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          if (Array.isArray(val)) {
            this.history.set(gid, val.slice(0, MAX_HISTORY_PER_GUILD));
          }
        }
      }
    } catch (err) {
      logger.error('[Games] Erreur chargement games_history.json :', err);
    }

    try {
      if (fs.existsSync(this.jackpotPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.jackpotPath, 'utf-8'));
        for (const [gid, val] of Object.entries(parsed)) {
          if (typeof val === 'number') this.jackpotPools.set(gid, val);
        }
      }
    } catch (err) {
      logger.error('[Games] Erreur chargement games_jackpot.json :', err);
    }
  }

  private saveConfigs() {
    try {
      const obj: Record<string, GamesConfig> = {};
      for (const [gid, cfg] of this.configs.entries()) obj[gid] = cfg;
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[Games] Erreur sauvegarde games_configs.json :', err);
    }
  }

  private saveHistory() {
    try {
      const obj: Record<string, GameRecord[]> = {};
      for (const [gid, list] of this.history.entries()) obj[gid] = list;
      fs.writeFileSync(this.historyPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[Games] Erreur sauvegarde games_history.json :', err);
    }
  }

  private saveJackpot() {
    try {
      const obj: Record<string, number> = {};
      for (const [gid, amount] of this.jackpotPools.entries()) obj[gid] = amount;
      fs.writeFileSync(this.jackpotPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[Games] Erreur sauvegarde games_jackpot.json :', err);
    }
  }

  public getConfig(guildId: string): GamesConfig {
    let cfg = this.configs.get(guildId);
    if (!cfg) {
      cfg = GamesConfigSchema.parse({});
      this.configs.set(guildId, cfg);
    }
    return cfg;
  }

  public updateConfig(guildId: string, patch: Partial<GamesConfig>): GamesConfig {
    const current = this.getConfig(guildId);
    const updated = GamesConfigSchema.parse({ ...current, ...patch });
    this.configs.set(guildId, updated);
    this.saveConfigs();
    return updated;
  }

  public getJackpot(guildId: string): number {
    if (!this.jackpotPools.has(guildId)) {
      const cfg = this.getConfig(guildId);
      this.jackpotPools.set(guildId, cfg.jackpotPool);
    }
    return this.jackpotPools.get(guildId) || 5000;
  }

  public addToJackpot(guildId: string, amount: number): number {
    const current = this.getJackpot(guildId);
    const updated = Math.max(0, current + Math.round(amount));
    this.jackpotPools.set(guildId, updated);
    this.saveJackpot();
    return updated;
  }

  public claimJackpot(guildId: string): number {
    const current = this.getJackpot(guildId);
    const baseSeed = this.getConfig(guildId).jackpotPool || 5000;
    this.jackpotPools.set(guildId, baseSeed);
    this.saveJackpot();
    return current;
  }

  public recordGame(guildId: string, record: Omit<GameRecord, 'id' | 'timestamp'>): GameRecord {
    const fullRecord: GameRecord = {
      ...record,
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    let list = this.history.get(guildId);
    if (!list) {
      list = [];
      this.history.set(guildId, list);
    }

    list.unshift(fullRecord);
    if (list.length > MAX_HISTORY_PER_GUILD) {
      list.length = MAX_HISTORY_PER_GUILD;
    }

    // Contribution progressive à la cagnotte jackpot
    const cfg = this.getConfig(guildId);
    if (record.bet > 0 && cfg.jackpotContributionPercent > 0) {
      const jackpotAdd = (record.bet * cfg.jackpotContributionPercent) / 100;
      this.addToJackpot(guildId, jackpotAdd);
    }

    this.saveHistory();
    return fullRecord;
  }

  public getHistory(guildId: string, limit = 20): GameRecord[] {
    return (this.history.get(guildId) || []).slice(0, limit);
  }

  public getOverview(guildId: string): GamesOverview {
    const cfg = this.getConfig(guildId);
    const list = this.history.get(guildId) || [];

    let totalBets = 0;
    let totalPayouts = 0;
    let biggestWin: GamesOverview['biggestWin'] = null;
    const playerStats = new Map<string, { username: string; totalWon: number; gamesPlayed: number }>();

    for (const g of list) {
      totalBets += g.bet;
      totalPayouts += g.payout;

      if (g.won && (!biggestWin || g.payout > biggestWin.amount)) {
        biggestWin = {
          username: g.username,
          amount: g.payout,
          game: g.detail,
          timestamp: g.timestamp,
        };
      }

      const p = playerStats.get(g.userId) || { username: g.username, totalWon: 0, gamesPlayed: 0 };
      p.gamesPlayed += 1;
      if (g.won) p.totalWon += g.net;
      playerStats.set(g.userId, p);
    }

    const topWinners = Array.from(playerStats.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.totalWon - a.totalWon)
      .slice(0, 5);

    return {
      enabled: cfg.enabled,
      jackpotPool: this.getJackpot(guildId),
      totalGamesPlayed: list.length,
      totalBets,
      totalPayouts,
      biggestWin,
      recentGames: list.slice(0, 10),
      topWinners,
    };
  }
}

export const gamesStorage = new GamesStorage();
