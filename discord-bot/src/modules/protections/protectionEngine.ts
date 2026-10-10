import {
  AuditLogEvent,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  Guild,
  GuildAuditLogsEntry,
  GuildBasedChannel,
  GuildChannel,
  GuildEmoji,
  GuildMember,
  Message,
  OverwriteType,
  PartialMessage,
  PermissionFlagsBits,
  PermissionsBitField,
  Role,
  Sticker,
} from 'discord.js';
import { getProtection, DEFAULT_WATCHED_PERMS, LOCKDOWN_PERMS, PROTECTIONS } from './catalog.js';
import { protectionStore, type ProtectionSettings } from './protectionStore.js';
import { countEmojis, detectScam, findBannedWord, findBlockedLink, isTextWall, normalizeForDuplicate, similarity, toxicityScore } from './detectors.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { ownerImmunityService } from '../../services/ownerImmunityService.js';
import { securityStorage } from '../security/storage/securityStorage.js';
import { logger } from '../../utils/logger.js';

type Undo = () => Promise<unknown>;
interface Hit {
  at: number;
  count: number;
  undo?: Undo;
}
interface EvalOptions {
  count?: number;
  /** Sous-compteur (ex. : un rôle précis pour l'anti-rôle de masse, un groupe de messages pour les doublons). */
  sub?: string;
  channelId?: string | null;
  member?: GuildMember | null;
  undo?: Undo;
  detail: string;
}

const ACTION_LABEL: Record<string, string> = {
  none: 'Alerte seulement',
  timeout: 'Timeout',
  derank: 'Rôles retirés',
  kick: 'Expulsion',
  ban: 'Bannissement',
};
const human = (s: number) => (s % 86400 === 0 ? `${s / 86400} j` : s % 3600 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : `${s} s`);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const change = (entry: GuildAuditLogsEntry, key: string) => entry.changes?.find((c) => c.key === key);

interface ChannelSnap {
  name: string;
  type: ChannelType;
  topic: string | null;
  nsfw: boolean;
  parentId: string | null;
  position: number;
  rateLimitPerUser: number;
  bitrate?: number;
  userLimit?: number;
  overwrites: { id: string; type: OverwriteType; allow: bigint; deny: bigint }[];
}
interface RoleSnap {
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: bigint;
  position: number;
  unicodeEmoji: string | null;
  memberIds: string[];
}

/**
 * Moteur des protections (modèle Keeper). Les actions de modération sont lues dans le journal d'audit (auteur fiable,
 * sans course entre événements), les messages en direct. Chaque protection compte les actions d'un même auteur dans sa
 * fenêtre ; au-delà du seuil, Etho répare ce qui a été fait pendant la rafale, punit l'auteur et prévient.
 */
class ProtectionEngine {
  private client: Client | null = null;
  private hits = new Map<string, Hit[]>();
  private recentlyPunished = new Map<string, number>();
  /** Après une rafale sanctionnée : les messages suivants de l'auteur sont supprimés jusqu'à la fin de la fenêtre. */
  private spamUntil = new Map<string, number>();
  private channelSnaps = new Map<string, { snap: ChannelSnap; at: number }>();
  private roleSnaps = new Map<string, { snap: RoleSnap; at: number }>();
  private emojiSnaps = new Map<string, { name: string; url: string; at: number }>();
  private stickerSnaps = new Map<string, { name: string; url: string; tags: string; description: string | null; at: number }>();
  private dupHistory = new Map<string, { id: string; channelId: string; norm: string; cluster: string; at: number }[]>();
  private lastInfoLog = new Map<string, number>();
  private lastOwnerDm = new Map<string, number>();
  private reorderTimers = new Map<string, NodeJS.Timeout>();
  private pendingReorder = new Map<string, Map<string, number>>();

  public init(client: Client) {
    this.client = client;
    client.once(Events.ClientReady, () => protectionStore.ensure(client.guilds.cache.keys()));
    // Nouveau serveur : tout reste désactivé (rien à reprendre).
    client.on(Events.GuildCreate, (g) => protectionStore.startFresh(g.id));
    // Ménage des compteurs et instantanés, et sauvegardes automatiques (Rollback & Backups).
    setInterval(() => this.sweep(), 60_000).unref();
    setInterval(() => void this.runBackups(), 15 * 60_000).unref();
  }

  private sweep() {
    const now = Date.now();
    for (const [k, list] of this.hits) {
      const fresh = list.filter((h) => now - h.at < 7 * 86400_000);
      if (fresh.length) this.hits.set(k, fresh);
      else this.hits.delete(k);
    }
    for (const map of [this.channelSnaps, this.roleSnaps, this.emojiSnaps, this.stickerSnaps] as Map<string, { at: number }>[]) {
      for (const [k, v] of map) if (now - v.at > 10 * 60_000) map.delete(k);
    }
    for (const [k, v] of this.dupHistory) {
      const fresh = v.filter((m) => now - m.at < 10 * 60_000);
      if (fresh.length) this.dupHistory.set(k, fresh);
      else this.dupHistory.delete(k);
    }
  }

  // --- Whitelist & évaluation --------------------------------------------------------------------------------------

  private isGloballyWhitelisted(guildId: string, member: GuildMember | null, userId: string) {
    const wl = securityStorage.getConfig(guildId).whitelist;
    if (wl.trustedUserIds.includes(userId) || wl.trustedBotIds.includes(userId)) return true;
    return Boolean(member && wl.trustedRoleIds.some((r) => member.roles.cache.has(r)));
  }

  private channelExempt(guild: Guild, s: ProtectionSettings, channelId?: string | null) {
    if (!channelId) return false;
    const ch = guild.channels.cache.get(channelId);
    const ids = [channelId, ch?.parentId, ch?.parent?.parentId].filter(Boolean) as string[];
    return ids.some((id) => s.wlChannels.includes(id) || s.wlCategories.includes(id));
  }

