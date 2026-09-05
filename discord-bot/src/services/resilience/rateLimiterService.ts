/**
 * ⚡ ETHONE DISCORD — RATE LIMITER & ANTI-ABUSE SERVICE 2.0
 *
 * Provides multi-tier, multi-dimensional rate limiting and anti-spam protection:
 * - Dimensions: User, IP, Guild, and Action
 * - Categories: READ (120/min), CONFIG (30/min), SENSITIVE (6/min), EXPENSIVE (10/min)
 * - Bot Owner Handling: Relaxed capacity (5x), but maintains loop & integrity guards
 * - Accurate HTTP 429 response calculation with `Retry-After` seconds
 * - Abuse Activity Audit Logging
 */

import { logger } from '../../utils/logger.js';
import { config } from '../../config.js';

export type RateLimitCategory = 'READ' | 'CONFIG' | 'SENSITIVE' | 'EXPENSIVE' | 'GLOBAL';

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
  category: RateLimitCategory;
}

export interface AbuseLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  guildId?: string;
  ip?: string;
  category: RateLimitCategory;
  endpoint?: string;
  action?: string;
  attempts: number;
  retryAfterSeconds: number;
  correlationId?: string;
}

export class RateLimiterService {
  private static instance: RateLimiterService;

  // In-memory sliding window timestamps: key -> array of request timestamps in ms
  private hits: Map<string, number[]> = new Map();
  private abuseLogs: AbuseLogEntry[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Default tiers
  private tierConfigs: Record<RateLimitCategory, RateLimitConfig> = {
    READ: { limit: 120, windowMs: 60 * 1000 },       // 120 req / minute
    CONFIG: { limit: 30, windowMs: 60 * 1000 },      // 30 mutations / minute
    SENSITIVE: { limit: 6, windowMs: 60 * 1000 },     // 6 heavy operations (backup/restore/sync) / minute
    EXPENSIVE: { limit: 10, windowMs: 60 * 1000 },    // 10 AI / export operations / minute
    GLOBAL: { limit: 250, windowMs: 60 * 1000 },      // 250 req / minute overall per IP
  };

  private constructor() {
    this.startCleanup();
  }

  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  private startCleanup(): void {
    // Purge inactive keys every minute
    this.cleanupInterval = setInterval(() => {
      this.purgeExpiredHits();
    }, 60 * 1000);
    this.cleanupInterval.unref?.();
  }

  private purgeExpiredHits(): void {
    const now = Date.now();
    const maxWindow = 5 * 60 * 1000;
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => now - t < maxWindow);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  /**
   * Evaluates if a request is allowed according to its tier and dimension
   */
  public checkRateLimit(params: {
    key: string;
    category: RateLimitCategory;
    userId?: string;
    guildId?: string;
    ip?: string;
    endpoint?: string;
    action?: string;
    correlationId?: string;
    customLimit?: number;
    customWindowMs?: number;
  }): RateLimitResult {
    const now = Date.now();
    const isOwner = params.userId === config.botOwnerId;

    const baseTier = this.tierConfigs[params.category] || this.tierConfigs.READ;
    const windowMs = params.customWindowMs || baseTier.windowMs;

    // Bot owner receives relaxed multiplier (e.g. 5x), but is never exempt from basic loop safeguards
    const multiplier = isOwner ? 5 : 1;
    const effectiveLimit = (params.customLimit || baseTier.limit) * multiplier;

    const bucketKey = `${params.category}:${params.key}`;
    const timestamps = (this.hits.get(bucketKey) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= effectiveLimit) {
      // Limit reached: calculate time until the oldest request leaves the sliding window
      const oldestInWindow = timestamps[0];
      const resetAt = oldestInWindow + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

      // Record in abuse log buffer
      this.recordAbuse({
        id: `abuse_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: params.userId,
        guildId: params.guildId,
        ip: params.ip,
        category: params.category,
        endpoint: params.endpoint,
        action: params.action,
        attempts: timestamps.length + 1,
        retryAfterSeconds,
        correlationId: params.correlationId,
      });

      logger.warn(
        `[RateLimiter] 429 Throttle triggered on [${params.category}] for key "${params.key}". Retry after: ${retryAfterSeconds}s (attempts: ${timestamps.length})`
      );

      return {
        allowed: false,
        remaining: 0,
        limit: effectiveLimit,
        resetAt,
        retryAfterSeconds,
        category: params.category,
      };
    }

    // Request is allowed: record hit timestamp
    timestamps.push(now);
    this.hits.set(bucketKey, timestamps);

    const remaining = Math.max(0, effectiveLimit - timestamps.length);
    const resetAt = timestamps[0] + windowMs;

    return {
      allowed: true,
      remaining,
      limit: effectiveLimit,
      resetAt,
      retryAfterSeconds: 0,
      category: params.category,
    };
  }

  private recordAbuse(entry: AbuseLogEntry): void {
    this.abuseLogs.unshift(entry);
    if (this.abuseLogs.length > 500) {
      this.abuseLogs = this.abuseLogs.slice(0, 500);
    }
  }

  public getAbuseLogs(guildId?: string, limit = 50): AbuseLogEntry[] {
    if (!guildId) {
      return this.abuseLogs.slice(0, limit);
    }
    return this.abuseLogs.filter((a) => !a.guildId || a.guildId === guildId).slice(0, limit);
  }

  public clearAbuseLogs(): void {
    this.abuseLogs = [];
  }

  public getStats(): {
    trackedBuckets: number;
    totalAbuseLogs: number;
    recentAbuseCount: number;
  } {
    return {
      trackedBuckets: this.hits.size,
      totalAbuseLogs: this.abuseLogs.length,
      recentAbuseCount: this.abuseLogs.filter((a) => Date.now() - new Date(a.timestamp).getTime() < 300000).length,
    };
  }

  public reset(): void {
    this.hits.clear();
    this.abuseLogs = [];
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.hits.clear();
  }
}

export const rateLimiterService = RateLimiterService.getInstance();
