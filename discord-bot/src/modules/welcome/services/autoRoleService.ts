import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { logger } from '../../../utils/logger.js';

export class AutoRoleService {
  public static async assignRoles(member: GuildMember, roleIds: string[]): Promise<string[]> {
    if (!roleIds || roleIds.length === 0) return [];

    const guild = member.guild;
    const botMember = guild.members.me;

    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      logger.warn(`[AutoRole] Le bot n’a pas la permission ManageRoles sur le serveur ${guild.name} (${guild.id}).`);
      return [];
    }

    const assignedRoleNames: string[] = [];
    const botHighest = botMember.roles.highest.position;

    for (const roleId of roleIds) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (!role) {
          logger.warn(`[AutoRole] Rôle ${roleId} introuvable sur le serveur ${guild.name}.`);
          continue;
        }

        // Vérification de hiérarchie des rôles
        if (role.position >= botHighest) {
          logger.warn(
            `[AutoRole] Impossible d'attribuer le rôle "${role.name}" : position égale ou supérieure au bot.`
          );
          continue;
        }

        await member.roles.add(role, 'Attribution automatique (Auto-Role Welcome)');
        assignedRoleNames.push(role.name);
      } catch (err) {
        logger.error(`[AutoRole] Échec d'attribution du rôle ${roleId} à ${member.user.tag} :`, err);
      }
    }

    return assignedRoleNames;
  }
}
