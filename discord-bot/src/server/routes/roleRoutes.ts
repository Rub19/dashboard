import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { autoRoleService } from '../../modules/roles/services/autoRoleService.js';
import { rolePanelService } from '../../modules/roles/services/rolePanelService.js';
import { RolePermissionService } from '../../modules/roles/services/rolePermissionService.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { logger } from '../../utils/logger.js';
import { rateLimit, idempotent } from '../middleware/antiAbuseMiddleware.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

export function createRoleRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Configuration des Auto-Rôles à l'arrivée
  router.get('/autorole', rateLimit('READ'), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = autoRoleService.getConfig(guildId);
    res.json({ config });
  });

  router.patch(
    '/autorole',
    rateLimit('CONFIG', { byGuild: true, actionName: 'autorole_config_update' }),
    idempotent(),
    async (req: Request, res: Response): Promise<void> => {
      const guildId = String(req.params.guildId);
      try {
        const updated = autoRoleService.updateConfig(guildId, req.body);
        emitConfigUpdated('autorole', guildId, updated, 'DASHBOARD', req.user?.id);
        res.json({ success: true, config: updated });
      } catch (err: any) {
        res.status(400).json({ error: err.message || 'Données invalides' });
      }
    }
  );

  // 2. Liste des Role Panels
  router.get('/panels', rateLimit('READ'), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const panels = rolePanelService.getPanels(guildId);
    res.json({ panels });
  });

  // 3. Créer ou modifier un Role Panel
  router.post(
    '/panels',
    rateLimit('CONFIG', { byGuild: true, actionName: 'role_panel_save' }),
    idempotent(),
    async (req: Request, res: Response): Promise<void> => {
      const guildId = String(req.params.guildId);
      try {
        const saved = rolePanelService.savePanel(guildId, req.body);
        emitConfigUpdated('rolePanels', guildId, saved, 'DASHBOARD', req.user?.id);
        res.json({ success: true, panel: saved });
      } catch (err: any) {
        res.status(400).json({ error: err.message || 'Données de panel invalides' });
      }
    }
  );

  // 4. Publier un Role Panel sur Discord
  router.post(
    '/panels/:panelId/publish',
    rateLimit('SENSITIVE', { byGuild: true, actionName: 'role_panel_publish' }),
    idempotent(),
    async (req: Request, res: Response): Promise<void> => {
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

  // 8. Détection auto des rôles + présets de permissions (même moteur que /permissions
  // côté Discord — cf. commands/admin/permissionsCommand.ts). Le dashboard n'exposait
  // rien de ceci jusqu'ici : Bot Control > Configuration affichait 5 rôles inventés.
  router.get('/permissions/presets', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable.' });
      return;
    }
    try {
      const detectedRoles = RolePermissionService.analyzeGuildRoles(guild);
      const presets = RolePermissionService.generatePresets(guild);
      const activePreset = guildConfigService.getConfig(guildId).activePreset || 'PRESET_BALANCED';
      res.json({ detectedRoles, presets, activePreset });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erreur d'analyse des rôles." });
    }
  });

  // 9. Appliquer un préset (même écriture que le bouton Discord : guildConfigService
  // émet déjà la sync live, pas besoin d'un emitConfigUpdated séparé ici).
  router.post('/permissions/apply-preset', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable.' });
      return;
    }
    const presetId = String(req.body?.presetId || '');
    const presets = RolePermissionService.generatePresets(guild);
    const selected = presets.find((p) => p.id === presetId);
    if (!selected) {
      res.status(400).json({ error: 'Préset invalide.' });
      return;
    }
    try {
      guildConfigService.updateConfig(
        guildId,
        {
          adminRoles: selected.adminRoles,
          modRoles: selected.modRoles,
          vipRoles: selected.vipRoles,
          activePreset: selected.id,
        },
        { source: 'DASHBOARD', actorId: req.user?.id }
      );
      res.json({ success: true, preset: selected });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erreur lors de l'application du préset." });
    }
  });

  return router;
}
