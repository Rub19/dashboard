import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { ownerShieldService } from '../../modules/security/services/ownerShieldService.js';
import { logger } from '../../utils/logger.js';

export function createOwnerShieldRouter(client: Client): Router {
  const router = Router();
  ownerShieldService.setClient(client);

  /**
   * GET /api/bot/owner-shield/status
   * Renvoie le statut global du bouclier, l'historique d'interception et le diagnostic par serveur.
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const autoDefenseEnabled = ownerShieldService.isAutoDefenseEnabled();
      const history = ownerShieldService.getInterceptionHistory();
      const guilds = await ownerShieldService.getGuildStatuses();

      res.json({
        success: true,
        data: {
          autoDefenseEnabled,
          history,
          guilds,
          totalGuilds: guilds.length,
          ownerId: '825124006209388616',
        },
      });
    } catch (err: any) {
      logger.error('[OwnerShieldRoute] Erreur GET /status:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/bot/owner-shield/rescue
   * Déclenche une opération de sauvetage d'urgence sur un serveur cible ou sur tous les serveurs.
   */
  router.post('/rescue', async (req: Request, res: Response) => {
    try {
      const { guildId, actions } = req.body;

      if (!guildId || guildId === 'all') {
        // Sauvetage global sur tous les serveurs
        const allResults: Record<string, any> = {};
        for (const [gId, g] of client.guilds.cache) {
          try {
            const res = await ownerShieldService.rescueOwner(gId, actions || {});
            allResults[gId] = { guildName: g.name, ...res };
          } catch (gErr: any) {
            allResults[gId] = { guildName: g.name, success: false, error: gErr.message };
          }
        }

        return res.json({
          success: true,
          message: `Sauvetage global exécuté sur ${client.guilds.cache.size} serveur(s).`,
          results: allResults,
        });
      }

      // Sauvetage ciblé sur un serveur spécifique
      const result = await ownerShieldService.rescueOwner(guildId, actions || {});
      res.json({
        message: `Sauvetage exécuté sur le serveur ${guildId}.`,
        ...result,
      });
    } catch (err: any) {
      logger.error('[OwnerShieldRoute] Erreur POST /rescue:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/bot/owner-shield/toggle
   * Active ou désactive la protection automatique en temps réel.
   */
  router.post('/toggle', (req: Request, res: Response) => {
    try {
      const { enabled } = req.body;
      const newState = Boolean(enabled);
      ownerShieldService.setAutoDefenseEnabled(newState);

      res.json({
        success: true,
        autoDefenseEnabled: newState,
        message: `Protection automatique de l'Owner ${newState ? 'activée' : 'désactivée'}.`,
      });
    } catch (err: any) {
      logger.error('[OwnerShieldRoute] Erreur POST /toggle:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
