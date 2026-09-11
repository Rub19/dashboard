import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { highlightStorage, MAX_KEYWORDS_PER_USER } from '../../modules/highlights/storage/highlightStorage.js';
import {
  HIGHLIGHT_KEYWORD_MAX_LENGTH,
  HIGHLIGHT_KEYWORD_MIN_LENGTH,
  HighlightUserConfigSchema,
} from '../../modules/highlights/types/highlight.js';

/**
 * API Dashboard du module Highlights.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 *
 * Contrairement aux autres modules (config gérée par les admins du serveur), les
 * mots-clés Highlights sont une donnée PERSONNELLE : chaque route `mine/*` se scope
 * strictement à `req.user.id` (l'utilisateur du dashboard authentifié), jamais à un
 * `userId` arbitraire venant du corps de la requête ou de l'URL (cf. reminderRoutes.ts
 * pour le même principe). `/overview` reste réservé aux compteurs agrégés : jamais le
 * contenu des mots-clés d'un autre membre, même pour un admin de serveur.
 */
export function createHighlightsRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  // Stats agrégées du serveur — jamais le contenu des mots-clés d'autrui.
  router.get('/overview', (req: Request, res: Response): void => {
    res.json(highlightStorage.getOverview(String(req.params.guildId)));
  });

  // Salons texte du serveur (sélecteur "salon à ignorer" du dashboard).
  router.get('/channels', (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  });

  // Les mots-clés + la config de l'utilisateur authentifié, et lui seul.
  router.get('/mine', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    res.json({
      config: highlightStorage.getConfig(guildId, userId),
      keywords: highlightStorage.listForUser(guildId, userId),
      maxKeywords: MAX_KEYWORDS_PER_USER,
    });
  });

  router.put('/mine/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const allowed = HighlightUserConfigSchema.partial().pick({ enabled: true, ignoredChannelIds: true });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    res.json({ success: true, config: highlightStorage.updateConfig(guildId, userId, parsed.data) });
  });

  router.post('/mine/keywords', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const raw = req.body?.keyword;
    const keyword = typeof raw === 'string' ? raw.trim() : '';
    if (keyword.length < HIGHLIGHT_KEYWORD_MIN_LENGTH || keyword.length > HIGHLIGHT_KEYWORD_MAX_LENGTH) {
      res.status(400).json({
        error: `Mot-clé invalide (${HIGHLIGHT_KEYWORD_MIN_LENGTH}-${HIGHLIGHT_KEYWORD_MAX_LENGTH} caractères).`,
      });
      return;
    }
    if (highlightStorage.has(guildId, userId, keyword)) {
      res.status(409).json({ error: 'Ce mot-clé est déjà surveillé.' });
      return;
    }
    if (!highlightStorage.canAddMore(guildId, userId)) {
      res.status(429).json({ error: `Limite de ${MAX_KEYWORDS_PER_USER} mots-clés atteinte.` });
      return;
    }
    const created = highlightStorage.add({ guildId, userId, keyword });
    res.json({ success: true, keyword: created });
  });

  router.delete('/mine/keywords/:keyword', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const keyword = decodeURIComponent(String(req.params.keyword));
    const ok = highlightStorage.remove(guildId, userId, keyword);
    if (!ok) {
      res.status(404).json({ error: 'Mot-clé introuvable' });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
