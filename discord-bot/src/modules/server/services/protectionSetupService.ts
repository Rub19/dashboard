import type { Guild } from 'discord.js';
import { raidRepository } from '../../antiRaid/storage/raidRepository.js';
import { protectionStore } from '../../protections/protectionStore.js';
import { getProtection, type Punish } from '../../protections/catalog.js';
import { autoModRepository } from '../../automod/storage/autoModRepository.js';
import { auditRepository } from '../../logs/storage/auditRepository.js';
import { isModuleEnabled, setModuleEnabled } from '../../../services/moduleRegistry.js';
import { nativeAutomodService } from '../../nativeAutomod/services/nativeAutomodService.js';

/**
 * Configuration assistée, calquée sur Keeper : un type de serveur choisit les protections, une sévérité choisit
 * la sanction selon la catégorie d'abus, et un salon reçoit les alertes. Les protections sont celles du catalogue
 * (modules/protections/catalog.ts), toutes disponibles.
 *
 * Sévérité (comme Keeper) :
 *  - surveillance : aucune sanction, alerte seulement ;
 *  - équilibré : messages → timeout 10 min, arrivées → expulsion, le reste (staff, salons, rôles, bots) → retrait des rôles ;
 *  - strict : messages → timeout 1 h, arrivées → expulsion, le reste → bannissement.
 */

export type ServerType = 'community' | 'friends' | 'large';
export type Severity = 'watch' | 'balanced' | 'strict';
export type PlanStatus = 'enable' | 'update' | 'already' | 'unavailable';
export interface PlanItem {
  id: string;
  label: string;
  category: string;
  sanction: string;
  status: PlanStatus;
}
export interface SetupInput {
  serverType: ServerType;
  severity: Severity;
  alertChannelId: string | null;
  overwrite: boolean;
}

// --- Protections (catalogue unique, voir modules/protections) ----------------------------------------------------

type Tier = 'messages' | 'arrivals' | 'staff';
const MESSAGE_KEYS = new Set(['antiSpam', 'antiMentionEveryone', 'antiMentionUsers', 'antiMentionRoles', 'antiGhostPing', 'antiTextWall', 'antiDuplicateMessage', 'antiEmojiAbuse', 'antiLink', 'antiScam', 'antiMuteVoc', 'antiSourdineVoc', 'antiDecoUser', 'antiDeplUser']);
const tierOf = (key: string): Tier => (key === 'antiAlt' ? 'arrivals' : MESSAGE_KEYS.has(key) ? 'messages' : 'staff');

/** Sanction par sévérité (comme Keeper) : messages → timeout, arrivées → expulsion, le reste → rôles retirés ou ban. */
function sanctionFor(key: string, s: Severity): { punish: Punish; timeoutSeconds?: number; label: string } {
  if (key === 'antiScam') return { punish: 'none', label: 'Supprime le message' };
  if (s === 'watch') return { punish: 'none', label: 'Alerte seulement' };
  const tier = tierOf(key);
  if (tier === 'messages') return s === 'strict' ? { punish: 'timeout', timeoutSeconds: 3600, label: 'Timeout 1 h' } : { punish: 'timeout', timeoutSeconds: 600, label: 'Timeout 10 min' };
  if (tier === 'arrivals') return { punish: 'kick', label: 'Expulse' };
  return s === 'strict' ? { punish: 'ban', label: 'Bannit' } : { punish: 'derank', label: 'Retire les rôles' };
}

/** Base de Keeper (« Entre amis »). */
const CORE = ['antiBan', 'antiKick', 'antiTimeout', 'antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate', 'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate', 'antiRoleAdd', 'antiRoleMass', 'antiBot', 'antiWebhook', 'antiWebhookUpdate', 'antiUpdateGuild', 'antiSpam', 'antiMentionEveryone', 'antiScam'];
/** Ajouts pour une communauté ouverte. */
const COMMUNITY = ['antiLink', 'antiMentionUsers', 'antiMentionRoles', 'antiGhostPing', 'antiTextWall', 'antiDuplicateMessage', 'antiEmojiAbuse', 'antiAlt'];
/** Ajouts pour une grosse communauté. */
const LARGE = ['antiMuteVoc', 'antiSourdineVoc', 'antiDecoUser', 'antiDeplUser', 'antiThreadCreate', 'antiExpression'];

