/**
 * 🔁 ETHONE DISCORD — RESILIENCE 2.0
 * Event Deduplication & Idempotency Service
 *
 * Ensures that:
 * - Duplicate events (e.g. WELCOME_CONFIG_UPDATED delivered twice) are identified
 * - Side-effects are executed exactly once
 * - Memory is kept bounded with automatic sliding-window expiration
 */

export class EventDeduplicationService {
  private static instance: EventDeduplicationService;
  private processedIds: Map<string, number> = new Map();
  private ttlMs: number;
  private cleanupInterval: NodeJS.Timeout;

  private constructor(ttlMs = 120000) { // 2 minutes window
    this.ttlMs = ttlMs;
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 30000);
    this.cleanupInterval.unref?.();
  }

  public static getInstance(): EventDeduplicationService {
    if (!EventDeduplicationService.instance) {
      EventDeduplicationService.instance = new EventDeduplicationService();
    }
    return EventDeduplicationService.instance;
  }

  /**
   * Check if an event or mutation ID was already processed.
   * If not seen, records it and returns false.
   * If already seen, returns true (is duplicate).
   */
  public isDuplicate(eventId: string): boolean {
    if (!eventId) return false;
    const now = Date.now();
    const existing = this.processedIds.get(eventId);

    if (existing && now - existing < this.ttlMs) {
      return true; // Already processed!
    }

    this.processedIds.set(eventId, now);
    return false;
  }

  /**
   * Manually record an ID as processed
   */
  public record(eventId: string): void {
    if (eventId) {
      this.processedIds.set(eventId, Date.now());
    }
  }

  /**
   * Remove expired entries to keep memory bounded
   */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, timestamp] of this.processedIds.entries()) {
      if (now - timestamp >= this.ttlMs) {
        this.processedIds.delete(id);
      }
    }
  }

  public clear(): void {
    this.processedIds.clear();
  }

  public size(): number {
    return this.processedIds.size;
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const eventDeduplicationService = EventDeduplicationService.getInstance();
