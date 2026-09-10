import express, { Request, Response } from 'express';
import { ChannelType, Client } from 'discord.js';
import { birthdayStorage } from '../../modules/birthdays/storage/birthdayStorage.js';
import { BirthdayConfigSchema } from '../../modules/birthdays/types/birthday.js';

/**
 * API Dashboard du module Birthdays.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createBirthdayRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/overview', (req: Request, res: Response): void => {
    res.json(birthdayStorage.getOverview(String(req.params.guildId)));
  });

  router.get('/config', (req: Request, res: Response): void => {
    res.json(birthdayStorage.getConfig(String(req.params.guildId)));
  });

  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = BirthdayConfigSchema.partial().omit({
      guildId: true,
      updatedAt: true,
      lastAnnouncedDate: true,
      currentRoleHolders: true,
    });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    res.json({ success: true, config: birthdayStorage.updateConfig(guildId, parsed.data) });
  });

  router.get('/list', (req: Request, res: Response): void => {
    res.json({ birthdays: birthdayStorage.getGuildEntries(String(req.params.guildId)) });
  });

  // Salons + rôles pour les sélecteurs du dashboard.
  router.get('/targets', (req: Request, res: Response): void => {
    const guild = client.guilds.cache.get(String(req.params.guildId));
    if (!guild) {
      res.json({ channels: [], roles: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => ({ id: c.id, name: c.name }))
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
