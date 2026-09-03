import { Client } from 'discord.js';
import { Giveaway } from '../types/giveaway.js';
import { giveawayStorage } from '../storage/giveawayStorage.js';
import { giveawayService } from './giveawayService.js';
import { logger } from '../../../utils/logger.js';

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
      logger.info(`Fin du giveaway "${giveaway.prize}" (${giveaway.id}), tirage en cours...`);
      try {
        await giveawayService.drawWinners(giveaway.id, client);
      } catch (err) {
        logger.error(`Erreur lors du tirage du giveaway ${giveaway.id} :`, err);
      }
    }, delay);

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
