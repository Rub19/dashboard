import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PROTECTIONS, getProtection, type Punish } from './catalog.js';
import { raidConfigService } from '../antiRaid/services/raidConfigService.js';
import { securityStorage } from '../security/storage/securityStorage.js';
import { logger } from '../../utils/logger.js';

const id = z.string().regex(/^\d{5,25}$/);
const ids = z.array(id).max(100);

/** Réglages communs à toutes les protections + réglages propres (facultatifs). Tout est borné : le corps vient du web. */
export const ProtectionSettingsSchema = z.object({
  enabled: z.boolean(),
  quotaMax: z.number().int().min(1).max(1000).optional(),
  quotaSeconds: z.number().int().min(1).max(7 * 86400).optional(),
  punish: z.enum(['none', 'timeout', 'derank', 'kick', 'ban']),
  timeoutSeconds: z.number().int().min(5).max(28 * 86400).default(600),
  lockdown: z.boolean().default(false),
  logChannelId: id.nullable().default(null),
  mentionRoleIds: ids.default([]),
  mentionEveryone: z.boolean().default(false),
  logMode: z.enum(['abuse', 'all']).default('abuse'),
  notifyOwner: z.boolean().default(false),
  ignoreEthoOwners: z.boolean().default(true),
  useGlobalWhitelist: z.boolean().default(true),
  exceptionQuotaMax: z.number().int().min(1).max(1000).nullable().default(null),
  exceptionQuotaSeconds: z.number().int().min(1).max(7 * 86400).nullable().default(null),
  wlUsers: ids.default([]),
  wlRoles: ids.default([]),
  wlChannels: ids.default([]),
  wlCategories: ids.default([]),
  // Propres
  watchedPerms: z.array(z.string().max(40)).max(40).optional(),
  watchedRoles: ids.optional(),
  webhookAction: z.enum(['delete', 'recreate', 'none']).optional(),
  linkTypes: z.array(z.enum(['general', 'discord', 'images'])).max(3).optional(),
  allowedDomains: z.array(z.string().max(100)).max(100).optional(),
  enforcement: z.enum(['bot', 'automod']).optional(),
  bannedWords: z.array(z.string().min(1).max(60)).max(500).optional(),
  toxicityThreshold: z.number().int().min(10).max(100).optional(),
  ignoreUntargeted: z.boolean().optional(),
  maxPerMessage: z.number().int().min(1).max(50).optional(),
  ghostMaxAgeSeconds: z.number().int().min(5).max(3600).optional(),
  ghostNotify: z.boolean().optional(),
  maxChars: z.number().int().min(50).max(4000).optional(),
  maxLines: z.number().int().min(2).max(200).optional(),
  ignoreCodeBlocks: z.boolean().optional(),
  matchMode: z.enum(['similar', 'exact']).optional(),
  minLength: z.number().int().min(1).max(200).optional(),
  maxEmojis: z.number().int().min(1).max(100).optional(),
  countCustom: z.boolean().optional(),
  countUnicode: z.boolean().optional(),
  minAccountAgeDays: z.number().int().min(1).max(365).optional(),
  dmMessage: z.string().max(500).optional(),
  backupIntervalHours: z.number().int().min(1).max(168).optional(),
});
export type ProtectionSettings = z.infer<typeof ProtectionSettingsSchema>;

interface GuildProtections {
  settings: Record<string, ProtectionSettings>;
  /** Permissions des rôles avant « Verrouiller le serveur », pour lever le verrouillage. */
  lockdown: { at: string; reason: string; roles: Record<string, string> } | null;
  lastBackupAt: string | null;
}

/** Réglages par défaut d'une protection : désactivée (le bot reste passif tant qu'on ne choisit rien). */
export function defaultSettings(key: string): ProtectionSettings {
  const def = getProtection(key);
  return ProtectionSettingsSchema.parse({ enabled: false, punish: 'none', ...(def?.defaults ?? {}) });
}

class ProtectionStore {
  private file = path.resolve(process.cwd(), 'data', 'protections.json');
  private data = new Map<string, GuildProtections>();

