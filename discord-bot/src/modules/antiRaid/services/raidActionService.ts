import {
  ChannelType,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  Role,
  TextChannel,
} from 'discord.js';
import { RaidAction } from '../types/antiRaid.js';
import { raidConfigService } from './raidConfigService.js';
import { CaseService } from '../../moderation/services/caseService.js';
import { logger } from '../../../utils/logger.js';

class RaidActionService {
  // GuildId -> Set of channelIds modified during lockdown
  private lockedChannels = new Map<string, Set<string>>();
  // GuildId -> Set of quarantined userIds
  private quarantinedMembers = new Map<string, Set<string>>();

  // ============================================
  // 1. GESTION DU RÔLE DE QUARANTAINE
  // ============================================
  public async getOrCreateQuarantineRole(guild: Guild): Promise<Role | null> {
    const config = raidConfigService.getConfig(guild.id);
    if (config.raidMode.quarantineRoleId) {
      const existing = guild.roles.cache.get(config.raidMode.quarantineRoleId);
      if (existing) return existing;
    }

    // Chercher un rôle existant nommé "Quarantined" ou "Quarantaine"
    const found = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === 'quarantined' || r.name.toLowerCase() === 'quarantaine'
    );
    if (found) return found;

    // Créer le rôle de quarantaine
    try {
      const role = await guild.roles.create({
        name: 'Quarantined',
        color: '#7F1D1D', // Dark red
        permissions: [],
        reason: 'Création automatique du rôle de quarantaine Anti-Raid',
      });

      // Sauvegarder dans la configuration
      raidConfigService.updateRaidModeConfig(guild.id, { quarantineRoleId: role.id });
      return role;
    } catch (err) {
      logger.error(`[RaidActionService] Erreur création rôle quarantaine sur ${guild.name}:`, err);
      return null;
    }
  }

  // ============================================
  // 2. EXÉCUTION D'ACTIONS SUR UN MEMBRE
  // ============================================
  public async executeMemberAction(
    member: GuildMember,
    action: RaidAction,
    reason: string
  ): Promise<boolean> {
    const guild = member.guild;
    const config = raidConfigService.getConfig(guild.id);

    // Vérifier whitelist utilisateur
    if (config.whitelist.trustedUserIds.includes(member.id)) {
      return false;
    }

    try {
      switch (action) {
        case 'QUARANTINE': {
          const role = await this.getOrCreateQuarantineRole(guild);
          if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role, `[Anti-Raid] Quarantaine : ${reason}`);
            let set = this.quarantinedMembers.get(guild.id);
            if (!set) {
              set = new Set();
              this.quarantinedMembers.set(guild.id, set);
            }
            set.add(member.id);
            try {
              CaseService.createCase(member.client, {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                moderatorId: 'ANTI_RAID',
                moderatorTag: 'Anti-Raid 2.0',
                action: 'QUARANTINE',
                reason,
                source: 'ANTI_RAID',
              });
            } catch {}
            return true;
          }
          break;
        }

        case 'TIMEOUT': {
          if (member.moderatable) {
            await member.timeout(15 * 60 * 1000, `[Anti-Raid] ${reason}`);
            try {
              CaseService.createCase(member.client, {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                moderatorId: 'ANTI_RAID',
                moderatorTag: 'Anti-Raid 2.0',
                action: 'TIMEOUT',
                reason,
                durationSeconds: 15 * 60,
                source: 'ANTI_RAID',
              });
            } catch {}
            return true;
          }
          break;
        }

        case 'KICK': {
          if (member.kickable) {
            await member.kick(`[Anti-Raid] ${reason}`);
            try {
              CaseService.createCase(member.client, {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                moderatorId: 'ANTI_RAID',
                moderatorTag: 'Anti-Raid 2.0',
                action: 'KICK',
                reason,
                source: 'ANTI_RAID',
              });
            } catch {}
            return true;
          }
          break;
        }

        case 'BAN': {
          if (member.bannable) {
            await member.ban({
              deleteMessageSeconds: 3600, // 1 hour of messages
              reason: `[Anti-Raid] ${reason}`,
            });
            try {
              CaseService.createCase(member.client, {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                moderatorId: 'ANTI_RAID',
                moderatorTag: 'Anti-Raid 2.0',
                action: 'BAN',
                reason,
                source: 'ANTI_RAID',
              });
            } catch {}
            return true;
          }
          break;
        }

        case 'VERIFY': {
          // Si le membre a le rôle quarantaine, on ne fait rien de plus
          // Sinon on timeout préventif 5 min pour vérification
          if (member.moderatable && !member.isCommunicationDisabled()) {
            await member.timeout(5 * 60 * 1000, `[Anti-Raid] Vérification requise : ${reason}`);
            return true;
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      logger.error(`[RaidActionService] Échec action ${action} sur ${member.user.tag}:`, err);
      return false;
    }

    return false;
  }

  // ============================================
  // 3. ACTIONS DE VERROUILLAGE (LOCKDOWN)
  // ============================================
  public async executeLockdown(guild: Guild, reason: string): Promise<number> {
    const config = raidConfigService.getConfig(guild.id);
    const exemptChannels = new Set(config.whitelist.exemptChannelIds);
    const everyoneRole = guild.roles.everyone;

    let locked = 0;
    const modified = new Set<string>();

    for (const [, channel] of guild.channels.cache) {
      if (channel.type === ChannelType.GuildText && !exemptChannels.has(channel.id)) {
        try {
          const textChannel = channel as TextChannel;
          await textChannel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
          });
          modified.add(channel.id);
          locked++;
        } catch (err) {
          logger.error(`[RaidActionService] Erreur lockdown salon ${channel.name}:`, err);
        }
      }
    }

    this.lockedChannels.set(guild.id, modified);
    return locked;
  }

  public async releaseLockdown(guild: Guild): Promise<number> {
    const everyoneRole = guild.roles.everyone;
    const modified = this.lockedChannels.get(guild.id);
    let unlocked = 0;

    if (modified && modified.size > 0) {
      for (const channelId of modified) {
        const channel = guild.channels.cache.get(channelId);
        if (channel && channel.type === ChannelType.GuildText) {
          try {
            const textChannel = channel as TextChannel;
            await textChannel.permissionOverwrites.edit(everyoneRole, {
              SendMessages: null,
            });
            unlocked++;
          } catch (err) {
            logger.error(`[RaidActionService] Erreur release lockdown salon ${channel.name}:`, err);
          }
        }
      }
      this.lockedChannels.delete(guild.id);
    } else {
      // Si aucun canal stocké, déverrouiller tous les canaux texte
      for (const [, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildText) {
          try {
            const textChannel = channel as TextChannel;
            await textChannel.permissionOverwrites.edit(everyoneRole, {
              SendMessages: null,
            });
            unlocked++;
          } catch {}
        }
      }
    }

    return unlocked;
  }

  public isLockdownActive(guildId: string): boolean {
    const modified = this.lockedChannels.get(guildId);
    return Boolean(modified && modified.size > 0);
  }

  public getLockedChannelsCount(guildId: string): number {
    const modified = this.lockedChannels.get(guildId);
    return modified ? modified.size : 0;
  }

  public getQuarantinedCount(guildId: string): number {
    const set = this.quarantinedMembers.get(guildId);
    return set ? set.size : 0;
  }
}

export const raidActionService = new RaidActionService();
