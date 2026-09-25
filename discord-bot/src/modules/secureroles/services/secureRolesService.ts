import { Client, Guild, GuildMember, PermissionFlagsBits, PermissionsBitField, Role } from 'discord.js';
import { secureRolesStorage as store } from '../storage/secureRolesStorage.js';
import { SecuredRole, SecureMemberRecord } from '../types/secureRoles.js';
import { decryptSecret, encryptSecret, generateSecret, otpauthUri, verifyCode } from './totp.js';
import { logger } from '../../../utils/logger.js';

/** Permissions déplacées vers le rôle caché : celles qui permettent de nuire au serveur si le compte est volé. */
export const SENSITIVE_PERMISSIONS: bigint[] = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageGuildExpressions,
  PermissionFlagsBits.ManageEvents,
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
];
export const SENSITIVE_MASK = SENSITIVE_PERMISSIONS.reduce((a, b) => a | b, 0n);

const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60_000;
const INVITE_TTL_MS = 24 * 3_600_000;

export function sensitiveOf(permissions: bigint): bigint {
  return permissions & SENSITIVE_MASK;
}

export const sensitiveNames = (permissions: bigint): string[] => new PermissionsBitField(sensitiveOf(permissions)).toArray();

export type ElevateResult =
  | { kind: 'error'; message: string }
  | { kind: 'setup'; secret: string; uri: string }
  | { kind: 'need_code' }
  | { kind: 'wrong_code'; remaining: number }
  | { kind: 'locked'; until: Date }
  | { kind: 'granted'; expiresAt: Date; roleIds: string[] };

const memberRolesSecured = (member: GuildMember): SecuredRole[] => store.getConfig(member.guild.id).roles.filter((r) => member.roles.cache.has(r.roleId));

// --- Administration (dashboard) ---

export async function secureRole(guild: Guild, roleId: string, actorId: string | null): Promise<{ permissionsRoleId: string; invited: number; moved: string[] }> {
  const conf = store.getConfig(guild.id);
  if (!conf.enabled) throw new Error('Activez d’abord le module Rôles sécurisés.');
  const role = guild.roles.cache.get(roleId);
  if (!role) throw new Error('Rôle introuvable sur ce serveur');
  if (role.id === guild.id) throw new Error('Le rôle @everyone ne peut pas être sécurisé.');
  if (role.managed) throw new Error('Ce rôle est géré par une application : il ne peut pas être modifié.');
  if (conf.roles.some((r) => r.roleId === roleId || r.permissionsRoleId === roleId)) throw new Error('Ce rôle est déjà sécurisé.');
  if (!role.editable) throw new Error('Le bot ne peut pas modifier ce rôle : placez le rôle du bot au-dessus de lui dans Paramètres du serveur → Rôles.');
  const original = role.permissions.bitfield;
  const sensitive = sensitiveOf(original);
  if (sensitive === 0n) throw new Error('Ce rôle n’a aucune permission sensible à protéger.');

  let hidden: Role;
  try {
    hidden = await guild.roles.create({ name: `🔐 ${role.name}`.slice(0, 100), permissions: sensitive, hoist: false, mentionable: false, reason: 'ETHONE Rôles sécurisés : rôle caché des permissions sensibles' });
  } catch (err) {
    throw new Error(`Création du rôle caché impossible (le bot doit posséder lui-même ces permissions) : ${err instanceof Error ? err.message : err}`);
  }
  try {
    await role.setPermissions(original & ~sensitive, `ETHONE Rôles sécurisés : permissions sensibles déplacées vers ${hidden.name}`);
  } catch (err) {
    await hidden.delete('ETHONE Rôles sécurisés : annulation').catch(() => null);
    throw new Error(`Modification du rôle impossible : ${err instanceof Error ? err.message : err}`);
  }

  store.updateConfig(guild.id, {
    roles: [...conf.roles, { roleId, permissionsRoleId: hidden.id, originalPermissions: original.toString(), securedPermissions: sensitive.toString(), securedAt: new Date().toISOString(), securedBy: actorId }],
  });
  store.log(guild.id, 'secured', `Rôle « ${role.name} » sécurisé`, { actorId, roleId });

  // Les personnes qui ont ce rôle aujourd'hui sont invitées à configurer leur double authentification.
  let invited = 0;
  await guild.members.fetch().catch(() => null);
  for (const m of guild.members.cache.values()) {
    if (m.user.bot || !m.roles.cache.has(roleId)) continue;
    if (!store.getMember(guild.id, m.id)) {
      store.saveMember(newRecord(guild.id, m.id, actorId));
      store.log(guild.id, 'invited', 'Invité à configurer la double authentification', { userId: m.id, actorId });
    }
    invited++;
  }
  return { permissionsRoleId: hidden.id, invited, moved: sensitiveNames(sensitive) };
}

