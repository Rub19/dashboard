import { BotCommandStat } from '../types/index.js';

export class BotCommandStatsService {
  private static instance: BotCommandStatsService;
  private commands: Map<string, BotCommandStat> = new Map();

  private constructor() {
    this.initCatalog();
  }

  public static getInstance(): BotCommandStatsService {
    if (!BotCommandStatsService.instance) {
      BotCommandStatsService.instance = new BotCommandStatsService();
    }
    return BotCommandStatsService.instance;
  }

  private initCatalog() {
    const catalog: Array<{ name: string; category: string; description: string; execs: number }> = [
      { name: 'voice', category: 'Voice', description: 'Create and configure instant personal temporary voice room', execs: 1420 },
      { name: 'ban', category: 'Moderation', description: 'Ban a disruptive member from the guild with audit reason', execs: 412 },
      { name: 'kick', category: 'Moderation', description: 'Kick a member from the guild', execs: 231 },
      { name: 'timeout', category: 'Moderation', description: 'Apply Discord native communication timeout to a member', execs: 890 },
      { name: 'warn', category: 'Moderation', description: 'Issue a formal warning to a user with case storage', execs: 640 },
      { name: 'ticket', category: 'Support', description: 'Open a dedicated private support ticket channel', execs: 1120 },
      { name: 'close', category: 'Support', description: 'Close and archive current support ticket with HTML transcript', execs: 1098 },
      { name: 'ai', category: 'Intelligence', description: 'Ask the contextual ETHONE AI assistant a question', execs: 3210 },
      { name: 'analyze', category: 'Intelligence', description: 'Run sentiment and risk analysis on channel messages', execs: 345 },
      { name: 'rank', category: 'Leveling', description: 'View your current level, XP, and global ranking card', execs: 2840 },
      { name: 'leaderboard', category: 'Leveling', description: 'Display top XP leaders on the server', execs: 980 },
      { name: 'giveaway', category: 'Engagement', description: 'Start an interactive button giveaway contest', execs: 154 },
      { name: 'poll', category: 'Engagement', description: 'Create a live multi-choice vote embed', execs: 210 },
      { name: 'lockdown', category: 'Security', description: 'Instantly lock public channels against incoming raids', execs: 42 },
      { name: 'backup', category: 'Management', description: 'Generate an encrypted JSON backup snapshot of server layout', execs: 68 },
      { name: 'serverinfo', category: 'Management', description: 'Inspect server metrics, boosts, and security rating', execs: 420 },
      { name: 'play', category: 'Entertainment', description: 'Enqueue audio stream into the active voice channel', execs: 1850 },
      { name: 'skip', category: 'Entertainment', description: 'Skip the current track in the music queue', execs: 740 },
      { name: 'form', category: 'Automation', description: 'Deploy a staff/whitelist application modal to a channel', execs: 85 },
      { name: 'suggest', category: 'Engagement', description: 'Submit a new proposal to community voting queue', execs: 560 },
      { name: 'diagnostics', category: 'System', description: 'Run bot internal health checks and latency tests', execs: 95 },
    ];

    for (const c of catalog) {
      const avgLat = Math.round(Math.random() * 20 + 25);
      this.commands.set(c.name, {
        name: c.name,
        category: c.category,
        description: c.description,
        totalExecutions: c.execs,
        executions24h: Math.round(c.execs * 0.2),
        successRate: 99.4,
        avgLatencyMs: avgLat,
        p95LatencyMs: Math.round(avgLat * 1.5),
        p99LatencyMs: Math.round(avgLat * 2.2),
        lastExecutedAt: new Date(Date.now() - Math.round(Math.random() * 300000)).toISOString(),
      });
    }
  }

  public getAllCommands(): BotCommandStat[] {
    return Array.from(this.commands.values());
  }

  public recordCommandExecution(name: string, latencyMs: number, success = true, errorMsg?: string) {
    const cmd = this.commands.get(name);
    if (cmd) {
      cmd.totalExecutions++;
      cmd.executions24h++;
      cmd.avgLatencyMs = Math.round((cmd.avgLatencyMs * 9 + latencyMs) / 10);
      cmd.lastExecutedAt = new Date().toISOString();
      if (!success) {
        cmd.successRate = Math.max(90, Math.round(((cmd.successRate * 99) + 0) / 100 * 10) / 10);
        if (errorMsg) cmd.lastError = errorMsg;
      }
      this.commands.set(name, cmd);
    }
  }
}
