import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { serverStatsStorage, MAX_STAT_CHANNELS } from '../../modules/serverStats/storage/serverStatsStorage.js';
import { serverStatsService } from '../../modules/serverStats/services/serverStatsService.js';
import { StatChannelSchema, StatsConfigSchema } from '../../modules/serverStats/types/serverStats.js';

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
    res.json({ success: true, config: serverStatsStorage.updateConfig(guildId, parsed.data) });
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
      template: parsed.data.template ?? '{count}',
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