  /** Enregistre une action ; renvoie true si l'auteur a été sanctionné. */
  public async evaluate(guild: Guild, key: string, executorId: string, opts: EvalOptions): Promise<boolean> {
    const s = protectionStore.get(guild.id, key);
    const def = getProtection(key);
    if (!s.enabled || !def) return false;
    if (executorId === guild.client.user?.id || executorId === guild.ownerId || ownerImmunityService.isOwnerImmune(executorId)) return false;
    if (def.channelExempt && this.channelExempt(guild, s, opts.channelId)) return false;

    const member = opts.member ?? (await guild.members.fetch(executorId).catch(() => null));
    const ethoOwner = s.ignoreEthoOwners && (guildConfigService.getConfig(guild.id).ethoOwners ?? []).includes(executorId);
    const whitelisted =
      ethoOwner ||
      (s.useGlobalWhitelist && this.isGloballyWhitelisted(guild.id, member, executorId)) ||
      s.wlUsers.includes(executorId) ||
      Boolean(member && s.wlRoles.some((r) => member.roles.cache.has(r)));
    if (whitelisted && (def.noWhitelistLimit || s.exceptionQuotaMax == null)) return false;

    const quotaMax = whitelisted ? s.exceptionQuotaMax! : def.kind === 'quota' ? s.quotaMax ?? 1 : 1;
    const windowMs = (whitelisted ? s.exceptionQuotaSeconds ?? s.quotaSeconds ?? 60 : def.kind === 'quota' ? s.quotaSeconds ?? 60 : 60) * 1000;

    const hk = `${guild.id}:${key}:${executorId}${opts.sub ? `:${opts.sub}` : ''}`;
    const now = Date.now();
    const list = (this.hits.get(hk) ?? []).filter((h) => now - h.at < windowMs);
    list.push({ at: now, count: opts.count ?? 1, undo: opts.undo });
    const total = list.reduce((n, h) => n + h.count, 0);

    const tag = member?.user.tag ?? (await guild.client.users.fetch(executorId).catch(() => null))?.tag ?? executorId;

    if (total < quotaMax) {
      this.hits.set(hk, list);
      if (s.logMode === 'all') void this.infoLog(guild, key, s, tag, executorId, `${opts.detail} (${total}/${quotaMax})`);
      return false;
    }

    // Seuil atteint : on répare toute la rafale, puis on punit une seule fois.
    this.hits.delete(hk);
    let repaired = 0;
    for (const h of list) {
      if (!h.undo) continue;
      try {
        await h.undo();
        repaired++;
      } catch (err) {
        logger.warn(`[Protections] ${key} : réparation impossible :`, (err as Error)?.message);
      }
    }

    const pk = `${guild.id}:${executorId}`;
    if (now - (this.recentlyPunished.get(pk) ?? 0) < 15_000) return true;
    this.recentlyPunished.set(pk, now);

    const result = await this.punish(guild, member, executorId, s, `${def.label} : ${opts.detail}`);
    const locked = s.lockdown ? await this.lockdown(guild, `${def.label} déclenchée par ${tag}`) : false;
    await this.abuseLog(guild, key, s, { tag, id: executorId, detail: opts.detail, result, repaired, locked });
    return true;
  }

  // --- Punition & verrouillage -------------------------------------------------------------------------------------

  private async punish(guild: Guild, member: GuildMember | null, userId: string, s: ProtectionSettings, reason: string): Promise<string> {
    const why = `Etho · ${reason}`.slice(0, 500);
    try {
      switch (s.punish) {
        case 'none':
          return ACTION_LABEL.none;
        case 'timeout':
          if (!member?.moderatable) return 'Timeout impossible (rôle au-dessus d’Etho)';
          await member.timeout(s.timeoutSeconds * 1000, why);
          return `Timeout ${human(s.timeoutSeconds)}`;
        case 'derank': {
          if (!member) return 'Auteur introuvable';
          const me = guild.members.me;
          const removable = member.roles.cache.filter((r) => r.id !== guild.id && !r.managed && me && r.comparePositionTo(me.roles.highest) < 0);
          if (removable.size) await member.roles.remove(removable, why);
          // Un bot garde son rôle d'intégration : on l'expulse pour lui ôter tout pouvoir.
          if (member.user.bot && member.roles.cache.some((r) => r.managed) && member.kickable) {
            await member.kick(why);
            return `Rôles retirés (${removable.size}) et bot expulsé`;
          }
          return `Rôles retirés (${removable.size})`;
        }
        case 'kick':
          if (!member?.kickable) return 'Expulsion impossible (rôle au-dessus d’Etho)';
          await member.kick(why);
          return ACTION_LABEL.kick;
        case 'ban':
          await guild.members.ban(userId, { reason: why });
          return ACTION_LABEL.ban;
      }
    } catch (err) {
      logger.warn('[Protections] Punition impossible :', (err as Error)?.message);
      return 'Punition impossible (permissions)';
    }
    return ACTION_LABEL.none;
  }

  /** Retire les permissions sensibles de tous les rôles (sous Etho) ; l'état d'avant est gardé pour tout remettre. */
  public async lockdown(guild: Guild, reason: string): Promise<boolean> {
    if (protectionStore.getLockdown(guild.id)) return true;
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
    const strip = new PermissionsBitField(LOCKDOWN_PERMS as (keyof typeof PermissionFlagsBits)[]);
    const saved: Record<string, string> = {};
    for (const role of guild.roles.cache.values()) {
      if (role.managed || role.comparePositionTo(me.roles.highest) >= 0 || !role.permissions.any(strip)) continue;
      saved[role.id] = role.permissions.bitfield.toString();
      await role.setPermissions(role.permissions.remove(strip), `Etho · Verrouillage : ${reason}`.slice(0, 500)).catch(() => delete saved[role.id]);
    }
    protectionStore.setLockdown(guild.id, { at: new Date().toISOString(), reason, roles: saved });
    return true;
  }

  public async liftLockdown(guild: Guild): Promise<number> {
    const state = protectionStore.getLockdown(guild.id);
    if (!state) return 0;
    let restored = 0;
    for (const [roleId, bits] of Object.entries(state.roles)) {
      const role = guild.roles.cache.get(roleId);
      if (role && (await role.setPermissions(BigInt(bits), 'Etho · Verrouillage levé').then(() => true).catch(() => false))) restored++;
    }
    protectionStore.setLockdown(guild.id, null);
    return restored;
  }

  // --- Alertes -----------------------------------------------------------------------------------------------------

