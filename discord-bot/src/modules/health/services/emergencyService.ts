import fs from 'fs';
import path from 'path';
import { ChannelType, Client, EmbedBuilder, Guild, PermissionFlagsBits } from 'discord.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { levelingStorage } from '../../leveling/storage/levelingStorage.js';
import { reportsStorage } from '../../reports/storage/reportsStorage.js';
import { countingStorage } from '../../counting/storage/countingStorage.js';
import { secureRolesStorage } from '../../secureroles/storage/secureRolesStorage.js';
import { voiceRepository } from '../../voice/storage/voiceRepository.js';
import { autoModRepository } from '../../automod/storage/autoModRepository.js';
import { logStorage } from '../../logs/storage/logStorage.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

/**
 * Contacts d'urgence : quand un problème sérieux est détecté (permission manquante, salon configuré supprimé, rôle caché
 * disparu…), un message d'urgence est posté sur le serveur et les contacts sont prévenus (mention + message privé) pour que
 * le problème soit réellement traité. Une alerte n'est renvoyée que si la liste des problèmes change, ou après 24 h.
 */

export interface EmergencyIssue {
  id: string;
  title: string;
  detail: string;
}

const CHECK_EVERY_MS = 30 * 60_000;
const REPEAT_AFTER_MS = 24 * 3_600_000;
const MAX_DM = 10;
const MAX_MENTIONS = 10;

const BASE_PERMS: Array<[bigint, string]> = [
  [PermissionFlagsBits.ViewChannel, 'Voir les salons'],
  [PermissionFlagsBits.SendMessages, 'Envoyer des messages'],
  [PermissionFlagsBits.EmbedLinks, 'Intégrer des liens'],
];

/** Liste les problèmes sérieux d'un serveur. Fonction sans effet de bord (testable). */
export function collectIssues(guild: Guild): EmergencyIssue[] {
  const issues: EmergencyIssue[] = [];
  const me = guild.members.me;
  if (!me) return issues;
  const has = (p: bigint) => me.permissions.has(p);
  const needs = (id: string, title: string, perm: bigint, label: string) => {
    if (!has(perm)) issues.push({ id, title, detail: `Permission manquante au bot : **${label}**.` });
  };
  const channelMissing = (id: string, title: string, channelId: string | null | undefined) => {
    if (channelId && !guild.channels.cache.has(channelId)) issues.push({ id, title, detail: `Le salon configuré (\`${channelId}\`) n'existe plus.` });
  };

  for (const [perm, label] of BASE_PERMS) needs(`base:${perm}`, 'Permissions de base', perm, label);

  // Rôles sécurisés : sans « Gérer les rôles », l'équipe ne peut plus retrouver ses permissions.
  const secure = secureRolesStorage.getConfig(guild.id);
  if (secure.roles.length > 0) {
    needs('secure:roles', 'Rôles sécurisés', PermissionFlagsBits.ManageRoles, 'Gérer les rôles');
    for (const r of secure.roles) {
      if (!guild.roles.cache.has(r.permissionsRoleId)) issues.push({ id: `secure:hidden:${r.roleId}`, title: 'Rôles sécurisés', detail: `Le rôle caché de <@&${r.roleId}> a été supprimé : ses permissions sensibles ne sont plus attribuables.` });
      if (!guild.roles.cache.has(r.roleId)) issues.push({ id: `secure:visible:${r.roleId}`, title: 'Rôles sécurisés', detail: `Un rôle sécurisé (\`${r.roleId}\`) a été supprimé.` });
    }
  }

  const leveling = levelingStorage.getConfig(guild.id);
  if (leveling.enabled) {
    if (levelingStorage.getRewards(guild.id).some((r) => r.enabled)) needs('leveling:roles', 'Niveaux', PermissionFlagsBits.ManageRoles, 'Gérer les rôles (récompenses de niveau)');
    if (leveling.levelUpChannelType === 'specific_channel') channelMissing('leveling:channel', 'Niveaux', leveling.levelUpChannelId);
  }

  const reports = reportsStorage.getConfig(guild.id);
  if (reports.enabled) channelMissing('reports:channel', 'Signalements', reports.channelId);

  const counting = countingStorage.getConfig(guild.id);
  if (counting.enabled) channelMissing('counting:channel', 'Comptage', counting.channelId);

  const voice = voiceRepository.getSettings(guild.id);
  const hubs = voiceRepository.getHubs(guild.id);
  if (voice.enabled && hubs.length > 0) {
    needs('voice:channels', 'Salons vocaux temporaires', PermissionFlagsBits.ManageChannels, 'Gérer les salons');
    for (const h of hubs) channelMissing(`voice:hub:${h.id}`, 'Salons vocaux temporaires', h.channelId);
  }

  const automod = autoModRepository.getConfig(guild.id);
  if (automod.enabled && automod.strikes.enabled) {
    for (const step of automod.strikes.progressiveSteps) {
      if (step.action === 'BAN') needs('automod:ban', 'AutoMod', PermissionFlagsBits.BanMembers, 'Bannir des membres (sanction automatique)');
      if (step.action === 'KICK') needs('automod:kick', 'AutoMod', PermissionFlagsBits.KickMembers, 'Expulser des membres (sanction automatique)');
      if (step.action === 'TIMEOUT') needs('automod:timeout', 'AutoMod', PermissionFlagsBits.ModerateMembers, 'Exclure temporairement (sanction automatique)');
    }
  }

  const logs = logStorage.getConfig(guild.id);
  if (logs.enabled && logs.useSingleChannel) channelMissing('logs:channel', 'Journaux', logs.singleChannelId);

  // Un même identifiant ne remonte qu'une fois (plusieurs paliers de sanction peuvent réclamer la même permission).
  return [...new Map(issues.map((i) => [i.id, i])).values()];
}