function protectionsFor(type: ServerType): string[] {
  return type === 'friends' ? CORE : type === 'community' ? [...CORE, ...COMMUNITY] : [...CORE, ...COMMUNITY, ...LARGE];
}

/** Règles AutoMod de Discord posées par Etho (langage, spam, mentions) : bloquées par Discord avant publication. */
const NATIVE_TRIGGERS = ['keyword_preset', 'spam', 'mention_spam'] as const;
const NATIVE_ID = 'discord-automod';
const wantsNative = (input: SetupInput) => input.serverType !== 'friends' && input.severity !== 'watch';

async function nativeRulesPresent(guild: Guild): Promise<boolean | null> {
  if (typeof (guild as any).autoModerationRules?.fetch !== 'function') return null;
  const rules = await nativeAutomodService.list(guild).catch(() => null);
  if (!rules) return null;
  const present = new Set(rules.map((r) => r.triggerType));
  return NATIVE_TRIGGERS.every((t) => present.has(t));
}

export async function planProtectionSetup(guild: Guild, input: SetupInput): Promise<PlanItem[]> {
  const items: PlanItem[] = protectionsFor(input.serverType).map((key) => {
    const def = getProtection(key)!;
    const current = protectionStore.get(guild.id, key);
    const want = sanctionFor(key, input.severity);
    const matches = current.punish === want.punish && (want.punish !== 'timeout' || current.timeoutSeconds === want.timeoutSeconds);
    const status: PlanStatus = !current.enabled ? 'enable' : matches ? 'already' : input.overwrite ? 'update' : 'already';
    return { id: key, label: def.label, category: def.category, sanction: want.label, status };
  });
  if (wantsNative(input)) {
    const present = await nativeRulesPresent(guild);
    if (present !== null) {
      items.push({
        id: NATIVE_ID,
        label: 'Règles AutoMod de Discord (langage, spam, mentions)',
        category: 'Messages',
        sanction: 'Bloque le message avant publication',
        status: present ? 'already' : 'enable',
      });
    }
  }
  return items;
}

export async function applyProtectionSetup(guild: Guild, input: SetupInput): Promise<PlanItem[]> {
  const plan = await planProtectionSetup(guild, input);
  const toApply = new Set(plan.filter((i) => i.status === 'enable' || i.status === 'update').map((i) => i.id));
  for (const key of protectionsFor(input.serverType)) {
    if (!toApply.has(key)) continue;
    const { punish, timeoutSeconds } = sanctionFor(key, input.severity);
    protectionStore.update(guild.id, key, { enabled: true, punish, ...(timeoutSeconds ? { timeoutSeconds } : {}), ...(input.alertChannelId ? { logChannelId: input.alertChannelId } : {}) });
  }
  if (toApply.size) setModuleEnabled(guild.id, 'anti-nuke', true, 'DASHBOARD');
  if (toApply.has(NATIVE_ID)) {
    // Discord n'accepte qu'une règle par type : celles qui existent déjà sont laissées telles quelles.
    await nativeAutomodService.createRecommended(guild, {
      alertChannelId: input.alertChannelId ?? undefined,
      reason: 'Configuration assistée Etho',
    });
  }

  // Salon des alertes : là où les protections écrivent (logs « Modération »), plus les alertes anti-raid et AutoMod.
  if (input.alertChannelId) {
    const audit = auditRepository.getConfig(guild.id);
    auditRepository.updateConfig(guild.id, { enabled: true, routing: { ...audit.routing, moderationChannelId: input.alertChannelId } });
    setModuleEnabled(guild.id, 'logs', true, 'DASHBOARD');
    const raid = raidRepository.getConfig(guild.id);
    raidRepository.updateConfig(guild.id, { alerts: { ...raid.alerts, channelId: input.alertChannelId } });
    // Protections déjà actives sans salon de log : elles prennent celui-ci.
    for (const [key, ps] of Object.entries(protectionStore.all(guild.id))) if (ps.enabled && !ps.logChannelId) protectionStore.update(guild.id, key, { logChannelId: input.alertChannelId });
    if (isModuleEnabled(guild.id, 'automod')) autoModRepository.updateConfig(guild.id, { alertChannelId: input.alertChannelId });
  }
  return planProtectionSetup(guild, input);
}
