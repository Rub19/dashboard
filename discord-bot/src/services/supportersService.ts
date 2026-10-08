import { ActivityType, type Client, type Guild, type GuildMember, type Presence, type User } from 'discord.js';
import { guildConfigService } from './guildConfigService.js';
import { logger } from '../utils/logger.js';

/**
 * Soutiens (page « Outils » de la console) : rôle donné tant qu'un membre affiche le tag de ce serveur sur son profil
 * et/ou un texte choisi dans son statut perso, retiré dès qu'il ne le fait plus.
 */

export function wearsGuildTag(user: User, guildId: string): boolean {
  return Boolean(user.primaryGuild?.identityEnabled && user.primaryGuild.identityGuildId === guildId);
}

export function statusContains(presence: Presence | null | undefined, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (!needle) return false;
  const custom = presence?.activities.find((a) => a.type === ActivityType.Custom);
  return Boolean(custom?.state?.toLowerCase().includes(needle));
}

export function isSupporter(member: GuildMember): boolean {
  const cfg = guildConfigService.getConfig(member.guild.id).supporters;
  const tag = cfg.mode !== 'status' && wearsGuildTag(member.user, member.guild.id);
  const status = cfg.mode !== 'tag' && statusContains(member.presence, cfg.statusText);
  return tag || status;
}

export async function syncSupporter(member: GuildMember): Promise<void> {
  const cfg = guildConfigService.getConfig(member.guild.id).supporters;
  if (!cfg.enabled || !cfg.roleId || member.user.bot) return;
  const role = member.guild.roles.cache.get(cfg.roleId);
  if (!role?.editable) return;
  const should = isSupporter(member);
  const has = member.roles.cache.has(role.id);
  if (should && !has) await member.roles.add(role, 'Soutien du serveur').catch((e) => logger.warn('[Soutiens]', e));
  if (!should && has) await member.roles.remove(role, 'Ne soutient plus le serveur').catch((e) => logger.warn('[Soutiens]', e));
}

export function supporterCount(guild: Guild): number {
  return guild.members.cache.filter((m) => !m.user.bot && isSupporter(m)).size;
}

/** Passe sur tous les membres (au réglage, puis toutes les 30 min sur le cache) : rattrape les changements manqués. */
export async function sweepSupporters(guild: Guild, fetchAll = false): Promise<void> {
  if (!guildConfigService.getConfig(guild.id).supporters.enabled) return;
  if (fetchAll) await guild.members.fetch({ withPresences: true }).catch(() => null);
  for (const member of guild.members.cache.values()) await syncSupporter(member);
}

export function startSupportersSweep(client: Client): void {
  setInterval(() => {
    for (const guild of client.guilds.cache.values()) void sweepSupporters(guild);
  }, 30 * 60_000).unref();
}

/** Un utilisateur a changé de profil (tag affiché) : on resynchronise ses serveurs. */
export async function onUserUpdate(client: Client, user: User): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    const member = guild.members.cache.get(user.id);
    if (member) await syncSupporter(member);
  }
}

/** Statut perso modifié (intent Présences). */
export async function onPresenceUpdate(presence: Presence): Promise<void> {
  if (!presence.guild || !presence.member) return;
  if (guildConfigService.getConfig(presence.guild.id).supporters.mode === 'tag') return;
  await syncSupporter(presence.member);
}
