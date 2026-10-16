import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { spotifyService } from '../../modules/spotify/services/spotifyService.js';
import { trq } from '../../utils/tr.js';

export function createSpotifyRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/state', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const isConnected = spotifyService.isConnected(userId);
    let track = await spotifyService.getPlaybackState(userId);

    if (!track) {
      const guildId = String(req.params.guildId);
      const guild = discordClient.guilds.cache.get(guildId);
      if (guild) {
        const member = guild.members.cache.get(userId);
        if (member) {
          track = spotifyService.getDiscordPresenceSpotify(member);
        }
      }
    }

    const devices = isConnected ? await spotifyService.getDevices(userId) : [];

    res.json({
      isConnected,
      track,
      devices,
    });
  });

  router.get('/devices', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const devices = await spotifyService.getDevices(userId);
    res.json({ devices });
  });

  router.post('/control', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const { action, query, seconds, percent, mode, enabled, deviceId } = req.body || {};

    if (!action || typeof action !== 'string') {
      res.status(400).json({ error: trq('Action manquante.') });
      return;
    }

    let result: { success: boolean; error?: string } = { success: false };

    switch (action) {
      case 'play':
      case 'resume':
        result = await spotifyService.play(userId, query);
        break;
      case 'pause':
        result = await spotifyService.pause(userId);
        break;
      case 'next':
        result = await spotifyService.next(userId);
        break;
      case 'previous':
        result = await spotifyService.previous(userId);
        break;
      case 'seek':
        result = await spotifyService.seek(userId, Number(seconds) || 0);
        break;
      case 'volume':
        result = await spotifyService.setVolume(userId, Number(percent) || 50);
        break;
      case 'repeat':
        result = await spotifyService.setRepeat(userId, mode || 'off');
        break;
      case 'shuffle':
        result = await spotifyService.setShuffle(userId, Boolean(enabled));
        break;
      case 'transfer':
        if (!deviceId) {
          res.status(400).json({ error: trq('deviceId manquant pour le transfert.') });
          return;
        }
        result = await spotifyService.transferPlayback(userId, String(deviceId));
        break;
      default:
        res.status(400).json({ error: trq('Action "{action}" non supportée.', { action }) });
        return;
    }

    if (!result.success) {
      res.status(400).json({ error: result.error || 'Erreur lors du contrôle Spotify.' });
      return;
    }

    res.json({ success: true, action });
  });

  router.post('/save', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const { action, trackId } = req.body || {};

    if (action === 'unlike') {
      const resUnlike = await spotifyService.unlikeTrack(userId, trackId);
      if (!resUnlike.success) {
        res.status(400).json({ error: resUnlike.error || 'Erreur lors du retrait des favoris.' });
        return;
      }
      res.json(resUnlike);
      return;
    }

    const resLike = await spotifyService.likeTrack(userId, trackId);
    if (!resLike.success) {
      res.status(400).json({ error: resLike.error || 'Erreur lors de l\'ajout aux favoris.' });
      return;
    }
    res.json(resLike);
  });

  router.post('/queue', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const { query } = req.body || {};

    if (!query) {
      const q = await spotifyService.getQueue(userId);
      res.json({ queue: q });
      return;
    }

    const result = await spotifyService.addToQueue(userId, String(query));
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Impossible d\'ajouter à la file.' });
      return;
    }
    res.json(result);
  });

  router.get('/top', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const timeRange = (String(req.query.timeRange || 'medium_term')) as 'short_term' | 'medium_term' | 'long_term';

    const [topTracks, topArtists] = await Promise.all([
      spotifyService.getTopTracks(userId, timeRange),
      spotifyService.getTopArtists(userId, timeRange),
    ]);

    res.json({ topTracks, topArtists });
  });

  router.post('/vc', async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id || 'dashboard';
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.status(404).json({ error: trq('Guilde introuvable.') });
      return;
    }

    const member = guild.members.cache.get(userId);
    if (!member) {
      res.status(400).json({ error: trq('Membre non trouvé sur le serveur.') });
      return;
    }

    const result = await spotifyService.streamToVoice(guild, member);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Impossible de diffuser dans le salon vocal.' });
      return;
    }

    res.json(result);
  });

  router.get('/connect-url', (req: Request, res: Response): void => {
    const userId = (req as any).user?.id || 'dashboard';
    const url = spotifyService.getLoginUrl(userId);
    res.json({ url });
  });

  router.post('/disconnect', (req: Request, res: Response): void => {
    const userId = (req as any).user?.id || 'dashboard';
    spotifyService.removeTokens(userId);
    res.json({ success: true });
  });

  return router;
}
