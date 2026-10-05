import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { streamerStorage } from '../../modules/streamers/storage/streamerStorage.js';
import { streamerService } from '../../modules/streamers/services/streamerService.js';
import { StreamPlatformSchema, StreamerConfigSchema, StreamPlatform } from '../../modules/streamers/types/streamer.js';
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
    const { platform, username, channelId, pingRoleId, customMessage } = req.body || {};

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

    const added = streamerStorage.addStreamer({
      guildId,
      platform: plat,
      username: cleanUser,
      displayName: probe.displayName,
      channelId: channelId || null,
      pingRoleId: pingRoleId || null,
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
    const { channelId, pingRoleId, customMessage } = req.body || {};

    const updated = streamerStorage.updateStreamer(guildId, id, {
      ...(channelId !== undefined ? { channelId: channelId || null } : {}),
      ...(pingRoleId !== undefined ? { pingRoleId: pingRoleId || null } : {}),
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
    // Simule ou envoie une notification de test si demandé
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

  // Salons + Rôles de destination pour les listes déroulantes du Dashboard
  router.get('/targets', (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [], roles: [] });
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

    res.json({ channels, roles });
  });

  return router;
}
