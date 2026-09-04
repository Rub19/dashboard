import { Client, Guild, GuildMember, PermissionsBitField } from 'discord.js';
import { ServerMemberItem, ServerMemberProfile } from '../types/index.js';
import { moderationRepository } from '../../moderation/storage/moderationRepository.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ServerMemberService {
  /**
   * Returns paginated members with search and multi-filtering.
   */
  public static async getMembers(
    client: Client,
    guildId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      filter?: 'all' | 'online' | 'offline' | 'bots' | 'humans' | 'staff' | 'muted' | 'banned';
    }
  ): Promise<{ members: ServerMemberItem[]; total: number; page: number; totalPages: number }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return { members: [], total: 0, page: 1, totalPages: 1 };
    }

    // Try fetching recent members into cache if cache is too small
    if (guild.members.cache.size < 25) {
      await guild.members.fetch({ limit: 100 }).catch(() => null);
    }

    let allMembers = Array.from(guild.members.cache.values());

    // Search query filter
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      allMembers = allMembers.filter(
        (m) =>
          m.user.username.toLowerCase().includes(q) ||
          m.displayName.toLowerCase().includes(q) ||
          m.id === q
      );
    }

    // Category Filter
    if (options.filter && options.filter !== 'all') {
      switch (options.filter) {
        case 'bots':
          allMembers = allMembers.filter((m) => m.user.bot);
          break;
        case 'humans':
          allMembers = allMembers.filter((m) => !m.user.bot);
          break;
        case 'online':
          allMembers = allMembers.filter((m) => m.presence?.status && m.presence.status !== 'offline');
          break;
        case 'offline':
          allMembers = allMembers.filter((m) => !m.presence || m.presence.status === 'offline');
          break;
        case 'staff':
          allMembers = allMembers.filter(
            (m) =>
              m.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
              m.permissions.has(PermissionsBitField.Flags.KickMembers) ||
              m.permissions.has(PermissionsBitField.Flags.Administrator)
          );
          break;
        case 'muted':
          allMembers = allMembers.filter((m) => m.isCommunicationDisabled());
          break;
      }
    }

    const total = allMembers.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 25));
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const startIndex = (page - 1) * limit;
    const pagedMembers = allMembers.slice(startIndex, startIndex + limit);

    const now = Date.now();
    const mapped: ServerMemberItem[] = pagedMembers.map((m) => {
      const accountAgeDays = Math.floor((now - m.user.createdTimestamp) / (1000 * 60 * 60 * 24));
      const hasAvatar = !!m.user.avatar;
      let riskScore = 0;
      if (accountAgeDays < 3) riskScore += 50;
      else if (accountAgeDays < 14) riskScore += 25;
      if (!hasAvatar) riskScore += 20;

      return {
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.displayAvatarURL(),
        bot: m.user.bot,
        joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
        createdAt: m.user.createdAt.toISOString(),
        roles: m.roles.cache
          .filter((r) => r.name !== '@everyone')
          .sort((a, b) => b.position - a.position)
          .map((r) => ({ id: r.id, name: r.name, color: r.hexColor })),
        status: (m.presence?.status as any) || 'offline',
        voiceChannelId: m.voice.channelId,
        voiceMuted: m.voice.serverMute || m.voice.selfMute || false,
        communicationDisabledUntil: m.communicationDisabledUntil
          ? m.communicationDisabledUntil.toISOString()
          : null,
        riskScore: Math.min(100, riskScore),
      };
    });

    return { members: mapped, total, page, totalPages };
  }

  /**
   * Fetches rich member profile with activity, moderation history & security metrics.
   */
  public static async getMemberProfile(
    client: Client,
    guildId: string,
    userId: string
  ): Promise<ServerMemberProfile | null> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return null;

    const now = Date.now();
    const accountAgeDays = Math.floor((now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const serverStayDays = member.joinedTimestamp
      ? Math.floor((now - member.joinedTimestamp) / (1000 * 60 * 60 * 24))
      : 0;

    // Security flags
    const flags: string[] = [];
    let riskScore = 0;
    if (accountAgeDays < 3) {
      flags.push('Compte créé il y a moins de 72h');
      riskScore += 45;
    }
    if (!member.user.avatar) {
      flags.push('Aucun avatar personnalisé (Avatar par défaut Discord)');
      riskScore += 20;
    }
    if (serverStayDays < 1) {
      flags.push('A rejoint le serveur aujourd’hui');
      riskScore += 15;
    }

    // Moderation cases
    const { cases: allCases } = moderationRepository.getCases(guildId);
    const memberCases = allCases.filter((c: any) => c.userId === userId);
    const warningsCount = memberCases.filter((c: any) => c.action === 'WARN').length;
    const timeoutsCount = memberCases.filter((c: any) => c.action === 'TIMEOUT').length;
    const kicksCount = memberCases.filter((c: any) => c.action === 'KICK').length;
    const bansCount = memberCases.filter((c: any) => c.action === 'BAN').length;

    // High permissions check
    const perms: string[] = [];
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) perms.push('Administrator');
    if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) perms.push('ManageGuild');
    if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) perms.push('ManageChannels');
    if (member.permissions.has(PermissionsBitField.Flags.ManageRoles)) perms.push('ManageRoles');
    if (member.permissions.has(PermissionsBitField.Flags.KickMembers)) perms.push('KickMembers');
    if (member.permissions.has(PermissionsBitField.Flags.BanMembers)) perms.push('BanMembers');
    if (member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) perms.push('ModerateMembers');

    return {
      id: member.id,
      username: member.user.username,
      displayName: member.displayName,
      avatar: member.user.displayAvatarURL(),
      bot: member.user.bot,
      joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
      createdAt: member.user.createdAt.toISOString(),
      roles: member.roles.cache
        .filter((r) => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position })),
      permissions: perms,
      isOwner: guild.ownerId === member.id,
      isAdmin: member.permissions.has(PermissionsBitField.Flags.Administrator),
      isTimedOut: member.isCommunicationDisabled(),
      timedOutUntil: member.communicationDisabledUntil ? member.communicationDisabledUntil.toISOString() : null,
      voice: {
        channelId: member.voice.channelId,
        channelName: member.voice.channel?.name || null,
        muted: member.voice.serverMute || member.voice.selfMute || false,
        deafened: member.voice.serverDeaf || member.voice.selfDeaf || false,
        streaming: member.voice.streaming || false,
      },
      moderationHistory: {
        warningsCount,
        timeoutsCount,
        kicksCount,
        bansCount,
        recentCases: memberCases.slice(0, 5).map((c: any) => ({
          id: c.id,
          type: c.action,
          reason: c.reason,
          moderatorTag: c.moderatorTag,
          createdAt: c.createdAt,
        })),
      },
      security: {
        accountAgeDays,
        serverStayDays,
        riskScore: Math.min(100, riskScore),
        flags,
      },
    };
  }

  /**
   * Executes administrative action on a member.
   */
  public static async executeAction(
    client: Client,
    guildId: string,
    userId: string,
    action: string,
    payload: any,
    actorTag: string = 'ETHONE Dashboard'
  ): Promise<{ success: boolean; message: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, message: 'Serveur introuvable.' };

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member && action !== 'ban') {
      return { success: false, message: 'Membre introuvable sur le serveur.' };
    }

    try {
      switch (action) {
        case 'timeout': {
          const minutes = payload.minutes || 10;
          await member!.timeout(minutes * 60 * 1000, payload.reason || 'Exclusion temporaire via Dashboard');
          logService.emit({
            guildId,
            module: 'MODERATION',
            type: 'USER_TIMEOUT',
            actor: { id: 'dashboard_admin', tag: actorTag },
            target: { id: userId, type: 'USER', name: member!.user.username, tag: member!.user.tag },
            reason: payload.reason || `Timeout de ${minutes}m`,
          });
          return { success: true, message: `Membre exclu temporairement pendant ${minutes} minutes.` };
        }

        case 'untimeout': {
          await member!.timeout(null, 'Annulation du timeout via Dashboard');
          return { success: true, message: 'Exclusion temporaire levée avec succès.' };
        }

        case 'kick': {
          await member!.kick(payload.reason || 'Expulsé via ETHONE Dashboard');
          logService.emit({
            guildId,
            module: 'MODERATION',
            type: 'USER_KICK',
            actor: { id: 'dashboard_admin', tag: actorTag },
            target: { id: userId, type: 'USER', name: member!.user.username, tag: member!.user.tag },
            reason: payload.reason || 'Expulsé via Dashboard',
          });
          return { success: true, message: 'Membre expulsé du serveur.' };
        }

        case 'ban': {
          await guild.bans.create(userId, { reason: payload.reason || 'Banni via ETHONE Dashboard' });
          logService.emit({
            guildId,
            module: 'MODERATION',
            type: 'USER_BAN',
            actor: { id: 'dashboard_admin', tag: actorTag },
            target: { id: userId, type: 'USER', name: member ? member.user.username : userId, tag: member ? member.user.tag : userId },
            reason: payload.reason || 'Banni via Dashboard',
          });
          return { success: true, message: 'Utilisateur banni définitivement du serveur.' };
        }

        case 'add_role': {
          if (!payload.roleId) return { success: false, message: 'roleId requis.' };
          await member!.roles.add(payload.roleId);
          return { success: true, message: 'Rôle attribué avec succès.' };
        }

        case 'remove_role': {
          if (!payload.roleId) return { success: false, message: 'roleId requis.' };
          await member!.roles.remove(payload.roleId);
          return { success: true, message: 'Rôle retiré avec succès.' };
        }

        case 'nickname': {
          await member!.setNickname(payload.nickname || null);
          return { success: true, message: 'Pseudo mis à jour avec succès.' };
        }

        case 'voice_mute': {
          if (!member!.voice.channelId) return { success: false, message: 'Membre non connecté en vocal.' };
          await member!.voice.setMute(payload.mute !== false);
          return { success: true, message: 'Statut du micro mis à jour.' };
        }

        case 'voice_kick': {
          if (!member!.voice.channelId) return { success: false, message: 'Membre non connecté en vocal.' };
          await member!.voice.disconnect('Déconnecté via Dashboard');
          return { success: true, message: 'Membre déconnecté du salon vocal.' };
        }

        default:
          return { success: false, message: 'Action inconnue.' };
      }
    } catch (err: any) {
      logger.error(`[ServerMemberService] Erreur action ${action} sur ${userId}:`, err);
      return { success: false, message: `Erreur Discord: ${err.message}` };
    }
  }
}
