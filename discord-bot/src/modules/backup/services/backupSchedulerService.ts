import { Client } from 'discord.js';
import { backupRepository } from '../storage/backupRepository.js';
import { BackupCollectorService } from './backupCollectorService.js';
import { logger } from '../../../utils/logger.js';

export class BackupSchedulerService {
  private intervalTimer: NodeJS.Timeout | null = null;
  private client: Client | null = null;

  public start(client: Client): void {
    this.client = client;
    if (this.intervalTimer) return;

    logger.info('[BackupScheduler] Démarrage du planificateur de sauvegardes automatiques & retention...');

    // Exécution toutes les 15 minutes
    this.intervalTimer = setInterval(() => {
      this.runScheduledCheck().catch((err) => {
        logger.error('[BackupScheduler] Erreur cycle planifié :', err);
      });
    }, 15 * 60 * 1000);

    // Première exécution rapide après 30 secondes
    setTimeout(() => {
      this.runScheduledCheck().catch(() => {});
    }, 30 * 1000);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      logger.info('[BackupScheduler] Planificateur arrêté.');
    }
  }

  public async runScheduledCheck(): Promise<void> {
    if (!this.client || !this.client.isReady()) return;

    for (const guild of this.client.guilds.cache.values()) {
      try {
        const settings = backupRepository.getSettings(guild.id);
        if (!settings.enabled) continue;

        // 1. Exécution de la retention
        backupRepository.pruneExpired(guild.id);

        // 2. Vérification si un backup automatique est dû
        const kpis = backupRepository.getKpis(guild.id);
        const now = Date.now();

        let intervalHours = 24;
        if (settings.frequency === '6h') intervalHours = 6;
        else if (settings.frequency === '12h') intervalHours = 12;
        else if (settings.frequency === 'weekly') intervalHours = 168;

        const intervalMs = intervalHours * 60 * 60 * 1000;
        const lastTime = kpis.lastBackupAt ? new Date(kpis.lastBackupAt).getTime() : 0;

        if (now - lastTime >= intervalMs) {
          logger.info(`[BackupScheduler] Déclenchement de la sauvegarde automatique pour ${guild.name} (${guild.id})`);
          const snapshot = await BackupCollectorService.createSnapshot({
            guild,
            guildId: guild.id,
            name: `Auto Backup — ${new Date().toLocaleDateString('fr-FR')}`,
            description: `Sauvegarde automatique périodique (${settings.frequency})`,
            type: 'FULL',
            isProtected: false,
            creator: {
              id: 'bot',
              tag: 'ETHONE AutoScheduler',
            },
          });
          backupRepository.save(snapshot);
          logger.info(`[BackupScheduler] Sauvegarde automatique réussie : ${snapshot.backupId}`);
        }
      } catch (err) {
        logger.error(`[BackupScheduler] Erreur traitement guild ${guild.id} :`, err);
      }
    }
  }
}

export const backupSchedulerService = new BackupSchedulerService();
