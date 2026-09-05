/**
 * 🔄 ETHONE DISCORD — DISCORD API RETRY & RATE LIMIT MANAGER 2.0
 *
 * Wraps Discord API calls with intelligent resilience:
 * - Handles HTTP 429 (Rate Limited) respecting `retry_after`
 * - Handles HTTP 500, 502, 503, 504 with Exponential Backoff + Jitter
 * - Strict retry limits (max 3 retries, zero infinite loops)
 * - Integrates with CircuitBreakerService for fast-failing during outages
 */

import { logger } from '../../utils/logger.js';
import { circuitBreakerRegistry } from './circuitBreakerService.js';

export interface RetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  circuitName?: string;
  abortOnCodes?: number[];
}

export class DiscordApiRetryManager {
  private static instance: DiscordApiRetryManager;

  private constructor() {}

  public static getInstance(): DiscordApiRetryManager {
    if (!DiscordApiRetryManager.instance) {
      DiscordApiRetryManager.instance = new DiscordApiRetryManager();
    }
    return DiscordApiRetryManager.instance;
  }

  /**
   * Convenience wrapper with operationName in options
   */
  public async executeWithRetry<T>(
    operationFn: () => Promise<T>,
    options: RetryOptions & { operationName?: string } = {}
  ): Promise<T> {
    const opName = options.operationName || 'discord_api_op';
    return this.execute(opName, operationFn, options);
  }

  /**
   * Executes an async Discord API operation with smart retry and rate-limit backoff
   */
  public async execute<T>(
    operationName: string,
    operationFn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const initialBackoffMs = options.initialBackoffMs ?? (options as any).baseDelayMs ?? 300;
    const maxBackoffMs = options.maxBackoffMs ?? 8000;
    const circuitName = options.circuitName ?? 'discord_rest';
    const abortOnCodes = options.abortOnCodes ?? [400, 401, 403, 404];

    const circuit = circuitBreakerRegistry.getCircuit(circuitName);

    return circuit.execute(async () => {
      let attempt = 0;

      while (true) {
        try {
          return await operationFn();
        } catch (err: any) {
          attempt++;

          const status = err.status || err.code || err.rawError?.status;
          const is429 = status === 429 || err.message?.includes('rate limit') || err.message?.includes('429');

          // Never retry explicit client errors (401 Unauthorized, 403 Forbidden, 404 Not Found)
          if (abortOnCodes.includes(status)) {
            logger.warn(`[DiscordRetry] Non-retryable HTTP ${status} for "${operationName}". Aborting immediately.`);
            throw err;
          }

          if (attempt > maxRetries) {
            logger.error(
              `[DiscordRetry] Max retries (${maxRetries}) exceeded for "${operationName}". Failing operation.`,
              err
            );
            throw err;
          }

          let delayMs = initialBackoffMs * Math.pow(2, attempt - 1);

          // Handle Discord 429 Rate Limit
          if (is429) {
            const retryAfterSec =
              err.retry_after ||
              err.rawError?.retry_after ||
              (err.headers?.get ? parseFloat(err.headers.get('retry-after') || '0') : 0);

            if (retryAfterSec > 0) {
              delayMs = Math.min(maxBackoffMs, Math.ceil(retryAfterSec * 1000));
            } else {
              delayMs = Math.min(maxBackoffMs, 1000 * attempt);
            }
            logger.warn(
              `[DiscordRetry] Discord 429 detected on "${operationName}". Backing off for ${delayMs}ms (Attempt ${attempt}/${maxRetries})`
            );
          } else {
            // Apply jitter (+/- 20%) to avoid thundering herd problem
            const jitter = delayMs * (0.8 + Math.random() * 0.4);
            delayMs = Math.min(maxBackoffMs, Math.round(jitter));
            logger.warn(
              `[DiscordRetry] Transient error on "${operationName}" (Attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }, 0);
  }
}

export const discordApiRetryManager = DiscordApiRetryManager.getInstance();
