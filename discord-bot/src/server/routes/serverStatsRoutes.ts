import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { serverStatsStorage, MAX_STAT_CHANNELS } from '../../modules/serverStats/storage/serverStatsStorage.js';
import { serverStatsService, COUNTER_PRESETS } from '../../modules/serverStats/services/serverStatsService.js';
import { renderTemplate, needsMemberFetch, TOKEN_DOCS } from '../../modules/serverStats/services/counterTemplate.js';
import { StatChannelSchema, StatsConfigSchema } from '../../modules/serverStats/types/serverStats.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

/**
 * API Dashboard du module Server Stats.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createServerStatsRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(serverStatsStorage.getOverview(String(req.params.guildId)));
  });

  router.get('/config', (req: Request, res: Response): void => {
    res.json(serverStatsStorage.getConfig(String(req.params.guildId)));
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = StatsConfigSchema.partial().omit({ guildId: true, updatedAt: true });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    const updated = serverStatsStorage.updateConfig(guildId, parsed.data);
    emitConfigUpdated('serverStats', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  // Catalogue des jetons (pour le sélecteur du dashboard) et des ensembles prêts à l'emploi.
  router.get('/tokens', (_req: Request, res: Response): void => {
    res.json({ tokens: TOKEN_DOCS, presets: COUNTER_PRESETS });
  });

  // Aperçu en direct d'un modèle avec les valeurs actuelles du serveur.
  router.post('/preview', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const template = typeof req.body?.template === 'string' ? req.body.template.slice(0, 100) : '';
    if (!guild || !template) {
      res.status(400).json({ error: 'Serveur ou modèle manquant' });
      return;
    }
    if (needsMemberFetch(template)) await guild.members.fetch().catch(() => {});
    res.json(renderTemplate(guild, template));
  });

  // Crée la catégorie « SERVER STATS » et ses salons compteurs verrouillés.
  router.post('/setup', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    const preset = String(req.body?.preset ?? '');
    if (!guild || !COUNTER_PRESETS.some((p) => p.id === preset)) {
      res.status(400).json({ error: 'Serveur ou ensemble inconnu' });
      return;
    }
    try {
      const created = await serverStatsService.createCategory(guild, preset as 'draftbot' | 'statbot');
      emitConfigUpdated('serverStats', guild.id, serverStatsStorage.getConfig(guild.id), 'DASHBOARD', req.user?.id);
      res.json({ success: true, ...created, overview: serverStatsStorage.getOverview(guild.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Création impossible' });
    }
  });

  router.put('/channels/:channelId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const allowed = StatChannelSchema.partial().omit({ guildId: true, channelId: true, lastValue: true, createdAt: true });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success || !parsed.data.type) {
      res.status(400).json({ error: 'Type de statistique requis', details: parsed.success ? undefined : parsed.error.flatten() });
      return;
    }
    if (!serverStatsStorage.get(guildId, channelId) && !serverStatsStorage.canAddMore(guildId)) {
      res.status(429).json({ error: `Limite de ${MAX_STAT_CHANNELS} salons compteurs atteinte.` });
      return;
    }
    const stat = serverStatsStorage.upsert({
      guildId,
      channelId,
      type: parsed.data.type,
      template: parsed.data.template ?? (parsed.data.type === 'custom' ? '{members}' : '{count}'),
      roleId: parsed.data.roleId ?? null,
      lastValue: null,
    });
    const guild = client.guilds.cache.get(guildId);
    if (guild) await serverStatsService.forceRefresh(guild).catch(() => {});
    res.json({ success: true, channel: stat });
  });

  router.delete('/channels/:channelId', (req: Request, res: Response): void => {
    const ok = serverStatsStorage.delete(String(req.params.guildId), String(req.params.channelId));
    res.json({ success: ok });
  });

  router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }
    await serverStatsService.forceRefresh(guild).catch(() => {});
    res.json({ success: true });
  });

  router.get('/targets', (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [], roles: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildText || c.type === ChannelType.GuildStageVoice)
      .map((c) => ({ id: c.id, name: c.name, type: c.type === ChannelType.GuildVoice ? 'voice' : c.type === ChannelType.GuildStageVoice ? 'stage' : 'text' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed)
      .map((r) => ({ id: r.id, name: r.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels, roles });
  });

  return router;
}
