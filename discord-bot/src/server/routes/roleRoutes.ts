import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { autoRoleService } from '../../modules/roles/services/autoRoleService.js';
import { rolePanelService } from '../../modules/roles/services/rolePanelService.js';
import { logger } from '../../utils/logger.js';

export function createRoleRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Configuration des Auto-Rôles à l'arrivée
  router.get('/autorole', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = autoRoleService.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/autorole', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = autoRoleService.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données invalides' });
    }
  });

  // 2. Liste des Role Panels
  router.get('/panels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panels = rolePanelService.getPanels(guildId);
    res.json({ panels });
  });

  // 3. Créer ou modifier un Role Panel
  router.post('/panels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const saved = rolePanelService.savePanel(guildId, req.body);
      res.json({ success: true, panel: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de panel invalides' });
    }
  });

  // 4. Publier un Role Panel sur Discord
  router.post('/panels/:panelId/publish', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panelId = String(req.params.panelId);
    const { channelId } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable.' });
      return;
    }

    const panel = rolePanelService.getPanel(guildId, panelId);
    if (!panel) {
      res.status(404).json({ error: 'Panel introuvable.' });
      return;
    }

    const targetChannelId = channelId || panel.channelId;
    if (!targetChannelId) {
      res.status(400).json({ error: 'Veuillez sélectionner un salon textuel de destination.' });
      return;
    }

    try {
      const result = await rolePanelService.publishPanel(guild, panelId, targetChannelId);
      res.json(result);
    } catch (err: any) {
      logger.error('Erreur publication Role Panel :', err);
      res.status(500).json({ error: err.message || 'Échec de la publication sur Discord.' });
    }
  });

  // 5. Synchroniser et vérifier l'intégrité d'un Role Panel
  router.post('/panels/:panelId/sync', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panelId = String(req.params.panelId);

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable.' });
      return;
    }

    try {
      const result = await rolePanelService.syncPanel(guild, panelId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur lors de la synchronisation.' });
    }
  });

  // 6. Dupliquer un Role Panel
  router.post('/panels/:panelId/duplicate', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panelId = String(req.params.panelId);

    try {
      const duplicated = rolePanelService.duplicatePanel(guildId, panelId);
      if (!duplicated) {
        res.status(404).json({ error: 'Panel original introuvable.' });
        return;
      }
      res.json({ success: true, panel: duplicated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur duplication.' });
    }
  });

  // 7. Supprimer un Role Panel
  router.delete('/panels/:panelId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panelId = String(req.params.panelId);
    const deleteMessage = req.query.deleteMessage === 'true';

    try {
      const deleted = await rolePanelService.deletePanel(guildId, panelId, deleteMessage, discordClient);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur suppression.' });
    }
  });

  return router;
}
