import fs from 'fs';
import path from 'path';
import { raidRepository } from '../modules/antiRaid/storage/raidRepository.js';
import { securityStorage } from '../modules/security/storage/securityStorage.js';
import { autoModRepository } from '../modules/automod/storage/autoModRepository.js';
import { logStorage } from '../modules/logs/storage/logStorage.js';
import { welcomeRepository } from '../modules/welcome/storage/welcomeRepository.js';
import { autoRoleService } from '../modules/roles/services/autoRoleService.js';
import { levelingStorage } from '../modules/leveling/storage/levelingStorage.js';
import { suggestionStorage } from '../modules/suggestions/storage/suggestionStorage.js';
import { starboardStorage } from '../modules/starboard/storage/starboardStorage.js';
import { birthdayStorage } from '../modules/birthdays/storage/birthdayStorage.js';
import { economyStorage } from '../modules/economy/storage/economyStorage.js';
import { afkStorage } from '../modules/afk/storage/afkStorage.js';
import { countingStorage } from '../modules/counting/storage/countingStorage.js';
import { statsStorage } from '../modules/stats/storage/statsStorage.js';
import { statrolesStorage } from '../modules/statroles/storage/statrolesStorage.js';
import { serverStatsStorage } from '../modules/serverStats/storage/serverStatsStorage.js';
import { ticketRepository } from '../modules/tickets/storage/ticketRepository.js';
import { emitConfigUpdated } from './syncConfigEmitter.js';
import { logger } from '../utils/logger.js';

/**
 * Registre central des modules du bot : UNE source de vérité pour « ce module est-il actif sur ce serveur ? ».
 *
 * - `isModuleEnabled` / `setModuleEnabled` sont utilisés par le dashboard (interrupteur du hub), par la commande
 *   `/module` et par le filtre commun qui bloque les commandes d'un module désactivé (voir moduleGate.ts).
 * - Les identifiants sont ceux du hub du dashboard (app/discord/page.tsx).
 * - Un module qui a déjà son propre interrupteur (`enabled` dans sa configuration) le garde : on le lit et on l'écrit,
 *   pour que dashboard, commande Discord et comportement réel ne divergent jamais. Les autres modules utilisent un
 *   interrupteur enregistré ici (data/module_switches.json), actif par défaut.
 */

export interface ModuleDef {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Noms des commandes (slash ou préfixe) qui appartiennent à ce module. */
  commands: string[];
  /** Interrupteur propre du module, s'il en a un. */
  own?: {
    get: (guildId: string) => boolean | undefined;
    set: (guildId: string, enabled: boolean) => void;
  };
}

