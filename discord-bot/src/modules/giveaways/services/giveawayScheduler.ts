import { Client } from 'discord.js';
import { Giveaway } from '../types/giveaway.js';
import { giveawayStorage } from '../storage/giveawayStorage.js';
import { giveawayService } from './giveawayService.js';
import { logger } from '../../../utils/logger.js';
import { isModuleEnabled } from '../../../services/moduleRegistry.js';

/** Plus grand délai accepté par setTimeout (~24,8 jours) : au-delà, Node le ramène à 1 ms et le timer part tout de suite. */
const MAX_TIMER_MS = 2_147_483_647;
/** Module désactivé : on repasse vérifier régulièrement, le tirage n'est fait qu'une fois le module réactivé. */
const DISABLED_RECHECK_MS = 10 * 60 * 1000;

class GiveawayScheduler {
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Initialise et restaure les timers de tous les giveaways actifs après redémarrage
   */
  public init(client: Client) {
    const all = giveawayStorage.getAll();
    const active = all.filter((g) => g.status === 'active');

    logger.info(`Restauration de ${active.length} giveaway(s) actif(s)...`);

    for (const gw of active) {
      this.schedule(gw, client);
    }
  }

  /**
   * Planifie la fin automatique d'un giveaway
   */
  public schedule(giveaway: Giveaway, client: Client) {
    this.cancel(giveaway.id);

    const now = Date.now();
    const end = new Date(giveaway.endsAt).getTime();
    const delay = Math.max(0, end - now);

    // Module Tirages désactivé sur ce serveur : aucun tirage ni annonce automatique, on attend la réactivation.
    if (delay <= 0 && !isModuleEnabled(giveaway.guildId, 'giveaways')) {
      const wait = setTimeout(() => {
        this.timers.delete(giveaway.id);
        const fresh = giveawayStorage.getById(giveaway.id);
        if (fresh && fresh.status === 'active') this.schedule(fresh, client);
      }, DISABLED_RECHECK_MS);
      wait.unref();
      this.timers.set(giveaway.id, wait);
      return;
    }

    if (delay <= 0) {
      // Clôture immédiate si déjà expiré
      logger.info(`Giveaway "${giveaway.prize}" (${giveaway.id}) expiré hors-ligne, tirage immédiat.`);
      giveawayService.drawWinners(giveaway.id, client).catch((err) => {
        logger.error('Erreur lors du tirage immédiat :', err);
      });
      return;
    }

    const timer = setTimeout(async () => {
      this.timers.delete(giveaway.id);
      // Giveaway plus long que le délai maximal d'un timer : on n'a attendu qu'une partie, on reprogramme le reste
      // (sans ça, un tirage à 30 jours se déclenchait aussitôt).
      const fresh = giveawayStorage.getById(giveaway.id);
      if (fresh && fresh.status === 'active' && new Date(fresh.endsAt).getTime() - Date.now() > 1000) {
        this.schedule(fresh, client);
        return;
      }
      if (fresh && fresh.status === 'active' && !isModuleEnabled(fresh.guildId, 'giveaways')) {
        this.schedule(fresh, client); // module désactivé : mise en attente (voir plus haut)
        return;
      }
      logger.info(`Fin du giveaway "${giveaway.prize}" (${giveaway.id}), tirage en cours...`);
      try {
        await giveawayService.drawWinners(giveaway.id, client);
      } catch (err) {
        logger.error(`Erreur lors du tirage du giveaway ${giveaway.id} :`, err);
      }
    }, Math.min(delay, MAX_TIMER_MS));

    // .unref() pour ne jamais bloquer l'extinction du processus Node
    timer.unref();
    this.timers.set(giveaway.id, timer);
  }

  /**
   * Annule un timer planifié
   */
  public cancel(giveawayId: string) {
    const timer = this.timers.get(giveawayId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(giveawayId);
    }
  }
}

export const giveawayScheduler = new GiveawayScheduler();
