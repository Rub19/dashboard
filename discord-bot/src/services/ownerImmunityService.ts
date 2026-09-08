import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Contrôle central du "God Mode" du Bot Owner : l'immunité totale contre toute
 * sanction (warn/ban/kick/timeout/quarantaine/AutoMod/Anti-Raid...), sur tous les
 * serveurs. Activée par défaut. Le Bot Owner peut la désactiver temporairement
 * via `/godmode etat:off` (ex. pour tester une commande de modération sur
 * lui-même), puis la réactiver avec `/godmode etat:on`.
 *
 * L'état vit en mémoire (pas persisté) : il revient à "activé" par défaut à
 * chaque redémarrage du bot, pour ne jamais laisser l'immunité désactivée par
 * accident après un crash/déploiement.
 */
class OwnerImmunityService {
  private static instance: OwnerImmunityService;
  private enabled = true;

  public static getInstance(): OwnerImmunityService {
    if (!OwnerImmunityService.instance) {
      OwnerImmunityService.instance = new OwnerImmunityService();
    }
    return OwnerImmunityService.instance;
  }

  /** True si `userId` doit être protégé de toute sanction en ce moment. */
  public isOwnerImmune(userId: string | null | undefined): boolean {
    if (!userId || !config.botOwnerId) return false;
    return this.enabled && userId === config.botOwnerId;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean, actor = 'Bot Owner'): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    logger.warn(`[OwnerImmunity] God Mode ${enabled ? 'RÉACTIVÉ' : 'DÉSACTIVÉ'} par ${actor}.`);
  }
}

export const ownerImmunityService = OwnerImmunityService.getInstance();
