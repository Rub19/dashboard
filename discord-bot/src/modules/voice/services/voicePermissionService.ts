import {
  Guild,
  GuildMember,
  OverwriteResolvable,
  PermissionFlagsBits,
  VoiceChannel,
} from 'discord.js';
import { VoiceHub } from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export class VoicePermissionService {
  public static buildInitialOverwrites(
    guild: Guild,
    hub: VoiceHub | { accessMode: string; allowedRoles: string[]; excludedRoles: string[] },
    owner: GuildMember
  ): OverwriteResolvable[] {
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
      id: owner.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
        PermissionFlagsBits.PrioritySpeaker,
      ],
    });
    if (hub.accessMode === 'locked') {
      overwrites.push({
        id: guild.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.Connect],
      });
    } else if (hub.accessMode === 'role_only' && hub.allowedRoles.length > 0) {
      overwrites.push({
        id: guild.id,
        deny: [PermissionFlagsBits.Connect],
      });
      for (const roleId of hub.allowedRoles) {
        overwrites.push({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
        });
      }
    } else if (hub.accessMode === 'invite_only') {
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
    for (const roleId of hub.excludedRoles) {
      overwrites.push({
        id: roleId,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      });
    }
    return overwrites;
  }

  public static async applyLock(channel: VoiceChannel, locked: boolean): Promise<boolean> {
    try {
      await channel.permissionOverwrites.edit(channel.guild.id, {
        Connect: locked ? false : null,
      });
      return true;
    } catch (err) {
      logger.error('[VoicePermission] Impossible d\'éditer les permissions pour ' + channel.name + ':', err);
      return false;
    }
  }

  public static async applyHide(channel: VoiceChannel, hidden: boolean): Promise<boolean> {
    try {
      await channel.permissionOverwrites.edit(channel.guild.id, {
        ViewChannel: hidden ? false : null,
      });
      return true;
    } catch (err) {
      logger.error('[VoicePermission] Impossible de masquer ' + channel.name + ':', err);
      return false;
    }
  }

  public static async setUserAccess(
    channel: VoiceChannel,
    targetUserId: string,
    mode: 'allow' | 'block' | 'reset'
  ): Promise<boolean> {
    try {
      if (mode === 'allow') {
        await channel.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
        });
      } else if (mode === 'block') {
        await channel.permissionOverwrites.edit(targetUserId, {
          Connect: false,
          ViewChannel: false,
        });
        // Disconnect user if currently in channel
        const member = channel.members.get(targetUserId);
        if (member) {
          await member.voice.disconnect('Banni du salon vocal').catch(() => null);
        }
      } else {
        await channel.permissionOverwrites.delete(targetUserId);
      }
      return true;
    } catch (err) {
      logger.error('[VoicePermission] Erreur setUserAccess pour ' + targetUserId + ':', err);
      return false;
    }
  }

  public static async applyWhitelist(channel: VoiceChannel, whitelistUserIds: string[]): Promise<void> {
    for (const userId of whitelistUserIds) {
      await this.setUserAccess(channel, userId, 'allow');
    }
  }

  public static async applyBanlist(channel: VoiceChannel, banlistUserIds: string[]): Promise<void> {
    for (const userId of banlistUserIds) {
      await this.setUserAccess(channel, userId, 'block');
    }
  }

  public static async kickMember(channel: VoiceChannel, memberId: string, reason: string = 'Expulsé par le propriétaire'): Promise<boolean> {
    try {
      const member = channel.members.get(memberId);
      if (member) {
        await member.voice.disconnect(reason);
        return true;
      }
      return false;
    } catch (err) {
      logger.error(`[VoicePermission] Erreur expulsion ${memberId}:`, err);
      return false;
    }
  }

  public static async muteMember(channel: VoiceChannel, memberId: string, mute: boolean): Promise<boolean> {
    try {
      const member = channel.members.get(memberId);
      if (member) {
        await member.voice.setMute(mute, 'Mute par le propriétaire du salon');
        return true;
      }
      return false;
    } catch (err) {
      logger.error(`[VoicePermission] Erreur mute ${memberId}:`, err);
      return false;
    }
  }
}
