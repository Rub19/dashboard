import {
  Client,
  Guild,
  GuildMember,
  Channel,
  PermissionsBitField,
  PermissionFlagsBits,
} from 'discord.js';
import {
  PermissionMatrixItem,
  PermissionDebugResult,
  PermissionDebugStep,
} from '../types/index.js';

export class ServerPermissionDebugger {
  private static KEY_PERMISSIONS = [
    { key: 'ViewChannel', name: 'Voir les salons', category: 'General' },
    { key: 'ManageChannels', name: 'Gérer les salons', category: 'Management' },
    { key: 'ManageRoles', name: 'Gérer les rôles', category: 'Management' },
    { key: 'ManageGuild', name: 'Gérer le serveur', category: 'Management' },
    { key: 'Administrator', name: 'Administrateur', category: 'Advanced' },
    { key: 'KickMembers', name: 'Expulser des membres', category: 'Moderation' },
    { key: 'BanMembers', name: 'Bannir des membres', category: 'Moderation' },
    { key: 'ModerateMembers', name: 'Exclusion temporaire (Timeout)', category: 'Moderation' },
    { key: 'SendMessages', name: 'Envoyer des messages', category: 'Text' },
    { key: 'AttachFiles', name: 'Joindre des fichiers', category: 'Text' },
    { key: 'ManageMessages', name: 'Gérer les messages', category: 'Moderation' },
    { key: 'Connect', name: 'Se connecter en vocal', category: 'Voice' },
    { key: 'Speak', name: 'Parler en vocal', category: 'Voice' },
    { key: 'MuteMembers', name: 'Muter des membres', category: 'Voice' },
    { key: 'MoveMembers', name: 'Déplacer des membres', category: 'Voice' },
  ];

  /**
   * Generates the Permission Comparison Matrix across all server roles.
   */
  public static getPermissionMatrix(client: Client, guildId: string): PermissionMatrixItem[] {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    const roles = Array.from(guild.roles.cache.values()).sort((a, b) => b.position - a.position);

    return this.KEY_PERMISSIONS.map((perm) => {
      const rolesMap: Record<string, boolean> = {};
      roles.forEach((r) => {
        rolesMap[r.id] = r.permissions.has((PermissionFlagsBits as any)[perm.key] || 0n);
      });

      return {
        permission: perm.key,
        name: perm.name,
        category: perm.category as any,
        roles: rolesMap,
      };
    });
  }

  /**
   * Evaluates Discord permission resolution step by step for a specific User, Channel & Permission.
   */
  public static async debugPermission(
    client: Client,
    guildId: string,
    userId: string,
    channelId: string,
    permissionKey: string
  ): Promise<PermissionDebugResult | null> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return null;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return null;

    const steps: PermissionDebugStep[] = [];
    const permBit = (PermissionFlagsBits as any)[permissionKey];

    // 1. Server Owner check
    if (guild.ownerId === member.id) {
      steps.push({
        step: 'Propriétaire du serveur',
        level: 'SERVER_OWNER',
        effect: 'ALLOW',
        description: `${member.user.tag} est le créateur/propriétaire de ce serveur. Il dispose de toutes les permissions de manière absolue et inconditionnelle.`,
      });
      return {
        userId,
        userTag: member.user.tag,
        channelId,
        channelName: channel.name,
        permission: permissionKey,
        isAllowed: true,
        reason: 'Le propriétaire du serveur détient toutes les permissions.',
        steps,
      };
    }

