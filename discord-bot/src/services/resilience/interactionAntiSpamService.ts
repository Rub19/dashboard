/**
 * 🛡️ ETHONE DISCORD — INTERACTION ANTI-SPAM SERVICE 2.0
 *
 * Protects Discord Bot interactions against:
 * 1. Button click spamming (rapid multi-clicks / double clicks)
 * 2. Slash command burst flooding
 * 3. Gateway event reflection loops (Bot action -> Gateway event -> Bot action loop)
 */

import { logger } from '../../utils/logger.js';

export interface InteractionCheckResult {
  allowed: boolean;
  retryAfterMs: number;
  message?: string;
  reason?: 'BUTTON_COOLDOWN' | 'COMMAND_THROTTLED' | 'ECHO_LOOP_DETECTED';
}

export class InteractionAntiSpamService {
  private static instance: InteractionAntiSpamService;

  // Track button clicks: `${userId}:${customId}` -> timestamp
  private buttonClicks: Map<string, number> = new Map();

  // Track slash command executions: `${userId}` -> timestamps[]
  private commandHistory: Map<string, number[]> = new Map();

  // Track bot action signatures to prevent Gateway echo loops: `${guildId}:${action}:${targetId}` -> timestamp
  private actionSignatures: Map<string, number> = new Map();

  // Clean interval
  private cleanupTimer: NodeJS.Timeout | null = null;

  public constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): InteractionAntiSpamService {
    if (!InteractionAntiSpamService.instance) {
      InteractionAntiSpamService.instance = new InteractionAntiSpamService();
    }
    return InteractionAntiSpamService.instance;
  }

  private startCleanupInterval(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Check if a button click is allowed (debounce rapid multi-clicks)
   * Default debounce: 800ms
   */
  public checkButton(userId: string, customId: string, debounceMs = 800): InteractionCheckResult {
    const now = Date.now();
    const key = `${userId}:${customId}`;
    const lastClick = this.buttonClicks.get(key);

    if (lastClick) {
      const elapsed = now - lastClick;
      if (elapsed < debounceMs) {
        const retryAfterMs = debounceMs - elapsed;
        return {
          allowed: false,
          retryAfterMs,
          reason: 'BUTTON_COOLDOWN',
          message: `Doucement ! Veuillez patienter ${(retryAfterMs / 1000).toFixed(1)}s avant de recliquer.`,
        };
      }
    }

    this.buttonClicks.set(key, now);
    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Check if a slash command is allowed (burst throttling)
   * Default: max 5 commands in 5000ms
   */
  public checkCommand(
    userId: string,
    commandName: string,
    maxBurst = 5,
    windowMs = 5000
  ): InteractionCheckResult {
    const now = Date.now();
    let history = this.commandHistory.get(userId);

    if (!history) {
      history = [];
      this.commandHistory.set(userId, history);
    }

    // Filter out timestamps older than windowMs
    history = history.filter((t) => now - t < windowMs);
    this.commandHistory.set(userId, history);

    if (history.length >= maxBurst) {
      const oldestInWindow = history[0];
      const retryAfterMs = Math.max(0, windowMs - (now - oldestInWindow));
      return {
        allowed: false,
        retryAfterMs,
        reason: 'COMMAND_THROTTLED',
        message: `Limite de commandes atteinte (${maxBurst}/${(windowMs / 1000)}s). Veuillez patienter ${(retryAfterMs / 1000).toFixed(1)}s.`,
      };
    }

    history.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Register an outgoing bot action signature to detect echo loops
   */
  public registerOutgoingAction(guildId: string, action: string, targetId: string): string {
    const sig = `${guildId}:${action}:${targetId}`;
    this.actionSignatures.set(sig, Date.now());
    return sig;
  }

  /**
   * Check if an incoming Gateway event is an echo of a bot-initiated action
   * within a given window (e.g. 3000ms)
   */
  public isEchoLoop(guildId: string, action: string, targetId: string, windowMs = 3000): boolean {
    const sig = `${guildId}:${action}:${targetId}`;
    const timestamp = this.actionSignatures.get(sig);
    if (!timestamp) return false;

    const now = Date.now();
    if (now - timestamp < windowMs) {
      logger.info(`[AntiSpam] Echo loop detected and suppressed for signature: ${sig}`);
      return true;
    }

    this.actionSignatures.delete(sig);
    return false;
  }

  /**
   * Cleanup expired entries
   */
  public cleanup(): void {
    const now = Date.now();

    for (const [key, timestamp] of this.buttonClicks.entries()) {
      if (now - timestamp > 10000) {
        this.buttonClicks.delete(key);
      }
    }

    for (const [userId, history] of this.commandHistory.entries()) {
      const active = history.filter((t) => now - t < 10000);
      if (active.length === 0) {
        this.commandHistory.delete(userId);
      } else {
        this.commandHistory.set(userId, active);
      }
    }

    for (const [sig, timestamp] of this.actionSignatures.entries()) {
      if (now - timestamp > 10000) {
        this.actionSignatures.delete(sig);
      }
    }
  }

  /**
   * Clear all records (useful for testing)
   */
  public reset(): void {
    this.buttonClicks.clear();
    this.commandHistory.clear();
    this.actionSignatures.clear();
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const interactionAntiSpamService = InteractionAntiSpamService.getInstance();
