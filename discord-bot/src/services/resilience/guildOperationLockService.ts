/**
 * 🔒 ETHONE DISCORD — GUILD OPERATION LOCK SERVICE 2.0
 *
 * Enforces mutual exclusion for sensitive, high-impact operations per guild:
 * - BACKUP_CREATE
 * - BACKUP_RESTORE
 * - SYNC
 * - RECONCILE
 * - MASS_ACTION
 *
 * Prevents race conditions and Discord flood when:
 * - Multiple users or multiple browser tabs trigger heavy actions simultaneously
 * - Auto-expiring lease ensures zero permanent deadlock
 */

import { logger } from '../../utils/logger.js';

export interface GuildLock {
  guildId: string;
  action: string;
  holder: string;
  acquiredAt: number;
  expiresAt: number;
  correlationId?: string;
}

export class GuildOperationLockService {
  private static instance: GuildOperationLockService;
  private locks: Map<string, GuildLock> = new Map(); // key: `${guildId}:${action}`
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanup();
  }

  public static getInstance(): GuildOperationLockService {
    if (!GuildOperationLockService.instance) {
      GuildOperationLockService.instance = new GuildOperationLockService();
    }
    return GuildOperationLockService.instance;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.purgeExpiredLocks();
    }, 15 * 1000);
    this.cleanupInterval.unref?.();
  }

  private getLockKey(guildId: string, action: string): string {
    return `${guildId}:${action.toUpperCase()}`;
  }

  private purgeExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (now > lock.expiresAt) {
        logger.info(`[GuildLock] Expired lock lease released automatically: ${key} held by ${lock.holder}`);
        this.locks.delete(key);
      }
    }
  }

  /**
   * Attempts to acquire exclusive lock for a guild action
   */
  public acquireLock(
    guildId: string,
    action: string,
    holder: string,
    ttlMs = 45000,
    correlationId?: string
  ): { acquired: boolean; currentHolder?: string; error?: string } {
    const key = this.getLockKey(guildId, action);
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing) {
      if (now < existing.expiresAt) {
        logger.warn(
          `[GuildLock] Concurrency conflict: Lock "${key}" already held by ${existing.holder}. Request from ${holder} rejected.`
        );
        return {
          acquired: false,
          currentHolder: existing.holder,
          error: `Une opération de type "${action}" est déjà en cours sur ce serveur (exécutée par ${existing.holder}).`,
        };
      } else {
        // Expired lease: reclaim
        this.locks.delete(key);
      }
    }

    const newLock: GuildLock = {
      guildId,
      action: action.toUpperCase(),
      holder,
      acquiredAt: now,
      expiresAt: now + ttlMs,
      correlationId,
    };

    this.locks.set(key, newLock);
    logger.info(`[GuildLock] Lock "${key}" acquired by ${holder} for ${ttlMs / 1000}s`);

    return { acquired: true };
  }

  /**
   * Releases an acquired lock
   */
  public releaseLock(guildId: string, action: string, holder: string): boolean {
    const key = this.getLockKey(guildId, action);
    const existing = this.locks.get(key);

    if (existing && existing.holder === holder) {
      this.locks.delete(key);
      logger.info(`[GuildLock] Lock "${key}" released by ${holder}`);
      return true;
    }

    return false;
  }

  /**
   * Checks if an action is currently locked for a guild
   */
  public isLocked(guildId: string, action: string): boolean {
    const key = this.getLockKey(guildId, action);
    const existing = this.locks.get(key);
    if (!existing) return false;
    return Date.now() < existing.expiresAt;
  }

  public getAllActiveLocks(): GuildLock[] {
    const now = Date.now();
    const active: GuildLock[] = [];
    for (const lock of this.locks.values()) {
      if (now < lock.expiresAt) {
        active.push({ ...lock });
      }
    }
    return active;
  }

  /**
   * Executes an asynchronous task with automatic lock acquisition and release
   */
  public async withLock<T>(
    guildId: string,
    action: string,
    holder: string,
    fn: () => Promise<T>,
    ttlMs = 45000,
    correlationId?: string
  ): Promise<T> {
    const lockRes = this.acquireLock(guildId, action, holder, ttlMs, correlationId);
    if (!lockRes.acquired) {
      const err: any = new Error(lockRes.error || `Action "${action}" currently locked`);
      err.statusCode = 409;
      err.code = 'OPERATION_LOCKED';
      throw err;
    }

    try {
      return await fn();
    } finally {
      this.releaseLock(guildId, action, holder);
    }
  }

  public clear(): void {
    this.locks.clear();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.locks.clear();
  }
}

export const guildOperationLockService = GuildOperationLockService.getInstance();
