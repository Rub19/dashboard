import fs from 'fs';
import path from 'path';
import { ActivityRotationConfig, RotationActivityItem } from '../types/index.js';
import { PresenceService } from './presenceService.js';
import { logger } from '../../../utils/logger.js';

const DEFAULT_CONFIG: ActivityRotationConfig = {
  enabled: false,
  intervalSeconds: 60,
  order: 'sequential',
  activities: [
    { id: 'rot_1', type: 'Playing', text: 'Valorant', weight: 40 },
    { id: 'rot_2', type: 'Watching', text: '{guildCount} serveurs Discord', weight: 30 },
    { id: 'rot_3', type: 'Listening', text: 'Spotify', weight: 20 },
    { id: 'rot_4', type: 'Competing', text: 'ETHONE Tournaments', weight: 10 },
  ],
  currentIndex: 0,
};

/**
 * Seul moteur de rotation d'activité du bot (un ancien système parallèle, codé en dur dans
 * PresenceService, tournait simultanément sans coordination — supprimé). Persisté sur disque :
 * `enabled` survit désormais à un redémarrage du bot (sans ça, chaque `pm2 restart` remettait
 * silencieusement la rotation à "désactivée" sans que rien ne le signale sur le dashboard).
 */
export class ActivityRotationEngine {
  private static instance: ActivityRotationEngine;
  private timer: NodeJS.Timeout | null = null;
  private configPath = path.resolve(process.cwd(), 'data', 'activity_rotation.json');

  private config: ActivityRotationConfig = { ...DEFAULT_CONFIG };

  private constructor() {
    this.loadData();
  }

  public static getInstance(): ActivityRotationEngine {
    if (!ActivityRotationEngine.instance) {
      ActivityRotationEngine.instance = new ActivityRotationEngine();
    }
    return ActivityRotationEngine.instance;
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        this.config = { ...DEFAULT_CONFIG, ...parsed, currentIndex: 0 };
      }
    } catch (err) {
      logger.error('[ActivityRotationEngine] Erreur chargement activity_rotation.json :', err);
    }
  }

  private saveData(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ActivityRotationEngine] Erreur sauvegarde activity_rotation.json :', err);
    }
  }

  /** À appeler une fois au démarrage du bot : reprend la rotation si elle était active avant le redémarrage
   * (setInterval ne survit pas à un redémarrage, mais `enabled` est maintenant persisté). */
  public resumeIfEnabled(): void {
    if (this.config.enabled) this.restartTimer();
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

    this.saveData();
    return { ...this.config };
  }

  public startRotation() {
    this.config.enabled = true;
    this.restartTimer();
    this.executeNextRotation();
    this.saveData();
    logger.info('[ActivityRotationEngine] Rotation automatique des activités activée.');
  }

  public stopRotation() {
    this.config.enabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.config.nextRotationAt = undefined;
    this.saveData();
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
    this.timer.unref();
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
    }

    return this.config.activities[0];
  }

  /** Force la prochaine activité de rotation immédiatement (ex : après un changement manuel de statut
   * depuis le panneau Discord, pour ne pas rester bloqué sur une activité figée jusqu'au prochain tick). */
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
