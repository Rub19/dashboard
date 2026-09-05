/**
 * 🔄 ETHONE DISCORD — SOURCE OF TRUTH & RECONCILIATION ENGINE 2.0
 * Discord Normalization Layer
 *
 * Provides canonical, sanitized models for Discord objects (Guild, Channel, Role, Member, Presence).
 * Eliminates disparities between raw REST packets, Gateway events, and cache structures.
 */

export interface NormalizedChannel {
  id: string;
  guildId: string;
  name: string;
  type: string;
  parentId: string | null;
  position: number;
  isCategory: boolean;
  isText: boolean;
  isVoice: boolean;
  isThread: boolean;
  botPermissions: {
    canView: boolean;
    canSend: boolean;
    canEmbed: boolean;
    canManage: boolean;
    canAttachFiles: boolean;
  };
}

export interface NormalizedRole {
  id: string;
  guildId: string;
  name: string;
  color: string;
  position: number;
  hoist: boolean;
  managed: boolean;
  mentionable: boolean;
  permissions: string[];
  isBotRole: boolean;
  isHigherThanBot: boolean;
}

export interface NormalizedMember {
  id: string;
  guildId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
  highestRolePosition: number;
  joinedAt: string | null;
  isBot: boolean;
  isAdmin: boolean;
}

export interface NormalizedGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  ownerId: string;
  botJoinedAt: string | null;
  botPermissions: string[];
  features: string[];
  channelCount: number;
  roleCount: number;
}

export interface NormalizedPresence {
  status: 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';
  activities: Array<{
    name: string;
    type: number;
    state?: string;
    details?: string;
    url?: string;
  }>;
  clientStatus: {
    desktop?: string;
    mobile?: string;
    web?: string;
  };
}

export class DiscordNormalizer {
  private static instance: DiscordNormalizer;

  private constructor() {}

  public static getInstance(): DiscordNormalizer {
    if (!DiscordNormalizer.instance) {
      DiscordNormalizer.instance = new DiscordNormalizer();
    }
    return DiscordNormalizer.instance;
  }

  /**
   * Normalizes a Discord Channel
   */
  public normalizeChannel(channel: any, botMember?: any): NormalizedChannel {
    if (!channel) {
      throw new Error('[DiscordNormalizer] Cannot normalize null or undefined channel.');
    }

    const typeStr = this.resolveChannelType(channel.type);
    const isCategory = typeStr === 'GUILD_CATEGORY' || channel.type === 4;
    const isText = typeStr === 'GUILD_TEXT' || channel.type === 0 || typeStr === 'GUILD_ANNOUNCEMENT';
    const isVoice = typeStr === 'GUILD_VOICE' || channel.type === 2 || channel.type === 13;
    const isThread = channel.isThread?.() || false;

    // Check bot permissions on this channel if botMember is provided
    let canView = true;
    let canSend = true;
    let canEmbed = true;
    let canManage = true;
    let canAttachFiles = true;

    if (botMember && channel.permissionsFor) {
      try {
        const perms = channel.permissionsFor(botMember);
        if (perms) {
          canView = perms.has?.('ViewChannel') ?? true;
          canSend = perms.has?.('SendMessages') ?? true;
          canEmbed = perms.has?.('EmbedLinks') ?? true;
          canManage = perms.has?.('ManageChannels') ?? perms.has?.('ManageMessages') ?? false;
          canAttachFiles = perms.has?.('AttachFiles') ?? true;
        }
      } catch {
        // Fallback to default
      }
    }

    return {
      id: String(channel.id),
      guildId: String(channel.guildId || channel.guild?.id || ''),
      name: channel.name || 'unknown-channel',
      type: typeStr,
      parentId: channel.parentId ? String(channel.parentId) : null,
      position: typeof channel.position === 'number' ? channel.position : 0,
      isCategory,
      isText,
      isVoice,
      isThread,
      botPermissions: {
        canView,
        canSend,
        canEmbed,
        canManage,
        canAttachFiles,
      },
    };
  }

