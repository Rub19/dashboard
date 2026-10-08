import {
  ChannelType,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildVerificationLevel,
  PermissionFlagsBits,
  type Client,
  type Guild,
} from 'discord.js';
import { isModuleEnabled } from '../../../services/moduleRegistry.js';

/**
 * Scan de sécurité réel : lit l'état du serveur Discord (rôles, salons, réglages, bots) et des modules de
 * protection d'Etho. Chaque point est vérifié, rien n'est supposé.
 */

export type ScanCategory = 'bot' | 'roles' | 'channels' | 'discord' | 'bots' | 'settings';
export interface ScanCheck {
  id: string;
  category: ScanCategory;
  title: string;
  ok: boolean;
  /** Détail affiché sous le titre quand le point est à corriger. */
  detail?: string;
}

const DANGEROUS: Array<[bigint, string]> = [
  [PermissionFlagsBits.Administrator, 'Administrateur'],
  [PermissionFlagsBits.ManageGuild, 'Gérer le serveur'],
  [PermissionFlagsBits.ManageRoles, 'Gérer les rôles'],
  [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
  [PermissionFlagsBits.ManageWebhooks, 'Gérer les webhooks'],
  [PermissionFlagsBits.BanMembers, 'Bannir'],
  [PermissionFlagsBits.KickMembers, 'Expulser'],
  [PermissionFlagsBits.MentionEveryone, 'Mentionner @everyone'],
];

const BOT_NEEDS: Array<[bigint, string]> = [
  [PermissionFlagsBits.ViewAuditLog, 'Voir les logs'],
  [PermissionFlagsBits.ManageGuild, 'Gérer le serveur'],
  [PermissionFlagsBits.ManageRoles, 'Gérer les rôles'],
  [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
  [PermissionFlagsBits.BanMembers, 'Bannir'],
  [PermissionFlagsBits.KickMembers, 'Expulser'],
  [PermissionFlagsBits.ModerateMembers, 'Exclure temporairement'],
  [PermissionFlagsBits.ManageMessages, 'Gérer les messages'],
  [PermissionFlagsBits.ManageWebhooks, 'Gérer les webhooks'],
];

const names = (list: string[], max = 4) => (list.length > max ? `${list.slice(0, max).join(', ')} +${list.length - max}` : list.join(', '));

export async function runSecurityScan(client: Client, guildId: string): Promise<{ checks: ScanCheck[]; scannedAt: string } | null> {
  const guild: Guild | undefined = client.guilds.cache.get(guildId);
  if (!guild) return null;
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const checks: ScanCheck[] = [];
  const add = (c: ScanCheck) => checks.push(c);

  // Bot
  if (me) {
    const missing = BOT_NEEDS.filter(([flag]) => !me.permissions.has(flag)).map(([, label]) => label);
    add({
      id: 'bot-permissions',
      category: 'bot',
      title: 'Le bot a les permissions nécessaires',
      ok: missing.length === 0,
      detail: missing.length ? `Manquantes : ${names(missing, 9)}.` : undefined,
    });
    const highest = guild.roles.cache.filter((r) => !r.managed || r.id === me.roles.highest.id).sort((a, b) => b.position - a.position).first();
    const onTop = !highest || highest.id === me.roles.highest.id;
    add({
      id: 'bot-role-top',
      category: 'bot',
      title: 'Le rôle du bot est en haut de la hiérarchie',
      ok: onTop,
      detail: onTop ? undefined : `Le rôle « ${highest?.name} » est au-dessus : le bot ne peut pas sanctionner ses membres.`,
    });
  }

  // Rôles
  const everyonePerms = DANGEROUS.filter(([flag]) => guild.roles.everyone.permissions.has(flag)).map(([, label]) => label);
  add({
    id: 'everyone-dangerous',
    category: 'roles',
    title: 'Aucune permission dangereuse pour @everyone',
    ok: everyonePerms.length === 0,
    detail: everyonePerms.length ? `@everyone peut : ${names(everyonePerms, 8)}.` : undefined,
  });
  const adminRoles = guild.roles.cache.filter((r) => !r.managed && r.id !== guild.id && r.permissions.has(PermissionFlagsBits.Administrator));
  add({
    id: 'admin-roles',
    category: 'roles',
    title: 'Peu de rôles administrateurs (3 maximum)',
    ok: adminRoles.size <= 3,
    detail: adminRoles.size > 3 ? `${adminRoles.size} rôles ont « Administrateur » : ${names(adminRoles.map((r) => r.name))}.` : undefined,
  });

  // Salons : un membre lambda ne doit pas pouvoir modifier un salon ou ses webhooks.
  const exposed = guild.channels.cache
    .filter((c) => c.type !== ChannelType.GuildCategory && 'permissionOverwrites' in c)
    .filter((c) => {
      const ow = (c as any).permissionOverwrites.cache.get(guild.id);
      return ow?.allow.has(PermissionFlagsBits.ManageChannels) || ow?.allow.has(PermissionFlagsBits.ManageWebhooks) || ow?.allow.has(PermissionFlagsBits.ManageRoles);
    })
    .map((c) => `#${c.name}`);
  add({
    id: 'channels-everyone-manage',
    category: 'channels',
    title: '@everyone ne peut modifier aucun salon',
    ok: exposed.length === 0,
    detail: exposed.length ? `Salons exposés : ${names(exposed)}.` : undefined,
  });

  // Réglages Discord
  add({
    id: 'verification-level',
    category: 'discord',
    title: 'Niveau de vérification au moins « Moyen »',
    ok: guild.verificationLevel >= GuildVerificationLevel.Medium,
    detail: guild.verificationLevel < GuildVerificationLevel.Medium ? 'Paramètres du serveur › Sécurité › Niveau de vérification.' : undefined,
  });
  add({
    id: 'explicit-filter',
    category: 'discord',
    title: 'Filtre de contenu explicite pour tous les membres',
    ok: guild.explicitContentFilter === GuildExplicitContentFilter.AllMembers,
    detail: guild.explicitContentFilter !== GuildExplicitContentFilter.AllMembers ? 'Paramètres du serveur › Sécurité › Filtre de contenu.' : undefined,
  });
  add({
    id: 'mfa',
    category: 'discord',
    title: 'Double authentification exigée pour la modération',
    ok: guild.mfaLevel === GuildMFALevel.Elevated,
    detail: guild.mfaLevel !== GuildMFALevel.Elevated ? 'Le propriétaire peut l\'activer dans Paramètres du serveur › Sécurité.' : undefined,
  });
  add({
    id: 'notifications',
    category: 'discord',
    title: 'Notifications par défaut : mentions uniquement',
    ok: guild.defaultMessageNotifications === GuildDefaultMessageNotifications.OnlyMentions,
  });

  // Bots tiers
  // Rôles d'intégration (un par bot) + bots déjà en cache : évite de télécharger toute la liste des membres.
  const adminBotIds = new Set<string>();
  for (const role of guild.roles.cache.values()) {
    const botId = role.tags?.botId;
    if (botId && botId !== me?.id && role.permissions.has(PermissionFlagsBits.Administrator)) adminBotIds.add(botId);
  }
  for (const m of guild.members.cache.values()) {
    if (m.user.bot && m.id !== me?.id && m.permissions.has(PermissionFlagsBits.Administrator)) adminBotIds.add(m.id);
  }
  const adminBots = [...adminBotIds].map((id) => guild.members.cache.get(id)?.user.username ?? client.users.cache.get(id)?.username ?? id);
  add({
    id: 'bots-admin',
    category: 'bots',
    title: 'Aucun autre bot n\'est administrateur',
    ok: adminBots.length === 0,
    detail: adminBots.length ? `Bots administrateurs : ${names(adminBots)}.` : undefined,
  });

  // Protections Etho
  for (const [id, label] of [
    ['security', 'Anti-raid'],
    ['anti-nuke', 'Anti-nuke'],
    ['automod', 'AutoMod'],
    ['logs', 'Logs'],
  ] as const) {
    const on = isModuleEnabled(guildId, id);
    add({ id: `module-${id}`, category: 'settings', title: `Module ${label} activé`, ok: on, detail: on ? undefined : 'Activable depuis le dashboard.' });
  }

  return { checks, scannedAt: new Date().toISOString() };
}