export const MODULES: ModuleDef[] = [
  {
    id: 'security',
    label: 'Anti-Raid',
    emoji: '🚨',
    description: 'Détection des arrivées massives et verrouillage d\'urgence.',
    commands: ['antiraid'],
    own: { get: (g) => raidRepository.getConfig(g).enabled, set: (g, enabled) => void raidRepository.updateConfig(g, { enabled }) },
  },
  {
    id: 'anti-nuke',
    label: 'Anti-Nuke',
    emoji: '☢️',
    description: 'Protection contre les suppressions et bannissements en série.',
    commands: ['antinuke'],
    own: {
      get: (g) => securityStorage.getConfig(g).antiNuke.enabled,
      set: (g, enabled) => void securityStorage.updateConfig(g, { antiNuke: { ...securityStorage.getConfig(g).antiNuke, enabled } }),
    },
  },
  {
    id: 'automod',
    label: 'AutoMod',
    emoji: '🤖',
    description: 'Filtres automatiques : insultes, liens, spam.',
    commands: ['automod'],
    own: { get: (g) => autoModRepository.getConfig(g).enabled, set: (g, enabled) => void autoModRepository.updateConfig(g, { enabled }) },
  },
  {
    id: 'moderation',
    label: 'Modération',
    emoji: '🛡️',
    description: 'Avertissements, mutes, expulsions, bannissements et gestion des salons.',
    commands: ['ban', 'clear', 'kick', 'lock', 'nickname', 'slowmode', 'timeout', 'unban', 'unlock', 'untimeout', 'warn', 'warnings'],
  },
  {
    id: 'logs',
    label: 'Journal d\'audit',
    emoji: '📋',
    description: 'Journal des actions du serveur (messages, rôles, salons, sanctions).',
    commands: ['logs'],
    own: { get: (g) => logStorage.getConfig(g).enabled, set: (g, enabled) => void logStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'welcome',
    label: 'Bienvenue & départs',
    emoji: '👋',
    description: 'Messages d\'accueil et d\'au revoir, vérification des nouveaux membres.',
    commands: ['verification'],
    own: {
      get: (g) => {
        const c = welcomeRepository.getConfig(g);
        return Boolean(c.welcome.enabled || c.goodbye.enabled);
      },
      set: (g, enabled) => {
        const c = welcomeRepository.getConfig(g);
        // Désactiver coupe l'accueil ET l'au revoir ; activer ne rallume que l'accueil (l'au revoir reste un choix à part).
        welcomeRepository.saveConfig(g, {
          ...c,
          welcome: { ...c.welcome, enabled },
          goodbye: { ...c.goodbye, enabled: enabled ? c.goodbye.enabled : false },
        });
      },
    },
  },
  {
    id: 'roles',
    label: 'Rôles automatiques',
    emoji: '🎭',
    description: 'Rôles donnés à l\'arrivée, menus de rôles.',
    commands: [],
    own: { get: (g) => autoRoleService.getConfig(g).enabled, set: (g, enabled) => void autoRoleService.updateConfig(g, { enabled }) },
  },
  {
    id: 'leveling',
    label: 'Niveaux & XP',
    emoji: '🏆',
    description: 'Expérience par messages, classement et rôles de niveau.',
    commands: ['rank', 'leaderboard', 'xp'],
    own: { get: (g) => levelingStorage.getConfig(g).enabled, set: (g, enabled) => void levelingStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'economy',
    label: 'Économie & boutique',
    emoji: '🪙',
    description: 'Monnaie du serveur, récompense quotidienne, boutique de rôles.',
    commands: ['balance', 'daily', 'gamble', 'pay', 'rob', 'shop', 'work', 'economy'],
    own: { get: (g) => economyStorage.getConfig(g).enabled, set: (g, enabled) => void economyStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'suggestions',
    label: 'Suggestions',
    emoji: '💡',
    description: 'Boîte à idées avec votes.',
    commands: ['suggest'],
    own: { get: (g) => suggestionStorage.getConfig(g).enabled, set: (g, enabled) => void suggestionStorage.updateConfig(g, { enabled }) },
  },
  { id: 'polls', label: 'Sondages & votes', emoji: '🗳️', description: 'Sondages, votes pondérés et décisions du staff.', commands: ['poll'] },
  { id: 'giveaways', label: 'Tirages au sort', emoji: '🎁', description: 'Concours avec sélection aléatoire de gagnants.', commands: ['giveaway'] },
  { id: 'events', label: 'Événements', emoji: '📅', description: 'Événements avec inscriptions et rappels.', commands: ['event'] },
  { id: 'forms', label: 'Formulaires', emoji: '📝', description: 'Formulaires et candidatures.', commands: ['form'] },
  { id: 'invites', label: 'Invitations', emoji: '✉️', description: 'Suivi des invitations et parrainages.', commands: [] },
  {
    id: 'starboard',
    label: 'Starboard',
    emoji: '⭐',
    description: 'Republication des messages les plus étoilés.',
    commands: ['starboard'],
    own: { get: (g) => starboardStorage.getConfig(g).enabled, set: (g, enabled) => void starboardStorage.updateConfig(g, { enabled }) },
  },
  { id: 'highlights', label: 'Highlights', emoji: '👁️', description: 'Alertes en DM sur des mots-clés.', commands: ['highlight'] },
  {
    id: 'birthdays',
    label: 'Anniversaires',
    emoji: '🎂',
    description: 'Annonce quotidienne et rôle du jour.',
    commands: ['birthday'],
    own: { get: (g) => birthdayStorage.getConfig(g).enabled, set: (g, enabled) => void birthdayStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'music',
    label: 'Musique',
    emoji: '🎵',
    description: 'Lecture dans les salons vocaux, file d\'attente et playlists.',
    commands: [
      'clearqueue', 'disconnect', 'join', 'loop', 'music', 'nowplaying', 'pause', 'play', 'player', 'playlist', 'previous',
      'queue', 'resume', 'shuffle', 'skip', 'stop', 'voice-status', 'volume',
    ],
  },
  { id: 'voice', label: 'Salons vocaux', emoji: '🔊', description: 'Salons vocaux temporaires (Join-to-Create).', commands: ['voice'] },
  {
    id: 'tickets',
    label: 'Tickets',
    emoji: '🎫',
    description: 'Support par salons privés.',
    commands: ['ticket'],
    own: {
      get: (g) => ticketRepository.getConfig(g).enabled,
      set: (g, enabled) => ticketRepository.saveConfig(g, { ...ticketRepository.getConfig(g), enabled }),
    },
  },
  { id: 'commands', label: 'Commandes personnalisées', emoji: '⌨️', description: 'Commandes créées depuis le dashboard.', commands: [] },
  { id: 'tags', label: 'Tags', emoji: '🏷️', description: 'Réponses rapides réutilisables.', commands: ['tag'] },
  { id: 'reminders', label: 'Rappels', emoji: '⏰', description: 'Rappels personnels programmés.', commands: ['reminder'] },
  { id: 'sticky', label: 'Messages épinglés', emoji: '📌', description: 'Message toujours visible en bas d\'un salon.', commands: ['sticky'] },
  {
    id: 'afk',
    label: 'AFK',
    emoji: '💤',
    description: 'Statut absent avec notification sur mention.',
    commands: ['afk'],
    own: { get: (g) => afkStorage.getConfig(g).enabled, set: (g, enabled) => void afkStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'counting',
    label: 'Comptage',
    emoji: '🔢',
    description: 'Jeu collectif : compter 1, 2, 3… à tour de rôle dans un salon.',
    commands: ['counting'],
    own: { get: (g) => countingStorage.getConfig(g).enabled, set: (g, enabled) => void countingStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'stats',
    label: 'Statistiques',
    emoji: '📊',
    description: 'Messages et vocal par jour, membres, salons, classements et graphiques.',
    commands: ['stats'],
    own: { get: (g) => statsStorage.getConfig(g).enabled, set: (g, enabled) => void statsStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'statroles',
    label: 'Statroles',
    emoji: '🏅',
    description: 'Rôles donnés et retirés automatiquement selon l’activité (messages, vocal, ancienneté).',
    commands: ['statroles'],
    own: { get: (g) => statrolesStorage.getConfig(g).enabled, set: (g, enabled) => void statrolesStorage.updateConfig(g, { enabled }) },
  },
  {
    id: 'serverstats',
    label: 'Stats du serveur',
    emoji: '📊',
    description: 'Salons compteurs (membres, en ligne…).',
    commands: ['serverstats'],
    own: { get: (g) => serverStatsStorage.getConfig(g).enabled, set: (g, enabled) => void serverStatsStorage.updateConfig(g, { enabled }) },
  },
  { id: 'ai', label: 'Assistant IA', emoji: '✨', description: 'Questions, résumés et images par IA.', commands: ['ask', 'imagine', 'summarize', 'ai-setup'] },
  { id: 'backups', label: 'Sauvegardes', emoji: '💾', description: 'Snapshots et restauration du serveur.', commands: [] },
];

const BY_ID = new Map(MODULES.map((m) => [m.id, m]));
const BY_COMMAND = new Map<string, ModuleDef>();
for (const m of MODULES) for (const c of m.commands) BY_COMMAND.set(c, m);

export function getModule(id: string): ModuleDef | undefined {
  return BY_ID.get(id);
}

/** Module auquel appartient une commande (undefined : commande de base, jamais bloquée : /help, /ping, /module…). */
export function moduleForCommand(commandName: string): ModuleDef | undefined {
  return BY_COMMAND.get(commandName.toLowerCase());
}

// --- interrupteurs enregistrés (modules sans interrupteur propre) ------------------------------------------------------
const SWITCHES_PATH = path.resolve(process.cwd(), 'data', 'module_switches.json');
let disabled: Record<string, string[]> = {};

try {
  if (fs.existsSync(SWITCHES_PATH)) disabled = JSON.parse(fs.readFileSync(SWITCHES_PATH, 'utf-8'));
} catch (err) {
  logger.error('Erreur lors du chargement de module_switches.json :', err);
  disabled = {};
}

function persistSwitches(): void {
  try {
    fs.mkdirSync(path.dirname(SWITCHES_PATH), { recursive: true });
    fs.writeFileSync(SWITCHES_PATH, JSON.stringify(disabled, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Erreur lors de la sauvegarde de module_switches.json :', err);
  }
}

export function isModuleEnabled(guildId: string, moduleId: string): boolean {
  const def = BY_ID.get(moduleId);
  if (!def) return true;
  if (disabled[guildId]?.includes(moduleId)) return false;
  if (def.own) {
    try {
      return def.own.get(guildId) !== false;
    } catch {
      return true;
    }
  }
  return true;
}

/** Active ou désactive un module. Renvoie false si l'identifiant est inconnu. */
export function setModuleEnabled(guildId: string, moduleId: string, enabled: boolean, source: 'DASHBOARD' | 'DISCORD_COMMAND' = 'DASHBOARD', userId?: string, emit = true): boolean {
  const def = BY_ID.get(moduleId);
  if (!def) return false;

  const list = new Set(disabled[guildId] ?? []);
  if (enabled) list.delete(moduleId);
  else list.add(moduleId);
  if (list.size > 0) disabled[guildId] = [...list];
  else delete disabled[guildId];
  persistSwitches();

  if (def.own) {
    try {
      def.own.set(guildId, enabled);
    } catch (err) {
      logger.error(`[ModuleRegistry] Impossible d'écrire l'interrupteur propre de « ${moduleId} » :`, err);
    }
  }

  // Tous les dashboards ouverts sur ce serveur se mettent à jour, quelle que soit l'origine du changement.
  if (emit) emitConfigUpdated('modules', guildId, listModuleStates(guildId), source, userId);
  return true;
}

/**
 * Modules actifs d'office sur un serveur qui vient d'inviter le bot : le socle simple et sans effet de bord. Tout le reste
 * démarre désactivé et s'active à la demande (configuration rapide, /module ou dashboard).
 */
export const CORE_MODULE_IDS: readonly string[] = ['moderation', 'music', 'reminders', 'tags'];

export type ModulePresetId = 'minimal' | 'community' | 'security' | 'all';

const COMMUNITY_IDS = ['welcome', 'roles', 'leveling', 'economy', 'suggestions', 'polls', 'giveaways', 'events', 'forms', 'starboard', 'highlights', 'birthdays', 'voice', 'tickets', 'invites', 'afk', 'counting', 'stats', 'statroles', 'serverstats', 'sticky', 'commands'];
const SECURITY_IDS = ['security', 'anti-nuke', 'automod', 'logs', 'welcome', 'tickets', 'backups'];

/** Ensembles de modules proposés par la configuration rapide (le socle est toujours inclus). */
export const MODULE_PRESETS: Record<ModulePresetId, { label: string; emoji: string; description: string; ids: () => string[] }> = {
  minimal: { label: 'Minimal', emoji: '⚡', description: 'Modération, musique, rappels et tags seulement.', ids: () => [...CORE_MODULE_IDS] },
  community: { label: 'Communauté', emoji: '🎉', description: 'Accueil, rôles, niveaux, économie, sondages, événements, tickets…', ids: () => [...CORE_MODULE_IDS, ...COMMUNITY_IDS] },
  security: { label: 'Sécurité', emoji: '🛡️', description: 'Anti-Raid, Anti-Nuke, AutoMod, journaux, accueil, tickets, sauvegardes.', ids: () => [...CORE_MODULE_IDS, ...SECURITY_IDS] },
  all: { label: 'Tout activer', emoji: '✅', description: "Tous les modules, y compris l'assistant IA.", ids: () => MODULES.map((m) => m.id) },
};

/** Applique d'un coup : les modules listés sont activés, tous les autres désactivés (un seul signal envoyé aux dashboards). */
export function applyModuleSelection(guildId: string, enabledIds: Iterable<string>, source: 'DASHBOARD' | 'DISCORD_COMMAND' = 'DISCORD_COMMAND', userId?: string): void {
  const wanted = new Set(enabledIds);
  for (const m of MODULES) setModuleEnabled(guildId, m.id, wanted.has(m.id), source, userId, false);
  emitConfigUpdated('modules', guildId, listModuleStates(guildId), source, userId);
}

export interface ModuleState {
  id: string;
  label: string;
  emoji: string;
  description: string;
  enabled: boolean;
}

export function listModuleStates(guildId: string): ModuleState[] {
  return MODULES.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji, description: m.description, enabled: isModuleEnabled(guildId, m.id) }));
}
