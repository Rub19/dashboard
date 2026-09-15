import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { securityStorage } from '../../modules/security/storage/securityStorage.js';
import { AntiNukeConfigSchema } from '../../modules/security/types/securityConfig.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

const NUKE_INCIDENT_TYPES = ['MASS_BAN', 'MASS_CHANNEL_DELETE', 'MASS_ROLE_DELETE'];

// Scoped deliberately to SecurityConfig's `antiNuke` sub-object only — the
// sibling antiRaid/antiSpam/whitelist/lockdown fields on the same
// SecurityConfig belong to a separate, already-exposed system
// (modules/antiRaid) and are intentionally left untouched by every read and
// write in this router.
export function createAntiNukeRouter(_discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const config = securityStorage.getConfig(guildId).antiNuke;
      const incidents = securityStorage.getIncidents(guildId).filter((i) => NUKE_INCIDENT_TYPES.includes(i.type));
      const openIncidents = incidents.filter((i) => i.status === 'open');
      res.json({
        success: true,
        enabled: config.enabled,
        action: config.action,
        totalIncidents: incidents.length,
        openIncidents: openIncidents.length,
        recentIncidents: incidents.slice(0, 10),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erreur récupération overview Anti-Nuke" });
    }
  });

  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      res.json({ success: true, config: securityStorage.getConfig(guildId).antiNuke });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération configuration Anti-Nuke' });
    }
  });

  router.put('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const parsed = AntiNukeConfigSchema.partial().parse(req.body);
      const current = securityStorage.getConfig(guildId);
      const updated = securityStorage.updateConfig(guildId, {
        antiNuke: { ...current.antiNuke, ...parsed },
      });
      emitConfigUpdated('antiNuke', guildId, updated.antiNuke, 'DASHBOARD', req.user?.id);
      res.json({ success: true, config: updated.antiNuke });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Configuration Anti-Nuke invalide' });
    }
  });

  router.get('/incidents', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const incidents = securityStorage.getIncidents(guildId).filter((i) => NUKE_INCIDENT_TYPES.includes(i.type));
      res.json({ success: true, incidents });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erreur récupération incidents Anti-Nuke' });
    }
  });

  router.post('/incidents/:incidentId/resolve', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const incidentId = String(req.params.incidentId);
    const resolved = securityStorage.resolveIncident(guildId, incidentId);
    if (!resolved) {
      res.status(404).json({ error: 'Incident introuvable.' });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
