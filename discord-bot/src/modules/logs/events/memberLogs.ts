import { AuditLogEvent, GuildBan, GuildMember, PartialGuildMember } from 'discord.js';
import { logService } from '../services/logService.js';
import { DiscordAuditAdapter } from '../services/discordAuditAdapter.js';

export async function handleGuildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
): Promise<void> {
  const guild = newMember.guild;

  // 1. Changement de pseudo / surnom
  if (oldMember.nickname !== newMember.nickname) {
    logService.emit({
      guildId: guild.id,
      module: 'MEMBERS',
      type: 'MEMBER_NICKNAME_CHANGE',
      actor: {
        id: newMember.id,
        tag: newMember.user.tag,
        username: newMember.user.username,
        avatar: newMember.user.displayAvatarURL(),
      },
      target: {
        id: newMember.id,
        type: 'USER',
        name: newMember.user.tag,
        tag: newMember.user.tag,
        avatar: newMember.user.displayAvatarURL(),
      },
      reason: `Surnom modifié: "${oldMember.nickname || 'Aucun'}" → "${newMember.nickname || 'Aucun'}"`,
      before: { nickname: oldMember.nickname || null },
      after: { nickname: newMember.nickname || null },
      diff: [
        {
          field: 'nickname',
          before: oldMember.nickname || null,
          after: newMember.nickname || null,
        },
      ],
    });
  }

  // 2. Changement de rôles
  const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

  if (addedRoles.size > 0 || removedRoles.size > 0) {
    const auditRes = await DiscordAuditAdapter.resolveExecutor(
      guild,
      AuditLogEvent.MemberRoleUpdate,
      newMember.id
    );

    const actor = auditRes.actor || {
      id: newMember.id,
      tag: newMember.user.tag,
      username: newMember.user.username,
      avatar: newMember.user.displayAvatarURL(),
    };

    const addedNames = addedRoles.map((r) => r.name);
    const removedNames = removedRoles.map((r) => r.name);

    logService.emit({
      guildId: guild.id,
      module: 'ROLES',
      type: addedRoles.size > 0 && removedRoles.size === 0 ? 'MEMBER_ROLE_ADD' : 'MEMBER_ROLE_UPDATE',
      actor,
      target: {
        id: newMember.id,
        type: 'USER',
        name: newMember.user.tag,
        tag: newMember.user.tag,
        avatar: newMember.user.displayAvatarURL(),
      },
      reason: `Rôles modifiés sur ${newMember.user.tag}`,
      before: { roles: oldMember.roles.cache.map((r) => r.name) },
      after: { roles: newMember.roles.cache.map((r) => r.name) },
      diff: [
        ...(addedNames.length > 0 ? [{ field: 'roles_added', before: [], after: addedNames }] : []),
        ...(removedNames.length > 0 ? [{ field: 'roles_removed', before: removedNames, after: [] }] : []),
      ],
      metadata: {
        addedRoles: addedNames,
        removedRoles: removedNames,
      },
    });
  }

  // 3. Timeout (Mute temporaire)
  if (
    oldMember.communicationDisabledUntilTimestamp !==
    newMember.communicationDisabledUntilTimestamp
  ) {
    const isTimedOut =
      newMember.communicationDisabledUntilTimestamp &&
      newMember.communicationDisabledUntilTimestamp > Date.now();

    const auditRes = await DiscordAuditAdapter.resolveExecutor(
      guild,
      AuditLogEvent.MemberUpdate,
      newMember.id
    );

    const actor = auditRes.actor || {
      id: newMember.id,
      tag: newMember.user.tag,
    };

    logService.emit({
      guildId: guild.id,
      module: 'MODERATION',
      type: isTimedOut ? 'MEMBER_TIMEOUT' : 'MEMBER_TIMEOUT_REMOVE',
      actor,
      target: {
        id: newMember.id,
        type: 'USER',
        name: newMember.user.tag,
        tag: newMember.user.tag,
        avatar: newMember.user.displayAvatarURL(),
      },
      reason: isTimedOut ? 'Exclusion temporaire appliquée' : 'Fin du timeout',
      before: { timeoutUntil: oldMember.communicationDisabledUntilTimestamp },
      after: { timeoutUntil: newMember.communicationDisabledUntilTimestamp },
      diff: [
        {
          field: 'timeoutUntil',
          before: oldMember.communicationDisabledUntilTimestamp,
          after: newMember.communicationDisabledUntilTimestamp,
        },
      ],
      metadata: {
        durationSeconds: isTimedOut
          ? Math.round((newMember.communicationDisabledUntilTimestamp! - Date.now()) / 1000)
          : 0,
      },
    });
  }
}

export async function handleGuildBanAdd(ban: GuildBan): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    ban.guild,
    AuditLogEvent.MemberBanAdd,
    ban.user.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Modérateur Inconnu',
  };

  logService.emit({
    guildId: ban.guild.id,
    module: 'MODERATION',
    type: 'MEMBER_BAN',
    actor,
    target: {
      id: ban.user.id,
      type: 'USER',
      name: ban.user.tag,
      tag: ban.user.tag,
      avatar: ban.user.displayAvatarURL(),
    },
    reason: ban.reason || auditRes.reason || 'Aucune raison spécifiée',
    metadata: {
      reason: ban.reason,
    },
  });
}

export async function handleGuildBanRemove(ban: GuildBan): Promise<void> {
  const auditRes = await DiscordAuditAdapter.resolveExecutor(
    ban.guild,
    AuditLogEvent.MemberBanRemove,
    ban.user.id
  );

  const actor = auditRes.actor || {
    id: 'unknown',
    tag: 'Modérateur Inconnu',
  };

  logService.emit({
    guildId: ban.guild.id,
    module: 'MODERATION',
    type: 'MEMBER_UNBAN',
    actor,
    target: {
      id: ban.user.id,
      type: 'USER',
      name: ban.user.tag,
      tag: ban.user.tag,
      avatar: ban.user.displayAvatarURL(),
    },
    reason: ban.reason || auditRes.reason || 'Débannissement',
  });
}
