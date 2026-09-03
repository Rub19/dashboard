import { Guild } from 'discord.js';
import { raidConfigService } from './raidConfigService.js';
import { raidActionService } from './raidActionService.js';
import { raidCache } from './raidCache.js';
import { raidRiskEngine } from './raidRiskEngine.js';
import { logger } from '../../../utils/logger.js';

interface RaidModeState {
  active: boolean;
  activatedAt: number;
  activatedBy: string; // 'MANUAL' | 'AUTO' | userId
  reason: string;
  minExpiresAt: number;
  lastSuspiciousActivity: number;
}

class RaidModeService {
  private guildStates = new Map<string, RaidModeState>();
  private autoExitTimer: NodeJS.Timeout;

  constructor() {
    this.autoExitTimer = setInterval(() => this.checkAutoExits(), 30000);
    this.autoExitTimer.unref();
  }

  public isRaidModeActive(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    return Boolean(state && state.active);
  }

  public getState(guildId: string): RaidModeState | null {
    return this.guildStates.get(guildId) || null;
  }

  public getRemainingSeconds(guildId: string): number {
    const state = this.guildStates.get(guildId);
    if (!state || !state.active) return 0;
    const now = Date.now();
    return Math.max(0, Math.round((state.minExpiresAt - now) / 1000));
  }

  public async activateRaidMode(
    guild: Guild,
    reason: string,
    activatedBy: string = 'AUTO'
  ): Promise<boolean> {
    const guildId = guild.id;
    const config = raidConfigService.getConfig(guildId);
    const now = Date.now();

    const minDurationMs = config.raidMode.minDurationMinutes * 60 * 1000;
    const state: RaidModeState = {
      active: true,
      activatedAt: now,
      activatedBy,
      reason,
      minExpiresAt: now + minDurationMs,
      lastSuspiciousActivity: now,
    };

    this.guildStates.set(guildId, state);

    logger.info(`[RaidModeService] 🛡️ RAID MODE ACTIVÉ sur ${guild.name} (Raison: ${reason})`);

    // Appliquer les mesures configurées pour le Raid Mode
    if (config.raidMode.lockdownDesignatedChannels) {
      await raidActionService.executeLockdown(guild, `Raid Mode activé : ${reason}`);
    }

    return true;
  }

  public async deactivateRaidMode(guild: Guild, resolvedBy: string = 'MANUAL'): Promise<boolean> {
    const guildId = guild.id;
    const state = this.guildStates.get(guildId);
    if (!state || !state.active) return false;

    state.active = false;
    this.guildStates.delete(guildId);

    logger.info(`[RaidModeService] 🔓 RAID MODE DÉSACTIVÉ sur ${guild.name} par ${resolvedBy}`);

    // Restaurer les canaux si verrouillés
    await raidActionService.releaseLockdown(guild);

    return true;
  }

  public markSuspiciousActivity(guildId: string): void {
    const state = this.guildStates.get(guildId);
    if (state && state.active) {
      state.lastSuspiciousActivity = Date.now();
    }
  }

  // Vérification périodique d'Auto-Exit
  private async checkAutoExits(): Promise<void> {
    const now = Date.now();

    for (const [guildId, state] of this.guildStates.entries()) {
      if (!state.active) continue;

      const config = raidConfigService.getConfig(guildId);

      // 1. Vérifier la durée minimale requise
      if (now < state.minExpiresAt) {
        continue;
      }

      // 2. Vérifier l'inactivité suspecte
      const quietThresholdMs = config.raidMode.autoExitMinutesWithoutActivity * 60 * 1000;
      const timeSinceSuspicious = now - state.lastSuspiciousActivity;

      if (timeSinceSuspicious < quietThresholdMs) {
        continue;
      }

      // 3. Vérifier le risk score actuel
      const risk = raidRiskEngine.calculateRisk(guildId);
      if (risk.score >= 35) {
        state.lastSuspiciousActivity = now; // Prolonger car le risque est encore présent
        continue;
      }

      // Sortie automatique du Raid Mode
      state.active = false;
      this.guildStates.delete(guildId);

      logger.info(
        `[RaidModeService] Auto-Exit Raid Mode pour ${guildId} après ${config.raidMode.autoExitMinutesWithoutActivity} min sans activité suspecte.`
      );
    }
  }
}

export const raidModeService = new RaidModeService();
