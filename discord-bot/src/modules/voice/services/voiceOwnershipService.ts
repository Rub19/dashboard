import { GuildMember } from 'discord.js';
import { TemporaryVoiceRoom, OwnershipTransferStrategy } from '../types/index.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class VoiceOwnershipService {
  public static canManageRoom(room: TemporaryVoiceRoom, member: GuildMember): boolean {
    if (member.id === room.ownerId) return true;
    if (member.permissions.has('Administrator') || member.permissions.has('ManageChannels')) {
      return true;
    }
    return false;
  }

  public static transferOwnership(
    room: TemporaryVoiceRoom,
    newOwner: { id: string; tag: string },
    actor: { id: string; tag: string },
    reason: string = 'Transfert manuel de propriété'
  ): TemporaryVoiceRoom {
    const prevOwnerTag = room.ownerTag;
    room.ownerId = newOwner.id;
    room.ownerTag = newOwner.tag;
    voiceRepository.saveRoom(room);

    voiceRepository.addTimelineEvent({
      roomId: room.id,
      guildId: room.guildId,
      type: 'OWNER_TRANSFERRED',
      actorId: actor.id,
      actorTag: actor.tag,
      targetId: newOwner.id,
      targetTag: newOwner.tag,
      details: 'Transféré de ' + prevOwnerTag + ' à ' + newOwner.tag + ' (' + reason + ')',
    });

    logService.emit({
      guildId: room.guildId,
      module: 'VOICE',
      type: 'OWNER_TRANSFERRED',
      actor: { id: actor.id, tag: actor.tag },
      target: { id: newOwner.id, type: 'USER', name: newOwner.tag },
      channel: { id: room.id, name: room.name, type: 'VOICE' },
      reason,
      metadata: { previousOwner: prevOwnerTag, newOwner: newOwner.tag },
    });

    logger.info('[VoiceOwnership] Room ' + room.name + ' transférée à ' + newOwner.tag);
    return room;
  }

  public static handleOwnerLeave(
    room: TemporaryVoiceRoom,
    strategy: OwnershipTransferStrategy,
    remainingUsers: Array<{ id: string; tag: string }>
  ): { transferred: boolean; newOwner?: { id: string; tag: string }; deleteRoom?: boolean } {
    if (remainingUsers.length === 0 || strategy === 'DELETE_ROOM') {
      return { transferred: false, deleteRoom: true };
    }
    if (strategy === 'OWNERLESS') {
      room.ownerId = 'ownerless';
      room.ownerTag = 'Aucun propriétaire';
      voiceRepository.saveRoom(room);
      return { transferred: false };
    }
    let targetUser: { id: string; tag: string } | null = null;
    if (strategy === 'FIRST_REMAINING') {
      targetUser = remainingUsers[0];
    } else if (strategy === 'RANDOM_REMAINING') {
      const idx = Math.floor(Math.random() * remainingUsers.length);
      targetUser = remainingUsers[idx];
    } else {
      targetUser = remainingUsers[0];
    }
    if (targetUser) {
      this.transferOwnership(
        room,
        targetUser,
        { id: 'system', tag: 'ETHONE Auto-Ownership' },
        'Transfert automatique (' + strategy + ')'
      );
      return { transferred: true, newOwner: targetUser };
    }
    return { transferred: false };
  }
}