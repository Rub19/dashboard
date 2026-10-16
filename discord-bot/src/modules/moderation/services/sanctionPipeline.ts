import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  type BaseMessageOptions,
} from 'discord.js';
import type { CaseAction, CaseSource, ModerationCase } from '../types/case.js';
import { CaseService } from './caseService.js';
import { moderationRepository } from '../storage/moderationRepository.js';
import { sanctionConfig, SEVERITY_LABEL, type SanctionConfig, type Severity, type Tier } from '../sanctionConfig.js';
import { ownerImmunityService } from '../../../services/ownerImmunityService.js';
import { MESSAGE_KEY, caseVars, renderTemplate } from '../sanctionMessages.js';
import { logger } from '../../../utils/logger.js';
import { guildLang, tr, trg } from '../../../utils/tr.js';

export const ACTION_LABEL: Record<CaseAction, string> = {
  WARN: 'Avertissement',
  NOTE: 'Note',
  TIMEOUT: 'Mute',
  UNTIMEOUT: 'Fin de mute',
  KICK: 'Expulsion',
  SOFTBAN: 'Softban',
  BAN: 'Bannissement',
  TEMPBAN: 'Ban temporaire',
  UNBAN: 'Débannissement',
  QUARANTINE: 'Quarantaine',
};

const COLOR: Partial<Record<CaseAction, number>> = { WARN: 0xfacc15, TIMEOUT: 0xf97316, KICK: 0xf97316, SOFTBAN: 0xef4444, BAN: 0xef4444, TEMPBAN: 0xef4444, UNBAN: 0x22c55e, UNTIMEOUT: 0x22c55e };
const REVERSIBLE: CaseAction[] = ['WARN', 'TIMEOUT', 'TEMPBAN', 'BAN'];

export const human = (s: number, lang?: string) => {
  if (s % 86400 === 0) return tr(lang, s / 86400 > 1 ? '{n} jours' : '{n} jour', { n: s / 86400 });
  if (s % 3600 === 0) return tr(lang, s / 3600 > 1 ? '{n} heures' : '{n} heure', { n: s / 3600 });
  return tr(lang, s >= 120 ? '{n} minutes' : '{n} minute', { n: Math.round(s / 60) });
};

/** Un dossier « en cours » : ni levé ni expiré. */
export const isOpen = (c: ModerationCase, now = Date.now()) => c.status === 'ACTIVE' && (!c.expiresAt || Date.parse(c.expiresAt) > now);

export interface ApplyParams {
  guildId: string;
  userId: string;
  moderator: { id: string; tag: string };
  action: CaseAction;
  reason: string;
  context?: string;
  severity?: Severity;
  points?: number | null;
  expiryDays?: number | null;
  durationSeconds?: number | null;
  source?: CaseSource;
  presetId?: string;
  notify?: boolean;
}

export type ApplyResult = { ok: true; case: ModerationCase } | { ok: false; error: string };

/** Message privé du membre sanctionné : numéro du dossier, raison et bouton d'appel si l'appel est ouvert. */
/** Avertissements encore actifs du membre (pour la variable {warns}). */
export const activeWarns = (guildId: string, userId: string) => moderationRepository.getUserCases(guildId, userId).filter((x) => x.action === 'WARN' && isOpen(x)).length;

export function memberDm(guild: Guild, c: ModerationCase, cfg: SanctionConfig): BaseMessageOptions {
  const lang = guildLang(guild.id);
  const t = (s: string, v?: Record<string, string | number>) => tr(lang, s, v);
  const canAppeal = cfg.appeals.enabled && cfg.appeals.channelId && (cfg.appeals.actions as string[]).includes(c.action);
  const appealRow = canAppeal
    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`appeal:open:${guild.id}:${c.caseNumber}`).setLabel(t('Faire appel')).setStyle(ButtonStyle.Secondary).setEmoji('📨'))]
    : [];
  const key = MESSAGE_KEY[c.action];
  const custom = key ? cfg.messages[key].dm : null;
  if (custom?.enabled) {
    const out = renderTemplate(custom, caseVars(guild, c, ACTION_LABEL[c.action], activeWarns(guild.id, c.userId), human), { server: guild.iconURL({ size: 256 }) });
    return { ...out, components: [...(out.components ?? []), ...appealRow] };
  }
  const who = cfg.replies.nameModerator && c.source !== 'SYSTEM' ? c.moderatorTag : t("L'équipe de modération");
  const e = new EmbedBuilder()
    .setColor(COLOR[c.action] ?? 0x5865f2)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle(`${t(ACTION_LABEL[c.action])} · ${t('dossier n°{n}', { n: c.caseNumber })}`)
    .setDescription(c.reason || t('Aucune raison précisée.'))
    .addFields({ name: t('Par'), value: who, inline: true })
    .setTimestamp(new Date(c.createdAt));
  if (c.action === 'WARN' && c.severity) e.addFields({ name: t('Gravité'), value: `${t(SEVERITY_LABEL[c.severity])}${c.points != null ? ` · ${t(c.points > 1 ? '{n} points' : '{n} point', { n: c.points })}` : ''}`, inline: true });
  if ((c.action === 'TIMEOUT' || c.action === 'TEMPBAN') && c.durationSeconds) e.addFields({ name: t('Durée'), value: human(c.durationSeconds, lang), inline: true });
  return { embeds: [e], components: appealRow };
}