export async function restoreRole(guild: Guild, roleId: string, actorId: string | null): Promise<void> {
  const conf = store.getConfig(guild.id);
  const secured = conf.roles.find((r) => r.roleId === roleId);
  if (!secured) throw new Error('Ce rôle n’est pas sécurisé.');
  const role = guild.roles.cache.get(roleId);
  if (role) {
    if (!role.editable) throw new Error('Le bot ne peut pas modifier ce rôle : placez le rôle du bot au-dessus de lui.');
    await role.setPermissions(BigInt(secured.originalPermissions) | (role.permissions.bitfield & ~SENSITIVE_MASK), 'ETHONE Rôles sécurisés : restauration des permissions');
  }
  for (const s of store.activeSessions(guild.id)) if (s.permissionsRoleIds.includes(secured.permissionsRoleId)) await endSession(guild, s.id, 'restored');
  await guild.roles.cache.get(secured.permissionsRoleId)?.delete('ETHONE Rôles sécurisés : restauration').catch(() => null);
  store.updateConfig(guild.id, { roles: conf.roles.filter((r) => r.roleId !== roleId) });
  store.log(guild.id, 'restored', `Rôle « ${role?.name ?? roleId} » restauré`, { actorId, roleId });
}

function newRecord(guildId: string, userId: string, invitedBy: string | null): SecureMemberRecord {
  return { guildId, userId, status: 'invited', secretEnc: null, invitedAt: new Date().toISOString(), invitedBy, enrolledAt: null, failedAttempts: 0, lockedUntil: null, lastStep: 0 };
}

export function inviteMember(guildId: string, userId: string, actorId: string | null): SecureMemberRecord {
  const existing = store.getMember(guildId, userId);
  if (existing?.status === 'active') throw new Error('Ce membre a déjà configuré sa double authentification.');
  store.log(guildId, 'invited', 'Invité à configurer la double authentification', { userId, actorId });
  return store.saveMember(newRecord(guildId, userId, actorId));
}

/** Réinitialise un membre (téléphone perdu, compte suspect) : sa session est fermée et il doit être réinvité. */
export async function resetMember(guild: Guild, userId: string, actorId: string | null): Promise<void> {
  const s = store.activeSessionFor(guild.id, userId);
  if (s) await endSession(guild, s.id, 'manual');
  store.deleteMember(guild.id, userId);
  store.log(guild.id, 'reset', 'Double authentification réinitialisée', { userId, actorId });
}

// --- Élévation (membre) ---

export async function elevate(member: GuildMember, code: string | null, now = Date.now()): Promise<ElevateResult> {
  const guild = member.guild;
  const secured = memberRolesSecured(member);
  if (secured.length === 0) return { kind: 'error', message: 'Tu ne possèdes aucun rôle sécurisé sur ce serveur.' };

  let rec = store.getMember(guild.id, member.id);
  if (!rec) return { kind: 'error', message: 'Un administrateur doit d’abord t’inviter (dashboard → Rôles sécurisés). Cette invitation évite qu’un compte volé configure sa propre authentification.' };
  if (rec.status === 'invited' && now - new Date(rec.invitedAt).getTime() > INVITE_TTL_MS) {
    return { kind: 'error', message: 'Ton invitation a expiré (24 h). Demande à un administrateur de te réinviter.' };
  }
  if (rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now) return { kind: 'locked', until: new Date(rec.lockedUntil) };

  if (rec.status === 'invited') {
    const secret = generateSecret();
    store.saveMember({ ...rec, status: 'pending', secretEnc: encryptSecret(secret) });
    return { kind: 'setup', secret, uri: otpauthUri(secret, member.user.username) };
  }
  if (!rec.secretEnc) return { kind: 'error', message: 'Configuration incomplète : demande une réinitialisation à un administrateur.' };
  const secret = decryptSecret(rec.secretEnc);
  if (!code) return rec.status === 'pending' ? { kind: 'setup', secret, uri: otpauthUri(secret, member.user.username) } : { kind: 'need_code' };

  const step = verifyCode(secret, code, now, rec.lastStep);
  if (step === null) {
    const failed = rec.failedAttempts + 1;
    if (failed >= MAX_ATTEMPTS) {
      rec = store.saveMember({ ...rec, failedAttempts: 0, lockedUntil: new Date(now + LOCK_MS).toISOString() });
      store.log(guild.id, 'locked', `${MAX_ATTEMPTS} codes erronés : blocage de 10 minutes`, { userId: member.id });
      return { kind: 'locked', until: new Date(rec.lockedUntil!) };
    }
    store.saveMember({ ...rec, failedAttempts: failed });
    store.log(guild.id, 'failed', 'Code erroné', { userId: member.id });
    return { kind: 'wrong_code', remaining: MAX_ATTEMPTS - failed };
  }

  const wasPending = rec.status === 'pending';
  store.saveMember({ ...rec, status: 'active', failedAttempts: 0, lockedUntil: null, lastStep: step, enrolledAt: rec.enrolledAt ?? new Date(now).toISOString() });
  if (wasPending) store.log(guild.id, 'enrolled', 'Double authentification activée', { userId: member.id });

  // Session enregistrée AVANT d'ajouter les rôles : le garde-fou ne doit pas les retirer aussitôt.
  const conf = store.getConfig(guild.id);
  const expiresAt = new Date(now + conf.sessionMinutes * 60_000);
  const roleIds = secured.map((r) => r.permissionsRoleId).filter((id) => guild.roles.cache.has(id));
  const previous = store.activeSessionFor(guild.id, member.id);
  if (previous) store.endSession(previous.id, 'manual');
  store.addSession({ guildId: guild.id, userId: member.id, permissionsRoleIds: roleIds, startedAt: new Date(now).toISOString(), expiresAt: expiresAt.toISOString(), endedAt: null, endReason: null });
  try {
    await member.roles.add(roleIds, 'ETHONE Rôles sécurisés : session élevée');
  } catch (err) {
    const s = store.activeSessionFor(guild.id, member.id);
    if (s) store.endSession(s.id, 'manual');
    return { kind: 'error', message: `Code valide, mais le bot n’a pas pu t’attribuer les permissions : ${err instanceof Error ? err.message : err}` };
  }
  store.log(guild.id, 'elevated', `Session de ${conf.sessionMinutes} min`, { userId: member.id });
  return { kind: 'granted', expiresAt, roleIds };
}

