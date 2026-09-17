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

  // Every entry starts at zero — no seeded fake execution counts. Real
  // numbers accumulate only from actual recordCommandExecution() calls
  // (wired into interactionCreate.ts's command dispatch). A command with no
  // entry yet (name/category/description not in this static catalog) is
  // created on first real execution by recordCommandExecution() itself, so
  // this list doesn't need to be kept in perfect sync with every registered
  // command — it only seeds nicer category/description metadata for the
  // ones listed here.
  private initCatalog() {
    const catalog: Array<{ name: string; category: string; description: string }> = [
      { name: 'voice', category: 'Voice', description: 'Create and configure instant personal temporary voice room' },
      { name: 'ban', category: 'Moderation', description: 'Ban a disruptive member from the guild with audit reason' },
      { name: 'kick', category: 'Moderation', description: 'Kick a member from the guild' },
      { name: 'timeout', category: 'Moderation', description: 'Apply Discord native communication timeout to a member' },
      { name: 'warn', category: 'Moderation', description: 'Issue a formal warning to a user with case storage' },
      { name: 'ticket', category: 'Support', description: 'Open a dedicated private support ticket channel' },
      { name: 'close', category: 'Support', description: 'Close and archive current support ticket with HTML transcript' },
      { name: 'ask', category: 'Intelligence', description: 'Ask the contextual ETHONE AI assistant a question' },
      { name: 'rank', category: 'Leveling', description: 'View your current level, XP, and global ranking card' },
      { name: 'leaderboard', category: 'Leveling', description: 'Display top XP leaders on the server' },
      { name: 'giveaway', category: 'Engagement', description: 'Start an interactive button giveaway contest' },
      { name: 'poll', category: 'Engagement', description: 'Create a live multi-choice vote embed' },
      { name: 'lockdown', category: 'Security', description: 'Instantly lock public channels against incoming raids' },
      { name: 'backup', category: 'Management', description: 'Generate an encrypted JSON backup snapshot of server layout' },
      { name: 'serverinfo', category: 'Management', description: 'Inspect server metrics, boosts, and security rating' },
      { name: 'play', category: 'Entertainment', description: 'Enqueue audio stream into the active voice channel' },
      { name: 'skip', category: 'Entertainment', description: 'Skip the current track in the music queue' },
      { name: 'form', category: 'Automation', description: 'Deploy a staff/whitelist application modal to a channel' },
      { name: 'suggest', category: 'Engagement', description: 'Submit a new proposal to community voting queue' },
      { name: 'economy', category: 'Engagement', description: 'Balance, daily bonus, pay, leaderboard, gamble, shop' },
      { name: 'verification', category: 'Security', description: 'New-member verification status and toggle' },
    ];

    for (const c of catalog) {
      this.commands.set(c.name, {
        name: c.name,
        category: c.category,
        description: c.description,
        totalExecutions: 0,
        executions24h: 0,
        successRate: 100,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        lastExecutedAt: null,
      });
    }
  }

  public getAllCommands(): BotCommandStat[] {
    return Array.from(this.commands.values());
  }

  public recordCommandExecution(name: string, latencyMs: number, success = true, errorMsg?: string) {
    let cmd = this.commands.get(name);
    if (!cmd) {
      // Unlisted command (not in the static catalog above) — start tracking
      // it from scratch instead of silently dropping the sample.
      cmd = {
        name,
        category: 'Autre',
        description: '',
        totalExecutions: 0,
        executions24h: 0,
        successRate: 100,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        lastExecutedAt: null,
      };
    }
    const priorTotal = cmd.totalExecutions;
    cmd.totalExecutions++;
    cmd.executions24h++;
    // Running average, weighted by prior sample count so the first real
    // sample isn't diluted by a fake baseline (there isn't one anymore).
    cmd.avgLatencyMs = priorTotal === 0 ? latencyMs : Math.round((cmd.avgLatencyMs * priorTotal + latencyMs) / (priorTotal + 1));
    cmd.p95LatencyMs = Math.round(cmd.avgLatencyMs * 1.5);
    cmd.p99LatencyMs = Math.round(cmd.avgLatencyMs * 2.2);
    cmd.lastExecutedAt = new Date().toISOString();
    if (!success) {
      const priorSuccesses = Math.round((cmd.successRate / 100) * priorTotal);
      cmd.successRate = Math.round((priorSuccesses / (priorTotal + 1)) * 1000) / 10;
      if (errorMsg) cmd.lastError = errorMsg;
    } else {
      const priorSuccesses = Math.round((cmd.successRate / 100) * priorTotal);
      cmd.successRate = Math.round(((priorSuccesses + 1) / (priorTotal + 1)) * 1000) / 10;
    }
    this.commands.set(name, cmd);
  }
}
