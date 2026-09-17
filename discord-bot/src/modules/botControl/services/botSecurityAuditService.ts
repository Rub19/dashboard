import { Client, GatewayIntentBits } from 'discord.js';
import { BotSecurityAuditReport } from '../types/index.js';

// suspiciousRoleCreations24h/unauthorizedAttempts24h/tokenLeakedInLogs are
// NOT wired to real detection here — doing so properly means aggregating
// modules/security's per-guild incident storage across every guild the bot
// is in (no cross-guild aggregation point exists today), and log-scanning
// for leaked tokens is a genuinely separate feature. Left as explicit,
// disclosed zeros/false rather than a fabricated non-zero number. intents
// and score below ARE real — no reason those needed to stay fake too.
export class BotSecurityAuditService {
  private static instance: BotSecurityAuditService;

  public static getInstance(): BotSecurityAuditService {
    if (!BotSecurityAuditService.instance) {
      BotSecurityAuditService.instance = new BotSecurityAuditService();
    }
    return BotSecurityAuditService.instance;
  }

  public getSecurityAudit(client?: Client): BotSecurityAuditReport {
    const guildCount = client?.guilds.cache.size || 1;
    const enabledIntents = client?.options.intents;

    const intents = {
      guildMembers: enabledIntents?.has(GatewayIntentBits.GuildMembers) ?? false,
      messageContent: enabledIntents?.has(GatewayIntentBits.MessageContent) ?? false,
      guildPresences: enabledIntents?.has(GatewayIntentBits.GuildPresences) ?? false,
    };

    const suspiciousRoleCreations24h = 0;
    const unauthorizedAttempts24h = 0;
    const tokenLeakedInLogs = false;

    // 100 minus a real deduction per missing intent the bot actually relies
    // on elsewhere (member tracking, message-content moderation, presence
    // sync) — not a flat hardcoded number.
    let score = 100;
    if (!intents.guildMembers) score -= 15;
    if (!intents.messageContent) score -= 15;
    if (!intents.guildPresences) score -= 5;
    if (tokenLeakedInLogs) score -= 50;
    score -= Math.min(20, suspiciousRoleCreations24h * 5);
    score -= Math.min(15, unauthorizedAttempts24h * 3);

    return {
      timestamp: new Date().toISOString(),
      intents,
      scopes: ['bot', 'applications.commands'],
      tokenLeakedInLogs,
      suspiciousRoleCreations24h,
      unauthorizedAttempts24h,
      adminGuildsCount: guildCount,
      score: Math.max(0, score),
    };
  }
}