  constructor() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf-8')) as Record<string, GuildProtections>;
        for (const [gid, g] of Object.entries(raw)) this.data.set(gid, { settings: g.settings ?? {}, lockdown: g.lockdown ?? null, lastBackupAt: g.lastBackupAt ?? null });
      }
    } catch (err) {
      logger.error('[Protections] Lecture de protections.json impossible :', err);
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.data), null, 2), 'utf-8');
      fs.renameSync(tmp, this.file);
    } catch (err) {
      logger.error('[Protections] Écriture de protections.json impossible :', err);
    }
  }

  private guild(guildId: string): GuildProtections {
    let g = this.data.get(guildId);
    if (!g) {
      g = { settings: this.migrate(guildId), lockdown: null, lastBackupAt: null };
      this.data.set(guildId, g);
    }
    return g;
  }

  /**
   * Premier passage sur un serveur : reprend l'ancien anti-nuke et les volets de l'anti-raid que les protections
   * remplacent (spam, mentions, bots, comptes récents, destruction et sanctions en masse), puis coupe ces volets pour
   * qu'une même action ne soit jamais sanctionnée deux fois. L'anti-raid garde les arrivées en masse et le mode raid.
   */
  private migrate(guildId: string): Record<string, ProtectionSettings> {
    const out: Record<string, ProtectionSettings> = {};
    const on = (key: string, patch: Partial<ProtectionSettings>) => {
      out[key] = { ...(out[key] ?? defaultSettings(key)), enabled: true, ...patch };
    };
    try {
      const nuke = securityStorage.getConfig(guildId).antiNuke;
      const punish = nuke.action === 'ban' ? 'ban' : nuke.action === 'strip_roles' ? 'derank' : 'none';
      const map: [string, boolean | undefined, number][] = [
        ['antiBan', nuke.protections?.bans, nuke.maxBans],
        ['antiChannelDelete', nuke.protections?.channelDeletes, nuke.maxChannelDeletes],
        ['antiRoleDelete', nuke.protections?.roleDeletes, nuke.maxRoleDeletes],
      ];
      for (const [key, enabled, max] of map) {
        if (nuke.enabled && enabled !== false) on(key, { punish, quotaMax: max, quotaSeconds: nuke.timeWindowSeconds });
      }
    } catch {
      /* pas d'ancien anti-nuke */
    }
    try {
      const raid = raidConfigService.getConfig(guildId);
      if (raid.enabled) {
        const strongest = (actions: string[]) => (actions.includes('BAN') ? 'ban' : actions.includes('KICK') ? 'kick' : actions.includes('TIMEOUT') ? 'timeout' : 'none') as Punish;
        const m = raid.messageRaid;
        if (m.enabled) on('antiSpam', { quotaMax: m.maxMessagesPerUser, quotaSeconds: m.timeWindowSeconds, punish: strongest(m.actions), timeoutSeconds: m.timeoutDurationSeconds });
        const mn = raid.mentionRaid;
        if (mn.enabled) {
          on('antiMentionUsers', { maxPerMessage: mn.maxMentionsPerMessage, quotaMax: 1, punish: strongest(mn.actions) });
          if (mn.blockEveryoneHere) on('antiMentionEveryone', { punish: strongest(mn.actions) });
        }
        if (raid.botRaid.enabled && raid.botRaid.blockUnwhitelistedBots) on('antiBot', { punish: 'none' });
        if (raid.accountAge.enabled && raid.accountAge.tiers.length) {
          const hours = Math.max(...raid.accountAge.tiers.map((t) => t.ageThresholdHours));
          on('antiAlt', { minAccountAgeDays: Math.max(1, Math.ceil(hours / 24)), punish: strongest(raid.accountAge.tiers.flatMap((t) => t.actions)) });
        }
        const n = raid.serverNuke;
        if (n.enabled) {
          on('antiChannelDelete', { quotaMax: n.maxChannelDeletes, quotaSeconds: n.timeWindowSeconds, lockdown: true });
          on('antiChannelCreate', { quotaMax: n.maxChannelCreates, quotaSeconds: n.timeWindowSeconds, lockdown: true });
          on('antiRoleDelete', { quotaMax: n.maxRoleDeletes, quotaSeconds: n.timeWindowSeconds, lockdown: true });
          on('antiRoleCreate', { quotaMax: n.maxRoleCreates, quotaSeconds: n.timeWindowSeconds, lockdown: true });
        }
        if (raid.massMod.enabled) {
          on('antiBan', { quotaMax: raid.massMod.maxBans, quotaSeconds: raid.massMod.timeWindowSeconds });
          on('antiKick', { quotaMax: raid.massMod.maxKicks, quotaSeconds: raid.massMod.timeWindowSeconds });
        }
      }
      raidConfigService.updateConfig(guildId, {
        messageRaid: { ...raid.messageRaid, enabled: false },
        mentionRaid: { ...raid.mentionRaid, enabled: false },
        botRaid: { ...raid.botRaid, enabled: false },
        accountAge: { ...raid.accountAge, enabled: false },
        serverNuke: { ...raid.serverNuke, enabled: false },
        massMod: { ...raid.massMod, enabled: false },
      });
    } catch (err) {
      logger.warn('[Protections] Reprise de l’anti-raid impossible :', (err as Error)?.message);
    }
    return out;
  }

  public startFresh(guildId: string) {
    if (this.data.has(guildId)) return;
    this.data.set(guildId, { settings: {}, lockdown: null, lastBackupAt: null });
    this.save();
  }

  /** Migre tous les serveurs connus au démarrage, avant que l'anti-raid ne traite le moindre événement. */
  public ensure(guildIds: Iterable<string>) {
    let changed = false;
    for (const gid of guildIds) {
      if (this.data.has(gid)) continue;
      this.guild(gid);
      changed = true;
    }
    if (changed) this.save();
  }

  public get(guildId: string, key: string): ProtectionSettings {
    const stored = this.guild(guildId).settings[key];
    return stored ? { ...defaultSettings(key), ...stored } : defaultSettings(key);
  }

  public all(guildId: string): Record<string, ProtectionSettings> {
    return Object.fromEntries(PROTECTIONS.map((p) => [p.key, this.get(guildId, p.key)]));
  }

  public update(guildId: string, key: string, patch: Partial<ProtectionSettings>): ProtectionSettings {
    const next = ProtectionSettingsSchema.parse({ ...this.get(guildId, key), ...patch });
    this.guild(guildId).settings[key] = next;
    this.save();
    return next;
  }

  public getLockdown(guildId: string) {
    return this.guild(guildId).lockdown;
  }
  public setLockdown(guildId: string, value: GuildProtections['lockdown']) {
    this.guild(guildId).lockdown = value;
    this.save();
  }
  public getLastBackupAt(guildId: string) {
    return this.guild(guildId).lastBackupAt;
  }
  public setLastBackupAt(guildId: string, iso: string) {
    this.guild(guildId).lastBackupAt = iso;
    this.save();
  }
}

export const protectionStore = new ProtectionStore();
