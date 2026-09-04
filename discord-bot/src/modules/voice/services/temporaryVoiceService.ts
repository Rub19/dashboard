import {
  ChannelType,
  Guild,
  GuildMember,
  VoiceChannel,
} from 'discord.js';
import { VoiceHub, TemporaryVoiceRoom } from '../types/index.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { VoiceNumberPool } from './voiceNumberPool.js';
import { VoicePermissionService } from './voicePermissionService.js';
import { VoiceOwnershipService } from './voiceOwnershipService.js';
import { VoiceSessionService } from './voiceSessionService.js';
import { VoiceAutomationService } from './voiceAutomationService.js';
import { DiscordVoicePanel } from '../ui/discordVoicePanel.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class TemporaryVoiceService {
  // Map of active deletion countdown timers: roomId -> NodeJS.Timeout
  private static deletionTimers = new Map<string, NodeJS.Timeout>();
  // Cooldown map: userId -> lastCreationTimestamp
  private static userCooldowns = new Map<string, number>();

  /**
   * Main entry point when a user connects to a "Join to Create" Hub channel.
   */
  public static async handleMemberJoinHub(member: GuildMember, hub: VoiceHub): Promise<VoiceChannel | null> {
    const guild = member.guild;
    const settings = voiceRepository.getSettings(guild.id);
    if (!settings.enabled || !hub.enabled) return null;

    // 1. Anti-Abuse: Check max rooms in guild
    const activeRooms = voiceRepository.getRooms(guild.id);
    if (activeRooms.length >= settings.maxRoomsPerGuild) {
      logger.warn(`[TemporaryVoice] Limite maximale de salons (${settings.maxRoomsPerGuild}) atteinte sur ${guild.name}`);
      await member.send({ content: `⚠️ Le serveur a atteint la limite maximale de ${settings.maxRoomsPerGuild} salons temporaires.` }).catch(() => null);
      await member.voice.disconnect('Limite maximale de salons atteinte').catch(() => null);
      return null;
    }

    // 2. Anti-Abuse: Check max rooms per user
    const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
    if (userRooms.length >= settings.maxRoomsPerUser) {
      logger.warn(`[TemporaryVoice] Utilisateur ${member.user.tag} possède déjà un salon actif`);
      // Move them to their existing room if available
      const existing = guild.channels.cache.get(userRooms[0].id) as VoiceChannel | undefined;
      if (existing) {
        await member.voice.setChannel(existing).catch(() => null);
        return existing;
      }
    }

    // 3. Rate-Limit Cooldown
    const now = Date.now();
    const lastCreated = this.userCooldowns.get(member.id) || 0;
    const cooldownMs = settings.creationCooldownSeconds * 1000;
    if (now - lastCreated < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - lastCreated)) / 1000);
      logger.warn(`[TemporaryVoice] Cooldown actif pour ${member.user.tag} (${waitSec}s restantes)`);
      await member.send({ content: `⏳ Merci de patienter encore ${waitSec}s avant de créer un nouveau salon vocal.` }).catch(() => null);
      await member.voice.disconnect('Cooldown actif').catch(() => null);
      return null;
    }

    // 4. Role restrictions if hub accessMode === 'role_only'
    if (hub.accessMode === 'role_only' && hub.allowedRoles.length > 0) {
      const hasRole = hub.roleRequirementMode === 'all'
        ? hub.allowedRoles.every((rId) => member.roles.cache.has(rId))
        : hub.allowedRoles.some((rId) => member.roles.cache.has(rId));

      if (!hasRole && !member.permissions.has('Administrator')) {
        logger.warn(`[TemporaryVoice] Accès refusé pour ${member.user.tag} sur le hub ${hub.name} (rôle requis)`);
        await member.send({ content: `🔒 Vous ne possédez pas les rôles requis pour créer un salon dans **${hub.name}**.` }).catch(() => null);
        await member.voice.disconnect('Rôle requis non possédé').catch(() => null);
        return null;
      }
    }

    // 5. Excluded roles check
    if (hub.excludedRoles.some((rId) => member.roles.cache.has(rId))) {
      await member.voice.disconnect('Rôle exclu du hub').catch(() => null);
      return null;
    }

    try {
      // 6. Compute room name
      let roomNumber = 1;
      if (hub.autoNumbering || hub.namingTemplate.includes('{number}')) {
        roomNumber = VoiceNumberPool.getNextAvailableNumber(guild.id, hub.id);
      }

      let roomName = hub.namingTemplate
        .replace('{user}', member.user.username)
        .replace('{username}', member.user.username)
        .replace('{displayName}', member.displayName)
        .replace('{server}', guild.name)
        .replace('{number}', roomNumber.toString());

      if (roomName.length > 100) roomName = roomName.substring(0, 100);

      // 7. Build permissions overwrites
      const overwrites = VoicePermissionService.buildInitialOverwrites(guild, hub, member);

      // 8. Create channel in Discord
      const createdChannel = await guild.channels.create({
        name: roomName,
        type: ChannelType.GuildVoice,
        parent: hub.categoryId || undefined,
        userLimit: hub.userLimit || 0,
        bitrate: Math.min(hub.bitrate || settings.defaultBitrate || 64000, 384000),
        permissionOverwrites: overwrites,
        reason: `ETHONE Temporary Voice: Join-to-Create par ${member.user.tag} (${hub.name})`,
      });

      this.userCooldowns.set(member.id, now);

      // 9. Save room entity in repository
      const tempRoom: TemporaryVoiceRoom = {
        id: createdChannel.id,
        guildId: guild.id,
        hubId: hub.id,
        hubName: hub.name,
        name: roomName,
        ownerId: member.id,
        ownerTag: member.user.tag,
        userLimit: hub.userLimit || 0,
        bitrate: hub.bitrate || 64000,
        isLocked: hub.accessMode === 'locked',
        isHidden: hub.accessMode === 'invite_only',
        allowedUserIds: [],
        blockedUserIds: [],
        createdAt: new Date().toISOString(),
        lastEmptyAt: null,
        status: 'ACTIVE',
        currentUsers: [
          {
            id: member.id,
            tag: member.user.tag,
            avatar: member.user.displayAvatarURL(),
            joinedAt: new Date().toISOString(),
            isMuted: member.voice.selfMute || false,
            isDeafened: member.voice.selfDeaf || false,
            isStreaming: member.voice.streaming || false,
          },
        ],
        peakUsers: 1,
        totalSecondsActive: 0,
      };
      voiceRepository.saveRoom(tempRoom);

      // 10. Move member to created room
      await member.voice.setChannel(createdChannel).catch((err) => {
        logger.error(`[TemporaryVoice] Erreur lors du déplacement du membre:`, err);
      });

      // 11. Record Session & Timeline
      VoiceSessionService.recordJoin(member, createdChannel.id, roomName, hub.id);
      voiceRepository.addTimelineEvent({
        roomId: createdChannel.id,
        guildId: guild.id,
        type: 'ROOM_CREATED',
        actorId: member.id,
        actorTag: member.user.tag,
        details: `Création automatique via Hub "${hub.name}"`,
      });

      // 12. Audit Log
      logService.emit({
        guildId: guild.id,
        module: 'VOICE',
        type: 'TEMPORARY_ROOM_CREATED',
        actor: { id: member.id, tag: member.user.tag },
        channel: { id: createdChannel.id, name: roomName, type: 'VOICE' },
        reason: `Join-to-Create depuis le hub ${hub.name}`,
        metadata: { hubId: hub.id, hubName: hub.name, owner: member.user.tag },
      });

      // 13. Dispatch Automations
      await VoiceAutomationService.dispatch(guild, 'ROOM_CREATED', {
        member,
        channel: createdChannel,
        roomName,
        roomId: createdChannel.id,
      });

      // 14. Optionally send in-channel Voice Control Panel
      if (settings.sendControlPanelInRoom) {
        await DiscordVoicePanel.sendPanelMessage(createdChannel, tempRoom).catch(() => null);
      }

      logger.success(`[TemporaryVoice] Salon "${roomName}" (${createdChannel.id}) créé pour ${member.user.tag}`);
      return createdChannel;
    } catch (err) {
      logger.error(`[TemporaryVoice] Erreur lors de la création du salon temporaire:`, err);
      return null;
    }
  }

  /**
   * Handled when a member joins an already existing temporary voice channel.
   */
  public static handleMemberJoinExistingRoom(member: GuildMember, channel: VoiceChannel): void {
    const room = voiceRepository.getRoomById(channel.id);
    if (!room || room.status === 'DELETED') return;

    // 1. Cancel empty room deletion timer if active
    if (this.deletionTimers.has(room.id)) {
      clearTimeout(this.deletionTimers.get(room.id)!);
      this.deletionTimers.delete(room.id);
      logger.info(`[TemporaryVoice] Compte à rebours de suppression annulé pour ${room.name} (reconnexion)`);
    }

    room.status = 'ACTIVE';
    room.lastEmptyAt = null;

    // 2. Add to current users if not already present
    if (!room.currentUsers.some((u) => u.id === member.id)) {
      room.currentUsers.push({
        id: member.id,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL(),
        joinedAt: new Date().toISOString(),
        isMuted: member.voice.selfMute || false,
        isDeafened: member.voice.selfDeaf || false,
        isStreaming: member.voice.streaming || false,
      });
      room.peakUsers = Math.max(room.peakUsers, room.currentUsers.length);
      voiceRepository.saveRoom(room);
    }

    // 3. Record Session & Timeline
    VoiceSessionService.recordJoin(member, room.id, room.name, room.hubId);
    voiceRepository.addTimelineEvent({
      roomId: room.id,
      guildId: member.guild.id,
      type: 'USER_JOINED',
      actorId: member.id,
      actorTag: member.user.tag,
    });

    // 4. Dispatch automation
    VoiceAutomationService.dispatch(member.guild, 'USER_JOIN', {
      member,
      channel,
      roomName: room.name,
      roomId: room.id,
    });

    if (room.userLimit > 0 && room.currentUsers.length >= room.userLimit) {
      VoiceAutomationService.dispatch(member.guild, 'ROOM_FULL', {
        member,
        channel,
        roomName: room.name,
        roomId: room.id,
      });
    }
  }

  /**
   * Handled when a member leaves a temporary voice channel.
   */
  public static async handleMemberLeave(member: GuildMember, channelId: string): Promise<void> {
    const room = voiceRepository.getRoomById(channelId);
    if (!room || room.status === 'DELETED') return;

    const guild = member.guild;
    const settings = voiceRepository.getSettings(guild.id);

    // 1. Close session & remove from room users
    VoiceSessionService.recordLeave(member, channelId);
    room.currentUsers = room.currentUsers.filter((u) => u.id !== member.id);
    voiceRepository.saveRoom(room);

    voiceRepository.addTimelineEvent({
      roomId: room.id,
      guildId: guild.id,
      type: 'USER_LEFT',
      actorId: member.id,
      actorTag: member.user.tag,
    });

    await VoiceAutomationService.dispatch(guild, 'USER_LEAVE', {
      member,
      roomName: room.name,
      roomId: room.id,
    });

    // 2. Check if room is empty
    if (room.currentUsers.length === 0) {
      room.lastEmptyAt = new Date().toISOString();
      const delaySeconds = settings.emptyDeletionDelaySeconds;

      if (delaySeconds <= 0) {
        // Immediate deletion
        await this.deleteRoomChannel(guild, room.id, 'Salon temporaire vide (suppression immédiate)');
      } else {
        // Grace period timer
        room.status = 'EMPTY_COUNTDOWN';
        voiceRepository.saveRoom(room);

        logger.info(`[TemporaryVoice] Salon ${room.name} vide. Suppression programmée dans ${delaySeconds}s`);

        if (this.deletionTimers.has(room.id)) {
          clearTimeout(this.deletionTimers.get(room.id)!);
        }

        const timer = setTimeout(async () => {
          this.deletionTimers.delete(room.id);
          // Check if still empty
          const fresh = voiceRepository.getRoomById(room.id);
          if (fresh && fresh.currentUsers.length === 0 && fresh.status !== 'DELETED') {
            await this.deleteRoomChannel(guild, room.id, `Salon vide depuis ${delaySeconds}s`);
          }
        }, delaySeconds * 1000);

        this.deletionTimers.set(room.id, timer);

        await VoiceAutomationService.dispatch(guild, 'ROOM_EMPTY', {
          roomName: room.name,
          roomId: room.id,
        });
      }
      return;
    }

    // 3. If member who left was the room owner, execute transfer strategy
    if (member.id === room.ownerId) {
      const result = VoiceOwnershipService.handleOwnerLeave(
        room,
        settings.ownershipTransferStrategy,
        room.currentUsers
      );

      if (result.deleteRoom) {
        await this.deleteRoomChannel(guild, room.id, 'Départ du propriétaire (stratégie DELETE_ROOM)');
      }
    }
  }

  /**
   * Deletes a temporary voice channel on Discord and marks it deleted in repository.
   */
  public static async deleteRoomChannel(guild: Guild, roomId: string, reason: string): Promise<boolean> {
    try {
      if (this.deletionTimers.has(roomId)) {
        clearTimeout(this.deletionTimers.get(roomId)!);
        this.deletionTimers.delete(roomId);
      }

      const room = voiceRepository.getRoomById(roomId);
      const roomName = room?.name || 'Salon vocal';

      // Delete on Discord
      const discordChannel = guild.channels.cache.get(roomId);
      if (discordChannel) {
        await discordChannel.delete(reason).catch((err) => {
          logger.warn(`[TemporaryVoice] Salon ${roomId} déjà supprimé ou inaccessible:`, err);
        });
      }

      voiceRepository.deleteRoom(roomId);
      voiceRepository.addTimelineEvent({
        roomId,
        guildId: guild.id,
        type: 'ROOM_DELETED',
        actorId: 'system',
        actorTag: 'ETHONE Voice Engine',
        details: reason,
      });

      logService.emit({
        guildId: guild.id,
        module: 'VOICE',
        type: 'TEMPORARY_ROOM_DELETED',
        actor: { id: 'system', tag: 'ETHONE Engine' },
        channel: { id: roomId, name: roomName, type: 'VOICE' },
        reason,
      });

      await VoiceAutomationService.dispatch(guild, 'ROOM_DELETED', {
        roomName,
        roomId,
      });

      logger.info(`[TemporaryVoice] Salon ${roomName} (${roomId}) supprimé: ${reason}`);
      return true;
    } catch (err) {
      logger.error(`[TemporaryVoice] Erreur lors de la suppression de ${roomId}:`, err);
      return false;
    }
  }
}