    // 2. Administrator check
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      steps.push({
        step: 'Privilège Administrateur',
        level: 'ADMINISTRATOR',
        effect: 'ALLOW',
        description: `Un des rôles de ${member.user.tag} possède la permission globale "Administrateur", qui outrepasse tous les réglages et restrictions de salon.`,
      });
      return {
        userId,
        userTag: member.user.tag,
        channelId,
        channelName: channel.name,
        permission: permissionKey,
        isAllowed: true,
        reason: 'Permission Administrateur active sur un des rôles du membre.',
        steps,
      };
    }

    // 3. Base @everyone role permissions
    const everyoneRole = guild.roles.everyone;
    const everyoneHasPerm = everyoneRole.permissions.has(permBit || 0n);
    steps.push({
      step: 'Rôle de base @everyone',
      level: 'ROLE_PERMISSIONS',
      effect: everyoneHasPerm ? 'ALLOW' : 'NEUTRAL',
      description: everyoneHasPerm
        ? `Le rôle @everyone autorise ${permissionKey}.`
        : `Le rôle @everyone n'accorde pas ${permissionKey} par défaut.`,
    });

    // 4. Member roles base permissions
    let roleGranted = everyoneHasPerm;
    member.roles.cache.forEach((r) => {
      if (r.permissions.has(permBit || 0n)) {
        roleGranted = true;
        steps.push({
          step: `Rôle @${r.name}`,
          level: 'ROLE_PERMISSIONS',
          effect: 'ALLOW',
          description: `Le rôle @${r.name} accorde la permission ${permissionKey} au niveau du serveur.`,
        });
      }
    });

    // 5. Channel @everyone overwrites
    if ('permissionOverwrites' in channel) {
      const overwrites = (channel as any).permissionOverwrites.cache;
      const everyoneOverwrite = overwrites.get(guild.id);

      if (everyoneOverwrite) {
        if (everyoneOverwrite.deny.has(permBit || 0n)) {
          steps.push({
            step: `Override salon : @everyone (Refus)`,
            level: 'EVERYONE_OVERWRITE',
            effect: 'DENY',
            description: `Le salon #${channel.name} interdit explicitement ${permissionKey} pour @everyone.`,
          });
          roleGranted = false;
        } else if (everyoneOverwrite.allow.has(permBit || 0n)) {
          steps.push({
            step: `Override salon : @everyone (Autorisation)`,
            level: 'EVERYONE_OVERWRITE',
            effect: 'ALLOW',
            description: `Le salon #${channel.name} autorise explicitement ${permissionKey} pour @everyone.`,
          });
          roleGranted = true;
        }
      }

      // 6. Member's role channel overwrites
      let rolesDenied = false;
      let rolesAllowed = false;

      member.roles.cache.forEach((r) => {
        const rOv = overwrites.get(r.id);
        if (rOv) {
          if (rOv.deny.has(permBit || 0n)) {
            rolesDenied = true;
            steps.push({
              step: `Override salon : rôle @${r.name} (Refus)`,
              level: 'ROLE_OVERWRITE',
              effect: 'DENY',
              description: `Le rôle @${r.name} est configuré en Refus sur #${channel.name}.`,
            });
          }
          if (rOv.allow.has(permBit || 0n)) {
            rolesAllowed = true;
            steps.push({
              step: `Override salon : rôle @${r.name} (Autorisation)`,
              level: 'ROLE_OVERWRITE',
              effect: 'ALLOW',
              description: `Le rôle @${r.name} est configuré en Autorisation sur #${channel.name}.`,
            });
          }
        }
      });

      if (rolesDenied && !rolesAllowed) roleGranted = false;
      if (rolesAllowed) roleGranted = true;

      // 7. Member-specific channel overwrite (highest precedence)
      const memberOverwrite = overwrites.get(member.id);
      if (memberOverwrite) {
        if (memberOverwrite.deny.has(permBit || 0n)) {
          steps.push({
            step: `Override salon nominatif : Membre (Refus)`,
            level: 'MEMBER_OVERWRITE',
            effect: 'DENY',
            description: `Un override personnel sur #${channel.name} interdit explicitement l'action pour ${member.user.tag}.`,
          });
          roleGranted = false;
        } else if (memberOverwrite.allow.has(permBit || 0n)) {
          steps.push({
            step: `Override salon nominatif : Membre (Autorisation)`,
            level: 'MEMBER_OVERWRITE',
            effect: 'ALLOW',
            description: `Un override personnel sur #${channel.name} autorise explicitement l'action pour ${member.user.tag}.`,
          });
          roleGranted = true;
        }
      }
    }

    return {
      userId,
      userTag: member.user.tag,
      channelId,
      channelName: channel.name,
      permission: permissionKey,
      isAllowed: roleGranted,
      reason: roleGranted
        ? `L'action est autorisée suite à la chaîne de résolution des rôles et overrides de salon.`
        : `L'action est refusée car aucun rôle ou override ne l'autorise (ou un refus explicite l'emporte).`,
      steps,
    };
  }
}
