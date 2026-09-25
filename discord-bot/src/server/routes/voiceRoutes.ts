import { Router, Request, Response } from 'express';
import { ChannelType, Client, PermissionFlagsBits, VoiceChannel, TextChannel } from 'discord.js';
import { voiceRepository } from '../../modules/voice/storage/voiceRepository.js';
import { VoicePermissionService } from '../../modules/voice/services/voicePermissionService.js';
import { VoiceOwnershipService } from '../../modules/voice/services/voiceOwnershipService.js';
import { TemporaryVoiceService } from '../../modules/voice/services/temporaryVoiceService.js';
import { VoiceSessionService } from '../../modules/voice/services/voiceSessionService.js';
import { CreateHubSchema, UpdateHubSchema, VOICE_TEMPLATE_TOKENS, createHub, quickSetup, updateHub } from '../../modules/voice/services/voiceHubService.js';
import { logger } from '../../utils/logger.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { rateLimit } from '../middleware/antiAbuseMiddleware.js';

export function createVoiceRouter(client: Client): Router {
  const router = Router({ mergeParams: true });

  // GET /api/guilds/:guildId/voice/overview
  router.get('/overview', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const data = voiceRepository.getOverview(guildId);
      res.json(data);
    } catch (err: any) {
      logger.error('Erreur voice/overview :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/guilds/:guildId/voice/panel/publish
  router.post('/panel/publish', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Serveur Discord introuvable ou bot non connecté' });
      }

      const settings = voiceRepository.getSettings(guildId);
      const targetChannelId = (req.body.channelId || settings.creationTextChannelId || settings.panelChannelId) as string;

      if (!targetChannelId) {
        return res.status(400).json({ error: 'Veuillez spécifier un salon textuel pour le panneau de création.' });
      }

      const result = await TemporaryVoiceService.publishCreationPanel(guild, targetChannelId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        message: 'Panneau de création publié avec succès.',
        channelId: targetChannelId,
        messageId: result.messageId,
      });
    } catch (err: any) {
      logger.error('Erreur voice/panel/publish :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/hubs
  router.get('/hubs', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const hubs = voiceRepository.getHubs(guildId);
      res.json({ hubs });
    } catch (err: any) {
      logger.error('Erreur voice/hubs :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/hubs/tokens : variables utilisables dans le modèle de nom
  router.get('/hubs/tokens', (_req: Request, res: Response) => {
    res.json({ tokens: VOICE_TEMPLATE_TOKENS });
  });

  // POST /api/guilds/:guildId/voice/hubs/quick : catégorie + salon déclencheur + hub par défaut, module activé
  router.post('/hubs/quick', rateLimit('CONFIG', { byGuild: true, actionName: 'voice_quick_setup' }), async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur Discord introuvable ou bot non connecté' });
    try {
      const out = await quickSetup(guild);
      emitConfigUpdated('voice', guildId, { hub: out.hub }, 'DASHBOARD', req.user?.id);
      res.status(out.created ? 201 : 200).json({ success: true, ...out });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Installation impossible' });
    }
  });

  // POST /api/guilds/:guildId/voice/hubs
  router.post('/hubs', (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const guild = client.guilds.cache.get(guildId);
    const parsed = CreateHubSchema.safeParse(req.body);
    if (!guild) return res.status(404).json({ error: 'Serveur Discord introuvable ou bot non connecté' });
    if (!parsed.success) return res.status(400).json({ error: 'Hub invalide : un salon vocal déclencheur est requis', details: parsed.error.flatten() });
    const out = createHub(guild, parsed.data);
    if (!out.hub) return res.status(400).json({ error: out.error });
    emitConfigUpdated('voice', guildId, { hub: out.hub }, 'DASHBOARD', req.user?.id);
    res.status(201).json({ hub: out.hub });
  });

  // PUT /api/guilds/:guildId/voice/hubs/:id
  router.put('/hubs/:id', (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const guild = client.guilds.cache.get(guildId);
    const parsed = UpdateHubSchema.safeParse(req.body);
    if (!guild) return res.status(404).json({ error: 'Serveur Discord introuvable ou bot non connecté' });
    if (!parsed.success) return res.status(400).json({ error: 'Réglages du hub invalides', details: parsed.error.flatten() });
    const out = updateHub(guild, req.params.id as string, parsed.data);
    if (!out.hub) return res.status(out.notFound ? 404 : 400).json({ error: out.error });
    emitConfigUpdated('voice', guildId, { hub: out.hub }, 'DASHBOARD', req.user?.id);
    res.json({ hub: out.hub });
  });

  // DELETE /api/guilds/:guildId/voice/hubs/:id : retire le hub (le salon Discord n'est pas supprimé)
  router.delete('/hubs/:id', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const deleted = voiceRepository.deleteHub(guildId, req.params.id as string);
      if (!deleted) return res.status(404).json({ error: 'Hub introuvable' });
      emitConfigUpdated('voice', guildId, { hubDeleted: req.params.id }, 'DASHBOARD', req.user?.id);
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Erreur suppression voice/hubs :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/rooms
  router.get('/rooms', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const rooms = voiceRepository.getRooms(guildId);
      res.json({ rooms });
    } catch (err: any) {
      logger.error('Erreur voice/rooms :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/rooms/:id/details
  router.get('/rooms/:id/details', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const id = req.params.id as string;
      const room = voiceRepository.getRoomById(id);
      if (!room || room.guildId !== guildId) {
        return res.status(404).json({ error: 'Salon introuvable' });
      }

      const timeline = voiceRepository.getRoomTimeline(id);
      res.json({
        room,
        timeline,
        whitelist: room.allowedUserIds || room.whitelist || [],
        banlist: room.blockedUserIds || room.banlist || [],
        currentUsers: room.currentUsers || [],
      });
    } catch (err: any) {
      logger.error('Erreur voice/rooms/:id/details :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/voice/rooms/:id/whitelist
  router.put('/rooms/:id/whitelist', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const id = req.params.id as string;
      const { userId, action } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId requis' });

      const room = voiceRepository.getRoomById(id);
      if (!room || room.guildId !== guildId) return res.status(404).json({ error: 'Salon introuvable' });

      const guild = client.guilds.cache.get(guildId);
      const discordChannel = guild?.channels.cache.get(id) as VoiceChannel | undefined;

      if (action === 'remove') {
        voiceRepository.removeFromWhitelist(id, userId);
        if (discordChannel) {
          await VoicePermissionService.setUserAccess(discordChannel, userId, 'reset');
        }
      } else {
        voiceRepository.addToWhitelist(id, userId, 'dashboard_admin', 'Dashboard Admin');
        if (discordChannel) {
          await VoicePermissionService.setUserAccess(discordChannel, userId, 'allow');
        }
      }

      res.json({ success: true, whitelist: room.allowedUserIds || room.whitelist || [] });
    } catch (err: any) {
      logger.error('Erreur voice/rooms/:id/whitelist :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/voice/rooms/:id/banlist
  router.put('/rooms/:id/banlist', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const id = req.params.id as string;
      const { userId, action } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId requis' });

      const room = voiceRepository.getRoomById(id);
      if (!room || room.guildId !== guildId) return res.status(404).json({ error: 'Salon introuvable' });

      const guild = client.guilds.cache.get(guildId);
      const discordChannel = guild?.channels.cache.get(id) as VoiceChannel | undefined;

      if (action === 'remove') {
        voiceRepository.removeFromBanlist(id, userId);
        if (discordChannel) {
          await VoicePermissionService.setUserAccess(discordChannel, userId, 'reset');
        }
      } else {
        voiceRepository.addToBanlist(id, userId, 'dashboard_admin', 'Dashboard Admin');
        if (discordChannel) {
          await VoicePermissionService.setUserAccess(discordChannel, userId, 'block');
        }
      }

      res.json({ success: true, banlist: room.blockedUserIds || room.banlist || [] });
    } catch (err: any) {
      logger.error('Erreur voice/rooms/:id/banlist :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/guilds/:guildId/voice/rooms/:id/action
  router.post('/rooms/:id/action', async (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const roomId = req.params.id as string;
      const { action, value, targetUserId } = req.body;

      const room = voiceRepository.getRoomById(roomId);
      if (!room || room.guildId !== guildId || room.status === 'DELETED') {
        return res.status(404).json({ error: 'Salon introuvable ou déjà supprimé' });
      }

      const guild = client.guilds.cache.get(guildId);
      const discordChannel = guild?.channels.cache.get(roomId) as VoiceChannel | undefined;

      switch (action) {
        case 'rename': {
          if (!value || typeof value !== 'string') return res.status(400).json({ error: 'Nouveau nom requis' });
          room.name = value.trim();
          voiceRepository.saveRoom(room);
          if (discordChannel) await discordChannel.setName(room.name).catch(() => null);
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'ROOM_RENAMED',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
            details: `Nouveau nom: "${room.name}"`,
          });
          break;
        }

        case 'lock': {
          room.isLocked = true;
          voiceRepository.saveRoom(room);
          if (discordChannel) await VoicePermissionService.applyLock(discordChannel, true);
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'ROOM_LOCKED',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
          });
          break;
        }

        case 'unlock': {
          room.isLocked = false;
          voiceRepository.saveRoom(room);
          if (discordChannel) await VoicePermissionService.applyLock(discordChannel, false);
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'ROOM_UNLOCKED',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
          });
          break;
        }

        case 'hide': {
          room.isHidden = true;
          voiceRepository.saveRoom(room);
          if (discordChannel) await VoicePermissionService.applyHide(discordChannel, true);
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'ROOM_HIDDEN',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
          });
          break;
        }

        case 'unhide': {
          room.isHidden = false;
          voiceRepository.saveRoom(room);
          if (discordChannel) await VoicePermissionService.applyHide(discordChannel, false);
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'ROOM_UNHIDDEN',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
          });
          break;
        }

        case 'set_limit': {
          const lim = parseInt(value, 10);
          if (isNaN(lim) || lim < 0 || lim > 99) return res.status(400).json({ error: 'Limite invalide' });
          room.userLimit = lim;
          voiceRepository.saveRoom(room);
          if (discordChannel) await discordChannel.setUserLimit(lim).catch(() => null);
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'LIMIT_CHANGED',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
            details: `Limite: ${lim === 0 ? 'Illimitée' : lim}`,
          });
          break;
        }

        case 'kick': {
          if (!targetUserId) return res.status(400).json({ error: 'Membre cible requis' });
          if (discordChannel) {
            await VoicePermissionService.kickMember(discordChannel, targetUserId, 'Expulsé via le Dashboard');
          }
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'USER_KICKED',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
            targetId: targetUserId,
          });
          break;
        }

        case 'mute': {
          if (!targetUserId) return res.status(400).json({ error: 'Membre cible requis' });
          const shouldMute = value !== false;
          if (discordChannel) {
            await VoicePermissionService.muteMember(discordChannel, targetUserId, shouldMute);
          }
          voiceRepository.addTimelineEvent({
            roomId,
            guildId,
            type: 'USER_MUTED',
            actorId: 'dashboard_admin',
            actorTag: 'Dashboard Admin',
            targetId: targetUserId,
            details: shouldMute ? 'Rendu muet' : 'Démuté',
          });
          break;
        }

        case 'transfer': {
          if (!targetUserId) return res.status(400).json({ error: 'Nouveau propriétaire requis' });
          const newOwnerTag = req.body.targetUserTag || 'Nouveau Propriétaire';
          VoiceOwnershipService.transferOwnership(
            room,
            { id: targetUserId, tag: newOwnerTag },
            { id: 'dashboard_admin', tag: 'Dashboard Admin' },
            'Transfert manuel via Dashboard'
          );
          break;
        }

        case 'delete':
        case 'cleanup': {
          if (guild) {
            await TemporaryVoiceService.deleteRoomChannel(guild, roomId, 'Suppression manuelle via le Dashboard');
          } else {
            voiceRepository.deleteRoom(roomId);
          }
          return res.json({ success: true, message: 'Salon supprimé' });
        }

        default:
          return res.status(400).json({ error: 'Action inconnue' });
      }

      res.json({ success: true, room });
    } catch (err: any) {
      logger.error('Erreur room action :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/sessions
  router.get('/sessions', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const sessions = voiceRepository.getSessions(guildId);
      res.json({ sessions });
    } catch (err: any) {
      logger.error('Erreur voice/sessions :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/analytics
  router.get('/analytics', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const sessions = voiceRepository.getSessions(guildId);
      const activeRooms = voiceRepository.getRooms(guildId);

      const hoursHeatmap = new Array(24).fill(0);
      sessions.forEach((s) => {
        const hour = new Date(s.joinedAt).getHours();
        hoursHeatmap[hour] += 1;
      });

      const hubUsage = new Map<string, number>();
      sessions.forEach((s) => {
        hubUsage.set(s.hubId, (hubUsage.get(s.hubId) || 0) + (s.durationSeconds || 0));
      });

      const topRooms = Array.from(hubUsage.entries()).map(([hubId, duration]) => {
        const hub = voiceRepository.getHubById(hubId);
        return {
          hubId,
          name: hub?.name || hubId,
          hours: Math.round(duration / 3600),
        };
      });
      topRooms.sort((a, b) => b.hours - a.hours);

      res.json({
        hoursHeatmap,
        topRooms,
        totalSessions: sessions.length,
        currentActiveUsers: activeRooms.reduce((acc, r) => acc + (r.currentUsers?.length || 0), 0),
      });
    } catch (err: any) {
      logger.error('Erreur voice/analytics :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/settings
  router.get('/settings', (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const settings = voiceRepository.getSettings(guildId);
      res.json({ settings });
    } catch (err: any) {
      logger.error('Erreur voice/settings :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/voice/settings
  router.put('/settings', rateLimit('CONFIG', { byGuild: true, actionName: 'voice_settings' }), (req: Request, res: Response) => {
    try {
      const guildId = req.params.guildId as string;
      const updated = voiceRepository.updateSettings(guildId, req.body);
      emitConfigUpdated('voice', guildId, updated, 'DASHBOARD', req.user?.id);
      res.json({ settings: updated });
    } catch (err: any) {
      logger.error('Erreur update voice/settings :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/guilds/:guildId/voice/preferences/:userId
  router.get('/preferences/:userId', (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      // Préférences PERSONNELLES (valables sur tous les serveurs) : seul le membre concerné peut les lire ou les changer.
      if (req.user?.id !== userId) {
        res.status(403).json({ error: 'Tu ne peux consulter que tes propres préférences.' });
        return;
      }
      const prefs = voiceRepository.getUserPreferences(userId);
      res.json({ preferences: prefs || null });
    } catch (err: any) {
      logger.error('Erreur voice/preferences :', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/guilds/:guildId/voice/preferences/:userId
  router.put('/preferences/:userId', (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      if (req.user?.id !== userId) {
        res.status(403).json({ error: 'Tu ne peux modifier que tes propres préférences.' });
        return;
      }
      const saved = voiceRepository.saveUserPreferences({
        userId,
        ...req.body,
      });
      res.json({ preferences: saved });
    } catch (err: any) {
      logger.error('Erreur save voice/preferences :', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