export async function endSession(guild: Guild, sessionId: string, reason: 'expired' | 'manual' | 'lost_role' | 'restored'): Promise<void> {
  const s = store.endSession(sessionId, reason);
  if (!s) return;
  const member = guild.members.cache.get(s.userId) ?? (await guild.members.fetch(s.userId).catch(() => null));
  if (member) await member.roles.remove(s.permissionsRoleIds, `ETHONE Rôles sécurisés : session terminée (${reason})`).catch((err) => logger.warn('[SecureRoles] Retrait du rôle caché impossible :', err?.message));
  store.log(guild.id, 'ended', `Session terminée (${reason})`, { userId: s.userId });
}

export async function endMemberSession(member: GuildMember): Promise<boolean> {
  const s = store.activeSessionFor(member.guild.id, member.id);
  if (!s) return false;
  await endSession(member.guild, s.id, 'manual');
  return true;
}

// --- Garde-fous ---

/** Ferme les sessions expirées ou dont le membre a perdu son rôle du personnel. */
export async function sweep(client: Client, now = Date.now()): Promise<void> {
  for (const s of store.activeSessions()) {
    const guild = client.guilds.cache.get(s.guildId);
    if (!guild) continue;
    const conf = store.getConfig(s.guildId);
    const member = guild.members.cache.get(s.userId);
    const stillStaff = !member || conf.roles.some((r) => member.roles.cache.has(r.roleId));
    if (new Date(s.expiresAt).getTime() <= now) await endSession(guild, s.id, 'expired');
    else if (!stillStaff) await endSession(guild, s.id, 'lost_role');
  }
}

/** Retire les rôles cachés que quelqu'un porte sans session valide (donné à la main, session perdue au redémarrage…). */
export async function enforceGuild(guild: Guild): Promise<number> {
  let removed = 0;
  for (const secured of store.getConfig(guild.id).roles) {
    const hidden = guild.roles.cache.get(secured.permissionsRoleId);
    if (!hidden) continue;
    for (const m of hidden.members.values()) {
      const s = store.activeSessionFor(guild.id, m.id);
      if (s && s.permissionsRoleIds.includes(hidden.id) && new Date(s.expiresAt).getTime() > Date.now()) continue;
      await m.roles.remove(hidden.id, 'ETHONE Rôles sécurisés : rôle caché sans session valide').catch(() => null);
      store.log(guild.id, 'blocked', 'Rôle caché retiré : aucune session valide', { userId: m.id, roleId: secured.roleId });
      removed++;
    }
  }
  return removed;
}

/** À brancher sur GuildMemberUpdate : quelqu'un obtient un rôle caché sans avoir validé de code → retiré tout de suite. */
export async function guardMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
  const conf = store.getConfig(newMember.guild.id);
  if (conf.roles.length === 0) return;
  for (const secured of conf.roles) {
    const id = secured.permissionsRoleId;
    if (oldMember.roles?.cache?.has(id) || !newMember.roles.cache.has(id)) continue;
    const s = store.activeSessionFor(newMember.guild.id, newMember.id);
    if (s && s.permissionsRoleIds.includes(id)) continue;
    await newMember.roles.remove(id, 'ETHONE Rôles sécurisés : rôle caché attribué sans validation').catch(() => null);
    store.log(newMember.guild.id, 'blocked', 'Attribution manuelle du rôle caché annulée', { userId: newMember.id, roleId: secured.roleId });
  }
}

let timer: NodeJS.Timeout | null = null;

export function initialize(client: Client): void {
  if (timer) clearInterval(timer);
  void (async () => {
    for (const guildId of store.guildIdsWithRoles()) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      await guild.members.fetch().catch(() => null);
      await sweep(client);
      await enforceGuild(guild);
    }
  })();
  timer = setInterval(() => void sweep(client).catch((err) => logger.warn('[SecureRoles] sweep :', err?.message)), 30_000);
  timer.unref?.();
}
