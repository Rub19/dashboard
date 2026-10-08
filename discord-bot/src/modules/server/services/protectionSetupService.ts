import type { Guild } from 'discord.js';
import { raidRepository } from '../../antiRaid/storage/raidRepository.js';
import { securityStorage } from '../../security/storage/securityStorage.js';
import { autoModRepository } from '../../automod/storage/autoModRepository.js';
import { auditRepository } from '../../logs/storage/auditRepository.js';
import { isModuleEnabled, setModuleEnabled } from '../../../services/moduleRegistry.js';
import type { RaidAction } from '../../antiRaid/types/antiRaid.js';
import type { AutoModConfig } from '../../automod/types/autoMod.js';

/**
 * Configuration assistée, calquée sur Keeper : un type de serveur choisit les protections, une sévérité choisit
 * la sanction selon la catégorie d'abus, et un salon reçoit les alertes. Seules les protections qu'Etho sait
 * vraiment faire sont proposées ; les protections vocales de Keeper sont listées comme indisponibles.
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
  category: 'Sanctions' | 'Salons' | 'Rôles' | 'Bots' | 'Arrivées' | 'Messages' | 'Vocal';
  sanction: string;
  status: PlanStatus;
}
export interface SetupInput {
  serverType: ServerType;
  severity: Severity;
  alertChannelId: string | null;
  overwrite: boolean;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

type AutoModDetector = 'links' | 'invites' | 'mentions' | 'ghostPing' | 'flood' | 'spam' | 'emojis';

interface Protection {
  id: string;
  label: string;
  category: PlanItem['category'];
  /** Activée et réglée sur ce niveau ? */
  isActive: (g: string) => boolean;
  matches: (g: string, s: Severity) => boolean;
  sanction: (s: Severity) => string;
  apply: (g: string, s: Severity) => void;
}

// --- Sanctions par catégorie ------------------------------------------------------------------------------------

const nukeAction = (s: Severity) => (s === 'watch' ? 'alert' : s === 'balanced' ? 'strip_roles' : 'ban') as 'alert' | 'strip_roles' | 'ban';
const nukeLabel = (s: Severity) => (s === 'watch' ? 'Alerte seulement' : s === 'balanced' ? 'Retire les rôles' : 'Bannit');
const messageRaidActions = (s: Severity): RaidAction[] => (s === 'watch' ? ['ALERT_STAFF'] : ['DELETE', 'TIMEOUT', 'ALERT_STAFF']);
const messageTimeout = (s: Severity) => (s === 'strict' ? 3600 : 600);
const messageLabel = (s: Severity) => (s === 'watch' ? 'Alerte seulement' : s === 'strict' ? 'Supprime + timeout 1 h' : 'Supprime + timeout 10 min');
const joinActions = (s: Severity): RaidAction[] => (s === 'watch' ? ['ALERT_STAFF'] : ['KICK', 'ALERT_STAFF']);
const joinLabel = (s: Severity) => (s === 'watch' ? 'Alerte seulement' : 'Expulse');
const botActions = (s: Severity): RaidAction[] => (s === 'watch' ? ['ALERT_STAFF'] : s === 'balanced' ? ['KICK', 'ALERT_STAFF'] : ['BAN', 'ALERT_STAFF']);
const botLabel = (s: Severity) => (s === 'watch' ? 'Alerte seulement' : s === 'balanced' ? 'Expulse le bot' : 'Bannit le bot');
const automodActions = (s: Severity): AutoModConfig['links']['actions'] => (s === 'watch' ? ['LOG', 'ALERT_STAFF'] : ['DELETE', 'TIMEOUT', 'ALERT_STAFF']);

// --- Protections Etho -------------------------------------------------------------------------------------------

