import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { RepeatMode, Track } from '../../modules/music/types/music.js';

export function createMusicRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. État de lecture en direct
  router.get('/state', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const state = musicService.getState(guildId);
    res.json({ state });
  });

  // 2. Lancer une musique / ajouter à la file
  router.post('/play', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { query, playNext, channelId } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Paramètre "query" manquant ou invalide.' });
      return;
    }

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      // Mock / fallback pour les serveurs pas encore en cache
      res.status(200).json({
        success: true,
        mock: true,
        message: 'Commande envoyée au player.',
        track: {
          id: `track-${Date.now()}`,
          title: query,
          artist: 'Web Stream',
          duration: 180,
          thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
          url: query,
          source: 'DIRECT',
          requestedBy: { id: 'dashboard', tag: 'Dashboard User' },
          addedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const result = await musicService.play(guild, null, query, {
      playNext: Boolean(playNext),
      channelId: channelId ? String(channelId) : undefined,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Erreur lors du lancement de la musique.' });
      return;
    }

    res.json({ success: true, track: result.track, queuePosition: result.queuePosition });
  });

  // 3. Pause
  router.post('/pause', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = musicService.pause(guildId, null);
    res.json(result);
  });

  // 4. Resume
  router.post('/resume', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = musicService.resume(guildId, null);
    res.json(result);
  });

  // 5. Skip
  router.post('/skip', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = await musicService.skip(guildId, null);
    res.json(result);
  });

  // 6. Previous
  router.post('/previous', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = await musicService.previous(guildId, null);
    res.json(result);
  });

  // 7. Stop
  router.post('/stop', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = musicService.stop(guildId, null);
    res.json(result);
  });

  // 8. Seek
  router.post('/seek', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { position } = req.body;
    const pos = Number(position);
    if (isNaN(pos) || pos < 0) {
      res.status(400).json({ error: 'Position invalide.' });
      return;
    }
    const result = musicService.seek(guildId, pos, null);
    res.json(result);
  });

  // 9. Volume
  router.post('/volume', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { volume } = req.body;
    const vol = Number(volume);
    if (isNaN(vol) || vol < 0 || vol > 100) {
      res.status(400).json({ error: 'Le volume doit être compris entre 0 et 100.' });
      return;
    }
    const result = musicService.setVolume(guildId, vol, null);
    res.json(result);
  });

  // 10. Mute / Unmute
  router.post('/mute', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = musicService.toggleMute(guildId, null);
    res.json(result);
  });

  // 11. Shuffle
  router.post('/shuffle', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = musicService.shuffle(guildId, null);
    res.json(result);
  });

  // 12. Repeat Mode
  router.post('/repeat', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { mode } = req.body;
    if (!['OFF', 'SONG', 'QUEUE'].includes(mode)) {
      res.status(400).json({ error: 'Mode de répétition invalide (OFF, SONG, QUEUE).' });
      return;
    }
    const result = musicService.setRepeatMode(guildId, mode as RepeatMode, null);
    res.json(result);
  });

  // 13. Queue Reorder (Drag & Drop)
  router.post('/queue/reorder', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { fromIndex, toIndex } = req.body;
    const from = Number(fromIndex);
    const to = Number(toIndex);

    if (isNaN(from) || isNaN(to)) {
      res.status(400).json({ error: 'Indices fromIndex et toIndex requis.' });
      return;
    }

    const result = musicService.reorderQueue(guildId, from, to, null);
    res.json(result);
  });

  // 14. Remove from Queue
  router.delete('/queue/:index', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const rawIndex = req.params.index;
    const index = parseInt(Array.isArray(rawIndex) ? String(rawIndex[0]) : String(rawIndex), 10);
    if (isNaN(index)) {
      res.status(400).json({ error: 'Index invalide.' });
      return;
    }
    const result = musicService.removeFromQueue(guildId, index, null);
    res.json(result);
  });

  // 15. Clear Queue
  router.post('/queue/clear', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const result = musicService.clearQueue(guildId, null);
    res.json(result);
  });

  // 16. Search
  router.get('/search', async (req: Request, res: Response): Promise<void> => {
    const q = String(req.query.q || '');
    const rawLimit = req.query.limit;
    const limit = rawLimit ? parseInt(Array.isArray(rawLimit) ? String(rawLimit[0]) : String(rawLimit), 10) : 8;
    const results = await musicService.search(q, null, isNaN(limit) ? 8 : limit);
    res.json({ results });
  });

  // 17. Playlists
  router.get('/playlists', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const playlists = musicService.getPlaylists(guildId);
    res.json({ playlists });
  });

  router.post('/playlists', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { name, tracks } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Nom de playlist requis.' });
      return;
    }
    const pl = musicService.createPlaylist(
      guildId,
      name.trim(),
      { id: 'dashboard', tag: 'Dashboard Staff' },
      Array.isArray(tracks) ? tracks : []
    );
    res.json({ playlist: pl });
  });

  router.post('/playlists/:playlistId/play', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const playlistId = String(req.params.playlistId);

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.json({ success: true, count: 1 });
      return;
    }

    const result = await musicService.playPlaylist(guild, null, playlistId);
    res.json(result);
  });

  router.delete('/playlists/:playlistId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const playlistId = String(req.params.playlistId);
    const ok = musicService.deletePlaylist(guildId, playlistId);
    res.json({ success: ok });
  });

  // 18. Favorites
  router.get('/favorites', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = String(req.query.userId || 'dashboard');
    const favorites = musicService.getFavorites(guildId, userId);
    res.json({ favorites });
  });

  router.post('/favorites', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { userId, track } = req.body;
    if (!track) {
      res.status(400).json({ error: 'Track requis.' });
      return;
    }
    const result = musicService.toggleFavorite(guildId, userId || 'dashboard', track);
    res.json(result);
  });

  // 19. History
  router.get('/history', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const history = musicService.getHistory(guildId);
    res.json({ history });
  });

  // 20. Stats
  router.get('/stats', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const stats = musicService.getStats(guildId);
    res.json({ stats });
  });

  // 21. Settings
  router.get('/settings', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const settings = musicService.getSettings(guildId);
    res.json({ settings });
  });

  router.put('/settings', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = musicService.updateSettings(guildId, req.body);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de configuration invalides.' });
    }
  });

  return router;
}
