import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { reminderStorage } from '../../modules/reminders/storage/reminderStorage.js';
import { parseDuration } from '../../modules/reminders/services/reminderService.js';

const MAX_PER_USER = 25;

/**
 * API Dashboard du module Reminders.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createReminderRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(reminderStorage.getOverview(String(req.params.guildId)));
  });

  router.get('/list', (req: Request, res: Response): void => {
    res.json({ reminders: reminderStorage.getGuild(String(req.params.guildId)) });
  });

  // Salons texte du serveur (sélecteur du dashboard).
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

  // Créer un rappel pour l'utilisateur authentifié.
  router.post('/', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const { in: durationRaw, message, channelId, recurrence } = req.body ?? {};
    const ms = typeof durationRaw === 'string' ? parseDuration(durationRaw) : null;
    if (ms === null || ms < 30_000) {
      res.status(400).json({ error: 'Délai invalide (min 30s, ex: 10m, 2h, 1d, 1h30m).' });
      return;
    }
    if (typeof message !== 'string' || !message.trim() || message.length > 1500) {
      res.status(400).json({ error: 'Message requis (1500 caractères max).' });
      return;
    }
    const guild = client.guilds.cache.get(guildId);
    const chan = typeof channelId === 'string' && guild?.channels.cache.get(channelId);
    if (!chan) {
      res.status(400).json({ error: 'Salon invalide.' });
      return;
    }
    if (reminderStorage.listForUser(guildId, userId).length >= MAX_PER_USER) {
      res.status(429).json({ error: `Limite de ${MAX_PER_USER} rappels en attente atteinte.` });
      return;
    }
    const rec = recurrence === 'daily' || recurrence === 'weekly' ? recurrence : 'none';
    const reminder = reminderStorage.create({
      guildId,
      channelId,
      userId,
      message: message.trim(),
      remindAt: new Date(Date.now() + ms).toISOString(),
      recurrence: rec,
    });
    res.json({ success: true, reminder });
  });

  router.delete('/:id', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const id = String(req.params.id);
    const target = reminderStorage.get(id);
    if (!target || target.guildId !== guildId) {
      res.status(404).json({ error: 'Rappel introuvable' });
      return;
    }
    // La route est déjà réservée aux admins/gérants du serveur par
    // createGuildAuthMiddleware, donc annuler n'importe quel rappel du serveur
    // est un acte de modération légitime.
    res.json({ success: reminderStorage.delete(id) });
  });

  return router;
}