  private logChannel(guild: Guild, s: ProtectionSettings) {
    const ch = s.logChannelId ? guild.channels.cache.get(s.logChannelId) : null;
    return ch && ch.isTextBased() && ch.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages) ? ch : null;
  }

  private async infoLog(guild: Guild, key: string, s: ProtectionSettings, tag: string, id: string, detail: string) {
    const k = `${guild.id}:${key}`;
    if (Date.now() - (this.lastInfoLog.get(k) ?? 0) < 1500) return;
    this.lastInfoLog.set(k, Date.now());
    const ch = this.logChannel(guild, s);
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor(0x6b7280)
      .setAuthor({ name: getProtection(key)?.label ?? key })
      .setDescription(`**${tag}** (<@${id}>) · ${detail}`)
      .setTimestamp();
    await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
  }

  private async abuseLog(
    guild: Guild,
    key: string,
    s: ProtectionSettings,
    a: { tag: string; id: string; detail: string; result: string; repaired: number; locked: boolean }
  ) {
    const def = getProtection(key)!;
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(def.label)
      .setDescription(`**${a.tag}** (<@${a.id}>) · ${a.detail}`)
      .addFields(
        { name: 'Sanction', value: a.result, inline: true },
        ...(a.repaired ? [{ name: 'Réparé', value: `${a.repaired} action${a.repaired > 1 ? 's' : ''} annulée${a.repaired > 1 ? 's' : ''}`, inline: true }] : []),
        ...(a.locked ? [{ name: 'Serveur', value: 'Verrouillé (permissions retirées)', inline: true }] : [])
      )
      .setFooter({ text: `ID ${a.id}` })
      .setTimestamp();
    const ch = this.logChannel(guild, s);
    if (ch) {
      const mentions = [...s.mentionRoleIds.map((r) => `<@&${r}>`), ...(s.mentionEveryone ? ['@everyone'] : [])].join(' ');
      await ch
        .send({ content: mentions || undefined, embeds: [embed], allowedMentions: { roles: s.mentionRoleIds, parse: s.mentionEveryone ? ['everyone'] : [] } })
        .catch(() => {});
    }
    securityStorage.addIncident(guild.id, {
      guildId: guild.id,
      type: 'PROTECTION',
      severity: s.punish === 'ban' || s.punish === 'derank' || a.locked ? 'critical' : 'high',
      title: def.label,
      description: `${a.tag} · ${a.detail}`,
      perpetratorId: a.id,
      perpetratorTag: a.tag,
      affectedCount: Math.max(1, a.repaired),
      actionTaken: [a.result, a.locked ? 'serveur verrouillé' : ''].filter(Boolean).join(' · '),
      status: 'open',
    });
    if (s.notifyOwner) {
      const k = `${guild.id}:${key}`;
      if (Date.now() - (this.lastOwnerDm.get(k) ?? 0) > 60_000) {
        this.lastOwnerDm.set(k, Date.now());
        const owner = await guild.fetchOwner().catch(() => null);
        await owner?.send({ embeds: [embed.setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })] }).catch(() => {});
      }
    }
  }

  // --- Journal d'audit ---------------------------------------------------------------------------------------------

  public async onAuditEntry(guild: Guild, entry: GuildAuditLogsEntry): Promise<void> {
    const ex = entry.executorId;
    if (!ex || ex === guild.client.user?.id) return;
    const target = entry.targetId ?? undefined;
    try {
      switch (entry.action) {
        case AuditLogEvent.MemberBanAdd:
          await this.evaluate(guild, 'antiBan', ex, { detail: `a banni <@${target}>`, undo: () => guild.members.unban(target!, 'Etho · Anti-ban : rafale annulée') });
          break;
        case AuditLogEvent.MemberKick:
          await this.evaluate(guild, 'antiKick', ex, { detail: `a expulsé <@${target}>`, undo: () => this.inviteBack(guild, target!) });
          break;
        case AuditLogEvent.MemberUpdate:
          await this.onMemberUpdateEntry(guild, entry, ex, target!);
          break;
        case AuditLogEvent.MemberDisconnect: {
          const count = Number((entry.extra as { count?: number } | null)?.count ?? 1);
          await this.evaluate(guild, 'antiDecoUser', ex, { count, detail: `a déconnecté ${count} membre${count > 1 ? 's' : ''} du vocal` });
          break;
        }
        case AuditLogEvent.MemberMove: {
          const count = Number((entry.extra as { count?: number } | null)?.count ?? 1);
          await this.evaluate(guild, 'antiDeplUser', ex, { count, detail: `a déplacé ${count} membre${count > 1 ? 's' : ''} en vocal` });
          break;
        }
        case AuditLogEvent.MemberRoleUpdate:
          await this.onMemberRoleEntry(guild, entry, ex, target!);
          break;
        case AuditLogEvent.BotAdd:
          await this.evaluate(guild, 'antiBot', ex, { detail: `a ajouté le bot <@${target}>`, undo: () => guild.members.ban(target!, { reason: 'Etho · Anti-bot' }) });
          break;
        case AuditLogEvent.ChannelCreate: {
          const ch = guild.channels.cache.get(target!);
          if (ch?.isThread()) break;
          await this.evaluate(guild, 'antiChannelCreate', ex, { channelId: ch?.parentId ?? target, detail: `a créé le salon #${ch?.name ?? target}`, undo: async () => guild.channels.cache.get(target!)?.delete('Etho · Anti-création de salon') });
          break;
        }
        case AuditLogEvent.ChannelDelete: {
          const name = String(change(entry, 'name')?.old ?? 'salon');
          await this.evaluate(guild, 'antiChannelDelete', ex, { channelId: this.channelSnaps.get(target!)?.snap.parentId ?? null, detail: `a supprimé le salon #${name}`, undo: () => this.recreateChannel(guild, target!, entry) });
          break;
        }
        case AuditLogEvent.ChannelUpdate:
          await this.onChannelUpdateEntry(guild, entry, ex, target!);
          break;
        case AuditLogEvent.ChannelOverwriteCreate:
        case AuditLogEvent.ChannelOverwriteUpdate:
        case AuditLogEvent.ChannelOverwriteDelete: {
          const ch = guild.channels.cache.get(target!) as GuildChannel | undefined;
          await this.evaluate(guild, 'antiChannelUpdate', ex, { channelId: target, detail: `a changé les permissions de #${ch?.name ?? target}`, undo: () => this.revertOverwrite(guild, entry, target!) });
          break;
        }
        case AuditLogEvent.RoleCreate:
          await this.evaluate(guild, 'antiRoleCreate', ex, { detail: `a créé le rôle @${change(entry, 'name')?.new ?? target}`, undo: async () => guild.roles.cache.get(target!)?.delete('Etho · Anti-création de rôle') });
          break;
        case AuditLogEvent.RoleDelete:
          await this.evaluate(guild, 'antiRoleDelete', ex, { detail: `a supprimé le rôle @${change(entry, 'name')?.old ?? target}`, undo: () => this.recreateRole(guild, target!, entry) });
          break;
        case AuditLogEvent.RoleUpdate:
          await this.onRoleUpdateEntry(guild, entry, ex, target!);
          break;
        case AuditLogEvent.WebhookCreate:
          await this.onWebhookCreate(guild, entry, ex, target!);
          break;
        case AuditLogEvent.WebhookUpdate:
          await this.evaluate(guild, 'antiWebhookUpdate', ex, {
            channelId: String(change(entry, 'channel_id')?.new ?? '') || null,
            detail: 'a modifié un webhook',
            undo: () => this.revertWebhook(guild, entry, target!),
          });
          break;
        case AuditLogEvent.ThreadCreate: {
          const th = guild.channels.cache.get(target!);
          await this.evaluate(guild, 'antiThreadCreate', ex, { channelId: th?.parentId ?? null, detail: `a créé le fil ${th?.name ?? ''}`.trim(), undo: async () => guild.channels.cache.get(target!)?.delete('Etho · Anti-thread') });
          break;
        }
        case AuditLogEvent.GuildUpdate:
          await this.onGuildUpdateEntry(guild, entry, ex);
          break;
        case AuditLogEvent.EmojiDelete: {
          const name = String(change(entry, 'name')?.old ?? 'emoji');
          const undo = () => this.recreateEmoji(guild, target!);
          const key = protectionStore.get(guild.id, 'antiEmojiDelete').enabled ? 'antiEmojiDelete' : 'antiExpression';
          await this.evaluate(guild, key, ex, { detail: `a supprimé l'emoji :${name}:`, undo });
          break;
        }
        case AuditLogEvent.StickerDelete:
          await this.evaluate(guild, 'antiExpression', ex, { detail: `a supprimé le sticker ${change(entry, 'name')?.old ?? ''}`.trim(), undo: () => this.recreateSticker(guild, target!) });
          break;
        case AuditLogEvent.EmojiUpdate: {
          const n = change(entry, 'name');
          if (n) await this.evaluate(guild, 'antiEmojiRename', ex, { detail: `a renommé l'emoji :${n.old}: en :${n.new}:`, undo: async () => guild.emojis.cache.get(target!)?.edit({ name: String(n.old), reason: 'Etho · Anti-renommage d’emoji' }) });
          break;
        }
        case AuditLogEvent.InviteDelete: {
          const channelId = String(change(entry, 'channel_id')?.old ?? '');
          await this.evaluate(guild, 'antiInviteDelete', ex, { channelId, detail: `a supprimé l'invitation ${change(entry, 'code')?.old ?? ''}`.trim(), undo: () => this.recreateInvite(guild, entry, channelId) });
          break;
        }
      }
    } catch (err) {
      logger.warn('[Protections] Journal d’audit :', (err as Error)?.message);
    }
  }

  private async onMemberUpdateEntry(guild: Guild, entry: GuildAuditLogsEntry, ex: string, target: string) {
    const timeout = change(entry, 'communication_disabled_until');
    if (timeout?.new && new Date(String(timeout.new)).getTime() > Date.now()) {
      await this.evaluate(guild, 'antiTimeout', ex, {
        detail: `a mis <@${target}> en timeout`,
        undo: async () => (await guild.members.fetch(target).catch(() => null))?.timeout(null, 'Etho · Anti-timeout : rafale annulée'),
      });
    }
    if (change(entry, 'mute')?.new === true) {
      await this.evaluate(guild, 'antiMuteVoc', ex, { detail: `a muté <@${target}> en vocal`, undo: async () => (await guild.members.fetch(target).catch(() => null))?.voice.setMute(false, 'Etho · Anti-mute vocal') });
    }
    if (change(entry, 'deaf')?.new === true) {
      await this.evaluate(guild, 'antiSourdineVoc', ex, { detail: `a mis <@${target}> en sourdine`, undo: async () => (await guild.members.fetch(target).catch(() => null))?.voice.setDeaf(false, 'Etho · Anti-sourdine vocal') });
    }
  }

  private watched(guild: Guild, s: ProtectionSettings, roleId: string) {
    if (s.watchedRoles?.includes(roleId)) return true;
    const role = guild.roles.cache.get(roleId);
    const perms = s.watchedPerms?.length ? s.watchedPerms : DEFAULT_WATCHED_PERMS;
    return Boolean(role && perms.some((p) => p in PermissionFlagsBits && role.permissions.has(PermissionFlagsBits[p as keyof typeof PermissionFlagsBits])));
  }

  private async onMemberRoleEntry(guild: Guild, entry: GuildAuditLogsEntry, ex: string, target: string) {
    const added = (change(entry, '$add')?.new ?? []) as { id: string; name: string }[];
    const removed = (change(entry, '$remove')?.new ?? []) as { id: string; name: string }[];
    const addS = protectionStore.get(guild.id, 'antiRoleAdd');
    const remS = protectionStore.get(guild.id, 'antiRoleRemove');
    const memberOf = () => guild.members.fetch(target).catch(() => null);
    for (const r of added) {
      if (addS.enabled && this.watched(guild, addS, r.id)) {
        await this.evaluate(guild, 'antiRoleAdd', ex, { detail: `a donné @${r.name} à <@${target}>`, undo: async () => (await memberOf())?.roles.remove(r.id, 'Etho · Anti-ajout de rôle') });
      }
      await this.evaluate(guild, 'antiRoleMass', ex, { sub: r.id, detail: `donne @${r.name} en masse`, undo: async () => (await memberOf())?.roles.remove(r.id, 'Etho · Anti-rôle de masse') });
    }
    for (const r of removed) {
      if (remS.enabled && this.watched(guild, remS, r.id)) {
        await this.evaluate(guild, 'antiRoleRemove', ex, { detail: `a retiré @${r.name} à <@${target}>`, undo: async () => (await memberOf())?.roles.add(r.id, 'Etho · Anti-retrait de rôle') });
      }
    }
  }

  private async onChannelUpdateEntry(guild: Guild, entry: GuildAuditLogsEntry, ex: string, target: string) {
    const ch = guild.channels.cache.get(target) as GuildChannel | undefined;
    const changes = entry.changes ?? [];
    const onlyName = changes.length === 1 && changes[0].key === 'name';
    const revert = (reason: string) => async () => {
      const c = guild.channels.cache.get(target) as GuildChannel | undefined;
      if (!c) return;
      const old: Record<string, unknown> = {};
      for (const x of changes) old[x.key] = x.old;
      await c.edit({
        ...(old.name !== undefined ? { name: String(old.name) } : {}),
        ...(old.topic !== undefined ? { topic: (old.topic as string | null) ?? null } : {}),
        ...(old.nsfw !== undefined ? { nsfw: Boolean(old.nsfw) } : {}),
        ...(old.rate_limit_per_user !== undefined ? { rateLimitPerUser: Number(old.rate_limit_per_user) || 0 } : {}),
        ...(old.bitrate !== undefined ? { bitrate: Number(old.bitrate) } : {}),
        ...(old.user_limit !== undefined ? { userLimit: Number(old.user_limit) || 0 } : {}),
        reason,
      } as Parameters<GuildChannel['edit']>[0]);
    };
    if (onlyName && protectionStore.get(guild.id, 'antiChannelRename').enabled) {
      await this.evaluate(guild, 'antiChannelRename', ex, { channelId: target, detail: `a renommé #${changes[0].old} en #${changes[0].new}`, undo: revert('Etho · Anti-renommage de salon') });
      return;
    }
    await this.evaluate(guild, 'antiChannelUpdate', ex, { channelId: target, detail: `a modifié #${ch?.name ?? target}`, undo: revert('Etho · Anti-modification de salon') });
  }

  private async onRoleUpdateEntry(guild: Guild, entry: GuildAuditLogsEntry, ex: string, target: string) {
    const changes = entry.changes ?? [];
    const onlyName = changes.length === 1 && changes[0].key === 'name';
    const role = guild.roles.cache.get(target);
    const revert = async () => {
      const r = guild.roles.cache.get(target);
      if (!r) return;
      const old: Record<string, unknown> = {};
      for (const x of changes) old[x.key] = x.old;
      await r.edit({
        ...(old.name !== undefined ? { name: String(old.name) } : {}),
        ...(old.color !== undefined ? { color: Number(old.color) } : {}),
        ...(old.hoist !== undefined ? { hoist: Boolean(old.hoist) } : {}),
        ...(old.mentionable !== undefined ? { mentionable: Boolean(old.mentionable) } : {}),
        ...(old.permissions !== undefined ? { permissions: BigInt(String(old.permissions)) } : {}),
        reason: 'Etho · Anti-modification de rôle',
      });
    };
    if (onlyName && protectionStore.get(guild.id, 'antiRoleRename').enabled) {
      await this.evaluate(guild, 'antiRoleRename', ex, { detail: `a renommé @${changes[0].old} en @${changes[0].new}`, undo: revert });
      return;
    }
    await this.evaluate(guild, 'antiRoleUpdate', ex, { detail: `a modifié @${role?.name ?? target}`, undo: revert });
  }

  private async onGuildUpdateEntry(guild: Guild, entry: GuildAuditLogsEntry, ex: string) {
    const changes = [...(entry.changes ?? [])];
    const name = changes.find((c) => c.key === 'name');
    const icon = changes.find((c) => c.key === 'icon_hash');
    if (name && protectionStore.get(guild.id, 'antiServerRename').enabled) {
      changes.splice(changes.indexOf(name), 1);
      await this.evaluate(guild, 'antiServerRename', ex, { detail: `a renommé le serveur en « ${name.new} »`, undo: () => guild.setName(String(name.old), 'Etho · Anti-renommage du serveur') });
    }
    if (icon && protectionStore.get(guild.id, 'antiIconUpdate').enabled) {
      changes.splice(changes.indexOf(icon), 1);
      await this.evaluate(guild, 'antiIconUpdate', ex, { detail: "a changé l'icône du serveur", undo: () => guild.setIcon(icon.old ? `https://cdn.discordapp.com/icons/${guild.id}/${icon.old}.png?size=1024` : null, 'Etho · Anti-changement d’icône') });
    }
    if (!changes.length) return;
    await this.evaluate(guild, 'antiUpdateGuild', ex, {
      detail: `a modifié le serveur (${changes.map((c) => c.key).join(', ')})`,
      undo: async () => {
        const old: Record<string, unknown> = {};
        for (const c of changes) old[c.key] = c.old;
        await guild.edit({
          ...(old.name !== undefined ? { name: String(old.name) } : {}),
          ...(old.icon_hash !== undefined ? { icon: old.icon_hash ? `https://cdn.discordapp.com/icons/${guild.id}/${old.icon_hash}.png?size=1024` : null } : {}),
          ...(old.verification_level !== undefined ? { verificationLevel: Number(old.verification_level) } : {}),
          ...(old.explicit_content_filter !== undefined ? { explicitContentFilter: Number(old.explicit_content_filter) } : {}),
          ...(old.default_message_notifications !== undefined ? { defaultMessageNotifications: Number(old.default_message_notifications) } : {}),
          ...(old.afk_channel_id !== undefined ? { afkChannel: (old.afk_channel_id as string | null) ?? null } : {}),
          ...(old.afk_timeout !== undefined ? { afkTimeout: Number(old.afk_timeout) } : {}),
          ...(old.system_channel_id !== undefined ? { systemChannel: (old.system_channel_id as string | null) ?? null } : {}),
          ...(old.description !== undefined ? { description: (old.description as string | null) ?? null } : {}),
          reason: 'Etho · Anti-modification du serveur',
        });
      },
    });
  }

  private async onWebhookCreate(guild: Guild, entry: GuildAuditLogsEntry, ex: string, target: string) {
    const s = protectionStore.get(guild.id, 'antiWebhook');
    const channelId = String(change(entry, 'channel_id')?.new ?? '') || null;
    const undo: Undo | undefined =
      s.webhookAction === 'none'
        ? undefined
        : async () => {
            if (s.webhookAction === 'recreate' && channelId) {
              const ch = guild.channels.cache.get(channelId) as GuildChannel | undefined;
              if (ch && 'clone' in ch) {
                const copy = await (ch as GuildChannel & { clone: (o: object) => Promise<GuildChannel> }).clone({ reason: 'Etho · Anti-webhook : salon recréé sans le webhook' });
                await copy.setPosition(ch.position).catch(() => {});
                await ch.delete('Etho · Anti-webhook').catch(() => {});
                return;
              }
            }
            const hooks = await guild.fetchWebhooks();
            await hooks.get(target)?.delete('Etho · Anti-webhook');
          };
    await this.evaluate(guild, 'antiWebhook', ex, { channelId, detail: `a créé un webhook${channelId ? ` dans <#${channelId}>` : ''}`, undo });
  }

  // --- Réparations -------------------------------------------------------------------------------------------------

  private async inviteBack(guild: Guild, userId: string) {
    const me = guild.members.me;
    const ch =
      (guild.systemChannel && me && guild.systemChannel.permissionsFor(me).has(PermissionFlagsBits.CreateInstantInvite) ? guild.systemChannel : null) ??
      guild.channels.cache.find((c) => c.type === ChannelType.GuildText && !!me && c.permissionsFor(me).has(PermissionFlagsBits.CreateInstantInvite));
    if (!ch || !('createInvite' in ch)) return;
    const invite = await ch.createInvite({ maxAge: 86400, maxUses: 1, unique: true, reason: 'Etho · Anti-kick : invitation de retour' });
    const user = await guild.client.users.fetch(userId);
    await user.send(`Tu as été expulsé de **${guild.name}** pendant une attaque. Voici ton invitation pour revenir : ${invite.url}`);
  }

  private async recreateChannel(guild: Guild, channelId: string, entry: GuildAuditLogsEntry) {
    await wait(1500); // laisse l'événement de suppression enregistrer l'instantané complet
    const snap = this.channelSnaps.get(channelId)?.snap;
    const name = snap?.name ?? String(change(entry, 'name')?.old ?? 'salon-restauré');
    const type = snap?.type ?? (Number(change(entry, 'type')?.old ?? ChannelType.GuildText) as ChannelType);
    const created = await guild.channels.create({
      name,
      type: type as ChannelType.GuildText,
      topic: snap?.topic ?? undefined,
      nsfw: snap?.nsfw,
      parent: snap?.parentId && guild.channels.cache.has(snap.parentId) ? snap.parentId : undefined,
      rateLimitPerUser: snap?.rateLimitPerUser,
      ...(snap?.bitrate ? { bitrate: snap.bitrate } : {}),
      ...(snap?.userLimit ? { userLimit: snap.userLimit } : {}),
      permissionOverwrites: snap?.overwrites.filter((o) => o.type !== OverwriteType.Role || guild.roles.cache.has(o.id)),
      reason: 'Etho · Anti-suppression de salon',
    });
    if (snap) await created.setPosition(snap.position).catch(() => {});
  }

  private async recreateRole(guild: Guild, roleId: string, entry: GuildAuditLogsEntry) {
    await wait(1500);
    const snap = this.roleSnaps.get(roleId)?.snap;
    const old = (k: string) => change(entry, k)?.old;
    const role = await guild.roles.create({
      name: snap?.name ?? String(old('name') ?? 'rôle-restauré'),
      color: snap?.color ?? Number(old('color') ?? 0),
      hoist: snap?.hoist ?? Boolean(old('hoist')),
      mentionable: snap?.mentionable ?? Boolean(old('mentionable')),
      permissions: snap?.permissions ?? BigInt(String(old('permissions') ?? '0')),
      reason: 'Etho · Anti-suppression de rôle',
    });
    if (snap) {
      await role.setPosition(Math.min(snap.position, (guild.members.me?.roles.highest.position ?? 1) - 1)).catch(() => {});
      for (const id of snap.memberIds) await (await guild.members.fetch(id).catch(() => null))?.roles.add(role, 'Etho · Rôle restauré').catch(() => {});
    }
  }

  private async revertOverwrite(guild: Guild, entry: GuildAuditLogsEntry, channelId: string) {
    const ch = guild.channels.cache.get(channelId) as GuildChannel | undefined;
    if (!ch || !('permissionOverwrites' in ch)) return;
    const extra = entry.extra as { id?: string } | null;
    const overwriteId = extra?.id ?? (change(entry, 'id')?.new as string | undefined) ?? (change(entry, 'id')?.old as string | undefined);
    if (!overwriteId) return;
    if (entry.action === AuditLogEvent.ChannelOverwriteCreate) {
      await ch.permissionOverwrites.delete(overwriteId, 'Etho · Anti-modification de salon');
      return;
    }
    const allow = BigInt(String(change(entry, 'allow')?.old ?? '0'));
    const deny = BigInt(String(change(entry, 'deny')?.old ?? '0'));
    const type = Number(change(entry, 'type')?.old ?? (guild.roles.cache.has(overwriteId) ? OverwriteType.Role : OverwriteType.Member)) as OverwriteType;
    const existing = ch.permissionOverwrites.cache.get(overwriteId);
    await ch.permissionOverwrites.set(
      [
        ...ch.permissionOverwrites.cache.filter((o) => o.id !== overwriteId).map((o) => ({ id: o.id, type: o.type, allow: o.allow.bitfield, deny: o.deny.bitfield })),
        { id: overwriteId, type, allow: existing && entry.action === AuditLogEvent.ChannelOverwriteUpdate && !change(entry, 'allow') ? existing.allow.bitfield : allow, deny: existing && entry.action === AuditLogEvent.ChannelOverwriteUpdate && !change(entry, 'deny') ? existing.deny.bitfield : deny },
      ],
      'Etho · Anti-modification de salon'
    );
  }

  private async revertWebhook(guild: Guild, entry: GuildAuditLogsEntry, webhookId: string) {
    const hook = (await guild.fetchWebhooks()).get(webhookId);
    if (!hook) return;
    const name = change(entry, 'name')?.old;
    const avatar = change(entry, 'avatar_hash');
    const channel = change(entry, 'channel_id')?.old;
    await hook.edit({
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(avatar ? { avatar: avatar.old ? `https://cdn.discordapp.com/avatars/${webhookId}/${avatar.old}.png` : null } : {}),
      ...(channel ? { channel: String(channel) } : {}),
      reason: 'Etho · Anti-modification de webhook',
    });
  }

  private async recreateEmoji(guild: Guild, emojiId: string) {
    await wait(1000);
    const snap = this.emojiSnaps.get(emojiId);
    if (snap) await guild.emojis.create({ attachment: snap.url, name: snap.name, reason: 'Etho · Emoji recréé' });
  }

  private async recreateSticker(guild: Guild, stickerId: string) {
    await wait(1000);
    const snap = this.stickerSnaps.get(stickerId);
    if (snap) await guild.stickers.create({ file: snap.url, name: snap.name, tags: snap.tags || 'emoji', description: snap.description ?? undefined, reason: 'Etho · Sticker recréé' });
  }

  private async recreateInvite(guild: Guild, entry: GuildAuditLogsEntry, channelId: string) {
    const ch = guild.channels.cache.get(channelId);
    if (!ch || !('createInvite' in ch)) return;
    const maxUses = Number(change(entry, 'max_uses')?.old ?? 0);
    const uses = Number(change(entry, 'uses')?.old ?? 0);
    const invite = await ch.createInvite({
      maxAge: Number(change(entry, 'max_age')?.old ?? 0),
      maxUses: maxUses ? Math.max(1, maxUses - uses) : 0,
      temporary: Boolean(change(entry, 'temporary')?.old),
      unique: true,
      reason: 'Etho · Anti-suppression d’invitation',
    });
    const s = protectionStore.get(guild.id, 'antiInviteDelete');
    const log = this.logChannel(guild, s);
    await log?.send({ content: `Invitation recréée : ${invite.url}`, allowedMentions: { parse: [] } }).catch(() => {});
  }

  // --- Instantanés (avant suppression) -----------------------------------------------------------------------------

  public snapChannel(channel: GuildBasedChannel) {
    if (channel.isThread() || !('permissionOverwrites' in channel)) return;
    const c = channel as GuildChannel & { topic?: string | null; nsfw?: boolean; rateLimitPerUser?: number; bitrate?: number; userLimit?: number };
    this.channelSnaps.set(channel.id, {
      at: Date.now(),
      snap: {
        name: c.name,
        type: c.type,
        topic: c.topic ?? null,
        nsfw: Boolean(c.nsfw),
        parentId: c.parentId,
        position: c.position,
        rateLimitPerUser: c.rateLimitPerUser ?? 0,
        bitrate: c.bitrate,
        userLimit: c.userLimit,
        overwrites: c.permissionOverwrites.cache.map((o) => ({ id: o.id, type: o.type, allow: o.allow.bitfield, deny: o.deny.bitfield })),
      },
    });
  }

  public snapRole(role: Role) {
    // Les membres gardent l'id du rôle supprimé dans leur cache tant qu'ils ne sont pas mis à jour.
    const memberIds = role.guild.members.cache.filter((m) => (m as unknown as { _roles: string[] })._roles?.includes(role.id)).map((m) => m.id);
    this.roleSnaps.set(role.id, {
      at: Date.now(),
      snap: { name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable, permissions: role.permissions.bitfield, position: role.position, unicodeEmoji: role.unicodeEmoji, memberIds },
    });
  }

  public snapEmoji(emoji: GuildEmoji) {
    this.emojiSnaps.set(emoji.id, { at: Date.now(), name: emoji.name ?? 'emoji', url: emoji.imageURL({ size: 128 }) });
  }

  public snapSticker(sticker: Sticker) {
    this.stickerSnaps.set(sticker.id, { at: Date.now(), name: sticker.name, url: sticker.url, tags: sticker.tags ?? '', description: sticker.description });
  }

  /** Réorganisation : Discord ne journalise pas l'auteur ; chaque rôle déplacé est remis à sa place (lot de 2 s). */
  public onRolePosition(oldRole: Role, newRole: Role) {
    if (oldRole.rawPosition === newRole.rawPosition) return;
    const s = protectionStore.get(newRole.guild.id, 'antiReorganisation');
    if (!s.enabled) return;
    const gid = newRole.guild.id;
    const pending = this.pendingReorder.get(gid) ?? new Map<string, number>();
    if (!pending.has(newRole.id)) pending.set(newRole.id, oldRole.rawPosition);
    this.pendingReorder.set(gid, pending);
    clearTimeout(this.reorderTimers.get(gid));
    this.reorderTimers.set(
      gid,
      setTimeout(async () => {
        const moves = this.pendingReorder.get(gid);
        this.pendingReorder.delete(gid);
        if (!moves?.size) return;
        const guild = newRole.guild;
        const me = guild.members.me;
        const fix = [...moves].filter(([id]) => {
          const r = guild.roles.cache.get(id);
          return r && me && r.comparePositionTo(me.roles.highest) < 0;
        });
        if (!fix.length) return;
        await guild.roles.setPositions(fix.map(([role, position]) => ({ role, position }))).catch((err) => logger.warn('[Protections] Réorganisation :', err?.message));
        const ch = this.logChannel(guild, s);
        await ch?.send({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setTitle('Anti-réorganisation de rôle').setDescription(`${fix.length} rôle${fix.length > 1 ? 's' : ''} remis à leur place.`).setTimestamp()] }).catch(() => {});
      }, 2000)
    );
  }

  // --- Messages ----------------------------------------------------------------------------------------------------

  public async onMessage(message: Message): Promise<void> {
    if (!message.inGuild() || message.webhookId || message.system || message.author.id === message.client.user.id) return;
    const guild = message.guild;
    const all = protectionStore.all(guild.id);
    const on = (k: string) => all[k]?.enabled;
    if (!PROTECTIONS.some((p) => p.deletesMessage && on(p.key))) return;
    const author = message.author.id;
    const member = message.member;
    const content = message.content ?? '';
    const base = { channelId: message.channelId, member };
    const del = async () => {
      if (message.deletable) await message.delete().catch(() => {});
    };
    // Supprime tout de suite, puis compte : la sanction arrive au seuil.
    const instant = async (key: string, detail: string) => {
      const s = all[key];
      if (s.wlChannels.length || s.wlCategories.length) {
        if (this.channelExempt(guild, s, message.channelId)) return false;
      }
      if (await this.exemptAuthor(guild, key, s, author, member)) return false;
      await del();
      await this.evaluate(guild, key, author, { ...base, detail });
      return true;
    };

    if (content) {
      if (on('antiScam')) {
        const why = detectScam(content);
        if (why && (await instant('antiScam', `arnaque détectée (${why})`))) return;
      }
      if (on('antiLink') && all.antiLink.enforcement !== 'automod') {
        const link = findBlockedLink(content, all.antiLink.linkTypes ?? ['general', 'discord'], all.antiLink.allowedDomains ?? []);
        if (link && (await instant('antiLink', `a publié un lien (${link.slice(0, 80)})`))) return;
      }
      if (on('antiBadWord') && all.antiBadWord.enforcement !== 'automod' && all.antiBadWord.bannedWords?.length) {
        const word = findBannedWord(content, all.antiBadWord.bannedWords);
        if (word && (await instant('antiBadWord', `a écrit un mot interdit (${word})`))) return;
      }
      if (on('antiToxicity')) {
        const score = toxicityScore(content, all.antiToxicity.ignoreUntargeted ?? true);
        if (score >= (all.antiToxicity.toxicityThreshold ?? 90) && (await instant('antiToxicity', `message toxique (${score} %)`))) return;
      }
    }
    if (on('antiMentionEveryone') && (message.mentions.everyone || /@(?:everyone|here)/.test(content)) && (await instant('antiMentionEveryone', 'a mentionné @everyone ou @here'))) return;
    if (on('antiMentionUsers')) {
      const n = message.mentions.users.filter((u) => u.id !== author).size;
      if (n > (all.antiMentionUsers.maxPerMessage ?? 5) && (await instant('antiMentionUsers', `a mentionné ${n} membres`))) return;
    }
    if (on('antiMentionRoles')) {
      const n = message.mentions.roles.size;
      if (n > (all.antiMentionRoles.maxPerMessage ?? 3) && (await instant('antiMentionRoles', `a mentionné ${n} rôles`))) return;
    }
    if (on('antiTextWall') && content) {
      const s = all.antiTextWall;
      if (isTextWall(content, s.maxChars ?? 1500, s.maxLines ?? 20, s.ignoreCodeBlocks ?? false) && (await instant('antiTextWall', 'a envoyé un pavé'))) return;
    }
    if (on('antiEmojiAbuse') && content) {
      const s = all.antiEmojiAbuse;
      const n = countEmojis(content, s.countCustom ?? true, s.countUnicode ?? true);
      if (n > (s.maxEmojis ?? 10) && (await instant('antiEmojiAbuse', `a envoyé ${n} emojis`))) return;
    }
    // Rafales : rien n'est supprimé avant le seuil, puis toute la rafale l'est.
    if (on('antiStickerAbuse') && message.stickers.size) {
      await this.evaluate(guild, 'antiStickerAbuse', author, { ...base, count: message.stickers.size, detail: 'a envoyé des stickers en rafale', undo: del });
    }
    if (on('antiDuplicateMessage') && content) {
      const s = all.antiDuplicateMessage;
      const norm = normalizeForDuplicate(content, s.matchMode ?? 'similar');
      if (norm.length >= (s.minLength ?? 2)) {
        const hk = `${guild.id}:${author}`;
        const now = Date.now();
        const hist = (this.dupHistory.get(hk) ?? []).filter((m) => now - m.at < (s.quotaSeconds ?? 30) * 1000);
        const twin = hist.find((m) => (s.matchMode === 'exact' ? m.norm === norm : similarity(m.norm, norm) >= 0.85));
        const cluster = twin?.cluster ?? message.id;
        hist.push({ id: message.id, channelId: message.channelId, norm, cluster, at: now });
        this.dupHistory.set(hk, hist.slice(-30));
        await this.evaluate(guild, 'antiDuplicateMessage', author, { ...base, sub: cluster, detail: 'a envoyé le même message en boucle', undo: del });
      }
    }
    if (on('antiSpam')) {
      const sk = `${guild.id}:${author}`;
      if ((this.spamUntil.get(sk) ?? 0) > Date.now()) {
        await del();
        return;
      }
      const punished = await this.evaluate(guild, 'antiSpam', author, { ...base, detail: 'a envoyé des messages en rafale', undo: del });
      if (punished) this.spamUntil.set(sk, Date.now() + (all.antiSpam.quotaSeconds ?? 8) * 1000);
    }
  }

  /** Auteur exempté d'office (whitelist sans seuil dédié) : le message n'est même pas supprimé. */
  private async exemptAuthor(guild: Guild, key: string, s: ProtectionSettings, userId: string, member: GuildMember | null) {
    if (userId === guild.ownerId || ownerImmunityService.isOwnerImmune(userId)) return true;
    const ethoOwner = s.ignoreEthoOwners && (guildConfigService.getConfig(guild.id).ethoOwners ?? []).includes(userId);
    const wl =
      ethoOwner ||
      (s.useGlobalWhitelist && this.isGloballyWhitelisted(guild.id, member, userId)) ||
      s.wlUsers.includes(userId) ||
      Boolean(member && s.wlRoles.some((r) => member.roles.cache.has(r)));
    return wl && (getProtection(key)?.noWhitelistLimit || s.exceptionQuotaMax == null);
  }

  public async onMessageDelete(message: Message | PartialMessage): Promise<void> {
    if (message.partial || !message.inGuild() || message.author.bot) return;
    const s = protectionStore.get(message.guild.id, 'antiGhostPing');
    if (!s.enabled) return;
    if (Date.now() - message.createdTimestamp > (s.ghostMaxAgeSeconds ?? 60) * 1000) return;
    const users = message.mentions.users.filter((u) => u.id !== message.author.id && !u.bot);
    const roles = message.mentions.roles;
    if (!users.size && !roles.size) return;
    const targets = [...users.map((u) => `<@${u.id}>`), ...roles.map((r) => `<@&${r.id}>`)];
    if (await this.exemptAuthor(message.guild, 'antiGhostPing', s, message.author.id, message.member)) return;
    if (s.ghostNotify && message.channel.isSendable()) {
      await message.channel
        .send({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription(`Ghost ping : <@${message.author.id}> a mentionné ${targets.join(', ')} puis a supprimé son message.`)], allowedMentions: { parse: [] } })
        .catch(() => {});
    }
    await this.evaluate(message.guild, 'antiGhostPing', message.author.id, { channelId: message.channelId, member: message.member, detail: `ghost ping sur ${targets.join(', ')}` });
  }

  // --- Arrivées ----------------------------------------------------------------------------------------------------

  public async onMemberAdd(member: GuildMember): Promise<void> {
    const s = protectionStore.get(member.guild.id, 'antiAlt');
    if (!s.enabled || member.user.bot) return;
    const ageDays = (Date.now() - member.user.createdTimestamp) / 86400_000;
    if (ageDays >= (s.minAccountAgeDays ?? 7)) return;
    const days = Math.max(0, Math.floor(ageDays));
    await this.evaluate(member.guild, 'antiAlt', member.id, {
      member,
      detail: `compte créé il y a ${days} jour${days > 1 ? 's' : ''}`,
      undo: () =>
        member.send(s.dmMessage?.trim() || `Désolé, ton compte Discord est trop récent pour rejoindre **${member.guild.name}**. Reviens dans quelques jours.`),
    });
  }

  // --- Rollback & Backups ------------------------------------------------------------------------------------------

  private async runBackups() {
    if (!this.client?.isReady()) return;
    const { BackupCollectorService } = await import('../backup/services/backupCollectorService.js');
    const { backupRepository } = await import('../backup/storage/backupRepository.js');
    for (const guild of this.client.guilds.cache.values()) {
      const s = protectionStore.get(guild.id, 'rollback');
      if (!s.enabled) continue;
      const last = protectionStore.getLastBackupAt(guild.id);
      if (last && Date.now() - new Date(last).getTime() < (s.backupIntervalHours ?? 24) * 3600_000) continue;
      try {
        const snapshot = await BackupCollectorService.createSnapshot({
          guild,
          guildId: guild.id,
          name: `Rollback — ${new Date().toLocaleString('fr-FR')}`,
          description: 'Capture automatique (protection Rollback & Backups)',
          type: 'FULL',
          isProtected: false,
          creator: { id: 'bot', tag: 'Etho · Rollback' },
        });
        backupRepository.save(snapshot);
        backupRepository.pruneExpired(guild.id);
        protectionStore.setLastBackupAt(guild.id, new Date().toISOString());
      } catch (err) {
        logger.warn(`[Protections] Capture du serveur ${guild.id} impossible :`, (err as Error)?.message);
      }
    }
  }

  /** Capture immédiate (bouton « Capturer maintenant » de la console). */
  public async backupNow(guild: Guild): Promise<string> {
    const { BackupCollectorService } = await import('../backup/services/backupCollectorService.js');
    const { backupRepository } = await import('../backup/storage/backupRepository.js');
    const snapshot = await BackupCollectorService.createSnapshot({
      guild,
      guildId: guild.id,
      name: `Rollback — ${new Date().toLocaleString('fr-FR')}`,
      description: 'Capture manuelle depuis la console',
      type: 'FULL',
      isProtected: false,
      creator: { id: 'bot', tag: 'Etho · Rollback' },
    });
    backupRepository.save(snapshot);
    protectionStore.setLastBackupAt(guild.id, new Date().toISOString());
    return snapshot.backupId;
  }
}

export const protectionEngine = new ProtectionEngine();
