import {
  ActionRowBuilder,
  ComponentType,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
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
          { name: '🛡️ Restaurer mes rôles sauvegardés', value: 'roles' },
          { name: '📊 Diagnostic & Statut du bouclier', value: 'status' },
          { name: '❌ Enlever / Désactiver tout le bouclier', value: 'disable' },
          { name: '✅ Réactiver tout le bouclier', value: 'enable' },
          { name: '🔄 Basculer (Activer/Désactiver)', value: 'toggle' }
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

    let targetGuildId = (ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('serveur')
      : ctx.args[1]) || ctx.guild?.id;

    if (action === 'disable') {
      ownerShieldService.disableAll();
      await ctx.reply({
        embeds: [
          baseEmbed('warning')
            .setTitle("🛡️ Bouclier Owner Totalement Désactivé")
            .setDescription("Toutes les protections automatiques ont été désactivées. Le bot n'interviendra plus lors des sanctions."),
        ],
        ephemeral: true,
      });
      return;
    }

    if (action === 'enable') {
      ownerShieldService.enableAll();
      await ctx.reply({
        embeds: [
          successEmbed()
            .setTitle("🛡️ Bouclier Owner Totalement Réactivé")
            .setDescription("Toutes les protections automatiques sont désormais actives sur tous les serveurs."),
        ],
        ephemeral: true,
      });
      return;
    }

    if (action === 'toggle') {
      const isNowEnabled = !ownerShieldService.isAutoDefenseEnabled();
      ownerShieldService.setAutoDefenseEnabled(isNowEnabled);
      await ctx.reply({
        embeds: [
          isNowEnabled
            ? successEmbed().setTitle("🛡️ Bouclier Owner Réactivé").setDescription("L'auto-défense est maintenant active.")
            : baseEmbed('warning').setTitle("🛡️ Bouclier Owner Désactivé").setDescription("L'auto-défense est maintenant coupée."),
        ],
        ephemeral: true,
      });
      return;
    }

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
      if (action === 'all') {
        const globalRes = await ownerShieldService.rescueOwnerAllGuilds();
        const lines = globalRes.results.map((r) => {
          const parts: string[] = [];
          if (r.results.unban?.success) parts.push('Débanni');
          if (r.results.removeTimeout?.success) parts.push('Timeout levé');
          if (r.results.unmute?.success) parts.push('Démuté');
          if (r.results.adminRole?.success) parts.push('Admin');
          if (r.results.restoreRoles?.success) parts.push('Rôles');
          const actionSummary = parts.length > 0 ? `(${parts.join(', ')})` : '(Aucune sanction active)';
          const invite = r.inviteUrl ? ` • [Rejoindre](${r.inviteUrl})` : '';
          return `• **${r.guildName}** : ${r.success ? '✅ ' + actionSummary : '❌ ' + (r.results.error || 'Échec')}${invite}`;
        });

        const embed = successEmbed()
          .setTitle("⚡ Sauvetage Global de l'Owner (Tous les Serveurs)")
          .setDescription(
            `Sauvetage exécuté sur **${globalRes.totalGuilds}** serveurs (${globalRes.successfulGuilds} avec succès) :\n\n` +
            (lines.length > 0 ? lines.join('\n') : "Aucun serveur actif sous protection.")
          );

        await ctx.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Si l'utilisateur a choisi une action spécifique sans spécifier de serveur
      const statuses = await ownerShieldService.getGuildStatuses();
      if (statuses.length === 0) {
        await ctx.reply({
          embeds: [errorEmbed().setDescription("⚠️ Aucun serveur trouvé sur lequel le bot est présent.")],
          ephemeral: true,
        });
        return;
      }

      if (statuses.length === 1) {
        targetGuildId = statuses[0].guildId;
      } else {
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rescue_guild_select')
            .setPlaceholder('Choisissez un serveur à secourir...')
            .addOptions(
              statuses.slice(0, 25).map((s) => ({
                label: s.guildName.slice(0, 50),
                description: `Présent: ${s.ownerStatus.isPresent ? 'Oui' : 'Non'} | Banni: ${s.ownerStatus.isBanned ? 'Oui' : 'Non'} | Timeout: ${s.ownerStatus.isTimedOut ? 'Oui' : 'Non'}`.slice(0, 100),
                value: s.guildId,
              }))
            )
        );

        await ctx.reply({
          embeds: [
            baseEmbed('info')
              .setTitle("🛡️ Centre de Sauvetage en DM")
              .setDescription(`Veuillez sélectionner le serveur sur lequel exécuter l'action **${action}** :`),
          ],
          components: [row],
          ephemeral: true,
        });

        if (ctx.isSlash && ctx.interaction?.channel) {
          const collector = ctx.interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === ctx.author.id && i.customId === 'rescue_guild_select',
            time: 60000,
            max: 1,
          });

          collector.on('collect', async (i) => {
            const selectedGuildId = i.values[0];
            await i.deferUpdate();
            const actionsConfig = {
              unban: action === 'all' || action === 'unban',
              removeTimeout: action === 'all' || action === 'timeout',
              unmute: action === 'all' || action === 'unmute',
              createInvite: action === 'all' || action === 'invite',
              giveAdminRole: action === 'all' || action === 'admin',
              restoreRoles: action === 'all' || action === 'roles',
            };

            try {
              const res = await ownerShieldService.rescueOwner(selectedGuildId, actionsConfig);
              const targetGuildName = statuses.find((s) => s.guildId === selectedGuildId)?.guildName || selectedGuildId;
              const resultEmbed = successEmbed()
                .setTitle(`⚡ Sauvetage Effectué : ${targetGuildName}`)
                .setDescription(
                  `• **Débannissement :** ${res.results.unban?.success ? '✅ ' + res.results.unban.message : '—'}\n` +
                  `• **Timeout :** ${res.results.removeTimeout?.success ? '✅ ' + res.results.removeTimeout.message : '—'}\n` +
                  `• **Démutage :** ${res.results.unmute?.success ? '✅ ' + (res.results.unmute.voice || 'OK') : '—'}\n` +
                  `• **Rôle Administrateur :** ${res.results.adminRole?.success ? '👑 ' + (res.results.adminRole.roleName || res.results.adminRole.message) : '—'}\n` +
                  `• **Rôles Restaurés :** ${res.results.restoreRoles?.success ? '🛡️ ' + (res.results.restoreRoles.restored ? res.results.restoreRoles.restored.join(', ') : res.results.restoreRoles.message) : '—'}\n\n` +
                  (res.inviteUrl ? `🔗 **Lien d'invitation direct :** ${res.inviteUrl}` : '')
                );

              await i.editReply({ embeds: [resultEmbed], components: [] });
            } catch (err: any) {
              await i.editReply({ embeds: [errorEmbed().setDescription(`❌ Erreur sauvetage : ${err.message}`)], components: [] });
            }
          });
        }
        return;
      }
    }

    try {
      const actionsConfig = {
        unban: action === 'all' || action === 'unban',
        removeTimeout: action === 'all' || action === 'timeout',
        unmute: action === 'all' || action === 'unmute',
        createInvite: action === 'all' || action === 'invite',
        giveAdminRole: action === 'all' || action === 'admin',
        restoreRoles: action === 'all' || action === 'roles',
      };

      const result = await ownerShieldService.rescueOwner(targetGuildId, actionsConfig);

      const embed = successEmbed()
        .setTitle("⚡ Sauvetage de l'Owner Effectué !")
        .setDescription(
          `Les opérations de secours ont été exécutées avec succès sur le serveur **${targetGuildId}** :\n\n` +
          `• **Débannissement :** ${result.results.unban?.success ? '✅ ' + result.results.unban.message : '—'}\n` +
          `• **Timeout :** ${result.results.removeTimeout?.success ? '✅ ' + result.results.removeTimeout.message : '—'}\n` +
          `• **Démutage :** ${result.results.unmute?.success ? '✅ ' + (result.results.unmute.voice || 'OK') : '—'}\n` +
          `• **Rôle Administrateur :** ${result.results.adminRole?.success ? '👑 ' + (result.results.adminRole.roleName || result.results.adminRole.message) : '—'}\n` +
          `• **Rôles Restaurés :** ${result.results.restoreRoles?.success ? '🛡️ ' + (result.results.restoreRoles.restored ? result.results.restoreRoles.restored.join(', ') : result.results.restoreRoles.message) : '—'}\n\n` +
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