/** Applique une sanction de bout en bout : vérifications, dossier, MP au membre, action sur Discord. */
export async function applySanction(client: Client, p: ApplyParams): Promise<ApplyResult> {
  const guild = client.guilds.cache.get(p.guildId);
  const t = (s: string) => trg(p.guildId, s);
  if (!guild) return { ok: false, error: t('Serveur introuvable.') };
  const cfg = sanctionConfig.get(guild.id);
  const member = await guild.members.fetch(p.userId).catch(() => null);
  const user = member?.user ?? (await client.users.fetch(p.userId).catch(() => null));
  if (!user) return { ok: false, error: t('Membre introuvable.') };
  const a = p.action;

  if (a !== 'NOTE' && a !== 'UNBAN' && a !== 'UNTIMEOUT') {
    if (ownerImmunityService.isOwnerImmune(user.id)) return { ok: false, error: t('Ce membre est protégé.') };
    if (user.id === guild.ownerId) return { ok: false, error: t('Impossible de sanctionner le propriétaire du serveur.') };
    if (user.id === client.user?.id) return { ok: false, error: t('Etho ne peut pas se sanctionner.') };
  }
  if ((a === 'TIMEOUT' || a === 'UNTIMEOUT' || a === 'KICK') && !member) return { ok: false, error: t("Le membre n'est pas sur le serveur.") };
  if ((a === 'TIMEOUT' || a === 'UNTIMEOUT') && !member!.moderatable) return { ok: false, error: t('Rôle du membre au-dessus de celui d’Etho.') };
  if (a === 'KICK' && !member!.kickable) return { ok: false, error: t('Rôle du membre au-dessus de celui d’Etho.') };
  if ((a === 'BAN' || a === 'TEMPBAN' || a === 'SOFTBAN') && member && !member.bannable) return { ok: false, error: t('Rôle du membre au-dessus de celui d’Etho.') };
  if (a === 'UNBAN' && !(await guild.bans.fetch(user.id).catch(() => null))) return { ok: false, error: t("Ce membre n'est pas banni.") };
  if (a === 'UNTIMEOUT' && !member!.isCommunicationDisabled()) return { ok: false, error: t("Ce membre n'est pas muet.") };

  const severity = a === 'WARN' ? (p.severity ?? cfg.warnings.defaultSeverity) : undefined;
  const points = a === 'WARN' ? (p.points ?? (cfg.warnings.severityEnabled ? cfg.warnings.points[severity!] : 1)) : undefined;
  const expiryDays = a === 'WARN' ? (p.expiryDays ?? cfg.warnings.expiryDays) : 0;
  const duration = a === 'TIMEOUT' ? Math.min(p.durationSeconds || 3600, 28 * 86400) : a === 'TEMPBAN' ? p.durationSeconds || 86400 : a === 'WARN' && expiryDays ? expiryDays * 86400 : null;

  const c = CaseService.createCase(client, {
    guildId: guild.id,
    userId: user.id,
    userTag: user.tag,
    moderatorId: p.moderator.id,
    moderatorTag: p.moderator.tag,
    action: a,
    reason: p.reason || t('Aucune raison précisée'),
    durationSeconds: duration,
    source: p.source ?? 'MANUAL',
    severity,
    points: points ?? undefined,
    context: p.context,
    presetId: p.presetId,
  });

  if (p.notify !== false && cfg.replies.dmMember && a !== 'NOTE' && a !== 'UNBAN' && c.caseNumber) await user.send(memberDm(guild, c, cfg)).catch(() => null);

  const why = `${p.moderator.tag} · dossier n°${c.caseNumber} · ${p.reason}`.slice(0, 500);
  try {
    if (a === 'TIMEOUT') await member!.timeout(duration! * 1000, why);
    else if (a === 'UNTIMEOUT') await member!.timeout(null, why);
    else if (a === 'KICK') await member!.kick(why);
    else if (a === 'BAN' || a === 'TEMPBAN') await guild.bans.create(user.id, { reason: why, deleteMessageSeconds: 86400 });
    else if (a === 'SOFTBAN') {
      await guild.bans.create(user.id, { reason: why, deleteMessageSeconds: 7 * 86400 });
      await guild.bans.remove(user.id, `Softban : ${why}`.slice(0, 500));
    } else if (a === 'UNBAN') await guild.bans.remove(user.id, why);
  } catch (err: any) {
    if (c.caseNumber) moderationRepository.deleteCase(guild.id, c.caseNumber);
    return { ok: false, error: err?.code === 50013 ? t('Permission manquante pour Etho.') : err?.message || t('Action refusée par Discord.') };
  }
  return { ok: true, case: c };
}

