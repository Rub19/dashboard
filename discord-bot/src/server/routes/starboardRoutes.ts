import express, { Request, Response } from 'express';
import { ChannelType, Client, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { starboardStorage } from '../../modules/starboard/storage/starboardStorage.js';
import { StarboardConfigSchema } from '../../modules/starboard/types/starboard.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { DESTINATION_CHANNEL_TYPES, canBotSendTo, isSendableTarget, sendToConfiguredChannel } from '../../utils/channelSend.js';
import { rateLimit } from '../middleware/antiAbuseMiddleware.js';
import { handleRouteError } from '../utils/routeError.js';
import { trq, trg } from '../../utils/tr.js';

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
      res.status(400).json({ error: trq('Configuration invalide'), details: parsed.error.flatten() });
      return;
    }
    const updated = starboardStorage.updateConfig(guildId, parsed.data);
    emitConfigUpdated('starboard', guildId, updated, 'DASHBOARD', req.user?.id);
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
      .filter((c) => DESTINATION_CHANNEL_TYPES.includes(c.type))
      .map((c) => {
        const perms = botMember && 'permissionsFor' in c ? c.permissionsFor(botMember) : null;
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          canSend: canBotSendTo(c, botMember),
          canEmbed: perms?.has(PermissionFlagsBits.EmbedLinks) ?? false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ channels });
  });

  router.post('/test', rateLimit('CONFIG', { byGuild: true, actionName: 'starboard_test' }), async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = starboardStorage.getConfig(guildId);
    if (!config.channelId) {
      res.status(400).json({ error: trq('Aucun salon d\'honneur configuré.') });
      return;
    }
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: trq('Serveur introuvable.') });
      return;
    }
    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel || !isSendableTarget(channel)) {
      res.status(400).json({ error: trq('Salon Discord introuvable ou inaccessible par Etho.') });
      return;
    }
    const botMember = guild.members.me;
    if (!canBotSendTo(channel, botMember)) {
      res.status(403).json({ error: trq('Etho n’a pas la permission d’envoyer des messages dans ce salon.') });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor((config.color as `#${string}`) || '#F5B301')
      .setAuthor({
        name: req.user?.username || trg(guildId, 'Équipe ETHONE'),
        iconURL: discordClient.user?.displayAvatarURL(),
      })
      .setTitle(trg(guildId, '⭐ Publication de test Starboard'))
      .setDescription(
        trg(guildId, 'Ce message confirme que le salon <#{channelId}> est correctement configuré.', { channelId: config.channelId }) + '\n' +
        trg(guildId, 'Seuil requis : **{threshold}** réaction(s) {emoji}.', { threshold: config.threshold, emoji: config.emoji }) + '\n' +
        trg(guildId, config.selfStarAllowed ? 'Auto-étoile : **Autorisée**.' : 'Auto-étoile : **Désactivée**.')
      )
      .setFooter({
        text: trg(guildId, '{threshold} {emoji} • Test Dashboard', { threshold: config.threshold, emoji: config.emoji }),
      })
      .setTimestamp();

    try {
      const sent = await sendToConfiguredChannel(channel, { embeds: [embed] }, { postTitle: trg(guildId, '⭐ Test Starboard') });
      res.json({ success: true, messageId: sent.id, channelName: 'name' in channel ? channel.name : 'salon-starboard' });
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur lors de l’envoi du test');
    }
  });

  return router;
}