const antiNukePart = (
  id: string,
  label: string,
  category: PlanItem['category'],
  flag?: 'blockUnknownWebhooks' | 'alertOnDangerousPermissions'
): Protection => ({
  id,
  label,
  category,
  isActive: (g) => isModuleEnabled(g, 'anti-nuke') && (!flag || securityStorage.getConfig(g).antiNuke[flag]),
  matches: (g, s) => securityStorage.getConfig(g).antiNuke.action === nukeAction(s),
  sanction: nukeLabel,
  apply: (g, s) => {
    const current = securityStorage.getConfig(g).antiNuke;
    securityStorage.updateConfig(g, { antiNuke: { ...current, enabled: true, action: nukeAction(s), ...(flag ? { [flag]: true } : {}) } });
    setModuleEnabled(g, 'anti-nuke', true, 'DASHBOARD');
  },
});

type RaidBlock = 'joinRaid' | 'messageRaid' | 'mentionRaid' | 'botRaid';
const raidPart = (
  id: string,
  label: string,
  category: PlanItem['category'],
  block: RaidBlock,
  actions: (s: Severity) => RaidAction[],
  sanction: (s: Severity) => string,
  extra?: (s: Severity) => Record<string, unknown>
): Protection => ({
  id,
  label,
  category,
  isActive: (g) => isModuleEnabled(g, 'security') && raidRepository.getConfig(g)[block].enabled,
  matches: (g, s) => sameSet(raidRepository.getConfig(g)[block].actions, actions(s)),
  sanction,
  apply: (g, s) => {
    raidRepository.updateConfig(g, { [block]: { ...raidRepository.getConfig(g)[block], enabled: true, actions: actions(s), ...(extra?.(s) ?? {}) } } as any);
    setModuleEnabled(g, 'security', true, 'DASHBOARD');
  },
});

const accountAge: Protection = {
  id: 'account-age',
  label: 'Comptes créés très récemment',
  category: 'Arrivées',
  isActive: (g) => isModuleEnabled(g, 'security') && raidRepository.getConfig(g).accountAge.enabled,
  matches: (g, s) => sameSet(raidRepository.getConfig(g).accountAge.tiers[0]?.actions ?? [], joinActions(s)),
  sanction: joinLabel,
  apply: (g, s) => {
    const current = raidRepository.getConfig(g).accountAge;
    const tiers = current.tiers.length ? current.tiers : [{ ageThresholdHours: 1, actions: [], tagRole: null }];
    raidRepository.updateConfig(g, { accountAge: { ...current, enabled: true, tiers: [{ ...tiers[0], actions: joinActions(s) }, ...tiers.slice(1)] } });
    setModuleEnabled(g, 'security', true, 'DASHBOARD');
  },
};

const automodPart = (id: string, label: string, detector: AutoModDetector): Protection => ({
  id,
  label,
  category: 'Messages',
  isActive: (g) => isModuleEnabled(g, 'automod') && autoModRepository.getConfig(g)[detector].enabled,
  matches: (g, s) => {
    const cfg = autoModRepository.getConfig(g);
    return sameSet(cfg[detector].actions, automodActions(s)) && (s === 'watch' || cfg.timeoutSeconds === messageTimeout(s));
  },
  sanction: messageLabel,
  apply: (g, s) => {
    const cfg = autoModRepository.getConfig(g);
    autoModRepository.updateConfig(g, {
      enabled: true,
      ...(s === 'watch' ? {} : { timeoutSeconds: messageTimeout(s) }),
      [detector]: { ...cfg[detector], enabled: true, actions: automodActions(s) },
    } as Partial<AutoModConfig>);
    setModuleEnabled(g, 'automod', true, 'DASHBOARD');
  },
});

