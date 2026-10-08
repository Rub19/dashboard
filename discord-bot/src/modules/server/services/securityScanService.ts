import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildVerificationLevel,
  MessageFlags,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { isModuleEnabled } from '../../../services/moduleRegistry.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { BotJobSchedulerService } from '../../botControl/services/botJobSchedulerService.js';
import { container, separator, text, type ContainerPart } from '../../../utils/components.js';
import { icon } from '../../../utils/v2.js';
import { logger } from '../../../utils/logger.js';

/**
 * Scan de sécurité réel : lit l'état du serveur Discord (rôles, salons, réglages, bots) et des modules de
 * protection d'Etho. Chaque point est vérifié, rien n'est supposé. Le dernier résultat est gardé par serveur
 * (vue d'ensemble du dashboard) et un scan automatique peut poster un rapport dans un salon.
 */

export type ScanCategory = 'bot' | 'roles' | 'channels' | 'discord' | 'bots' | 'settings';
export type ScanSeverity = 'important' | 'review' | 'suggestion';
export interface ScanCheck {
  id: string;
  category: ScanCategory;
  severity: ScanSeverity;
  title: string;
  ok: boolean;
  /** Pourquoi c'est un risque (affiché quand le point est à corriger). */
  why?: string;
  /** Comment corriger. */
  fix?: string;
  /** Éléments concernés (rôles, salons, bots…). */
  items?: string[];
}
export interface ScanResult {
  checks: ScanCheck[];
  scannedAt: string;
  memberCount: number;
  score: number;
  sensitiveRoles: string[];
}
export interface AutoScanConfig {
  enabled: boolean;
  channelId: string | null;
  frequency: 'day' | 'week';
  lastRunAt: string | null;
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
const CHANNEL_DANGEROUS: Array<[bigint, string]> = [
  [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
  [PermissionFlagsBits.ManageRoles, 'Gérer les permissions'],
  [PermissionFlagsBits.ManageWebhooks, 'Gérer les webhooks'],
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
const SEVERITY_WEIGHT: Record<ScanSeverity, number> = { important: 3, review: 2, suggestion: 1 };
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Score sur 100 pondéré par la gravité : un point « important » pèse trois fois une suggestion. */
export function scoreOf(checks: ScanCheck[]): number {
  const total = checks.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
  const ok = checks.filter((c) => c.ok).reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
  return total ? Math.round((ok / total) * 100) : 100;
}

export async function runSecurityScan(client: Client, guildId: string): Promise<ScanResult | null> {
  const guild: Guild | undefined = client.guilds.cache.get(guildId);
  if (!guild) return null;
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const checks: ScanCheck[] = [];
  const add = (c: ScanCheck) => checks.push(c);
  const myTop = me?.roles.highest.position ?? 0;

  // --- Etho ---
  if (me) {
    const missing = BOT_NEEDS.filter(([flag]) => !me.permissions.has(flag)).map(([, label]) => label);
    add({
      id: 'bot-permissions',
      category: 'bot',
      severity: 'important',
      title: missing.length ? `Il manque ${plural(missing.length, 'permission', 'permissions')} au bot` : 'Le bot a les permissions nécessaires',
      ok: missing.length === 0,
      why: 'Sans elles, Etho ne peut pas sanctionner ni restaurer ce qu\'un attaquant casse.',
      fix: 'Paramètres du serveur › Rôles › rôle d\'Etho : coche les permissions manquantes (ou Administrateur).',
      items: missing,
    });
    const above = guild.roles.cache.filter((r) => r.position > myTop && r.id !== guild.id).sort((a, b) => b.position - a.position);
    add({
      id: 'bot-role-top',
      category: 'bot',
      severity: 'important',
      title: above.size ? 'Le rôle d\'Etho n\'est pas tout en haut' : 'Le rôle d\'Etho est en haut de la hiérarchie',
      ok: above.size === 0,
      why: 'Etho ne peut agir que sur les membres dont le rôle le plus haut est en dessous du sien.',
      fix: 'Paramètres du serveur › Rôles : glisse le rôle d\'Etho au-dessus de tous les autres.',
      items: above.map((r) => `@${r.name}`),
    });
  }

  // --- Bots tiers ---
  const botRoles = guild.roles.cache.filter((r) => Boolean(r.tags?.botId) && r.tags?.botId !== me?.id);
  const strongBotsAbove = botRoles
    .filter((r) => r.position > myTop && DANGEROUS.some(([flag]) => r.permissions.has(flag)))
    .map((r) => `@${r.name}`);
  add({
    id: 'bots-above',
    category: 'bots',
    severity: 'important',
    title: strongBotsAbove.length
      ? `${plural(strongBotsAbove.length, 'bot avec de gros pouvoirs est placé', 'bots avec de gros pouvoirs sont placés')} au-dessus d'Etho`
      : 'Aucun bot puissant au-dessus d\'Etho',
    ok: strongBotsAbove.length === 0,
    why: 'Si l\'un d\'eux était compromis, Etho ne pourrait pas le retenir.',
    fix: 'Si tu lui fais confiance, ajoute-le à la whitelist. Sinon, place Etho au-dessus de lui.',
    items: strongBotsAbove,
  });
  const adminBots = botRoles.filter((r) => r.permissions.has(PermissionFlagsBits.Administrator)).map((r) => `@${r.name}`);
  add({
    id: 'bots-admin',
    category: 'bots',
    severity: 'review',
    title: adminBots.length ? `${plural(adminBots.length, 'autre bot est administrateur', 'autres bots sont administrateurs')}` : 'Aucun autre bot n\'est administrateur',
    ok: adminBots.length === 0,
    why: 'Un bot administrateur peut tout faire sur le serveur si son compte est piraté.',
    fix: 'Donne-lui seulement les permissions dont il a besoin.',
    items: adminBots,
  });

  // --- Rôles ---
  const everyonePerms = DANGEROUS.filter(([flag]) => guild.roles.everyone.permissions.has(flag)).map(([, label]) => label);
  add({
    id: 'everyone-dangerous',
    category: 'roles',
    severity: 'important',
    title: everyonePerms.length ? '@everyone a des permissions dangereuses' : 'Aucune permission dangereuse pour @everyone',
    ok: everyonePerms.length === 0,
    why: 'Tout nouveau membre, y compris un compte de raid, en profite dès son arrivée.',
    fix: 'Paramètres du serveur › Rôles › @everyone : retire ces permissions.',
    items: everyonePerms,
  });
  // Les compteurs de membres par rôle demandent la liste complète ; on ne la charge que pour les serveurs moyens.
  if (guild.memberCount <= 2000 && guild.members.cache.size < guild.memberCount) await guild.members.fetch().catch(() => null);
  const adminRoles = guild.roles.cache.filter((r) => !r.managed && r.id !== guild.id && r.permissions.has(PermissionFlagsBits.Administrator));
  const adminMembers = new Set<string>(adminRoles.map((r) => [...r.members.keys()]).flat());
  adminMembers.add(guild.ownerId);
  add({
    id: 'admin-roles',
    category: 'roles',
    severity: 'suggestion',
    title: `${plural(adminMembers.size, 'membre a', 'membres ont')} la permission Administrateur, propriétaire compris`,
    ok: adminMembers.size <= 3,
    why: 'Administrateur passe outre toutes les autres permissions : chaque compte concerné mérite une vraie confiance.',
    fix: 'Rien d\'anormal si ce sont des personnes de confiance.',
    items: adminRoles.map((r) => `@${r.name} · ${plural(r.members.size, 'membre', 'membres')}`),
  });

  // --- Salons : un membre lambda ne doit pas pouvoir modifier un salon ou ses webhooks ---
  const exposed: string[] = [];
  for (const c of guild.channels.cache.values()) {
    if (c.type === ChannelType.GuildCategory || !('permissionOverwrites' in c)) continue;
    const ow = (c as any).permissionOverwrites.cache.get(guild.id);
    if (!ow) continue;
    const granted = CHANNEL_DANGEROUS.filter(([flag]) => ow.allow.has(flag)).map(([, label]) => label);
    if (granted.length) exposed.push(`#${c.name} · ${granted.join(', ')}`);
  }
  add({
    id: 'channels-everyone-manage',
    category: 'channels',
    severity: 'review',
    title: exposed.length
      ? `${plural(exposed.length, 'salon donne', 'salons donnent')} des permissions de gestion à @everyone`
      : '@everyone ne peut modifier aucun salon',
    ok: exposed.length === 0,
    why: 'Dans ces salons, n\'importe quel membre peut les supprimer, changer leurs accès ou créer des webhooks.',
    fix: 'Si ce n\'est pas voulu, retire ces permissions de @everyone sur ces salons.',
    items: exposed,
  });

  // --- Réglages Discord ---
  add({
    id: 'verification-level',
    category: 'discord',
    severity: 'suggestion',
    title: guild.verificationLevel >= GuildVerificationLevel.Medium ? 'Niveau de vérification au moins « Moyen »' : 'Le niveau de vérification est trop bas',
    ok: guild.verificationLevel >= GuildVerificationLevel.Medium,
    why: 'Un niveau bas laisse parler des comptes créés il y a quelques minutes.',
    fix: 'Paramètres du serveur › Sécurité › Niveau de vérification.',
  });
  add({
    id: 'explicit-filter',
    category: 'discord',
    severity: 'suggestion',
    title:
      guild.explicitContentFilter === GuildExplicitContentFilter.AllMembers
        ? 'Filtre de contenu explicite pour tous les membres'
        : 'Le filtre de contenu explicite ne couvre pas tous les membres',
    ok: guild.explicitContentFilter === GuildExplicitContentFilter.AllMembers,
    why: 'Discord bloque alors les images choquantes avant qu\'elles soient vues.',
    fix: 'Paramètres du serveur › Sécurité › Filtre de contenu.',
  });
  add({
    id: 'mfa',
    category: 'discord',
    severity: 'suggestion',
    title: guild.mfaLevel === GuildMFALevel.Elevated ? 'La 2FA est exigée pour modérer' : 'La 2FA n\'est pas exigée pour modérer',
    ok: guild.mfaLevel === GuildMFALevel.Elevated,
    why: 'Avec la 2FA obligatoire, un compte modérateur dont le mot de passe fuite ne peut pas servir à bannir.',
    fix: 'Option réservée au propriétaire : Paramètres du serveur › Sécurité.',
  });
  add({
    id: 'notifications',
    category: 'discord',
    severity: 'suggestion',
    title:
      guild.defaultMessageNotifications === GuildDefaultMessageNotifications.OnlyMentions
        ? 'Notifications par défaut : mentions uniquement'
        : 'Les notifications par défaut sonnent pour chaque message',
    ok: guild.defaultMessageNotifications === GuildDefaultMessageNotifications.OnlyMentions,
    why: 'Sinon chaque message d\'un raid sonne chez tous les membres.',
    fix: 'Paramètres du serveur › Vue d\'ensemble › Paramètres de notification par défaut.',
  });

  // --- Réglages Etho ---
  const systemChannelId = guildConfigService.getConfig(guildId).systemChannelId;
  add({
    id: 'system-channel',
    category: 'settings',
    severity: 'suggestion',
    title: systemChannelId && guild.channels.cache.has(systemChannelId) ? 'Salon système d\'Etho configuré' : 'Aucun salon système configuré',
    ok: Boolean(systemChannelId && guild.channels.cache.has(systemChannelId)),
    why: 'Etho n\'a pas d\'endroit où te prévenir d\'un souci de permissions ou d\'une alerte importante.',
    fix: 'Choisis-le dans le message d\'accueil d\'Etho ou avec /setup.',
  });
  for (const [id, label, severity] of [
    ['security', 'Anti-raid', 'review'],
    ['anti-nuke', 'Anti-nuke', 'review'],
    ['automod', 'AutoMod', 'suggestion'],
    ['logs', 'Logs', 'suggestion'],
  ] as const) {
    const on = isModuleEnabled(guildId, id);
    add({
      id: `module-${id}`,
      category: 'settings',
      severity,
      title: on ? `Module ${label} activé` : `Module ${label} désactivé`,
      ok: on,
      why: 'Ce module est désactivé : Etho ne réagit pas à ce type d\'attaque.',
      fix: 'Active-le depuis la page Protections du dashboard.',
    });
  }

  const sensitiveRoles = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed && DANGEROUS.some(([flag]) => r.permissions.has(flag)))
    .sort((a, b) => b.position - a.position)
    .map((r) => `@${r.name}`);

  const result: ScanResult = {
    checks,
    scannedAt: new Date().toISOString(),
    memberCount: guild.memberCount,
    score: scoreOf(checks),
    sensitiveRoles,
  };
  securityScanStore.saveResult(guildId, result);
  return result;
}

// ---------------------------------------------------------------------------
// Stockage : dernier scan + réglages du scan automatique, par serveur.

type StoreShape = Record<string, { last?: ScanResult; auto?: AutoScanConfig }>;
const DEFAULT_AUTO: AutoScanConfig = { enabled: false, channelId: null, frequency: 'week', lastRunAt: null };

class SecurityScanStore {
  private file = path.resolve(process.cwd(), 'data', 'security_scans.json');
  private data: StoreShape = {};

  constructor() {
    try {
      if (fs.existsSync(this.file)) this.data = JSON.parse(fs.readFileSync(this.file, 'utf-8')) ?? {};
    } catch (err) {
      logger.error('[Scan] Lecture de security_scans.json impossible :', err);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      logger.error('[Scan] Écriture de security_scans.json impossible :', err);
    }
  }

  getLast(guildId: string): ScanResult | null {
    return this.data[guildId]?.last ?? null;
  }

  saveResult(guildId: string, result: ScanResult): void {
    this.data[guildId] = { ...this.data[guildId], last: result };
    this.save();
  }

  getAuto(guildId: string): AutoScanConfig {
    return { ...DEFAULT_AUTO, ...this.data[guildId]?.auto };
  }

  setAuto(guildId: string, patch: Partial<AutoScanConfig>): AutoScanConfig {
    const next = { ...this.getAuto(guildId), ...patch };
    this.data[guildId] = { ...this.data[guildId], auto: next };
    this.save();
    return next;
  }

  guildIds(): string[] {
    return Object.keys(this.data);
  }

  /** Oublie un serveur quitté. */
  remove(guildId: string): void {
    if (!this.data[guildId]) return;
    delete this.data[guildId];
    this.save();
  }
}

export const securityScanStore = new SecurityScanStore();

// ---------------------------------------------------------------------------
// Scan automatique : rapport posté dans un salon, avec ce qui a changé depuis le précédent.

const FREQUENCY_MS: Record<AutoScanConfig['frequency'], number> = { day: 24 * 3600_000, week: 7 * 24 * 3600_000 };

export function buildScanReport(guild: Guild, result: ScanResult, previous: ScanResult | null) {
  const failing = result.checks.filter((c) => !c.ok).sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
  const prevFailing = new Set(previous?.checks.filter((c) => !c.ok).map((c) => c.id) ?? []);
  const nowFailing = new Set(failing.map((c) => c.id));
  const added = failing.filter((c) => !prevFailing.has(c.id));
  const fixed = previous ? previous.checks.filter((c) => !c.ok && !nowFailing.has(c.id)) : [];
  const label: Record<ScanSeverity, string> = { important: 'Important', review: 'À examiner', suggestion: 'Suggestion' };
  const line = (c: ScanCheck) => `> **${label[c.severity]}** · ${c.title}`;

  const delta = previous ? result.score - previous.score : 0;
  const parts: ContainerPart[] = [
    text(`## ${icon('a_logo', '🛡️')} Scan de sécurité · ${result.score}/100`),
    text(
      previous
        ? `${delta === 0 ? 'Score inchangé' : `${delta > 0 ? '+' : ''}${delta} depuis le dernier scan`} · ${plural(failing.length, 'point', 'points')} à régler`
        : `Premier rapport · ${plural(failing.length, 'point', 'points')} à régler`
    ),
    separator(),
  ];
  if (previous && added.length) parts.push(text(`### Nouveaux points\n${added.map(line).join('\n')}`));
  if (fixed.length) parts.push(text(`### Corrigés depuis le dernier scan\n${fixed.map((c) => `> ${icon('a_check', '✅')} ${c.title}`).join('\n')}`));
  if (!previous || !added.length) {
    parts.push(text(failing.length ? `### À régler\n${failing.slice(0, 6).map(line).join('\n')}` : `${icon('a_check', '✅')} Rien à régler.`));
  }
  parts.push(separator());
  parts.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Voir le rapport complet')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://ethone.dev/discord/?guildId=${guild.id}&view=scan`)
        .setEmoji('📊')
    )
  );
  return { components: [container(result.score >= 85 ? 0x10b981 : result.score >= 60 ? 0xf59e0b : 0xef4444, parts)], flags: MessageFlags.IsComponentsV2 } as const;
}

