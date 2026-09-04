import fs from 'node:fs';
import path from 'node:path';
import { Guild, ChannelType } from 'discord.js';
import {
  BackupCategory,
  BackupChannel,
  BackupComponent,
  BackupEmoji,
  BackupGuildSettings,
  BackupPermissionOverwrite,
  BackupRole,
  BackupSnapshot,
  BackupType,
  EthoneModuleConfigs,
} from '../types/index.js';
import { BackupIntegrityService } from './backupIntegrityService.js';
import { logger } from '../../../utils/logger.js';

export interface ScanProgressCallback {
  (step: string, percent: number): void;
}

export class BackupCollectorService {
  /**
   * Collecte les configurations ETHONE pour la guild spécifiée depuis les fichiers de données
   */
  public static collectEthoneConfigs(guildId: string): EthoneModuleConfigs {
    const dataDir = path.resolve(process.cwd(), 'data');
    const configs: EthoneModuleConfigs = {};

    const fileMap: Record<string, string> = {
      guild: 'guild_configs.json',
      welcome: 'welcome_configs.json',
      moderation: 'moderation_settings.json',
      antiRaid: 'anti_raid_configs.json',
      autoMod: 'automod_configs.json',
      tickets: 'ticket_categories.json',
      ticketTeams: 'ticket_teams.json',
      voiceHubs: 'voice_hubs.json',
      voiceSettings: 'voice_settings.json',
      invites: 'invite_settings.json',
      inviteRewards: 'invite_rewards.json',
      leveling: 'leveling_configs.json',
      suggestions: 'suggestion_configs.json',
      roles: 'auto_roles.json',
    };

    for (const [key, fileName] of Object.entries(fileMap)) {
      try {
        const filePath = path.join(dataDir, fileName);
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            const guildItems = data.filter((item: any) => item.guildId === guildId);
            if (guildItems.length > 0) configs[key] = guildItems;
          } else if (typeof data === 'object' && data !== null) {
            if (data[guildId]) {
              configs[key] = data[guildId];
            }
          }
        }
      } catch (err) {
        logger.warn(`[BackupCollector] Impossible de lire ${fileName} pour la guild ${guildId} :`, err);
      }
    }

    return configs;
  }

  /**
   * Collecte l'intégralité d'un snapshot à partir d'un objet Guild Discord réel (ou simulé)
   */
  public static async createSnapshot(params: {
    guild: Guild | null;
    guildId: string;
    name: string;
    description?: string;
    type?: BackupType;
    isProtected?: boolean;
    includedComponents?: BackupComponent[];
    creator: { id: string; tag: string; avatar?: string };
    onProgress?: ScanProgressCallback;
  }): Promise<BackupSnapshot> {
    const {
      guild,
      guildId,
      name,
      description,
      type = 'FULL',
      isProtected = false,
      includedComponents = [
        'ROLES',
        'CATEGORIES',
        'CHANNELS',
        'PERMISSIONS',
        'SERVER_CONFIG',
        'EMOJIS',
        'ETHONE_CONFIG',
      ],
      creator,
      onProgress = () => {},
    } = params;

    onProgress('Scanning server...', 10);

    // 1. Server Settings
    let guildSettings: BackupGuildSettings = {
      name: guild?.name || `Server ${guildId}`,
      icon: guild?.iconURL() || null,
      description: guild?.description || null,
      afkChannelId: guild?.afkChannelId || null,
      afkTimeout: guild?.afkTimeout || 300,
      systemChannelId: guild?.systemChannelId || null,
      verificationLevel: guild?.verificationLevel || 0,
      defaultMessageNotifications: guild?.defaultMessageNotifications || 0,
      explicitContentFilter: guild?.explicitContentFilter || 0,
    };

    // 2. Roles
    onProgress('Collecting roles...', 30);
    const roles: BackupRole[] = [];
    if (includedComponents.includes('ROLES') && guild) {
      const fetchedRoles = await guild.roles.fetch().catch(() => null);
      if (fetchedRoles) {
        for (const role of fetchedRoles.values()) {
          roles.push({
            id: role.id,
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions.bitfield.toString(),
            mentionable: role.mentionable,
            managed: role.managed,
            isEveryone: role.id === guild.id,
          });
        }
      }
    }

    // 3. Channels & Categories
    onProgress('Collecting channels & categories...', 55);
    const categories: BackupCategory[] = [];
    const channels: BackupChannel[] = [];
    let permissionCount = 0;

    if (
      (includedComponents.includes('CHANNELS') || includedComponents.includes('CATEGORIES')) &&
      guild
    ) {
      const fetchedChannels = await guild.channels.fetch().catch(() => null);
      if (fetchedChannels) {
        for (const chan of fetchedChannels.values()) {
          if (!chan) continue;

          const overwrites: BackupPermissionOverwrite[] = [];
          if (includedComponents.includes('PERMISSIONS') && 'permissionOverwrites' in chan) {
            for (const ow of chan.permissionOverwrites.cache.values()) {
              overwrites.push({
                id: ow.id,
                type: ow.type === 0 ? 'role' : 'member',
                allow: ow.allow.bitfield.toString(),
                deny: ow.deny.bitfield.toString(),
              });
              permissionCount++;
            }
          }

          if (chan.type === ChannelType.GuildCategory && includedComponents.includes('CATEGORIES')) {
            categories.push({
              id: chan.id,
              name: chan.name,
              position: chan.position,
              permissionOverwrites: overwrites,
            });
          } else if (
            chan.type !== ChannelType.GuildCategory &&
            includedComponents.includes('CHANNELS')
          ) {
            channels.push({
              id: chan.id,
              name: chan.name,
              type: chan.type,
              typeName: ChannelType[chan.type] || 'Unknown',
              topic: 'topic' in chan ? chan.topic : null,
              nsfw: 'nsfw' in chan ? chan.nsfw : false,
              parentId: chan.parentId,
              parentName: chan.parent?.name || null,
              position: chan.position,
              rateLimitPerUser: 'rateLimitPerUser' in chan ? chan.rateLimitPerUser : undefined,
              bitrate: 'bitrate' in chan ? chan.bitrate : undefined,
              userLimit: 'userLimit' in chan ? chan.userLimit : undefined,
              permissionOverwrites: overwrites,
            });
          }
        }
      }
    }

    // 4. Emojis
    onProgress('Collecting emojis...', 75);
    const emojis: BackupEmoji[] = [];
    if (includedComponents.includes('EMOJIS') && guild) {
      const fetchedEmojis = await guild.emojis.fetch().catch(() => null);
      if (fetchedEmojis) {
        for (const emo of fetchedEmojis.values()) {
          emojis.push({
            id: emo.id,
            name: emo.name || 'emoji',
            url: emo.imageURL() || undefined,
            roles: Array.from(emo.roles.cache.keys()),
          });
        }
      }
    }

    // 5. ETHONE Configs
    onProgress('Collecting ETHONE module configurations...', 85);
    let ethoneConfig: EthoneModuleConfigs = {};
    if (includedComponents.includes('ETHONE_CONFIG')) {
      ethoneConfig = this.collectEthoneConfigs(guildId);
    }

    // 6. Final Snapshot Assembly & Checksum
    onProgress('Creating snapshot & calculating SHA-256 checksum...', 95);
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const backupId = `BKP-${timestampStr}-${randSuffix}`;

    const partialPayload: Omit<BackupSnapshot, 'checksum' | 'sizeBytes'> = {
      backupId,
      guildId,
      name,
      description,
      createdAt: now.toISOString(),
      createdBy: creator,
      type,
      status: 'COMPLETED',
      isProtected,
      schemaVersion: BackupIntegrityService.CURRENT_SCHEMA_VERSION,
      includedComponents,
      objectCounts: {
        categories: categories.length,
        channels: channels.length,
        roles: roles.length,
        permissions: permissionCount,
        emojis: emojis.length,
        ethoneModules: Object.keys(ethoneConfig).length,
      },
      data: {
        guild: guildSettings,
        roles,
        categories,
        channels,
        emojis,
        ethoneConfig,
      },
    };

    const checksum = BackupIntegrityService.computeChecksum(partialPayload);
    const sizeBytes = Buffer.byteLength(JSON.stringify(partialPayload));

    const snapshot: BackupSnapshot = {
      ...partialPayload,
      checksum,
      sizeBytes,
    };

    onProgress('Backup completed', 100);
    return snapshot;
  }
}
