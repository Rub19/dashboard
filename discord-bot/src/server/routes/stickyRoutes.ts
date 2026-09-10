import express, { Request, Response } from 'express';
import { ChannelType, Client, PermissionFlagsBits } from 'discord.js';
import { stickyStorage } from '../../modules/stickyMessages/storage/stickyStorage.js';
import { stickyService } from '../../modules/stickyMessages/services/stickyService.js';
import { StickyMessageSchema } from '../../modules/stickyMessages/types/sticky.js';

/**
 * API Dashboard du module Sticky Messages.
 * Montée derrière `authMiddleware` + `createGuildAuthMiddleware` (cf. server/index.ts).
 */
export function createStickyRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // Vue d'ensemble + liste des stickies
  router.get('/overview', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    res.json(stickyStorage.getOverview(guildId));
  });

  // Détail d'un sticky
  router.get('/config/:channelId', (req: Request, res: Response): void => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const sticky = stickyStorage.get(guildId, channelId);
    if (!sticky) {
      res.status(404).json({ error: 'Aucun sticky sur ce salon' });
      return;
    }
    res.json(sticky);
  });

  // Créer / remplacer un sticky
  router.put('/config/:channelId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const allowed = StickyMessageSchema.partial().omit({
      guildId: true,
      channelId: true,
      lastMessageId: true,
      repostCount: true,
      createdAt: true,
      updatedAt: true,
    });
    const parsed = allowed.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Configuration invalide', details: parsed.error.flatten() });
      return;
    }
    if (!parsed.data.content && !stickyStorage.get(guildId, channelId)) {
      res.status(400).json({ error: 'Le contenu est requis pour créer un sticky' });
      return;
    }

    const guild = discordClient.guilds.cache.get(guildId);
    if (guild) await stickyService.clearPosted(guild, channelId).catch(() => {});

    const updated = stickyStorage.upsert({ guildId, channelId, ...parsed.data, lastMessageId: null });

    if (guild && updated.enabled) {
      await stickyService.forceRepost(guild, channelId).catch(() => {});
    }
    res.json({ success: true, config: stickyStorage.get(guildId, channelId) });
  });

  // Supprimer un sticky
  router.delete('/config/:channelId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (guild) await stickyService.clearPosted(guild, channelId).catch(() => {});
    const deleted = stickyStorage.delete(guildId, channelId);
    res.json({ success: deleted });
  });

  // Repositionner immédiatement (bouton « Republier maintenant »)
  router.post('/config/:channelId/repost', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }
    await stickyService.forceRepost(guild, channelId).catch(() => {});
    res.json({ success: true, config: stickyStorage.get(guildId, channelId) });
  });

  // Salons textuels + permissions du bot (pour le sélecteur du dashboard)
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
          canManage: perms?.has(PermissionFlagsBits.ManageMessages) ?? false,
          canEmbed: perms?.has(PermissionFlagsBits.EmbedLinks) ?? false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  });

  return router;
}
