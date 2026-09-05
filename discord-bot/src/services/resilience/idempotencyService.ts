/**
 * 🔒 ETHONE DISCORD — IDEMPOTENCY SERVICE 2.0
 *
 * Ensures that sensitive and mutative operations (create ticket, restore backup,
 * create giveaway, sync, mutate config) are executed EXACTLY ONCE, even when:
 * - The user double/triple clicks a button
 * - Network timeouts trigger automatic HTTP client retries
 * - Multiple browser tabs submit the same action
 * - Proxies or intermediate gateways retry dropped connections
 */

import { logger } from '../../utils/logger.js';

export type IdempotencyState = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface IdempotencyRecord<T = any> {
  key: string;
  scope?: string;
  state: IdempotencyState;
  createdAt: number;
  completedAt?: number;
  responsePayload?: T;
  statusCode?: number;
  error?: string;
  correlationId?: string;
  userId?: string;
  inFlightPromise?: Promise<T>;
}

export class IdempotencyService {
  private static instance: IdempotencyService;
  private records: Map<string, IdempotencyRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startAutoCleanup();
  }

  public static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  private startAutoCleanup(): void {
    // Evict expired keys every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.evictExpired(24 * 60 * 60 * 1000); // 24h default TTL
    }, 5 * 60 * 1000);
    this.cleanupInterval.unref?.();
  }

  private getCompositeKey(key: string, scope?: string): string {
    return scope ? `${scope}:${key}` : key;
  }

  /**
   * Executes an operation with idempotency guarantees
   */
  public async executeIdempotent<T>(
    key: string,
    operationFn: () => Promise<T>,
    options: {
      scope?: string;
      ttlMs?: number;
      correlationId?: string;
      userId?: string;
    } = {}
  ): Promise<{
    result: T;
    isDuplicate: boolean;
    state: IdempotencyState;
    executedAt: number;
  }> {
    const compositeKey = this.getCompositeKey(key, options.scope);
    const existing = this.records.get(compositeKey);

    // 1. If completed record exists, return cached response immediately
    if (existing && existing.state === 'COMPLETED') {
      logger.info(`[Idempotency] Cache HIT for key "${compositeKey}". Returning cached idempotent result.`);
      return {
        result: existing.responsePayload as T,
        isDuplicate: true,
        state: 'COMPLETED',
        executedAt: existing.completedAt || existing.createdAt,
      };
    }

    // 2. If request is currently in-flight, coalesce with the running promise
    if (existing && existing.state === 'PENDING' && existing.inFlightPromise) {
      logger.info(`[Idempotency] Request coalesced for in-flight key "${compositeKey}". Awaiting active execution.`);
      try {
        const result = await existing.inFlightPromise;
        return {
          result,
          isDuplicate: true,
          state: 'COMPLETED',
          executedAt: existing.completedAt || Date.now(),
        };
      } catch (err) {
        throw err;
      }
    }

    // 3. Mark as PENDING and execute
    let inFlightResolver!: (value: T) => void;
    let inFlightRejecter!: (reason: any) => void;

    const inFlightPromise = new Promise<T>((resolve, reject) => {
      inFlightResolver = resolve;
      inFlightRejecter = reject;
    });
    inFlightPromise.catch(() => {});

    const record: IdempotencyRecord<T> = {
      key,
      scope: options.scope,
      state: 'PENDING',
      createdAt: Date.now(),
      correlationId: options.correlationId,
      userId: options.userId,
      inFlightPromise,
    };

    this.records.set(compositeKey, record);

    try {
      const result = await operationFn();

      record.state = 'COMPLETED';
      record.completedAt = Date.now();
      record.responsePayload = result;
      delete record.inFlightPromise;

      inFlightResolver(result);

      logger.info(`[Idempotency] Successfully executed and cached idempotent operation for key "${compositeKey}".`);

      return {
        result,
        isDuplicate: false,
        state: 'COMPLETED',
        executedAt: record.completedAt,
      };
    } catch (err: any) {
      record.state = 'FAILED';
      record.error = err.message || 'Operation failed';
      delete record.inFlightPromise;

      inFlightRejecter(err);

      // On failure, remove from records after 10 seconds so client can retry
      setTimeout(() => {
        if (this.records.get(compositeKey)?.state === 'FAILED') {
          this.records.delete(compositeKey);
        }
      }, 10000);

      throw err;
    }
  }

  /**
   * Marks an operation as pending for HTTP middleware and sets up promise coalescing
   */
  public markPending(key: string, scope?: string): { inFlight: boolean; promise: Promise<any> } {
    const compositeKey = this.getCompositeKey(key, scope);
    const existing = this.records.get(compositeKey);
    if (existing && existing.state === 'PENDING' && existing.inFlightPromise) {
      return { inFlight: true, promise: existing.inFlightPromise };
    }

    let inFlightResolver!: (value: any) => void;
    let inFlightRejecter!: (reason: any) => void;
    const inFlightPromise = new Promise<any>((resolve, reject) => {
      inFlightResolver = resolve;
      inFlightRejecter = reject;
    });
    inFlightPromise.catch(() => {});

    (inFlightPromise as any).resolve = inFlightResolver;
    (inFlightPromise as any).reject = inFlightRejecter;

    this.records.set(compositeKey, {
      key,
      scope,
      state: 'PENDING',
      createdAt: Date.now(),
      inFlightPromise,
    });

    return { inFlight: false, promise: inFlightPromise };
  }

  /**
   * Stores pre-computed HTTP response for an idempotency key
   */
  public storeResponse(key: string, payload: any, statusCode = 200, scope?: string): void {
    const compositeKey = this.getCompositeKey(key, scope);
    const existing = this.records.get(compositeKey);
    if (existing && existing.inFlightPromise && (existing.inFlightPromise as any).resolve) {
      (existing.inFlightPromise as any).resolve({ payload, statusCode });
    }
    this.records.set(compositeKey, {
      key,
      scope,
      state: 'COMPLETED',
      createdAt: existing?.createdAt || Date.now(),
      completedAt: Date.now(),
      responsePayload: payload,
      statusCode,
    });
  }

  /**
   * Stores error response for an idempotency key
   */
  public storeError(key: string, error: any, scope?: string): void {
    const compositeKey = this.getCompositeKey(key, scope);
    const existing = this.records.get(compositeKey);
    if (existing && existing.inFlightPromise && (existing.inFlightPromise as any).reject) {
      (existing.inFlightPromise as any).reject(error);
    }
    this.records.set(compositeKey, {
      key,
      scope,
      state: 'FAILED',
      createdAt: existing?.createdAt || Date.now(),
      completedAt: Date.now(),
      error: error?.message || String(error),
    });
  }

  public getRecord(key: string, scope?: string): IdempotencyRecord | null {
    return this.records.get(this.getCompositeKey(key, scope)) || null;
  }

  public evictExpired(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let count = 0;
    for (const [k, v] of this.records.entries()) {
      if (v.createdAt < cutoff) {
        this.records.delete(k);
        count++;
      }
    }
    return count;
  }

  public getStats(): {
    totalRecords: number;
    pendingRecords: number;
    completedRecords: number;
    failedRecords: number;
  } {
    let pending = 0;
    let completed = 0;
    let failed = 0;
    for (const r of this.records.values()) {
      if (r.state === 'PENDING') pending++;
      else if (r.state === 'COMPLETED') completed++;
      else if (r.state === 'FAILED') failed++;
    }
    return {
      totalRecords: this.records.size,
      pendingRecords: pending,
      completedRecords: completed,
      failedRecords: failed,
    };
  }

  public clear(): void {
    this.records.clear();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records.clear();
  }
}

export const idempotencyService = IdempotencyService.getInstance();