// --- Paliers -------------------------------------------------------------------------------------------------------

const inScope = (c: ModerationCase, scope: Tier['scope']) => {
  if (c.source === 'SYSTEM' || ['NOTE', 'UNBAN', 'UNTIMEOUT'].includes(c.action)) return false;
  if (scope === 'warns') return c.action === 'WARN' && (c.source === 'MANUAL' || c.source === 'DISCORD');
  if (scope === 'protection') return c.source === 'SECURITY' || c.source === 'ANTI_RAID';
  if (scope === 'automod') return c.source === 'AUTOMOD';
  return true;
};

export function tierValue(cases: ModerationCase[], tier: Tier, cfg: SanctionConfig, now: number): number {
  const since = tier.periodSeconds ? now - tier.periodSeconds * 1000 : 0;
  const list = cases.filter((c) => inScope(c, tier.scope) && c.status !== 'REVOKED' && Date.parse(c.createdAt) >= since && (c.action !== 'WARN' || isOpen(c, now)));
  if (tier.unit === 'infractions') return list.length;
  let total = list.reduce((n, c) => n + (c.points ?? 1), 0);
  const gc = cfg.warnings.goodConduct;
  if (gc.enabled && list.length) {
    const last = Math.max(...list.map((c) => Date.parse(c.createdAt)));
    total -= Math.floor((now - last) / (gc.periodDays * 86400000)) * gc.points;
  }
  return Math.max(0, total);
}

async function applyTiers(client: Client, c: ModerationCase, cfg: SanctionConfig): Promise<void> {
  const tiers = cfg.tiers.filter((t) => t.enabled && inScope(c, t.scope));
  if (!tiers.length) return;
  const now = Date.now();
  const all = moderationRepository.getUserCases(c.guildId, c.userId);
  const before = all.filter((x) => x.caseNumber !== c.caseNumber);
  const hit = tiers
    .filter((t) => tierValue(before, t, cfg, now) < t.count && tierValue(all, t, cfg, now) >= t.count)
    .sort((x, y) => y.count - x.count)[0];
  if (!hit) return;
  const guild = client.guilds.cache.get(c.guildId);
  if (!guild) return;
  if (await guild.bans.fetch(c.userId).catch(() => null)) return;
  const member = await guild.members.fetch(c.userId).catch(() => null);
  if (hit.action === 'TIMEOUT' && member?.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > now + hit.durationSeconds * 1000) return;
  const unit = trg(c.guildId, hit.unit === 'points' ? 'points' : 'infractions');
  await applySanction(client, {
    guildId: c.guildId,
    userId: c.userId,
    moderator: { id: client.user!.id, tag: client.user!.tag },
    action: hit.action,
    reason: hit.reason || trg(c.guildId, 'Palier automatique : {n} {unit}', { n: hit.count, unit }),
    durationSeconds: hit.durationSeconds,
    source: 'SYSTEM',
  });
}

// --- Garde-fou -----------------------------------------------------------------------------------------------------

const lastAlert = new Map<string, number>();

