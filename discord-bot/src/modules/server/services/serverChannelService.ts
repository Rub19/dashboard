import {
  Client,
  Guild,
  ChannelType,
  GuildChannel,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  PermissionsBitField,
  PermissionFlagsBits,
} from 'discord.js';
import { ChannelItem, CategoryTreeItem, ChannelTreeData, ChannelPermissionOverride } from '../types/index.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ServerChannelService {
  /**
   * Builds the channel hierarchy tree grouped by categories.
   */
  public static getChannelTree(client: Client, guildId: string): ChannelTreeData {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { categories: [], orphanChannels: [] };

    const categories: CategoryTreeItem[] = [];
    const orphanChannels: ChannelItem[] = [];

    // Filter categories
    const categoryChannels = guild.channels.cache
      .filter((ch) => ch.type === ChannelType.GuildCategory)
      .sort((a: any, b: any) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0));

    // Populate categories
    categoryChannels.forEach((cat) => {
      const children = guild.channels.cache
        .filter((ch) => ch.parentId === cat.id && (ch.type as any) !== ChannelType.GuildCategory)
        .sort((a: any, b: any) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
        .map((ch) => this.mapChannelItem(ch));

      categories.push({
        id: cat.id,
        name: cat.name,
        position: (cat as any).rawPosition ?? (cat as any).position ?? 0,
        channels: children,
      });
    });

    // Populate channels without category
    guild.channels.cache
      .filter((ch) => !ch.parentId && (ch.type as any) !== ChannelType.GuildCategory)
      .sort((a: any, b: any) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
      .forEach((ch) => {
        orphanChannels.push(this.mapChannelItem(ch));
      });

    return { categories, orphanChannels };
  }

  private static mapChannelItem(ch: any): ChannelItem {
    return {
      id: ch.id,
      name: ch.name,
      type: ch.type,
      parentId: ch.parentId || null,
      position: ch.position,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      rateLimitPerUser: ch.rateLimitPerUser || 0,
      bitrate: ch.bitrate || undefined,
      userLimit: ch.userLimit || undefined,
      permissionOverwritesCount: ch.permissionOverwrites?.cache?.size || 0,
    };
  }

  /**
   * Creates a new channel via the Channel Creator Wizard.
   */
  public static async createChannel(
    client: Client,
    guildId: string,
    payload: {
      name: string;
      type: number;
      parentId?: string | null;
      topic?: string;
      nsfw?: boolean;
      bitrate?: number;
      userLimit?: number;
      rateLimitPerUser?: number;
      isPrivate?: boolean;
      allowedRoleIds?: string[];
    }
  ): Promise<{ success: boolean; channel?: ChannelItem; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    try {
      const overwrites: any[] = [];
      if (payload.isPrivate) {
        overwrites.push({
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        });
        if (payload.allowedRoleIds?.length) {
          payload.allowedRoleIds.forEach((rId) => {
            overwrites.push({
              id: rId,
              allow: [PermissionFlagsBits.ViewChannel],
            });
          });
        }
      }

      const created = await guild.channels.create({
        name: payload.name.trim(),
        type: payload.type as any,
        parent: payload.parentId || undefined,
        topic: payload.topic || undefined,
        nsfw: payload.nsfw || false,
        bitrate: payload.bitrate || undefined,
        userLimit: payload.userLimit || undefined,
        rateLimitPerUser: payload.rateLimitPerUser || undefined,
        permissionOverwrites: overwrites.length > 0 ? overwrites : undefined,
        reason: 'Créé via ETHONE Server Management 2.0',
      });

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'CHANNEL_CREATE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        channel: { id: created.id, name: created.name, type: ChannelType[created.type] || 'TEXT' },
        reason: 'Création via Channel Creator Wizard',
      });

      return { success: true, channel: this.mapChannelItem(created) };
    } catch (err: any) {
      logger.error('[ServerChannelService] Erreur création salon:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates channel settings.
   */
  public static async updateChannel(
    client: Client,
    guildId: string,
    channelId: string,
    payload: Partial<{
      name: string;
      topic: string;
      nsfw: boolean;
      rateLimitPerUser: number;
      bitrate: number;
      userLimit: number;
      parentId: string | null;
    }>
  ): Promise<{ success: boolean; channel?: ChannelItem; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const ch = guild.channels.cache.get(channelId);
    if (!ch) return { success: false, error: 'Salon introuvable.' };

    try {
      const updated = await (ch as any).edit({
        name: payload.name !== undefined ? payload.name.trim() : undefined,
        topic: payload.topic !== undefined ? payload.topic : undefined,
        nsfw: payload.nsfw !== undefined ? payload.nsfw : undefined,
        rateLimitPerUser: payload.rateLimitPerUser !== undefined ? payload.rateLimitPerUser : undefined,
        bitrate: payload.bitrate !== undefined ? payload.bitrate : undefined,
        userLimit: payload.userLimit !== undefined ? payload.userLimit : undefined,
        parent: payload.parentId !== undefined ? payload.parentId : undefined,
      });

      return { success: true, channel: this.mapChannelItem(updated) };
    } catch (err: any) {
      logger.error('[ServerChannelService] Erreur mise à jour salon:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes a channel safely with impact estimation.
   */
  public static async deleteChannel(
    client: Client,
    guildId: string,
    channelId: string,
    reason: string = 'Supprimé via ETHONE Dashboard'
  ): Promise<{ success: boolean; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const ch = guild.channels.cache.get(channelId);
    if (!ch) return { success: false, error: 'Salon introuvable.' };

    try {
      const channelName = ch.name;
      const channelType = ChannelType[ch.type] || 'CHANNEL';
      await ch.delete(reason);

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'CHANNEL_DELETE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        channel: { id: channelId, name: channelName, type: channelType },
        reason,
      });

      return { success: true };
    } catch (err: any) {
      logger.error('[ServerChannelService] Erreur suppression salon:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetches channel permission overrides.
   */
  public static getChannelPermissions(
    client: Client,
    guildId: string,
    channelId: string
  ): ChannelPermissionOverride[] {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    const ch = guild.channels.cache.get(channelId);
    if (!ch || !('permissionOverwrites' in ch)) return [];

    const overrides: ChannelPermissionOverride[] = [];
    (ch as any).permissionOverwrites.cache.forEach((ov: any) => {
      let targetName = ov.id;
      if (ov.type === 0) {
        // Role
        const role = guild.roles.cache.get(ov.id);
        targetName = role ? role.name : `@Role_${ov.id}`;
      } else {
        // Member
        const member = guild.members.cache.get(ov.id);
        targetName = member ? member.user.tag : `User_${ov.id}`;
      }

      overrides.push({
        id: ov.id,
        type: ov.type === 0 ? 'role' : 'member',
        name: targetName,
        allow: ov.allow.toArray(),
        deny: ov.deny.toArray(),
      });
    });

    return overrides;
  }

  /**
   * Sets or edits permission overrides on a channel.
   */
  public static async setChannelPermission(
    client: Client,
    guildId: string,
    channelId: string,
    targetId: string,
    allow: string[],
    deny: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const ch = guild.channels.cache.get(channelId);
    if (!ch || !('permissionOverwrites' in ch)) return { success: false, error: 'Salon non configurable.' };

    try {
      const allowBits = allow.reduce((acc, p) => (PermissionFlagsBits as any)[p] ? acc | (PermissionFlagsBits as any)[p] : acc, 0n);
      const denyBits = deny.reduce((acc, p) => (PermissionFlagsBits as any)[p] ? acc | (PermissionFlagsBits as any)[p] : acc, 0n);

      await (ch as any).permissionOverwrites.edit(targetId, {
        ...this.permissionArrayToRecord(allow, true),
        ...this.permissionArrayToRecord(deny, false),
      });

      return { success: true };
    } catch (err: any) {
      logger.error('[ServerChannelService] Erreur permission overwrite:', err);
      return { success: false, error: err.message };
    }
  }

  private static permissionArrayToRecord(perms: string[], value: boolean): Record<string, boolean> {
    const rec: Record<string, boolean> = {};
    perms.forEach((p) => {
      rec[p] = value;
    });
    return rec;
  }
}
