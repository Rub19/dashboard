/**
 * ⚡ ETHONE DISCORD — RESILIENCE 2.0
 * Circuit Breaker Service
 *
 * Implements the Circuit Breaker Pattern:
 * - States: CLOSED (nominal), OPEN (failing, fail-fast), HALF_OPEN (trial probe)
 * - Exponential backoff with random jitter
 * - Discord HTTP 429 Retry-After handling
 * - Hard cap on max retries (never loops infinitely)
 * - Failure threshold and automatic cool-down
 */

import { logger } from '../../utils/logger.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before tripping (default: 5)
  resetTimeoutMs?: number; // Time in OPEN state before testing HALF_OPEN (default: 10000ms)
  maxRetries?: number; // Max retries per operation (default: 3)
  baseDelayMs?: number; // Base exponential delay (default: 500ms)
  maxDelayMs?: number; // Cap for retry delay (default: 8000ms)
}

export interface CircuitMetrics {
  serviceName: string;
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  lastStateChange: string;
  lastError?: string;
  trippedCount: number;
}

export class CircuitBreaker {
  private serviceName: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private trippedCount = 0;
  private lastStateChangeTime = Date.now();
  private lastError?: string;
  private nextAttemptTime = 0;

  private failureThreshold: number;
  private resetTimeoutMs: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(serviceName: string, options: CircuitBreakerOptions = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 8000;
  }

  public getState(): CircuitState {
    // If OPEN and resetTimeout elapsed, transition to HALF_OPEN to probe service
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.transitionTo('HALF_OPEN');
    }
    return this.state;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChangeTime = Date.now();

    if (newState === 'OPEN') {
      this.trippedCount++;
      this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
      logger.error(`[CircuitBreaker:${this.serviceName}] Circuit OPENED. Calls will fail-fast for ${this.resetTimeoutMs}ms.`);
    } else if (newState === 'HALF_OPEN') {
      logger.warn(`[CircuitBreaker:${this.serviceName}] Circuit entered HALF_OPEN. Probing downstream health.`);
    } else if (newState === 'CLOSED') {
      this.failureCount = 0;
      logger.success(`[CircuitBreaker:${this.serviceName}] Circuit CLOSED. Service operating normally.`);
    }
  }

  /**
   * Execute an async operation through the circuit breaker with retries, backoff, and jitter
   */
  public async execute<T>(fn: () => Promise<T>, customRetries?: number): Promise<T> {
    this.totalCalls++;
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      const waitRemaining = Math.max(0, this.nextAttemptTime - Date.now());
      throw new Error(`[CircuitBreaker:${this.serviceName}] Circuit is OPEN. Service unavailable (retry in ${waitRemaining}ms).`);
    }

    const retriesAllowed = customRetries !== undefined ? customRetries : this.maxRetries;
    let attempt = 0;

    while (attempt <= retriesAllowed) {
      try {
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (err: any) {
        attempt++;
        this.lastError = err?.message || String(err);

        // Check for 429 Rate Limit Retry-After
        let retryAfterMs = 0;
        if (err?.status === 429 || err?.response?.status === 429) {
          const header = err?.response?.headers?.['retry-after'] || err?.retryAfter;
          if (header) {
            retryAfterMs = Math.min(this.maxDelayMs, parseFloat(header) * 1000);
          }
        }

        const isLastAttempt = attempt > retriesAllowed;
        if (isLastAttempt) {
          this.onFailure(err);
          throw err;
        }

        // Calculate backoff with jitter
        const exponentialDelay = Math.min(
          this.maxDelayMs,
          this.baseDelayMs * Math.pow(2, attempt - 1)
        );
        const jitter = Math.random() * (this.baseDelayMs * 0.5);
        const delay = retryAfterMs > 0 ? retryAfterMs : exponentialDelay + jitter;

        logger.warn(`[CircuitBreaker:${this.serviceName}] Attempt ${attempt}/${retriesAllowed} failed (${this.lastError}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    throw new Error(`[CircuitBreaker:${this.serviceName}] Exhausted all ${retriesAllowed} retries.`);
  }

  private onSuccess(): void {
    this.successCount++;
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
    } else if (this.state === 'CLOSED') {
      this.failureCount = Math.max(0, this.failureCount - 1); // Gradually decrement
    }
  }

  private onFailure(err: any): void {
    this.failureCount++;
    if (this.state === 'HALF_OPEN') {
      // Immediate trip back to OPEN
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.transitionTo('CLOSED');
  }

  public forceOpen(): void {
    this.transitionTo('OPEN');
  }

  public getMetrics(): CircuitMetrics {
    return {
      serviceName: this.serviceName,
      state: this.getState(),
      failures: this.failureCount,
      successes: this.successCount,
      totalCalls: this.totalCalls,
      lastStateChange: new Date(this.lastStateChangeTime).toISOString(),
      lastError: this.lastError,
      trippedCount: this.trippedCount,
    };
  }
}

export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private circuits: Map<string, CircuitBreaker> = new Map();

  private constructor() {
    // Register standard critical services
    this.getCircuit('discord_rest', { failureThreshold: 5, resetTimeoutMs: 15000, maxRetries: 3 });
    this.getCircuit('supabase_db', { failureThreshold: 3, resetTimeoutMs: 10000, maxRetries: 3 });
    this.getCircuit('ai_gateway', { failureThreshold: 4, resetTimeoutMs: 12000, maxRetries: 2 });
  }

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  public getCircuit(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let circuit = this.circuits.get(serviceName);
    if (!circuit) {
      circuit = new CircuitBreaker(serviceName, options);
      this.circuits.set(serviceName, circuit);
    }
    return circuit;
  }

  public getAllMetrics(): CircuitMetrics[] {
    return Array.from(this.circuits.values()).map((c) => c.getMetrics());
  }

  public resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }
}

export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();
