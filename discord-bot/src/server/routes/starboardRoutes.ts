import express, { Request, Response } from 'express';
import { ChannelType, Client, PermissionFlagsBits } from 'discord.js';
import { starboardStorage } from '../../modules/starboard/storage/starboardStorage.js';
import { StarboardConfigSchema } from '../../modules/starboard/types/starboard.js';

/**
 * API Dashboard du module Starboard.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createStarboardRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // Vue d'ensemble + statistiques
  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(starboardStorage.getOverview(guildId));
  });

  // Configuration courante
  router.get('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(starboardStorage.getConfig(guildId));
  });

  // Mise à jour de la configuration (patch partiel validé par zod)
  router.put('/config', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const allowed = StarboardConfigSchema.partial().omit({ guildId: true, createdAt: true, updatedAt: true });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    const updated = starboardStorage.updateConfig(guildId, parsed.data);
    res.json({ success: true, config: updated });
  });

  // Liste des messages étoilés (les plus étoilés en premier)
  router.get('/entries', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json({ entries: starboardStorage.getGuildEntries(guildId) });
  });

  // Salons textuels du serveur + permissions du bot (pour le sélecteur du dashboard)
  router.get('/channels', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.json({ channels: [] });
      return;
    }
    const botMember = guild.members.me;
    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => {
        const perms = botMember && 'permissionsFor' in c ? c.permissionsFor(botMember) : null;
        return {
          id: c.id,
          name: c.name,
          canSend: perms?.has(PermissionFlagsBits.SendMessages) ?? false,
          canEmbed: perms?.has(PermissionFlagsBits.EmbedLinks) ?? false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  });

  return router;
}
