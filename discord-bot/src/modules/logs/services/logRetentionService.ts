import { auditRepository } from '../storage/auditRepository.js';
import { logger } from '../../../utils/logger.js';

export class LogRetentionService {
  private static intervalTimer: NodeJS.Timeout | null = null;

  public static startScheduler(): void {
    if (this.intervalTimer) return;
    // Exécution toutes les 12 heures
    this.intervalTimer = setInterval(() => {
      this.runRetentionCleanup();
    }, 12 * 60 * 60 * 1000);
  }

  public static runRetentionCleanup(): number {
    try {
      // Par défaut purge des logs globaux de plus de 90 jours (ou selon config max)
      const purged = auditRepository.purgeOlderThanDays(90);
      if (purged > 0) {
        logger.info(`[LogRetentionService] ${purged} logs expirés purgés avec succès.`);
      }
      return purged;
    } catch (err) {
      logger.error('Erreur lors de la purge de retention des logs :', err);
      return 0;
    }
  }
}