  /**
   * Normalizes a Discord Role
   */
  public normalizeRole(role: any, botMember?: any): NormalizedRole {
    if (!role) {
      throw new Error('[DiscordNormalizer] Cannot normalize null or undefined role.');
    }

    const colorHex = role.hexColor || (role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#000000');
    const botHighestPosition = botMember?.roles?.highest?.position ?? (botMember?.roles?.cache ? Math.max(0, ...Array.from(botMember.roles.cache.values()).map((r: any) => r.position || 0)) : 999);
    const rolePosition = typeof role.position === 'number' ? role.position : 0;
    const isHigherThanBot = rolePosition >= botHighestPosition;

    let permissionsArray: string[] = [];
    if (role.permissions?.toArray) {
      permissionsArray = role.permissions.toArray();
    } else if (Array.isArray(role.permissions)) {
      permissionsArray = role.permissions;
    }

    return {
      id: String(role.id),
      guildId: String(role.guild?.id || role.guildId || ''),
      name: role.name || 'unknown-role',
      color: colorHex,
      position: rolePosition,
      hoist: Boolean(role.hoist),
      managed: Boolean(role.managed),
      mentionable: Boolean(role.mentionable),
      permissions: permissionsArray,
      isBotRole: Boolean(role.tags?.botId || role.managed),
      isHigherThanBot,
    };
  }

  /**
   * Normalizes a Discord Guild
   */
  public normalizeGuild(guild: any, clientUser?: any): NormalizedGuild {
    if (!guild) {
      throw new Error('[DiscordNormalizer] Cannot normalize null or undefined guild.');
    }

    const botMember = guild.members?.me || guild.members?.cache?.get(clientUser?.id);
    let botPerms: string[] = [];
    if (botMember?.permissions?.toArray) {
      botPerms = botMember.permissions.toArray();
    }

    return {
      id: String(guild.id),
      name: guild.name || 'Unknown Server',
      iconUrl: guild.iconURL?.() || null,
      memberCount: typeof guild.memberCount === 'number' ? guild.memberCount : 0,
      ownerId: String(guild.ownerId || ''),
      botJoinedAt: botMember?.joinedAt ? new Date(botMember.joinedAt).toISOString() : null,
      botPermissions: botPerms,
      features: Array.isArray(guild.features) ? guild.features : [],
      channelCount: guild.channels?.cache?.size ?? 0,
      roleCount: guild.roles?.cache?.size ?? 0,
    };
  }

  /**
   * Normalizes a Guild Member
   */
  public normalizeMember(member: any): NormalizedMember {
    if (!member) {
      throw new Error('[DiscordNormalizer] Cannot normalize null or undefined member.');
    }

    const rolesList: string[] = member.roles?.cache
      ? Array.from(member.roles.cache.keys()).map(String)
      : Array.isArray(member.roles)
      ? member.roles.map(String)
      : [];

    const highestPos = member.roles?.highest?.position ?? 0;
    const isAdmin = Boolean(member.permissions?.has?.('Administrator') || false);

    return {
      id: String(member.id || member.user?.id),
      guildId: String(member.guild?.id || member.guildId || ''),
      username: member.user?.username || member.username || 'unknown',
      displayName: member.displayName || member.user?.displayName || member.user?.username || 'unknown',
      avatarUrl: member.displayAvatarURL?.() || member.user?.displayAvatarURL?.() || null,
      roles: rolesList,
      highestRolePosition: highestPos,
      joinedAt: member.joinedAt ? new Date(member.joinedAt).toISOString() : null,
      isBot: Boolean(member.user?.bot),
      isAdmin,
    };
  }

  /**
   * Normalizes Discord Live Presence
   */
  public normalizePresence(presence: any): NormalizedPresence {
    if (!presence) {
      return {
        status: 'offline',
        activities: [],
        clientStatus: {},
      };
    }

    const rawStatus = presence.status || 'offline';
    const status: NormalizedPresence['status'] =
      rawStatus === 'online' || rawStatus === 'idle' || rawStatus === 'dnd' || rawStatus === 'invisible'
        ? rawStatus
        : 'offline';

    const activities = (presence.activities || []).map((a: any) => ({
      name: a.name || '',
      type: typeof a.type === 'number' ? a.type : 0,
      state: a.state || undefined,
      details: a.details || undefined,
      url: a.url || undefined,
    }));

    return {
      status,
      activities,
      clientStatus: {
        desktop: presence.clientStatus?.desktop,
        mobile: presence.clientStatus?.mobile,
        web: presence.clientStatus?.web,
      },
    };
  }

  private resolveChannelType(rawType: any): string {
    if (typeof rawType === 'string') return rawType;
    switch (rawType) {
      case 0:
        return 'GUILD_TEXT';
      case 1:
        return 'DM';
      case 2:
        return 'GUILD_VOICE';
      case 3:
        return 'GROUP_DM';
      case 4:
        return 'GUILD_CATEGORY';
      case 5:
        return 'GUILD_ANNOUNCEMENT';
      case 10:
      case 11:
      case 12:
        return 'GUILD_THREAD';
      case 13:
        return 'GUILD_STAGE_VOICE';
      case 15:
        return 'GUILD_FORUM';
      default:
        return `UNKNOWN_${rawType}`;
    }
  }
}

export const discordNormalizer = DiscordNormalizer.getInstance();
