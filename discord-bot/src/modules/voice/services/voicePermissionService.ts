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
    hub: VoiceHub,
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
        });
      } else {
        await channel.permissionOverwrites.delete(targetUserId);
      }
      return true;
    } catch (err) {
      logger.error('[VoicePermission] Erreur setUserAccess pour ' + targetUserId + ':', err);
      return false;
    }
  }
}