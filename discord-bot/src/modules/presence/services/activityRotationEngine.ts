import { ActivityRotationConfig, RotationActivityItem } from '../types/index.js';
import { PresenceService } from './presenceService.js';
import { logger } from '../../../utils/logger.js';

export class ActivityRotationEngine {
  private static instance: ActivityRotationEngine;
  private timer: NodeJS.Timeout | null = null;

  private config: ActivityRotationConfig = {
    enabled: false,
    intervalSeconds: 60, // 60s par défaut
    order: 'sequential',
    activities: [
      { id: 'rot_1', type: 'Playing', text: 'Valorant', weight: 40 },
      { id: 'rot_2', type: 'Watching', text: '{guildCount} serveurs Discord', weight: 30 },
      { id: 'rot_3', type: 'Listening', text: 'Spotify', weight: 20 },
      { id: 'rot_4', type: 'Competing', text: 'ETHONE Tournaments', weight: 10 },
    ],
    currentIndex: 0,
  };

  private constructor() {}

  public static getInstance(): ActivityRotationEngine {
    if (!ActivityRotationEngine.instance) {
      ActivityRotationEngine.instance = new ActivityRotationEngine();
    }
    return ActivityRotationEngine.instance;
  }

  public getConfig(): ActivityRotationConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<ActivityRotationConfig>): ActivityRotationConfig {
    const wasEnabled = this.config.enabled;
    this.config = {
      ...this.config,
      ...partial,
      intervalSeconds: Math.max(30, partial.intervalSeconds ?? this.config.intervalSeconds),
    };

    if (this.config.enabled && !wasEnabled) {
      this.startRotation();
    } else if (!this.config.enabled && wasEnabled) {
      this.stopRotation();
    } else if (this.config.enabled && partial.intervalSeconds !== undefined) {
      this.restartTimer();
    }

    return { ...this.config };
  }

  public startRotation() {
    this.config.enabled = true;
    this.restartTimer();
    this.executeNextRotation();
    logger.info('[ActivityRotationEngine] Rotation automatique des activités activée.');
  }

  public stopRotation() {
    this.config.enabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.config.nextRotationAt = undefined;
    logger.info('[ActivityRotationEngine] Rotation automatique des activités désactivée.');
  }

  private restartTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const intervalMs = Math.max(30000, this.config.intervalSeconds * 1000);
    this.config.nextRotationAt = new Date(Date.now() + intervalMs).toISOString();

    this.timer = setInterval(() => {
      this.executeNextRotation();
    }, intervalMs);
  }

  private pickNextItem(): RotationActivityItem | null {
    if (this.config.activities.length === 0) return null;

    if (this.config.order === 'sequential') {
      this.config.currentIndex = (this.config.currentIndex + 1) % this.config.activities.length;
      return this.config.activities[this.config.currentIndex];
    }

    if (this.config.order === 'random') {
      const randIdx = Math.floor(Math.random() * this.config.activities.length);
      this.config.currentIndex = randIdx;
      return this.config.activities[randIdx];
    }

    if (this.config.order === 'weighted') {
      const totalWeight = this.config.activities.reduce((acc, a) => acc + (a.weight || 10), 0);
      let randomNum = Math.random() * totalWeight;

      for (let i = 0; i < this.config.activities.length; i++) {
        const item = this.config.activities[i];
        const weight = item.weight || 10;
        if (randomNum < weight) {
          this.config.currentIndex = i;
          return item;
        }
        randomNum -= weight;
      }
      return this.config.activities[0];
    }

    return this.config.activities[0];
  }

  public executeNextRotation() {
    if (!this.config.enabled || this.config.activities.length === 0) return;

    const item = this.pickNextItem();
    if (!item) return;

    const presenceService = PresenceService.getInstance();
    const currentStatus = presenceService.getCurrentState().status;

    presenceService.updatePresence(
      currentStatus,
      {
        type: item.type,
        name: item.text,
        url: item.url,
      },
      'Rotation Engine',
      'system_rotation',
      'rotation',
      `Rotation automatique (${this.config.order})`
    );

    presenceService.recordRotationExecuted();

    this.config.lastRotatedAt = new Date().toISOString();
    this.config.nextRotationAt = new Date(Date.now() + this.config.intervalSeconds * 1000).toISOString();
  }
}
