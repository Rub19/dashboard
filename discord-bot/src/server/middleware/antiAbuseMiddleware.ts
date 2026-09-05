/**
 * 🛡️ ETHONE DISCORD — ANTI-ABUSE & RATE LIMITING MIDDLEWARE 2.0
 *
 * Enforces production security:
 * 1. Multi-tier Sliding Window Rate Limiting (READ, CONFIG, SENSITIVE, EXPENSIVE)
 * 2. Idempotency Key deduplication (X-Idempotency-Key / Idempotency-Key)
 * 3. Guild-Level Concurrency Locking (Mutual exclusion for heavy operations)
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiterService, RateLimitCategory } from '../../services/resilience/rateLimiterService.js';
import { idempotencyService } from '../../services/resilience/idempotencyService.js';
import { guildOperationLockService } from '../../services/resilience/guildOperationLockService.js';

/**
 * Express Middleware for multi-tier rate limiting
 */
export function rateLimit(
  category: RateLimitCategory,
  options: {
    byGuild?: boolean;
    actionName?: string;
    customLimit?: number;
    customWindowMs?: number;
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?.id;
    const guildId = (req.params.guildId as string) || (req.body?.guildId as string) || undefined;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const correlationId = (req.headers['x-correlation-id'] as string) || (req.body?.correlationId as string);

    // Build rate limit key
    let key = '';
    if (options.byGuild && guildId) {
      key = `guild:${guildId}:${options.actionName || req.path}`;
    } else if (userId) {
      key = `user:${userId}:${options.actionName || req.path}`;
    } else {
      key = `ip:${ip}:${options.actionName || req.path}`;
    }

    const check = rateLimiterService.checkRateLimit({
      key,
      category,
      userId,
      guildId,
      ip,
      endpoint: req.originalUrl || req.url,
      action: options.actionName || req.method,
      correlationId,
      customLimit: options.customLimit,
      customWindowMs: options.customWindowMs,
    });

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', check.limit);
    res.setHeader('X-RateLimit-Remaining', check.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(check.resetAt / 1000));

    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: `Trop de requêtes. Action temporairement limitée (${category.toLowerCase()}). Réessayez dans ${check.retryAfterSeconds} seconde(s).`,
        category,
        retryAfter: check.retryAfterSeconds,
        resetAt: check.resetAt,
      });
      return;
    }

    next();
  };
}

/**
 * Express Middleware for Idempotency Key validation and caching
 */
export function idempotent(options: { scopePrefix?: string; ttlMs?: number } = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      (req.body?.idempotencyKey as string);

    if (!rawKey) {
      // If no idempotency key provided, proceed normally
      return next();
    }

    const guildId = (req.params.guildId as string) || (req.body?.guildId as string) || 'global';
    const scope = options.scopePrefix ? `${options.scopePrefix}:${guildId}` : guildId;
    const existing = idempotencyService.getRecord(rawKey, scope);

    if (existing) {
      if (existing.state === 'COMPLETED') {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.setHeader('X-Idempotent-Key', rawKey);
        res.status(existing.statusCode || 200).json(existing.responsePayload);
        return;
      }

      if (existing.state === 'PENDING') {
        res.status(409).json({
          success: false,
          error: 'Une requête identique avec cette clé d\'idempotence est actuellement en cours de traitement.',
          idempotencyKey: rawKey,
        });
        return;
      }
    }

    // Intercept response to store result in IdempotencyService
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyService.storeResponse(rawKey, body, res.statusCode, scope);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Express Middleware for Guild Operation Lock (Mutual exclusion)
 */
export function guildLock(action: string, ttlMs = 45000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const guildId = (req.params.guildId as string) || (req.body?.guildId as string);
    if (!guildId) {
      return next();
    }

    const holder = (req as any).user?.username || (req as any).user?.id || req.ip || 'unknown';
    const correlationId = (req.headers['x-correlation-id'] as string) || (req.body?.correlationId as string);

    const lockResult = guildOperationLockService.acquireLock(guildId, action, holder, ttlMs, correlationId);
    if (!lockResult.acquired) {
      res.status(409).json({
        success: false,
        error: lockResult.error || `Une opération "${action}" est déjà en cours sur ce serveur.`,
        action,
        guildId,
        lockedBy: lockResult.currentHolder,
      });
      return;
    }

    // Release lock when HTTP response finishes or closes
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        guildOperationLockService.releaseLock(guildId, action, holder);
      }
    };

    res.once('finish', release);
    res.once('close', release);

    next();
  };
}
