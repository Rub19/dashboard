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
import { serverStatsStorage } from '../modules/serverStats/storage/serverStatsStorage.js';
import { ticketRepository } from '../modules/tickets/storage/ticketRepository.js';

/**
 * Interrupteur général de chaque module, tel qu'enregistré par le bot. Les identifiants sont ceux du hub du dashboard
 * (app/discord/page.tsx). Un module absent de cette liste n'a pas d'interrupteur unique (ex. Modération, dont les
 * sanctions sont toujours actives) : le dashboard n'affiche alors aucune pastille plutôt qu'un état inventé.
 */
const READERS: Record<string, (guildId: string) => boolean | undefined> = {
  security: (g) => raidRepository.getConfig(g).enabled,
  'anti-nuke': (g) => securityStorage.getConfig(g).antiNuke.enabled,
  automod: (g) => autoModRepository.getConfig(g).enabled,
  logs: (g) => logStorage.getConfig(g).enabled,
  welcome: (g) => welcomeRepository.getConfig(g).welcome.enabled,
  roles: (g) => autoRoleService.getConfig(g).enabled,
  leveling: (g) => levelingStorage.getConfig(g).enabled,
  suggestions: (g) => suggestionStorage.getConfig(g).enabled,
  starboard: (g) => starboardStorage.getConfig(g).enabled,
  birthdays: (g) => birthdayStorage.getConfig(g).enabled,
  economy: (g) => economyStorage.getConfig(g).enabled,
  afk: (g) => afkStorage.getConfig(g).enabled,
  serverstats: (g) => serverStatsStorage.getConfig(g).enabled,
  tickets: (g) => ticketRepository.getConfig(g).enabled,
};

/** État activé / désactivé des modules d'un serveur. Une lecture qui échoue omet simplement le module. */
export function getModuleStatus(guildId: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [id, read] of Object.entries(READERS)) {
    try {
      const value = read(guildId);
      if (typeof value === 'boolean') out[id] = value;
    } catch {
      // module non configurable pour ce serveur : pas de pastille
    }
  }
  return out;
}