/** Membres à prévenir. `owner` : le propriétaire ; `admins` : les administrateurs humains ; `custom` : la liste choisie. */
export async function resolveContacts(guild: Guild): Promise<{ userIds: string[]; roleIds: string[] }> {
  const conf = guildConfigService.getConfig(guild.id).emergencyContacts;
  if (conf.mode === 'owner') return { userIds: [guild.ownerId], roleIds: [] };
  if (conf.mode === 'custom') return { userIds: [...conf.userIds], roleIds: [...conf.roleIds] };
  await guild.members.fetch().catch(() => null);
  const admins = guild.members.cache.filter((m) => !m.user.bot && m.permissions.has(PermissionFlagsBits.Administrator)).map((m) => m.id);
  return { userIds: [...new Set([guild.ownerId, ...admins])], roleIds: [] };
}

/** Salon d'alerte : le salon unique des journaux, sinon le salon système ; à défaut, seuls les messages privés partent. */
function alertChannel(guild: Guild) {
  const logs = logStorage.getConfig(guild.id);
  const ids = [logs.useSingleChannel ? logs.singleChannelId : null, guild.systemChannelId];
  for (const id of ids) {
    const ch = id ? guild.channels.cache.get(id) : null;
    if (ch && (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) && guild.members.me && ch.permissionsFor(guild.members.me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) return ch;
  }
  return null;
}

export function buildEmergencyEmbed(guild: Guild, issues: EmergencyIssue[], test: boolean): EmbedBuilder {
  const body = test
    ? 'Ceci est un **test** : si vous voyez ce message, les contacts d’urgence de ce serveur sont bien prévenus.'
    : issues.map((i) => `**${i.title}** — ${i.detail}`).join('\n');
  return baseEmbed(test ? 'info' : 'error').setTitle(test ? '🧪 Test des contacts d’urgence' : '🚨 Problème sérieux détecté').setDescription(body.slice(0, 3800)).setFooter({ text: `${guild.name} · ETHONE` });
}

/** Envoie l'alerte : message dans le salon (avec mentions) + message privé à chaque contact. Renvoie ce qui a réellement été livré. */
export async function notify(guild: Guild, issues: EmergencyIssue[], test = false): Promise<{ channel: boolean; dms: number; contacts: number }> {
  const contacts = await resolveContacts(guild);
  const embed = buildEmergencyEmbed(guild, issues, test);
  const mentions = [...contacts.userIds.slice(0, MAX_MENTIONS).map((id) => `<@${id}>`), ...contacts.roleIds.slice(0, MAX_MENTIONS).map((id) => `<@&${id}>`)].join(' ');

  let channelSent = false;
  const channel = alertChannel(guild);
  if (channel && 'send' in channel) {
    channelSent = await channel
      .send({ content: mentions || undefined, embeds: [embed], allowedMentions: { users: contacts.userIds.slice(0, MAX_MENTIONS), roles: contacts.roleIds.slice(0, MAX_MENTIONS) } })
      .then(() => true)
      .catch(() => false);
  }

  let dms = 0;
  for (const id of contacts.userIds.slice(0, MAX_DM)) {
    const user = await guild.client.users.fetch(id).catch(() => null);
    if (user && (await user.send({ embeds: [embed] }).then(() => true).catch(() => false))) dms++;
  }
  return { channel: channelSent, dms, contacts: contacts.userIds.length + contacts.roleIds.length };
}

// --- Surveillance périodique ---

interface AlertState {
  fingerprint: string;
  at: number;
}
const STATE_FILE = path.resolve(process.cwd(), 'data', 'emergency_state.json');

function loadState(): Record<string, AlertState> {
  try {
    return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
  } catch {
    return {};
  }
}
function saveState(state: Record<string, AlertState>) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    logger.warn('[Emergency] Sauvegarde de l’état impossible :', err instanceof Error ? err.message : err);
  }
}

/** Vérifie tous les serveurs. Renvoie le nombre d'alertes envoyées. */
export async function sweep(client: Pick<Client, 'guilds'>, now = Date.now()): Promise<number> {
  const state = loadState();
  let sent = 0;
  for (const guild of client.guilds.cache.values()) {
    const issues = collectIssues(guild);
    if (issues.length === 0) {
      delete state[guild.id];
      continue;
    }
    const fingerprint = issues.map((i) => i.id).sort().join('|');
    const prev = state[guild.id];
    if (prev && prev.fingerprint === fingerprint && now - prev.at < REPEAT_AFTER_MS) continue;
    const res = await notify(guild, issues).catch(() => null);
    // Mémorisé seulement si quelqu'un a pu être prévenu : sinon on réessaie au prochain passage.
    if (res && (res.channel || res.dms > 0)) {
      state[guild.id] = { fingerprint, at: now };
      sent++;
    }
  }
  saveState(state);
  return sent;
}

let timer: NodeJS.Timeout | null = null;

export function initialize(client: Client): void {
  if (timer) clearInterval(timer);
  setTimeout(() => void sweep(client).catch(() => null), 90_000).unref?.();
  timer = setInterval(() => void sweep(client).catch((err) => logger.warn('[Emergency] sweep :', err?.message)), CHECK_EVERY_MS);
  timer.unref?.();
}
