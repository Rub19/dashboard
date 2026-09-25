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
