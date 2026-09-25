import type { EmbedBuilder } from 'discord.js';
import { getModule, isModuleEnabled, moduleForCommand } from './moduleRegistry.js';
import { noticeEmbed } from '../utils/embeds.js';

const DASHBOARD_URL = 'https://ethone.dev/discord';

interface GateInput {
  guildId: string | null | undefined;
  commandName: string;
  /** L'utilisateur peut gérer le serveur (permission ou rôle admin/modérateur configuré). */
  isStaff: boolean;
  /** Préfixe des commandes du serveur si l'appel vient d'un message, sinon null (commande slash). */
  prefix: string | null;
}

/**
 * Filtre commun : si la commande appartient à un module désactivé sur ce serveur, renvoie les embeds à afficher à la
 * place de la commande (sinon null).
 *  - tout le monde : un embed d'erreur qui dit quel module est désactivé ;
 *  - le staff : un second embed avec la commande Discord et le lien du dashboard pour le réactiver.
 */
export function disabledModuleEmbeds({ guildId, commandName, isStaff, prefix }: GateInput): EmbedBuilder[] | null {
  if (!guildId) return null;
  const def = moduleForCommand(commandName);
  if (!def || isModuleEnabled(guildId, def.id)) return null;

  const call = prefix ? `${prefix}${commandName}` : `/${commandName}`;
  const embeds = [
    noticeEmbed('error', `Le module **${def.emoji} ${def.label}** est désactivé sur ce serveur : \`${call}\` n'est pas disponible pour le moment.`, {
      title: 'Module désactivé',
      icon: 'denied',
    }),
  ];

  if (isStaff) {
    const enableWithCommand = prefix ? `\`${prefix}module ${def.id} on\`` : `\`/module nom:${def.id} activer:True\``;
    embeds.push(
      noticeEmbed(
        'info',
        `Vous pouvez réactiver ce module :\n• Sur Discord : ${enableWithCommand}\n• Depuis le dashboard : ${DASHBOARD_URL} (interrupteur du module **${def.label}**).`,
        { title: 'Réservé au staff' }
      )
    );
  }
  return embeds;
}

export { getModule };

/** Préfixes d'identifiants de composants (boutons, menus, formulaires) → module propriétaire. Ordre : le plus précis d'abord. */
const COMPONENT_PREFIXES: Array<[string, string]> = [
  ['ticket_', 'tickets'], ['modal_ticket_', 'tickets'],
  ['giveaway_', 'giveaways'],
  ['sugg_', 'suggestions'], ['modal_sugg_', 'suggestions'],
  ['welcome_', 'welcome'], ['onb:', 'welcome'], ['onb_modal:', 'welcome'],
  ['voice_', 'voice'], ['modal_voice_', 'voice'],
  ['ai_', 'ai'],
  ['form_', 'forms'],
  ['poll_', 'polls'],
  ['event_', 'events'],
  ['eco_btn_', 'economy'],
  ['rank_btn_', 'leveling'],
  ['role_btn:', 'roles'], ['role_select:', 'roles'],
  ['rep_', 'reports'],
  ['mod_btn_', 'moderation'],
  ['logs_', 'logs'],
];

/**
 * Filtre des composants (boutons, menus, formulaires) : renvoie un embed si le module auquel ils appartiennent est désactivé
 * sur ce serveur, sinon null. Les panneaux déjà publiés restent dans les salons mais ne font plus rien.
 */
export function disabledComponentEmbed(guildId: string | null | undefined, customId: string): EmbedBuilder | null {
  if (!guildId) return null;
  const hit = COMPONENT_PREFIXES.find(([prefix]) => customId.startsWith(prefix));
  if (!hit) return null;
  const def = getModule(hit[1]);
  if (!def || isModuleEnabled(guildId, def.id)) return null;
  return noticeEmbed('error', `Le module **${def.emoji} ${def.label}** est désactivé sur ce serveur : cette action n'est pas disponible pour le moment.`, { title: 'Module désactivé' });
}