class AutoScanScheduler {
  private timer?: NodeJS.Timeout;
  private running = false;

  initialize(client: Client): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(BotJobSchedulerService.getInstance().track('security_autoscan_tick', () => this.tick(client)), 15 * 60_000);
    logger.info('[Scan] Scan automatique actif (vérification toutes les 15 min)');
  }

  async tick(client: Client): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      for (const guildId of securityScanStore.guildIds()) {
        const auto = securityScanStore.getAuto(guildId);
        if (!auto.enabled || !auto.channelId) continue;
        if (auto.lastRunAt && now - Date.parse(auto.lastRunAt) < FREQUENCY_MS[auto.frequency]) continue;
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(auto.channelId);
        if (!guild || !channel?.isTextBased()) continue;
        const previous = securityScanStore.getLast(guildId);
        const result = await runSecurityScan(client, guildId);
        securityScanStore.setAuto(guildId, { lastRunAt: new Date().toISOString() });
        if (!result) continue;
        await channel.send(buildScanReport(guild, result, previous)).catch((err) => logger.warn(`[Scan] Rapport impossible sur ${guild.name} :`, err));
      }
    } catch (err) {
      logger.error('[Scan] Erreur du scan automatique :', err);
    } finally {
      this.running = false;
    }
  }
}

export const autoScanScheduler = new AutoScanScheduler();
