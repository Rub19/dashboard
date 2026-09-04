import { Guild, GuildMember } from 'discord.js';
import { inviteRepository } from '../storage/inviteRepository.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ReferralRewardService {
  public async checkAndGrantRewards(guild: Guild, inviterId: string): Promise<void> {
    try {
      const settings = inviteRepository.getSettings(guild.id);
      if (!settings.rewardsEnabled) return;

      const rules = inviteRepository.getRewards(guild.id).filter((r) => r.enabled);
      if (rules.length === 0) return;

      // Count only valid and retained referrals
      const userRefs = inviteRepository.getReferralsByUser(guild.id, inviterId);
      const eligibleInvites = userRefs.filter(
        (r) => r.status === 'VALID' || r.status === 'REWARDED'
      ).length;

      let member: GuildMember | null = null;
      try {
        member = await guild.members.fetch(inviterId);
      } catch {
        return; // Inviter is no longer in server
      }

      if (!member) return;

      for (const rule of rules) {
        if (eligibleInvites >= rule.requiredValidInvites) {
          if (rule.roleId) {
            const role = guild.roles.cache.get(rule.roleId);
            if (role && !member.roles.cache.has(role.id)) {
              // Verify bot role hierarchy
              const botMember = guild.members.me;
              if (botMember && botMember.permissions.has('ManageRoles')) {
                if (botMember.roles.highest.position > role.position) {
                  await member.roles.add(role.id);
                  logger.success(
                    `[Invite Rewards] Rôle ${role.name} accordé à ${member.user.tag} (${eligibleInvites} invites)`
                  );

                  // Emit audit log
                  logService.emit({
                    guildId: guild.id,
                    module: 'MEMBERS',
                    type: 'ROLE_UPDATE',
                    actor: { id: botMember.id, tag: botMember.user.tag },
                    target: { id: member.id, name: member.user.tag },
                    reason: `Récompense d'invitation : palier ${rule.requiredValidInvites} atteint (${rule.name})`,
                    metadata: { roleId: role.id, roleName: role.name, invites: eligibleInvites },
                  });
                  } else {
                    logger.warn(
                      `[Invite Rewards] Impossible d'attribuer le rôle ${role.name} : position supérieure au bot`
                    );
                  }
                }
            }
          }
        }
      }
    } catch (err) {
      logger.error('[ReferralRewardService] Erreur lors de la vérification des récompenses:', err);
    }
  }

  public validateRoleHierarchy(guild: Guild, roleId: string): { valid: boolean; reason?: string } {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return { valid: false, reason: 'Rôle introuvable sur le serveur' };
    }
    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has('ManageRoles')) {
      return { valid: false, reason: "Le bot ne possède pas la permission 'Gérer les rôles'" };
    }
    if (botMember.roles.highest.position <= role.position) {
      return {
        valid: false,
        reason: `Le rôle "${role.name}" a un rang hiérarchique supérieur ou égal au rôle le plus élevé du bot`,
      };
    }
    return { valid: true };
  }
}

export const referralRewardService = new ReferralRewardService();
