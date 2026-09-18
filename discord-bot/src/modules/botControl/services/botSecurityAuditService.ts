import { Client, GatewayIntentBits } from 'discord.js';
import { BotSecurityAuditReport } from '../types/index.js';
import { securityStorage } from '../../security/storage/securityStorage.js';

const UNAUTHORIZED_ATTEMPT_TYPES = new Set([
  'MASS_BAN',
  'MASS_KICK',
  'MASS_CHANNEL_DELETE',
  'MASS_ROLE_DELETE',
  'SUSPICIOUS_BOT',
  'DANGEROUS_PERMS',
]);

const DAY_MS = 24 * 60 * 60 * 1000;

// tokenLeakedInLogs is NOT wired to real detection here — that needs actual
// log-scanning infrastructure (persisted, queryable logs), which doesn't
// exist today; a genuinely separate feature. Left as an explicit, disclosed
// false rather than a fabricated value. Everything else below is real:
// intents, score, and (via modules/security's per-guild incident storage,
// aggregated across every guild the client is currently in) the role
// creation / unauthorized attempt counts.
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

    const guildIds =
      client && typeof client.guilds?.cache?.keys === 'function'
        ? Array.from(client.guilds.cache.keys())
        : [];
    const recentIncidents = securityStorage.getIncidentsAcrossGuilds(guildIds, DAY_MS);
    const suspiciousRoleCreations24h = recentIncidents.filter((i) => i.type === 'MASS_ROLE_CREATE').length;
    const unauthorizedAttempts24h = recentIncidents.filter((i) => UNAUTHORIZED_ATTEMPT_TYPES.has(i.type)).length;
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
