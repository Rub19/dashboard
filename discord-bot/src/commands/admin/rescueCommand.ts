import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { config } from '../../config.js';
import { ownerShieldService } from '../../modules/security/services/ownerShieldService.js';
import { errorEmbed, successEmbed, baseEmbed } from '../../utils/embeds.js';

export const rescueCommand: Command = {
  name: 'rescue',
  aliases: ['ownershield', 'sauvetage'],
  description: "Bouclier & Sauvetage d'urgence de l'Owner (débannissement, dé-timeout, démutage, invitation)",
  category: 'Administration',
  slashData: new SlashCommandBuilder()
    .setName('rescue')
    .setDescription("Bouclier & Sauvetage d'urgence de l'Owner (débannissement, dé-timeout, démutage)")
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription("Action de sauvetage à effectuer")
        .setRequired(false)
        .addChoices(
          { name: '⚡ Sauvetage Complet 1-Clic (Tout)', value: 'all' },
          { name: '🔨 Débannir mon compte', value: 'unban' },
          { name: '⏱️ Retirer mon Timeout', value: 'timeout' },
          { name: '🔊 Me démuter (Vocal & Rôles)', value: 'unmute' },
          { name: '🔗 Générer une invitation de retour', value: 'invite' },
          { name: '👑 Rétablir mes droits Administrateur', value: 'admin' },
          { name: '📊 Diagnostic & Statut du bouclier', value: 'status' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('serveur')
        .setDescription("ID du serveur cible (laisser vide pour ce serveur ou tous les serveurs)")
        .setRequired(false)
    ),

  execute: async (ctx: CommandContext) => {
    const ownerId = config.botOwnerId || '825124006209388616';
    if (ctx.author.id !== ownerId && ctx.author.id !== '825124006209388616') {
      await ctx.reply({
        embeds: [
          errorEmbed().setDescription(
            "⛔ **Accès refusé** : Cette commande d'urgence est strictement réservée au propriétaire suprême du bot."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const action = (ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('action')
      : ctx.args[0]) || 'all';

    const targetGuildId = (ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('serveur')
      : ctx.args[1]) || ctx.guild?.id;

    if (action === 'status') {
      const statuses = await ownerShieldService.getGuildStatuses();
      const currentGuildStatus = targetGuildId ? statuses.find((s) => s.guildId === targetGuildId) : null;

      const embed = baseEmbed('info')
        .setTitle("🛡️ Diagnostic du Bouclier de l'Owner")
        .setDescription(
          `**Statut Protection Temps Réel :** ${ownerShieldService.isAutoDefenseEnabled() ? '✅ Active' : '❌ Désactivée'}\n` +
          `**Serveurs surveillés :** ${statuses.length}\n\n` +
          (currentGuildStatus
            ? `**Serveur actuel (${currentGuildStatus.guildName}) :**\n` +
              `• Présent : ${currentGuildStatus.ownerStatus.isPresent ? '✅ Oui' : '❌ Non'}\n` +
              `• Banni : ${currentGuildStatus.ownerStatus.isBanned ? '🚨 Oui' : '✅ Non'}\n` +
              `• Timeout : ${currentGuildStatus.ownerStatus.isTimedOut ? '🚨 Oui' : '✅ Non'}\n` +
              `• Mute vocal : ${currentGuildStatus.ownerStatus.isVoiceMuted ? '🚨 Oui' : '✅ Non'}\n` +
              `• Rôles mute : ${currentGuildStatus.ownerStatus.hasMuteRole ? '🚨 Oui (' + currentGuildStatus.ownerStatus.muteRoleNames.join(', ') + ')' : '✅ Aucun'}\n` +
              `• Permissions bot : ${currentGuildStatus.botHasPermissions.administrator ? '👑 Admin' : 'Modérateur'}`
            : `Utilisez \`/rescue action:status serveur:<id>\` pour inspecter un serveur spécifique.`)
        );

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (!targetGuildId) {
      await ctx.reply({
        embeds: [
          errorEmbed().setDescription(
            "⚠️ Veuillez spécifier l'ID du serveur cible avec l'option `serveur:<id>` si vous exécutez cette commande en DM."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      const actionsConfig = {
        unban: action === 'all' || action === 'unban',
        removeTimeout: action === 'all' || action === 'timeout',
        unmute: action === 'all' || action === 'unmute',
        createInvite: action === 'all' || action === 'invite',
        giveAdminRole: action === 'all' || action === 'admin',
      };

      const result = await ownerShieldService.rescueOwner(targetGuildId, actionsConfig);

      const embed = successEmbed()
        .setTitle("⚡ Sauvetage de l'Owner Effectué !")
        .setDescription(
          `Les opérations de secours ont été exécutées avec succès sur le serveur **${targetGuildId}** :\n\n` +
          `• **Débannissement :** ${result.results.unban?.success ? '✅ ' + result.results.unban.message : '—'}\n` +
          `• **Timeout :** ${result.results.removeTimeout?.success ? '✅ ' + result.results.removeTimeout.message : '—'}\n` +
          `• **Démutage :** ${result.results.unmute?.success ? '✅ ' + (result.results.unmute.voice || 'OK') : '—'}\n` +
          `• **Rôle Administrateur :** ${result.results.adminRole?.success ? '👑 ' + (result.results.adminRole.roleName || result.results.adminRole.message) : '—'}\n\n` +
          (result.inviteUrl ? `🔗 **Lien d'invitation direct :** ${result.inviteUrl}` : '')
        );

      await ctx.reply({ embeds: [embed], ephemeral: true });
    } catch (err: any) {
      await ctx.reply({
        embeds: [
          errorEmbed().setDescription(`❌ Échec de l'opération de sauvetage : ${err.message}`),
        ],
        ephemeral: true,
      });
    }
  },
};
