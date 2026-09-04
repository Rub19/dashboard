import { Client, VoiceState, VoiceChannel } from 'discord.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { TemporaryVoiceService } from './temporaryVoiceService.js';
import { logger } from '../../../utils/logger.js';

export class VoiceService {
  private client: Client | null = null;

  /**
   * Initializes the Voice service, recovers active temporary channels and starts monitors.
   */
  public async initialize(client: Client): Promise<void> {
    this.client = client;
    logger.info('[VoiceService] Initialisation du gestionnaire de salons vocaux 2.0...');

    try {
      // Bot restart recovery
      for (const [guildId, guild] of client.guilds.cache) {
        const storedRooms = voiceRepository.getRooms(guildId);

        for (const room of storedRooms) {
          const discordChannel = guild.channels.cache.get(room.id) as VoiceChannel | undefined;

          if (!discordChannel) {
            // Channel was deleted while bot was offline
            logger.info(`[VoiceService] Salon temporaire abandonné détecté (introuvable sur Discord): ${room.name}`);
            voiceRepository.deleteRoom(room.id);
            continue;
          }

          // Resync current users
          const currentMembers = Array.from(discordChannel.members.values());
          room.currentUsers = currentMembers.map((m) => ({
            id: m.id,
            tag: m.user.tag,
            avatar: m.user.displayAvatarURL(),
            joinedAt: new Date().toISOString(),
            isMuted: m.voice.selfMute || false,
            isDeafened: m.voice.selfDeaf || false,
            isStreaming: m.voice.streaming || false,
          }));

          if (currentMembers.length === 0) {
            // If room is empty on bot restart, trigger empty cleanup
            const settings = voiceRepository.getSettings(guildId);
            const delay = settings.emptyDeletionDelaySeconds;
            if (delay === 0) {
              await TemporaryVoiceService.deleteRoomChannel(guild, room.id, 'Nettoyage au redémarrage (salon vide)');
            } else {
              room.status = 'EMPTY_COUNTDOWN';
              voiceRepository.saveRoom(room);
              setTimeout(async () => {
                const fresh = voiceRepository.getRoomById(room.id);
                if (fresh && fresh.currentUsers.length === 0 && fresh.status !== 'DELETED') {
                  await TemporaryVoiceService.deleteRoomChannel(guild, room.id, 'Salon vide après redémarrage');
                }
              }, delay * 1000);
            }
          } else {
            room.status = 'ACTIVE';
            voiceRepository.saveRoom(room);
          }
        }
      }

      logger.success('[VoiceService] Récupération et synchronisation des salons vocaux terminées.');
    } catch (err) {
      logger.error('[VoiceService] Erreur lors de la synchronisation au démarrage:', err);
    }
  }

  /**
   * Main listener hook for Discord Events.VoiceStateUpdate
   */
  public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // No channel change (mute/deafen/stream update only)
    if (oldChannelId === newChannelId) {
      if (newChannelId) {
        const room = voiceRepository.getRoomById(newChannelId);
        if (room) {
          const userEntry = room.currentUsers.find((u) => u.id === member.id);
          if (userEntry) {
            userEntry.isMuted = newState.selfMute || false;
            userEntry.isDeafened = newState.selfDeaf || false;
            userEntry.isStreaming = newState.streaming || false;
            voiceRepository.saveRoom(room);
          }
        }
      }
      return;
    }

    // 1. Member left old channel
    if (oldChannelId) {
      await TemporaryVoiceService.handleMemberLeave(member, oldChannelId);
    }

    // 2. Member joined new channel
    if (newChannelId) {
      const guildId = newState.guild.id;

      // Check if this channel is a "Join to Create" Hub
      const hub = voiceRepository.getHubByChannelId(newChannelId);
      if (hub) {
        await TemporaryVoiceService.handleMemberJoinHub(member, hub);
        return;
      }

      // Check if this channel is an existing temporary room
      const existingRoom = voiceRepository.getRoomById(newChannelId);
      if (existingRoom && newState.channel) {
        TemporaryVoiceService.handleMemberJoinExistingRoom(member, newState.channel as VoiceChannel);
        return;
      }
    }
  }
}

export const voiceService = new VoiceService();
