import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { streamerStorage } from '../../modules/streamers/storage/streamerStorage.js';
import { streamerService } from '../../modules/streamers/services/streamerService.js';
import { StreamPlatformSchema, StreamerConfigSchema, StreamerPingModeSchema } from '../../modules/streamers/types/streamer.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { DESTINATION_CHANNEL_TYPES } from '../../utils/channelSend.js';

export function createStreamerRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  // Aperçu complet pour le Dashboard
  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(streamerStorage.getOverview(guildId));
  });

  // Liste des streamers
  router.get('/list', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json({ streamers: streamerStorage.getStreamers(guildId) });
  });

  // Configuration du module
  router.get('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(streamerStorage.getConfig(guildId));
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = StreamerConfigSchema.partial().omit({
      guildId: true,
      updatedAt: true,
    });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    const updated = streamerStorage.updateConfig(guildId, parsed.data);
    emitConfigUpdated('streamers', guildId, updated, 'DASHBOARD', req.user?.id);
    res.json({ success: true, config: updated });
  });

  // Ajout d'un streamer
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const {
      platform,
      username,
      channelId,
      pingMode,
      pingRoleId,
      discordUserId,
      gameFilter,
      minViewers,
      customColor,
      customMessage,
    } = req.body || {};

    const platParse = StreamPlatformSchema.safeParse(platform);
    if (!platParse.success || !username || typeof username !== 'string') {
      res.status(400).json({ error: 'Plateforme (twitch|youtube|kick) et pseudo requis' });
      return;
    }

    const cleanUser = username.trim();
    const plat = platParse.data;

    const existing = streamerStorage.getStreamers(guildId).find(
      (s) => s.platform === plat && s.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (existing) {
      res.status(409).json({ error: 'Ce streamer est déjà enregistré sur ce serveur' });
      return;
    }

    // Sonde en direct
    const probe = await streamerService.fetchLiveStatus(plat, cleanUser);

    const validPingMode = StreamerPingModeSchema.safeParse(pingMode).success ? pingMode : 'default';

    const added = streamerStorage.addStreamer({
      guildId,
      platform: plat,
      username: cleanUser,
      displayName: probe.displayName,
      channelId: channelId || null,
      pingMode: validPingMode,
      pingRoleId: pingRoleId || null,
      discordUserId: discordUserId || null,
      gameFilter: gameFilter ? String(gameFilter).trim() : null,
      minViewers: typeof minViewers === 'number' && minViewers >= 0 ? minViewers : 0,
      customColor: customColor ? String(customColor).trim() : null,
      paused: false,
      customMessage: customMessage || null,
      isLive: probe.isLive,
      title: probe.title || null,
      game: probe.game || null,
      viewers: probe.viewers || null,
      thumbnailUrl: probe.thumbnailUrl || null,
      avatarUrl: probe.avatarUrl || null,
      streamUrl: probe.streamUrl,
      lastAlertChannelId: null,
      lastAlertMessageId: null,
      lastLiveAt: probe.isLive ? new Date().toISOString() : null,
      lastStreamId: probe.streamId || null,
    });

    emitConfigUpdated('streamers', guildId, { action: 'added', streamer: added }, 'DASHBOARD', req.user?.id);
    res.status(201).json({ success: true, streamer: added });
  });

  // Suppression d'un streamer
  router.delete('/:id', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const ok = streamerStorage.removeStreamer(guildId, id);
    if (!ok) {
      res.status(404).json({ error: 'Streamer introuvable' });
      return;
    }
    emitConfigUpdated('streamers', guildId, { action: 'deleted', id }, 'DASHBOARD', req.user?.id);
    res.json({ success: true });
  });

  // Modification d'un streamer
  router.patch('/:id', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const {
      channelId,
      pingMode,
      pingRoleId,
      discordUserId,
      gameFilter,
      minViewers,
      customColor,
      paused,
      customMessage,
    } = req.body || {};

    const updated = streamerStorage.updateStreamer(guildId, id, {
      ...(channelId !== undefined ? { channelId: channelId || null } : {}),
      ...(pingMode !== undefined ? { pingMode } : {}),
      ...(pingRoleId !== undefined ? { pingRoleId: pingRoleId || null } : {}),
      ...(discordUserId !== undefined ? { discordUserId: discordUserId || null } : {}),
      ...(gameFilter !== undefined ? { gameFilter: gameFilter ? String(gameFilter).trim() : null } : {}),
      ...(minViewers !== undefined ? { minViewers: Number(minViewers) || 0 } : {}),
      ...(customColor !== undefined ? { customColor: customColor ? String(customColor).trim() : null } : {}),
      ...(paused !== undefined ? { paused: Boolean(paused) } : {}),
      ...(customMessage !== undefined ? { customMessage: customMessage || null } : {}),
    });

    if (!updated) {
      res.status(404).json({ error: 'Streamer introuvable' });
      return;
    }
    emitConfigUpdated('streamers', guildId, { action: 'updated', streamer: updated }, 'DASHBOARD', req.user?.id);
    res.json({ success: true, streamer: updated });
  });

  // Test manuel d'alerte / Sonde immédiate
  router.post('/:id/test', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const streamer = streamerStorage.getStreamer(guildId, id);
    if (!streamer) {
      res.status(404).json({ error: 'Streamer introuvable' });
      return;
    }

    const probe = await streamerService.fetchLiveStatus(streamer.platform, streamer.username);
    const messageId = await streamerService.dispatchLiveAlert(streamer, {
      ...probe,
      isLive: true,
      title: probe.title || `[TEST] ${streamer.displayName || streamer.username} teste les alertes ETHONE`,
      game: probe.game || 'Live Test',
      viewers: probe.viewers || 42,
    });

    res.json({
      success: true,
      liveStatus: probe,
      alertDispatched: Boolean(messageId),
      messageId,
    });
  });

  // Simulation complète d'alerte en direct avec attribution optionnelle du rôle @En Live
  router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const {
      platform = 'twitch',
      username = 'Gotaga',
      displayName,
      title,
      game,
      viewers,
      targetMemberId,
      channelId,
      pingMode,
      assignLiveRole = false,
    } = req.body || {};

    const result = await streamerService.simulateLiveAlert(guildId, {
      platform,
      username,
      displayName,
      title,
      game,
      viewers: Number(viewers) || 14850,
      targetMemberId,
      channelId,
      pingMode,
      assignLiveRole: Boolean(assignLiveRole),
    });

    res.json({
      success: Boolean(result.messageId),
      ...result,
    });
  });

  // Salons + Rôles + Membres de destination pour le Dashboard
  router.get('/targets', async (req: Request, res: Response): Promise<void> => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [], roles: [], members: [] });
      return;
    }

    const channels = guild.channels.cache
      .filter((c) => DESTINATION_CHANNEL_TYPES.includes(c.type))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const botHighest = guild.members.me?.roles.highest.position ?? 0;
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed && r.position < botHighest)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
      .sort((a, b) => a.name.localeCompare(b.name));

    let members: Array<{ id: string; name: string; displayName: string; avatarUrl: string | null }> = [];
    try {
      const fetched = await guild.members.fetch({ limit: 100 }).catch(() => null);
      if (fetched) {
        members = fetched
          .filter((m) => !m.user.bot)
          .map((m) => ({
            id: m.id,
            name: m.user.username,
            displayName: m.displayName,
            avatarUrl: m.user.displayAvatarURL({ size: 64 }),
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
      }
    } catch {
      // Ignoré
    }

    res.json({ channels, roles, members });
  });

  return router;
}