async function guardCheck(client: Client, c: ModerationCase, cfg: SanctionConfig): Promise<void> {
  if (!cfg.guard.enabled || (c.source !== 'MANUAL' && c.source !== 'DISCORD')) return;
  const hourAgo = Date.now() - 3600_000;
  const n = moderationRepository.allCases(c.guildId).filter((x) => x.moderatorId === c.moderatorId && Date.parse(x.createdAt) >= hourAgo).length;
  const key = `${c.guildId}:${c.moderatorId}`;
  if (n <= cfg.guard.perHour || (lastAlert.get(key) ?? 0) > hourAgo) return;
  lastAlert.set(key, Date.now());
  const guild = client.guilds.cache.get(c.guildId);
  if (!guild) return;
  const text = `⚠️ ${trg(guild.id, '**Garde-fou** : {mod} ({tag}) a posé **{n} sanctions** en une heure sur **{server}** (seuil : {max}). Compte volé ou abus ? Vérifie ses dernières sanctions.', { mod: `<@${c.moderatorId}>`, tag: c.moderatorTag, n, server: guild.name, max: cfg.guard.perHour })}`;
  const channel = cfg.guard.alertChannelId ? guild.channels.cache.get(cfg.guard.alertChannelId) : null;
  if (channel?.isTextBased()) await channel.send({ content: text, allowedMentions: { parse: [] } }).catch(() => null);
  else await (await guild.fetchOwner().catch(() => null))?.send(text).catch(() => null);
}

export async function onCaseCreated(client: Client, c: ModerationCase): Promise<void> {
  const cfg = sanctionConfig.get(c.guildId);
  await guardCheck(client, c, cfg);
  await applyTiers(client, c, cfg);
}

/** « Rappel de fin » : le membre est prévenu quand son mute ou son ban temporaire se termine. */
export async function remindEnd(client: Client, guild: Guild, c: ModerationCase): Promise<void> {
  const cfg = sanctionConfig.get(guild.id);
  if (!cfg.replies.endReminder) return;
  const user = await client.users.fetch(c.userId).catch(() => null);
  if (cfg.messages.end.enabled) {
    await user?.send(renderTemplate(cfg.messages.end, caseVars(guild, c, ACTION_LABEL[c.action], activeWarns(guild.id, c.userId), human), { server: guild.iconURL({ size: 256 }) })).catch(() => null);
    return;
  }
  await user
    ?.send({ embeds: [new EmbedBuilder().setColor(0x22c55e).setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined }).setDescription(trg(guild.id, c.action === 'TIMEOUT' ? 'Ton mute (dossier n°{n}) est terminé.' : 'Ton ban temporaire (dossier n°{n}) est terminé.', { n: c.caseNumber }))] })
    .catch(() => null);
}

/** Peut sanctionner : permission de modération, ou rôle autorisé par une raison prédéfinie. */
export const canModerate = (m: GuildMember | null | undefined) =>
  Boolean(m && (m.permissions.has(PermissionFlagsBits.ModerateMembers) || m.permissions.has(PermissionFlagsBits.BanMembers) || m.permissions.has(PermissionFlagsBits.KickMembers)));

export { REVERSIBLE };

/** « Sanctions faites dans Discord » : un ban, une expulsion ou un timeout posé à la main crée aussi un dossier. */
export function recordDiscordSanction(client: Client, guild: Guild, entry: { action: number; executorId: string | null; targetId: string | null; reason: string | null; changes: Array<{ key: string; old?: unknown; new?: unknown }> }): void {
  const executor = entry.executorId;
  if (!executor || !entry.targetId || executor === client.user?.id) return;
  if (!sanctionConfig.get(guild.id).history.discord) return;
  let action: CaseAction | null = null;
  let duration: number | null = null;
  if (entry.action === 22) action = 'BAN';
  else if (entry.action === 23) action = 'UNBAN';
  else if (entry.action === 20) action = 'KICK';
  else if (entry.action === 24) {
    const ch = entry.changes.find((c) => c.key === 'communication_disabled_until');
    if (!ch) return;
    if (ch.new) {
      action = 'TIMEOUT';
      duration = Math.max(60, Math.round((Date.parse(String(ch.new)) - Date.now()) / 1000));
    } else action = 'UNTIMEOUT';
  }
  if (!action) return;
  void (async () => {
    const [mod, target] = await Promise.all([client.users.fetch(executor).catch(() => null), client.users.fetch(entry.targetId!).catch(() => null)]);
    if (mod?.bot) return;
    CaseService.createCase(client, {
      guildId: guild.id,
      userId: entry.targetId!,
      userTag: target?.tag ?? entry.targetId!,
      moderatorId: executor,
      moderatorTag: mod?.tag ?? executor,
      action: action!,
      reason: entry.reason || 'Fait dans Discord, sans raison',
      durationSeconds: duration,
      source: 'DISCORD',
    });
  })();
}
