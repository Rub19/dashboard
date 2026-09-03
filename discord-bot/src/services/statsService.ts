interface ActivityItem {
  id: string;
  guildId: string;
  guildName: string;
  userTag: string;
  commandName: string;
  type: 'slash' | 'prefix';
  timestamp: string;
}

class StatsService {
  private totalCommands = 0;
  private commandsToday = 0;
  private lastResetDate = new Date().toDateString();
  private guildCommandCounts = new Map<string, number>();
  private recentActivities: ActivityItem[] = [];

  constructor() {
    // Initialiser avec quelques métriques de base
    this.checkDateReset();
  }

  private checkDateReset() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.commandsToday = 0;
      this.lastResetDate = today;
    }
  }

  public recordCommand(guildId: string, guildName: string, userTag: string, commandName: string, type: 'slash' | 'prefix') {
    this.checkDateReset();
    this.totalCommands++;
    this.commandsToday++;

    const currentGuildCount = this.guildCommandCounts.get(guildId) ?? 0;
    this.guildCommandCounts.set(guildId, currentGuildCount + 1);

    const activity: ActivityItem = {
      id: Math.random().toString(36).substring(2, 9),
      guildId,
      guildName,
      userTag,
      commandName,
      type,
      timestamp: new Date().toISOString(),
    };

    this.recentActivities.unshift(activity);
    if (this.recentActivities.length > 20) {
      this.recentActivities.pop();
    }
  }

  public getGlobalStats() {
    this.checkDateReset();
    return {
      totalCommands: this.totalCommands,
      commandsToday: this.commandsToday,
      recentActivities: this.recentActivities,
    };
  }

  public getGuildStats(guildId: string) {
    this.checkDateReset();
    return {
      totalCommands: this.guildCommandCounts.get(guildId) ?? 0,
      recentActivities: this.recentActivities.filter((a) => a.guildId === guildId),
    };
  }
}

export const statsService = new StatsService();
