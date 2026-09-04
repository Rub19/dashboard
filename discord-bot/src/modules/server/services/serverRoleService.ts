import {
  Client,
  Guild,
  Role,
  PermissionsBitField,
  PermissionFlagsBits,
} from 'discord.js';
import { RoleItem } from '../types/index.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

export class ServerRoleService {
  /**
   * Returns all guild roles sorted by hierarchy position descending.
   */
  public static getRoles(client: Client, guildId: string): RoleItem[] {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    const botMember = guild.members.me;
    const botHighestPosition = botMember?.roles.highest.position || 0;
    const isBotOwner = guild.ownerId === botMember?.id;

    return guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map((role) => {
        const isEditable = isBotOwner || (role.position < botHighestPosition && !role.managed && role.name !== '@everyone');

        return {
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          hoist: role.hoist,
          mentionable: role.mentionable,
          managed: role.managed,
          isBotRole: role.tags?.botId !== undefined,
          memberCount: role.members.size,
          permissions: role.permissions.toArray(),
          isEditableByBot: isEditable,
        };
      });
  }

  /**
   * Creates a new role.
   */
  public static async createRole(
    client: Client,
    guildId: string,
    payload: {
      name: string;
      color?: string;
      hoist?: boolean;
      mentionable?: boolean;
      permissions?: string[];
    }
  ): Promise<{ success: boolean; role?: RoleItem; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    try {
      let permsBit = 0n;
      if (payload.permissions?.length) {
        payload.permissions.forEach((p) => {
          if ((PermissionFlagsBits as any)[p]) {
            permsBit |= (PermissionFlagsBits as any)[p];
          }
        });
      }

      const created = await guild.roles.create({
        name: payload.name.trim(),
        color: payload.color as any,
        hoist: payload.hoist || false,
        mentionable: payload.mentionable || false,
        permissions: permsBit,
        reason: 'Créé via ETHONE Role Center 2.0',
      });

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'ROLE_CREATE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Création du rôle ${created.name}`,
      });

      return {
        success: true,
        role: {
          id: created.id,
          name: created.name,
          color: created.hexColor,
          position: created.position,
          hoist: created.hoist,
          mentionable: created.mentionable,
          managed: created.managed,
          isBotRole: false,
          memberCount: 0,
          permissions: created.permissions.toArray(),
          isEditableByBot: true,
        },
      };
    } catch (err: any) {
      logger.error('[ServerRoleService] Erreur création rôle:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates an existing role.
   */
  public static async updateRole(
    client: Client,
    guildId: string,
    roleId: string,
    payload: {
      name?: string;
      color?: string;
      hoist?: boolean;
      mentionable?: boolean;
      permissions?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const role = guild.roles.cache.get(roleId);
    if (!role) return { success: false, error: 'Rôle introuvable.' };

    const botMember = guild.members.me;
    if (role.position >= (botMember?.roles.highest.position || 0) && guild.ownerId !== botMember?.id) {
      return { success: false, error: 'Ce rôle est supérieur ou égal au rôle du bot dans la hiérarchie Discord.' };
    }

    try {
      let permsBit: bigint | undefined = undefined;
      if (payload.permissions) {
        permsBit = 0n;
        payload.permissions.forEach((p) => {
          if ((PermissionFlagsBits as any)[p]) {
            permsBit! |= (PermissionFlagsBits as any)[p];
          }
        });
      }

      await role.edit({
        name: payload.name !== undefined ? payload.name.trim() : undefined,
        color: payload.color as any,
        hoist: payload.hoist,
        mentionable: payload.mentionable,
        permissions: permsBit,
        reason: 'Modifié via ETHONE Role Center 2.0',
      });

      return { success: true };
    } catch (err: any) {
      logger.error('[ServerRoleService] Erreur mise à jour rôle:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes a role safely.
   */
  public static async deleteRole(
    client: Client,
    guildId: string,
    roleId: string,
    reason: string = 'Supprimé via ETHONE Dashboard'
  ): Promise<{ success: boolean; error?: string }> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Serveur introuvable.' };

    const role = guild.roles.cache.get(roleId);
    if (!role) return { success: false, error: 'Rôle introuvable.' };

    const botMember = guild.members.me;
    if (role.position >= (botMember?.roles.highest.position || 0) && guild.ownerId !== botMember?.id) {
      return { success: false, error: 'Impossible de supprimer un rôle supérieur ou égal au rôle du bot.' };
    }

    try {
      const roleName = role.name;
      await role.delete(reason);

      logService.emit({
        guildId,
        module: 'SERVER',
        type: 'ROLE_DELETE',
        actor: { id: 'dashboard_admin', tag: 'ETHONE Dashboard' },
        reason: `Suppression du rôle "${roleName}"`,
      });

      return { success: true };
    } catch (err: any) {
      logger.error('[ServerRoleService] Erreur suppression rôle:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetches members holding a specific role.
   */
  public static async getRoleMembers(client: Client, guildId: string, roleId: string) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    const role = guild.roles.cache.get(roleId);
    if (!role) return [];

    return Array.from(role.members.values()).map((m) => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      avatar: m.user.displayAvatarURL(),
      bot: m.user.bot,
    }));
  }
}
