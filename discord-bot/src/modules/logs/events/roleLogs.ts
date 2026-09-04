import { AuditLogEvent, Role } from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleRoleCreate(role: Role): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    role.guild,
    AuditLogEvent.RoleCreate,
    role.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: role.guild.id,
    module: 'ROLES',
    type: 'ROLE_CREATE',
    actor,
    target: {
      id: role.id,
      type: 'ROLE',
      name: role.name,
    },
    reason: auditRes.reason || `Création du rôle @${role.name}`,
    after: {
      name: role.name,
      color: role.hexColor,
      mentionable: role.mentionable,
      hoist: role.hoist,
      permissions: role.permissions.toArray(),
    },
    metadata: {
      roleId: role.id,
      color: role.hexColor,
    },
  });
}

export async function handleRoleDelete(role: Role): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    role.guild,
    AuditLogEvent.RoleDelete,
    role.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: role.guild.id,
    module: 'ROLES',
    type: 'ROLE_DELETE',
    actor,
    target: {
      id: role.id,
      type: 'ROLE',
      name: role.name,
    },
    reason: auditRes.reason || `Suppression du rôle @${role.name}`,
    before: {
      name: role.name,
      color: role.hexColor,
    },
    metadata: {
      roleId: role.id,
    },
  });
}

export async function handleRoleUpdate(oldRole: Role, newRole: Role): Promise<void> {
  const diffs: { field: string; before: any; after: any }[] = [];

  if (oldRole.name !== newRole.name) {
    diffs.push({ field: 'name', before: oldRole.name, after: newRole.name });
  }

  if (oldRole.hexColor !== newRole.hexColor) {
    diffs.push({ field: 'color', before: oldRole.hexColor, after: newRole.hexColor });
  }

  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
    const oldPerms = oldRole.permissions.toArray();
    const newPerms = newRole.permissions.toArray();
    const addedPerms = newPerms.filter((p) => !oldPerms.includes(p));
    const removedPerms = oldPerms.filter((p) => !newPerms.includes(p));

    diffs.push({
      field: 'permissions',
      before: removedPerms.length ? `Retiré: ${removedPerms.join(', ')}` : 'Inchangé',
      after: addedPerms.length ? `Ajouté: ${addedPerms.join(', ')}` : 'Inchangé',
    });
  }

  if (diffs.length === 0) return;

  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    newRole.guild,
    AuditLogEvent.RoleUpdate,
    newRole.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Admin Inconnu',
  };

  logService.emit({
    guildId: newRole.guild.id,
    module: 'ROLES',
    type: 'ROLE_UPDATE',
    actor,
    target: {
      id: newRole.id,
      type: 'ROLE',
      name: newRole.name,
    },
    reason: auditRes.reason || `Modification du rôle @${newRole.name}`,
    diff: diffs,
    before: {
      name: oldRole.name,
      color: oldRole.hexColor,
    },
    after: {
      name: newRole.name,
      color: newRole.hexColor,
    },
    metadata: {
      roleId: newRole.id,
    },
  });
}
