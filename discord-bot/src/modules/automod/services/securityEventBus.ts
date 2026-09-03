import { EventEmitter } from 'events';
import { logger } from '../../../utils/logger.js';

export interface AutoModViolationEvent {
  guildId: string;
  userId: string;
  userTag: string;
  channelId: string;
  riskScore: number;
  triggerReason: string;
  detectors: string[];
}

export interface RaidModeEvent {
  guildId: string;
  active: boolean;
  reason?: string;
}

class SecurityEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  // Émis par AutoMod lors d'une détection à haut risque
  public emitAutoModViolation(event: AutoModViolationEvent): void {
    this.emit('AUTOMOD_VIOLATION', event);
    if (event.riskScore >= 60) {
      this.emit('AUTOMOD_HIGH_RISK', event);
    }
  }

  // Émis par Anti-Raid lors du basculement du Raid Mode
  public emitRaidModeChanged(event: RaidModeEvent): void {
    logger.info(`[SecurityEventBus] Raid Mode status changed for ${event.guildId}: ${event.active}`);
    this.emit('RAID_MODE_CHANGED', event);
  }

  public onAutoModHighRisk(handler: (event: AutoModViolationEvent) => void): void {
    this.on('AUTOMOD_HIGH_RISK', handler);
  }

  public onRaidModeChanged(handler: (event: RaidModeEvent) => void): void {
    this.on('RAID_MODE_CHANGED', handler);
  }
}

export const securityEventBus = new SecurityEventBus();
