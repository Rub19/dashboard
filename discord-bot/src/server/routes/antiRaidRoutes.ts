import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { raidDetectionService } from '../../modules/antiRaid/services/raidDetectionService.js';
import { raidConfigService } from '../../modules/antiRaid/services/raidConfigService.js';
import { raidModeService } from '../../modules/antiRaid/services/raidModeService.js';
import { raidActionService } from '../../modules/antiRaid/services/raidActionService.js';
import { raidIncidentService } from '../../modules/antiRaid/services/raidIncidentService.js';
import { raidCache } from '../../modules/antiRaid/services/raidCache.js';
import { AntiRaidConfigSchema } from '../../modules/antiRaid/types/antiRaid.js';

export function createAntiRaidRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. STATUT & RISK SCORE EN TEMPS RÉEL
  router.get('/status', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const metrics = raidDetectionService.getLiveMetrics(guildId);
      res.json({
        success: true,
        guildId,
        metrics,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération statut Anti-Raid' });
    }
  });

  // 2. CONFIGURATION COMPLETE
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const config = raidConfigService.getConfig(guildId);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération configuration' });
    }
  });

  router.put('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      // Validation Zod
      const parsed = AntiRaidConfigSchema.partial().parse(req.body);
      const updated = raidConfigService.updateConfig(guildId, parsed);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Configuration Anti-Raid invalide' });
    }
  });

  // 3. CONTRÔLE RAID MODE (ACTIVER / DÉSACTIVER)
  router.post('/raid-mode', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { active, reason = 'Déclenché manuellement depuis le Dashboard ETHONE' } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur Discord introuvable' });
      return;
    }

    try {
      if (active) {
        await raidModeService.activateRaidMode(guild, reason, req.user?.username || 'Dashboard User');
      } else {
        await raidModeService.deactivateRaidMode(guild, req.user?.username || 'Dashboard User');
      }

      const metrics = raidDetectionService.getLiveMetrics(guildId);
      res.json({
        success: true,
        raidModeActive: raidModeService.isRaidModeActive(guildId),
        metrics,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur mise à jour Raid Mode' });
    }
  });

  // 4. VERROUILLAGE D'URGENCE (LOCKDOWN)
  router.post('/lockdown', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { active, reason = 'Action manuelle depuis le Dashboard' } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur Discord introuvable' });
      return;
    }

    try {
      let count = 0;
      if (active) {
        count = await raidActionService.executeLockdown(guild, reason);
      } else {
        count = await raidActionService.releaseLockdown(guild);
      }

      res.json({
        success: true,
        lockdownActive: raidActionService.isLockdownActive(guildId),
        affectedChannelsCount: count,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur gestion lockdown' });
    }
  });

  // 5. QUARANTAINE DES JOINS RÉCENTS
  router.post('/quarantine-all', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { seconds = 60 } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur Discord introuvable' });
      return;
    }

    try {
      const recentMembers = raidCache.getRecentJoinMembers(guildId, seconds);
      let quarantinedCount = 0;

      for (const info of recentMembers) {
        const member = guild.members.cache.get(info.userId);
        if (member) {
          const success = await raidActionService.executeMemberAction(
            member,
            'QUARANTINE',
            'Quarantaine d’urgence manuelle déclenchée depuis le dashboard'
          );
          if (success) quarantinedCount++;
        }
      }

      res.json({
        success: true,
        quarantinedCount,
        totalChecked: recentMembers.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur mise en quarantaine' });
    }
  });

  // 6. HISTORIQUE DES INCIDENTS
  router.get('/incidents', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    try {
      const incidents = raidIncidentService.getIncidents(guildId, limit);
      res.json({ success: true, incidents });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur historique incidents' });
    }
  });

  // 7. INVESTIGATION DÉTAILLÉE D'UN INCIDENT
  router.get('/incidents/:incidentId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const incidentId = String(req.params.incidentId);

    try {
      const incident = raidIncidentService.getIncidentById(guildId, incidentId);
      if (!incident) {
        res.status(404).json({ error: 'Incident introuvable' });
        return;
      }
      res.json({ success: true, incident });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur investigation incident' });
    }
  });

  // 8. GESTION DE LA WHITELIST / CONFIANCE
  router.post('/whitelist', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = raidConfigService.updateWhitelist(guildId, req.body);
      res.json({ success: true, whitelist: updated.whitelist });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Mise à jour whitelist invalide' });
    }
  });

  // 9. LIVE METRICS STREAM / POLLING LÉGER
  router.get('/live-metrics', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const metrics = raidDetectionService.getLiveMetrics(guildId);
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur live metrics' });
    }
  });

  return router;
}
