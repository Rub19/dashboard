import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { securityStorage } from '../../modules/security/storage/securityStorage.js';
import { securityEngine } from '../../modules/security/services/securityEngine.js';

export function createSecurityRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble du centre de sécurité & Live Monitor
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const joinsLastMinute = securityEngine.getJoinsLastMinute(guildId);
    const messagesLastMinute = securityEngine.getMessagesLastMinute(guildId);
    const raidModeActive = securityEngine.isRaidModeActive(guildId);

    const overview = securityStorage.getOverview(
      guildId,
      joinsLastMinute,
      messagesLastMinute,
      raidModeActive
    );
    res.json(overview);
  });

  // 2. Configuration de sécurité
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = securityStorage.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = securityStorage.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Configuration de sécurité invalide.' });
    }
  });

  // 3. Activer le Lockdown d'urgence (Panic Button)
  router.post('/lockdown', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { durationMinutes = 15, reason = 'Verrouillage manuel d’urgence déclenché depuis le Dashboard' } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur Discord introuvable.' });
      return;
    }

    try {
      const result = await securityEngine.triggerLockdown(guild, durationMinutes, reason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Échec du verrouillage.' });
    }
  });

  // 4. Lever le Lockdown
  router.post('/release-lockdown', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur Discord introuvable.' });
      return;
    }

    try {
      const result = await securityEngine.releaseLockdown(guild);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Échec du déverrouillage.' });
    }
  });

  // 5. Liste des incidents
  router.get('/incidents', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const incidents = securityStorage.getIncidents(guildId);
    res.json({ incidents });
  });

  // 6. Résoudre un incident
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
