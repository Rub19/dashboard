import { Router } from 'express';
import { funService } from '../../modules/fun/services/funService.js';

export const funRouter = Router({ mergeParams: true });

funRouter.get('/lyrics', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const result = await funService.getLyrics(q);
    if (!result) {
      return res.status(404).json({ error: 'No lyrics found' });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

funRouter.get('/tvshow', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const result = await funService.getTvShow(q);
    if (!result) {
      return res.status(404).json({ error: 'No TV show found' });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

funRouter.get('/movie', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const result = await funService.getMovie(q);
    if (!result) {
      return res.status(404).json({ error: 'No movie found' });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

funRouter.get('/game', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const result = await funService.getGame(q);
    if (!result) {
      return res.status(404).json({ error: 'No game found' });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

funRouter.get('/images', async (req, res) => {
  try {
    const q = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 12;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const results = await funService.searchImages(q, limit);
    return res.json({ query: q, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

funRouter.get('/reverse', (req, res) => {
  const url = req.query.url as string;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'Query parameter url is required' });
  }
  const links = funService.getReverseImageLinks(url);
  return res.json(links);
});
