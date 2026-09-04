import { AuditEvent } from '../types/auditEvent.js';
import { auditRepository } from '../storage/auditRepository.js';
import { logger } from '../../../utils/logger.js';

type LogEventListener = (event: AuditEvent) => void;

export class LogQueue {
  private buffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 50;
  private readonly flushDelayMs = 500;
  private listeners: Set<LogEventListener> = new Set();

  public enqueue(event: AuditEvent): void {
    this.buffer.push(event);

    // Notifier immédiatement les écouteurs temps réel (ex: stream websocket/dashboard)
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error('Erreur dans LogQueue listener :', err);
      }
    }

    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushDelayMs);
    }
  }

  public flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      auditRepository.insertBatch(batch);
    } catch (err) {
      logger.error('Erreur lors du flush de LogQueue :', err);
      // Réinsérer au début du buffer en cas d'erreur
      this.buffer.unshift(...batch);
    }
  }

  public onEvent(listener: LogEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public get pendingCount(): number {
    return this.buffer.length;
  }
}

export const logQueue = new LogQueue();
