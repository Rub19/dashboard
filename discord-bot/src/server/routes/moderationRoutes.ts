import express, { Request, Response } from 'express';
import { Client, ChannelType, PermissionFlagsBits, TextChannel } from 'discord.js';
import { sanctionService } from '../../modules/moderation/sanctions/sanctionService.js';
import { SanctionTypeSchema } from '../../modules/moderation/types/sanction.js';
import { ModLogger } from '../../modules/moderation/logs/modLogger.js';
import { checkHierarchy } from '../../modules/moderation/permissions/hierarchy.js';
import { logger } from '../../utils/logger.js';

export function createModerationRouter(discordClient: Client) {
  const router = express.Router({ mergeParams: true });

  // 1. Vue d'ensemble (Stats & Récentes Sanctions)
  router.get('/overview', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const counts = sanctionService.getCounts(guildId);
    const recentSanctions = sanctionService.getGuildSanctions(guildId, { limit: 15 });

    res.json({
      counts,
      recentSanctions,
    });
  });

  // 2. Liste complète des sanctions (filtrable)
  router.get('/sanctions', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;

    const sanctions = sanctionService.getGuildSanctions(guildId, { userId, type });
    res.json({ sanctions });
  });

  // 3. Appliquer une sanction depuis le Web Dashboard (avec hiérarchie stricte)
  router.post('/sanctions', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const { userId, type, reason, durationSeconds } = req.body;

    const validSanctionType = SanctionTypeSchema.safeParse(type);
    if (!validSanctionType.success) {
      res.status(400).json({ error: 'Type de sanction invalide' });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: 'userId manquant' });
      return;
    }

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }

    try {
      const targetUser = await discordClient.users.fetch(userId).catch(() => null);
      const userTag = targetUser?.tag || userId;
      const moderatorTag = req.user ? req.user.username : 'Web Dashboard';
      const moderatorId = req.user ? req.user.id : 'web-dashboard';

      const targetMember = await guild.members.fetch(userId).catch(() => null);

      if (targetMember) {
        // Vérification de la hiérarchie pour les membres sur le serveur
        if (!targetMember.manageable && type !== 'warn') {
          res.status(403).json({
            error: 'Le bot ne possède pas un rôle suffisant pour sanctionner ce membre.',
          });
          return;
        }

        if (type === 'timeout') {
          const dur = (durationSeconds || 600) * 1000;
          await targetMember.timeout(dur, reason || 'Sanction via Dashboard Web');
        } else if (type === 'untimeout') {
          await targetMember.timeout(null, reason || 'Levée de sanction via Dashboard');
        } else if (type === 'kick') {
          await targetMember.send({
            content: `👢 Vous avez été expulsé du serveur **${guild.name}** depuis le Dashboard.\n**Raison :** ${reason}`,
          }).catch(() => {});
          await targetMember.kick(reason || 'Expulsion via Dashboard Web');
        } else if (type === 'ban') {
          await targetMember.send({
            content: `🔨 Vous avez été banni du serveur **${guild.name}** depuis le Dashboard.\n**Raison :** ${reason}`,
          }).catch(() => {});
          await guild.bans.create(userId, { reason: reason || 'Bannissement via Dashboard Web' });
        }
      } else {
        if (type === 'ban') {
          await guild.bans.create(userId, { reason: reason || 'Bannissement ID via Dashboard Web' });
        } else if (type === 'unban') {
          await guild.bans.remove(userId, reason || 'Débannissement via Dashboard Web');
        } else {
          res.status(400).json({
            error: 'Le membre n’est pas présent sur le serveur pour cette sanction.',
          });
          return;
        }
      }

      // Enregistrement dans le service de persistance
      const { sanction } = sanctionService.createSanction({
        guildId,
        userId,
        userTag,
        moderatorId,
        moderatorTag,
        type: validSanctionType.data,
        reason: reason || 'Action effectuée depuis le Dashboard Web',
        durationSeconds: durationSeconds ?? null,
      });

      // Journalisation Discord
      await ModLogger.logSanction(guild, sanction);

      res.json({ success: true, sanction });
    } catch (err: any) {
      logger.error('Erreur application sanction via web :', err);
      res.status(500).json({ error: err.message || 'Échec de l’application de la sanction.' });
    }
  });

  // 4. Révoquer une sanction
  router.delete('/sanctions/:sanctionId', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const sanctionId = String(req.params.sanctionId);

    const revoked = sanctionService.revokeSanction(guildId, sanctionId);
    if (!revoked) {
      res.status(404).json({ error: 'Sanction introuvable' });
      return;
    }

    res.json({ success: true });
  });

  // 5. Configuration de Modération & AutoMod
  router.get('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const config = sanctionService.getConfig(guildId);
    res.json({ config });
  });

  router.patch('/config', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    try {
      const updated = sanctionService.updateConfig(guildId, req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Données de configuration invalides' });
    }
  });

  // 6. Gestion des Utilisateurs : Liste des membres du serveur avec rôles et avatar
  router.get('/members', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ members: [] });
      return;
    }

    try {
      const fetched = await guild.members.fetch({ limit: 100 });
      const members = fetched.map((m) => ({
        id: m.id,
        userTag: m.user.tag,
        username: m.user.username,
        nickname: m.nickname || null,
        avatar: m.user.displayAvatarURL({ size: 64 }),
        isBot: m.user.bot,
        isOwner: m.id === guild.ownerId,
        manageable: m.manageable,
        isTimedOut: m.isCommunicationDisabled(),
        roles: m.roles.cache
          .filter((r) => r.id !== guild.id)
          .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
          .slice(0, 5),
      }));

      res.json({ members });
    } catch (err: any) {
      res.status(500).json({ error: 'Impossible de récupérer les membres.' });
    }
  });

  // 7. Modifier le surnom d'un membre depuis le web
  router.post('/members/:memberId/nickname', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const memberId = String(req.params.memberId);
    const { nickname } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ error: 'Serveur introuvable' });
      return;
    }

    const member = await guild.members.fetch(memberId).catch(() => null);
    if (!member || !member.manageable) {
      res.status(403).json({ error: 'Permissions insuffisantes pour renommer ce membre.' });
      return;
    }

    try {
      await member.setNickname(nickname || null);
      res.json({ success: true, nickname: member.nickname });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Échec du changement de pseudo.' });
    }
  });

  // 8. Gestion détaillée des Salons (Slowmode, Lock, Purge)
  router.get('/channels-detail', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ channels: [] });
      return;
    }

    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => {
        const tc = c as TextChannel;
        const everyoneOverwrites = tc.permissionOverwrites.cache.get(guild.id);
        const isLocked = everyoneOverwrites?.deny.has(PermissionFlagsBits.SendMessages) || false;

        return {
          id: tc.id,
          name: tc.name,
          slowmode: tc.rateLimitPerUser || 0,
          isLocked,
        };
      });

    res.json({ channels });
  });

  // 9. Régler le slowmode d'un salon depuis le web
  router.post('/channels/:channelId/slowmode', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const { seconds } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel || channel.type !== ChannelType.GuildText) {
      res.status(404).json({ error: 'Salon textuel introuvable.' });
      return;
    }

    try {
      await channel.setRateLimitPerUser(Number(seconds) || 0);
      res.json({ success: true, slowmode: channel.rateLimitPerUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Impossible de modifier le slowmode.' });
    }
  });

  // 10. Verrouiller ou déverrouiller un salon depuis le web
  router.post('/channels/:channelId/lock', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const { locked, reason } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!guild || !channel || channel.type !== ChannelType.GuildText) {
      res.status(404).json({ error: 'Salon textuel introuvable.' });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(guild.id, {
        SendMessages: locked ? false : null,
      });

      if (locked) {
        channel.send({
          content: `🔒 **Salon Verrouillé** par un modérateur depuis le Dashboard Web.\n**Raison :** ${reason || 'Maintenance / Modération'}`,
        }).catch(() => {});
      } else {
        channel.send({
          content: '🔓 **Salon Déverrouillé** depuis le Dashboard Web.',
        }).catch(() => {});
      }

      res.json({ success: true, isLocked: locked });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Impossible de modifier le verrouillage.' });
    }
  });

  // 11. Purger / Clear des messages d'un salon depuis le web
  router.post('/channels/:channelId/clear', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const channelId = String(req.params.channelId);
    const { amount } = req.body;

    const guild = discordClient.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel || channel.type !== ChannelType.GuildText) {
      res.status(404).json({ error: 'Salon textuel introuvable.' });
      return;
    }

    const count = Math.min(Math.max(Number(amount) || 10, 1), 100);

    try {
      const deleted = await channel.bulkDelete(count, true);
      res.json({ success: true, deletedCount: deleted.size });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Impossible de purger les messages.' });
    }
  });

  // 12. Salons & Rôles simples pour selects
  router.get('/channels', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ channels: [] });
      return;
    }

    const textChannels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => ({ id: c.id, name: c.name }));

    res.json({ channels: textChannels });
  });

  router.get('/roles', async (req: Request, res: Response): Promise<void> => {
    const guildId = String(req.params.guildId);
    const guild = discordClient.guilds.cache.get(guildId);

    if (!guild) {
      res.json({ roles: [] });
      return;
    }

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));

    res.json({ roles });
  });

  return router;
}