/** Base de Keeper (« Entre amis ») transposée sur Etho. */
const CORE: Protection[] = [
  antiNukePart('nuke-sanctions', 'Bans et expulsions en série', 'Sanctions'),
  antiNukePart('nuke-channels', 'Création et suppression de salons en série', 'Salons'),
  antiNukePart('nuke-roles', 'Rôles supprimés, créés ou rendus dangereux', 'Rôles', 'alertOnDangerousPermissions'),
  antiNukePart('nuke-webhooks', 'Webhooks inconnus', 'Bots', 'blockUnknownWebhooks'),
  raidPart('bot-raid', 'Bots ajoutés sans autorisation', 'Bots', 'botRaid', botActions, botLabel),
  raidPart('message-raid', 'Spam', 'Messages', 'messageRaid', messageRaidActions, messageLabel, (s) => ({ timeoutDurationSeconds: messageTimeout(s) })),
  raidPart('mention-raid', 'Mentions @everyone et mentions de masse', 'Messages', 'mentionRaid', messageRaidActions, messageLabel, () => ({ blockEveryoneHere: true })),
];

/** Ajouts de Keeper pour une communauté ouverte. */
const COMMUNITY: Protection[] = [
  raidPart('join-raid', 'Arrivées massives', 'Arrivées', 'joinRaid', joinActions, joinLabel),
  accountAge,
  automodPart('automod-links', 'Liens', 'links'),
  automodPart('automod-invites', 'Invitations Discord', 'invites'),
  automodPart('automod-mentions', 'Mentions d\'utilisateurs et de rôles', 'mentions'),
  automodPart('automod-ghostping', 'Ghost ping', 'ghostPing'),
  automodPart('automod-flood', 'Pavés de texte et caractères répétés', 'flood'),
  automodPart('automod-spam', 'Messages en double', 'spam'),
  automodPart('automod-emojis', 'Abus d\'émojis', 'emojis'),
];

/** Protections vocales de Keeper (grosse communauté) : Etho ne les a pas encore. */
const VOICE_UNAVAILABLE = [
  ['voice-mute', 'Mutes en série'],
  ['voice-deafen', 'Sourdines en série'],
  ['voice-disconnect', 'Déconnexions forcées en série'],
  ['voice-move', 'Déplacements forcés en série'],
] as const;

function protectionsFor(type: ServerType): Protection[] {
  return type === 'friends' ? CORE : [...CORE, ...COMMUNITY];
}

export function planProtectionSetup(guild: Guild, input: SetupInput): PlanItem[] {
  const items: PlanItem[] = protectionsFor(input.serverType).map((p) => {
    const active = p.isActive(guild.id);
    const status: PlanStatus = !active ? 'enable' : p.matches(guild.id, input.severity) ? 'already' : input.overwrite ? 'update' : 'already';
    return { id: p.id, label: p.label, category: p.category, sanction: p.sanction(input.severity), status };
  });
  if (input.serverType === 'large') {
    for (const [id, label] of VOICE_UNAVAILABLE) items.push({ id, label, category: 'Vocal', sanction: 'Pas encore disponible sur Etho', status: 'unavailable' });
  }
  return items;
}

export function applyProtectionSetup(guild: Guild, input: SetupInput): PlanItem[] {
  const plan = planProtectionSetup(guild, input);
  const toApply = new Set(plan.filter((i) => i.status === 'enable' || i.status === 'update').map((i) => i.id));
  for (const p of protectionsFor(input.serverType)) if (toApply.has(p.id)) p.apply(guild.id, input.severity);

  // Salon des alertes : là où les protections écrivent (logs « Modération »), plus les alertes anti-raid et AutoMod.
  if (input.alertChannelId) {
    const audit = auditRepository.getConfig(guild.id);
    auditRepository.updateConfig(guild.id, { enabled: true, routing: { ...audit.routing, moderationChannelId: input.alertChannelId } });
    setModuleEnabled(guild.id, 'logs', true, 'DASHBOARD');
    const raid = raidRepository.getConfig(guild.id);
    raidRepository.updateConfig(guild.id, { alerts: { ...raid.alerts, channelId: input.alertChannelId } });
    if (isModuleEnabled(guild.id, 'automod')) autoModRepository.updateConfig(guild.id, { alertChannelId: input.alertChannelId });
  }
  return planProtectionSetup(guild, input);
}
