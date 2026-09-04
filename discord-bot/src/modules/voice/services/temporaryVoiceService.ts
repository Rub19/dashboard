import {
  ChannelType,
  Guild,
  GuildMember,
  TextChannel,
  VoiceChannel,
  PermissionFlagsBits,
  OverwriteResolvable,
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
   * Publishes or updates the permanent Creation Panel message in the specified text channel.
   */
  public static async publishCreationPanel(
    guild: Guild,
    textChannelId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const channel = guild.channels.cache.get(textChannelId);
      if (!channel || !channel.isTextBased()) {
        return { success: false, error: 'Salon textuel introuvable ou invalide.' };
      }

      const settings = voiceRepository.getSettings(guild.id);
      const payload = DiscordVoicePanel.buildCreatePanel(settings);

      let msg: any = null;
      if (settings.creationPanelMessageId) {
        try {
          const existingMsg = await (channel as TextChannel).messages.fetch(settings.creationPanelMessageId).catch(() => null);
          if (existingMsg) {
            msg = await existingMsg.edit(payload);
          }
        } catch {
          // If message fetch failed, we fall through to sending a new one
        }
      }

      if (!msg) {
        msg = await (channel as TextChannel).send(payload);
      }

      voiceRepository.updateSettings(guild.id, {
        creationTextChannelId: textChannelId,
        creationPanelMessageId: msg.id,
      });

      logger.info(`[TemporaryVoice] Panneau de création publié sur ${guild.name} (#${channel.name}) - Message ${msg.id}`);
      return { success: true, messageId: msg.id };
    } catch (err: any) {
      logger.error(`[TemporaryVoice] Erreur publication panneau de création:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Creates a personal voice room on behalf of a member (e.g. from Creation Panel or API).
   */
  public static async createPersonalVoiceRoom(
    member: GuildMember,
    customOptions?: {
      name?: string;
      limit?: number;
      locked?: boolean;
      hidden?: boolean;
      bitrate?: number;
    }
  ): Promise<{ success: boolean; message?: string; channel?: VoiceChannel; room?: TemporaryVoiceRoom; alreadyExists?: boolean }> {
    const guild = member.guild;
    const settings = voiceRepository.getSettings(guild.id);

    if (!settings.enabled) {
      return { success: false, message: 'Le système de salons vocaux temporaires est actuellement désactivé sur ce serveur.' };
    }

    // 1. Anti-abuse: Check max rooms in guild
    const activeRooms = voiceRepository.getRooms(guild.id);
    if (activeRooms.length >= settings.maxRoomsPerGuild) {
      return { success: false, message: `La limite maximale de salons vocaux sur le serveur (${settings.maxRoomsPerGuild}) est atteinte.` };
    }

    // 2. Anti-abuse: Check max rooms per user
    const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
    if (userRooms.length >= settings.maxRoomsPerUser) {
      const existingChannel = guild.channels.cache.get(userRooms[0].id) as VoiceChannel | undefined;
      return {
        success: false,
        message: `Vous possédez déjà un salon vocal actif (${userRooms[0].name}).`,
        channel: existingChannel,
        room: userRooms[0],
        alreadyExists: true,
      };
    }

    // 3. Cooldown check
    const now = Date.now();
    const lastCreated = this.userCooldowns.get(member.id) || 0;
    const cooldownMs = (settings.creationCooldownSeconds || 15) * 1000;
    if (now - lastCreated < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - lastCreated)) / 1000);
      return { success: false, message: `Veuillez patienter encore ${waitSec}s avant de recréer un salon.` };
    }

    try {
      // 4. Resolve user preferences
      const userPrefs = voiceRepository.getUserPreferences(member.id);

      const isLocked = customOptions?.locked !== undefined ? customOptions.locked : (userPrefs?.defaultLocked ?? false);
      const isHidden = customOptions?.hidden !== undefined ? customOptions.hidden : (userPrefs?.defaultHidden ?? false);
      const userLimit = customOptions?.limit !== undefined ? customOptions.limit : (userPrefs?.defaultLimit ?? 0);
      const bitrate = customOptions?.bitrate || userPrefs?.defaultBitrate || settings.defaultBitrate || 64000;

      // 5. Compute room name
      let template = customOptions?.name || userPrefs?.defaultName || settings.defaultRoomNameTemplate || '🔊 Salon de {username}';
      let roomName = template
        .replace('{user}', member.user.username)
        .replace('{username}', member.user.username)
        .replace('{displayName}', member.displayName)
        .replace('{server}', guild.name);

      if (roomName.length > 100) roomName = roomName.substring(0, 100);

      // 6. Overwrites
      const overwrites: OverwriteResolvable[] = [];
      if (guild.members.me) {
        overwrites.push({
          id: guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
          ],
        });
      }

      overwrites.push({
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
          PermissionFlagsBits.PrioritySpeaker,
        ],
      });

      if (isLocked) {
        overwrites.push({
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.Connect],
        });
      } else if (isHidden) {
        overwrites.push({
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        });
      } else {
        overwrites.push({
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
        });
      }

      // 7. Create Discord Channel
      const targetCategory = settings.roomCategory || settings.defaultCategoryId || undefined;
      const createdChannel = await guild.channels.create({
        name: roomName,
        type: ChannelType.GuildVoice,
        parent: targetCategory,
        userLimit: Math.min(Math.max(userLimit, 0), 99),
        bitrate: Math.min(Math.max(bitrate, 8000), 384000),
        permissionOverwrites: overwrites,
        reason: `ETHONE Personal Voice: Créé par ${member.user.tag}`,
      });

      this.userCooldowns.set(member.id, now);

      // 8. Construct Entity
      const isConnected = !!member.voice.channel;
      const tempRoom: TemporaryVoiceRoom = {
        id: createdChannel.id,
        guildId: guild.id,
        hubId: 'personal_voice_2',
        hubName: 'Personal Voice Rooms 2.0',
        name: roomName,
        ownerId: member.id,
        ownerTag: member.user.tag,
        userLimit,
        bitrate,
        isLocked,
        isHidden,
        allowedUserIds: [],
        blockedUserIds: [],
        whitelist: [],
        banlist: [],
        textChannelId: createdChannel.id,
        createdAt: new Date().toISOString(),
        lastEmptyAt: isConnected ? null : new Date().toISOString(),
        status: isConnected ? 'ACTIVE' : 'EMPTY_COUNTDOWN',
        currentUsers: isConnected
          ? [
              {
                id: member.id,
                tag: member.user.tag,
                avatar: member.user.displayAvatarURL(),
                joinedAt: new Date().toISOString(),
                isMuted: member.voice.selfMute || false,
                isDeafened: member.voice.selfDeaf || false,
                isStreaming: member.voice.streaming || false,
              },
            ]
          : [],
        peakUsers: isConnected ? 1 : 0,
        totalSecondsActive: 0,
      };

      voiceRepository.saveRoom(tempRoom);

      // 9. Move user if currently connected to a voice channel
      if (isConnected) {
        await member.voice.setChannel(createdChannel).catch((err) => {
          logger.warn(`[TemporaryVoice] Impossible de déplacer l'utilisateur dans le salon:`, err);
        });
        VoiceSessionService.recordJoin(member, createdChannel.id, roomName, 'personal_voice_2');
      } else {
        // Start grace period countdown if user is not in voice
        this.scheduleEmptyDeletion(guild, tempRoom.id, settings.emptyDeletionDelaySeconds || 60);
      }

      // 10. Record Timeline & Audit
      voiceRepository.addTimelineEvent({
        roomId: createdChannel.id,
        guildId: guild.id,
        type: 'ROOM_CREATED',
        actorId: member.id,
        actorTag: member.user.tag,
        details: `Création via Panneau Personnel 2.0`,
      });

      logService.emit({
        guildId: guild.id,
        module: 'VOICE',
        type: 'TEMPORARY_ROOM_CREATED',
        actor: { id: member.id, tag: member.user.tag },
        channel: { id: createdChannel.id, name: roomName, type: 'VOICE' },
        reason: 'Création via Personal Voice Rooms 2.0',
        metadata: { owner: member.user.tag, isLocked, isHidden, userLimit },
      });

      // 11. Send in-channel Voice Control Panel
      if (settings.sendControlPanelInRoom) {
        await DiscordVoicePanel.sendPanelMessage(createdChannel, tempRoom).catch(() => null);
      }

      await VoiceAutomationService.dispatch(guild, 'ROOM_CREATED', {
        member,
        channel: createdChannel,
        roomName,
        roomId: createdChannel.id,
      });

      logger.success(`[TemporaryVoice] Salon personnel "${roomName}" (${createdChannel.id}) créé pour ${member.user.tag}`);
      return { success: true, channel: createdChannel, room: tempRoom };
    } catch (err: any) {
      logger.error(`[TemporaryVoice] Erreur création salon personnel:`, err);
      return { success: false, message: `Erreur interne: ${err.message}` };
    }
  }

  /**
   * Entry point when user connects to a traditional "Join to Create" Hub channel.
   */
  public static async handleMemberJoinHub(member: GuildMember, hub: VoiceHub): Promise<VoiceChannel | null> {
    const guild = member.guild;
    const settings = voiceRepository.getSettings(guild.id);
    if (!settings.enabled || !hub.enabled) return null;

    const activeRooms = voiceRepository.getRooms(guild.id);
    if (activeRooms.length >= settings.maxRoomsPerGuild) {
      await member.send({ content: `⚠️ Le serveur a atteint la limite de ${settings.maxRoomsPerGuild} salons vocaux.` }).catch(() => null);
      await member.voice.disconnect('Limite atteinte').catch(() => null);
      return null;
    }

    const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
    if (userRooms.length >= settings.maxRoomsPerUser) {
      const existing = guild.channels.cache.get(userRooms[0].id) as VoiceChannel | undefined;
      if (existing) {
        await member.voice.setChannel(existing).catch(() => null);
        return existing;
      }
    }

    const now = Date.now();
    const lastCreated = this.userCooldowns.get(member.id) || 0;
    const cooldownMs = settings.creationCooldownSeconds * 1000;
    if (now - lastCreated < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - lastCreated)) / 1000);
      await member.send({ content: `⏳ Merci de patienter encore ${waitSec}s.` }).catch(() => null);
      await member.voice.disconnect('Cooldown actif').catch(() => null);
      return null;
    }

    if (hub.accessMode === 'role_only' && hub.allowedRoles.length > 0) {
      const hasRole = hub.roleRequirementMode === 'all'
        ? hub.allowedRoles.every((rId) => member.roles.cache.has(rId))
        : hub.allowedRoles.some((rId) => member.roles.cache.has(rId));

      if (!hasRole && !member.permissions.has('Administrator')) {
        await member.send({ content: `🔒 Rôles requis non possédés pour **${hub.name}**.` }).catch(() => null);
        await member.voice.disconnect('Rôle requis non possédé').catch(() => null);
        return null;
      }
    }

    if (hub.excludedRoles.some((rId) => member.roles.cache.has(rId))) {
      await member.voice.disconnect('Rôle exclu du hub').catch(() => null);
      return null;
    }

    try {
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

      const overwrites = VoicePermissionService.buildInitialOverwrites(guild, hub, member);

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
        whitelist: [],
        banlist: [],
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

      await member.voice.setChannel(createdChannel).catch((err) => {
        logger.error(`[TemporaryVoice] Erreur lors du déplacement du membre:`, err);
      });

      VoiceSessionService.recordJoin(member, createdChannel.id, roomName, hub.id);
      voiceRepository.addTimelineEvent({
        roomId: createdChannel.id,
        guildId: guild.id,
        type: 'ROOM_CREATED',
        actorId: member.id,
        actorTag: member.user.tag,
        details: `Création automatique via Hub "${hub.name}"`,
      });

      logService.emit({
        guildId: guild.id,
        module: 'VOICE',
        type: 'TEMPORARY_ROOM_CREATED',
        actor: { id: member.id, tag: member.user.tag },
        channel: { id: createdChannel.id, name: roomName, type: 'VOICE' },
        reason: `Join-to-Create depuis le hub ${hub.name}`,
        metadata: { hubId: hub.id, hubName: hub.name, owner: member.user.tag },
      });

      await VoiceAutomationService.dispatch(guild, 'ROOM_CREATED', {
        member,
        channel: createdChannel,
        roomName,
        roomId: createdChannel.id,
      });

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

    // Cancel empty room deletion countdown if active
    if (this.deletionTimers.has(room.id)) {
      clearTimeout(this.deletionTimers.get(room.id)!);
      this.deletionTimers.delete(room.id);
      logger.info(`[TemporaryVoice] Compte à rebours de suppression annulé pour ${room.name} (reconnexion)`);
    }

    room.status = 'ACTIVE';
    room.lastEmptyAt = null;

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

    VoiceSessionService.recordJoin(member, room.id, room.name, room.hubId);
    voiceRepository.addTimelineEvent({
      roomId: room.id,
      guildId: member.guild.id,
      type: 'USER_JOINED',
      actorId: member.id,
      actorTag: member.user.tag,
    });

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

    // Check if room is empty
    if (room.currentUsers.length === 0) {
      room.lastEmptyAt = new Date().toISOString();
      const delaySeconds = settings.emptyDeletionDelaySeconds;

      if (delaySeconds <= 0) {
        await this.deleteRoomChannel(guild, room.id, 'Salon temporaire vide (suppression immédiate)');
      } else {
        this.scheduleEmptyDeletion(guild, room.id, delaySeconds);
        await VoiceAutomationService.dispatch(guild, 'ROOM_EMPTY', {
          roomName: room.name,
          roomId: room.id,
        });
      }
      return;
    }

    // Owner leave transfer strategy
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
   * Schedules an empty room deletion countdown.
   */
  private static scheduleEmptyDeletion(guild: Guild, roomId: string, delaySeconds: number): void {
    const room = voiceRepository.getRoomById(roomId);
    if (!room) return;

    room.status = 'EMPTY_COUNTDOWN';
    voiceRepository.saveRoom(room);

    if (this.deletionTimers.has(roomId)) {
      clearTimeout(this.deletionTimers.get(roomId)!);
    }

    logger.info(`[TemporaryVoice] Salon ${room.name} vide. Suppression programmée dans ${delaySeconds}s`);

    const timer = setTimeout(async () => {
      this.deletionTimers.delete(roomId);
      const fresh = voiceRepository.getRoomById(roomId);
      if (fresh && fresh.currentUsers.length === 0 && fresh.status !== 'DELETED') {
        await this.deleteRoomChannel(guild, roomId, `Salon vide depuis ${delaySeconds}s`);
      }
    }, delaySeconds * 1000);

    this.deletionTimers.set(roomId, timer);
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
