import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { config } from '../../config.js';
import { ownerImmunityService } from '../../services/ownerImmunityService.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';

/**
 * /godmode — Active/désactive l'immunité totale du Bot Owner contre toute sanction
 * (warn/ban/kick/timeout/AutoMod/Anti-Raid...), sur tous les serveurs.
 *
 * Réservée au Bot Owner, comme /status : cette immunité est globale (pas propre à un
 * serveur), donc son contrôle ne peut pas être ouvert aux administrateurs de serveur.
 * Désactivée manuellement, elle sert par exemple à tester une commande de modération
 * sur soi-même — et il n'y a AUCUNE persistance : un redémarrage du bot la réactive
 * automatiquement, pour ne jamais rester désactivée par accident.
 */
export const godmodeCommand: Command = {
  name: 'godmode',
  description: "Active/désactive l'immunité totale du Bot Owner contre toute sanction (réservé au Bot Owner)",
  category: 'Administration',
  slashData: new SlashCommandBuilder()
    .setName('godmode')
    .setDescription("Active/désactive l'immunité totale du Bot Owner contre toute sanction (réservé au Bot Owner)")
    .addStringOption((opt) =>
      opt
        .setName('etat')
        .setDescription("Activer ou désactiver l'immunité (laisser vide pour juste voir l'état actuel)")
        .setRequired(false)
        .addChoices(
          { name: '🛡️ Activer', value: 'on' },
          { name: '⚠️ Désactiver', value: 'off' }
        )
    ),

  execute: async (ctx: CommandContext) => {
    if (ctx.author.id !== config.botOwnerId) {
      await ctx.reply({
        embeds: [
          errorEmbed().setDescription(
            "⛔ **Accès refusé** : cette commande est réservée au Bot Owner — l'immunité qu'elle contrôle est globale et partagée par tous les serveurs."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const requested = ctx.isSlash && ctx.interaction ? ctx.interaction.options.getString('etat') : null;

    if (requested === 'on' || requested === 'off') {
      ownerImmunityService.setEnabled(requested === 'on', ctx.author.username);
    }

    const enabled = ownerImmunityService.isEnabled();
    const embed = (enabled ? successEmbed() : warningEmbed())
      .setTitle(enabled ? '🛡️ God Mode : Activé' : '⚠️ God Mode : Désactivé')
      .setDescription(
        enabled
          ? 'Tu es actuellement **immunisé** contre toute sanction (warn/ban/kick/timeout/AutoMod/Anti-Raid), sur tous les serveurs.'
          : "Tu peux actuellement être sanctionné normalement, comme n'importe quel membre — utile pour tester une commande de modération sur toi-même. Réactive avec `/godmode etat:on` (ou redémarre le bot, qui réactive automatiquement l'immunité par sécurité)."
      );

    await ctx.reply({ embeds: [embed], ephemeral: true });
  },
};
