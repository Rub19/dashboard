import express, { Request, Response } from 'express';
import { Client } from 'discord.js';
import { tagStorage, MAX_TAGS_PER_GUILD } from '../../modules/tags/storage/tagStorage.js';
import { TAG_NAME_RE } from '../../modules/tags/types/tag.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { isSendableTarget, sendToConfiguredChannel } from '../../utils/channelSend.js';

/**
 * API Dashboard du module Tags.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createTagRouter(_client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(tagStorage.getOverview(String(req.params.guildId)));
  });

  router.get('/list', (req: Request, res: Response): void => {
    res.json({ tags: tagStorage.getGuild(String(req.params.guildId)) });
  });

  router.put('/:name', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const name = String(req.params.name).toLowerCase();
    if (!TAG_NAME_RE.test(name)) {
      res.status(400).json({ error: 'Nom invalide (a-z 0-9 _ - , max 32).' });
      return;
    }
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!content.trim() || content.length > 2000) {
      res.status(400).json({ error: 'Contenu requis (2000 caractères max).' });
      return;
    }
    const existing = tagStorage.get(guildId, name);
    if (!existing && !tagStorage.canAddMore(guildId)) {
      res.status(429).json({ error: `Limite de ${MAX_TAGS_PER_GUILD} tags atteinte.` });
      return;
    }
    const tag = tagStorage.set({
      guildId,
      name,
      content: content.trim(),
      createdBy: existing?.createdBy ?? (req.user?.id ?? null),
    });
    emitConfigUpdated('tags', guildId, tag, 'DASHBOARD', req.user?.id);
    res.json({ success: true, tag });
  });

  router.delete('/:name', (req: Request, res: Response): void => {
    const ok = tagStorage.delete(String(req.params.guildId), String(req.params.name).toLowerCase());
    res.json({ success: ok });
  });

  router.post('/:name/test', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const name = String(req.params.name).toLowerCase();
    const channelId = String(req.body?.channelId || '');
    const tag = tagStorage.get(guildId, name);
    if (!tag) {
      res.status(404).json({ error: 'Tag introuvable.' });
      return;
    }
    if (!channelId) {
      res.status(400).json({ error: 'Salon de destination requis.' });
      return;
    }
    const guild = _client.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable.' });
      return;
    }
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !isSendableTarget(channel)) {
      res.status(400).json({ error: 'Salon inaccessible par Etho.' });
      return;
    }
    try {
      const sent = await sendToConfiguredChannel(channel, { content: tag.content }, { postTitle: `🏷️ ${tag.name}` });
      res.json({ success: true, messageId: sent.id, channelName: 'name' in channel ? channel.name : 'salon' });
    } catch (err: any) {
      res.status(500).json({ error: 'Impossible d’envoyer le tag dans ce salon.' });
    }
  });

  return router;
}
