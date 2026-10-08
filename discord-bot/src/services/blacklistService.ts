import { PermissionFlagsBits, type Guild, type GuildMember } from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { logService } from '../modules/logs/services/logService.js';
import { logger } from '../utils/logger.js';

/**
 * Blacklist (comme Keeper) : un compte blacklisté est banni tout de suite s'il est sur le serveur, puis à chaque
 * retour (s'il a été débanni entre-temps). Gérée depuis la console ; rien n'agit tant que la liste est vide.
 */

export type BlacklistEntry = { userId: string; reason: string; addedBy: string | null; addedAt: string };

export function getBlacklist(guildId: string): BlacklistEntry[] {
  return guildConfigService.getConfig(guildId).blacklist ?? [];
}

export function isBlacklisted(guildId: string, userId: string): BlacklistEntry | undefined {
  return getBlacklist(guildId).find((e) => e.userId === userId);
}

/** Bannit le compte s'il le peut. Renvoie true si le ban a été posé (ou existait déjà). */
async function banNow(guild: Guild, userId: string, reason: string): Promise<boolean> {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) return false;
  const already = await guild.bans.fetch(userId).catch(() => null);
  if (already) return true;
  try {
    await guild.members.ban(userId, { reason: `[Blacklist Etho] ${reason || 'Compte blacklisté'}` });
    await logService.log(guild, {
      category: 'moderation',
      type: 'MOD_SANCTION',
      title: '⛔ Blacklist : compte banni',
      description: `<@${userId}> est blacklisté${reason ? ` (${reason})` : ''}.`,
      color: '#EF4444',
      fields: [],
      userId,
    });
    return true;
  } catch (err) {
    logger.warn(`[Blacklist] Ban impossible de ${userId} sur ${guild.name} :`, err);
    return false;
  }
}

export async function addToBlacklist(guild: Guild, userId: string, reason: string, addedBy: string | null) {
  const list = getBlacklist(guild.id);
  if (!list.some((e) => e.userId === userId)) {
    guildConfigService.updateConfig(guild.id, {
      blacklist: [...list, { userId, reason: reason.slice(0, 200), addedBy, addedAt: new Date().toISOString() }],
    });
  }
  // Ban immédiat (même si le compte n'est pas sur le serveur : Discord accepte le ban par identifiant).
  return { banned: await banNow(guild, userId, reason) };
}

export function removeFromBlacklist(guildId: string, userId: string): void {
  guildConfigService.updateConfig(guildId, { blacklist: getBlacklist(guildId).filter((e) => e.userId !== userId) });
}

/** À l'arrivée d'un membre : un compte blacklisté repart aussitôt. */
export async function enforceBlacklistOnJoin(member: GuildMember): Promise<void> {
  const entry = isBlacklisted(member.guild.id, member.id);
  if (entry) await banNow(member.guild, member.id, entry.reason);
}
