import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { Command, CommandContext } from '../../types/command.js';
import { GuildConfig, resolveHexColor } from '../../types/guildConfig.js';

/**
 * Construit l'embed et les composants pour la vue principale des paramètres
 */
export function buildSettingsMessage(guildConfig: GuildConfig, memberName?: string) {
  const embed = new EmbedBuilder()
    .setColor(resolveHexColor(guildConfig.primaryColor))
    .setTitle(`${guildConfig.emojis.settings} Configuration du Serveur`)
    .setDescription(
      `Personnalisez le comportement, les couleurs et les commandes de **${guildConfig.botName}** sur ce serveur.\n` +
      `*Seuls les administrateurs ou membres ayant \`Gérer le serveur\` peuvent modifier ces réglages.*`
    )
    .addFields(
      {
        name: '🎨 Apparence & Couleurs',
        value:
          `• **Nom affiché :** \`${guildConfig.botName}\`\n` +
          `• **Couleur Principale :** \`${guildConfig.primaryColor}\`\n` +
          `• **Couleur Secondaire :** \`${guildConfig.secondaryColor}\`\n` +
          `• **Succès / Erreur :** \`${guildConfig.successColor}\` / \`${guildConfig.errorColor}\`\n` +
          `• **Emojis clés :** ${guildConfig.emojis.success} ${guildConfig.emojis.error} ${guildConfig.emojis.info}`,
        inline: false,
      },
      {
        name: '⌨️ Commandes & Préfixe',
        value:
          `• **Préfixe textuel :** \`${guildConfig.prefix}\`\n` +
          `• **Commandes Préfixes (\`${guildConfig.prefix}\`) :** ${
            guildConfig.prefixCommandsEnabled ? '🟢 **Activées**' : '🔴 **Désactivées**'
          }\n` +
          `• **Slash Commands (\`/\`) :** ${
            guildConfig.slashCommandsEnabled ? '🟢 **Activées**' : '🔴 **Désactivées**'
          }`,
        inline: false,
      },
      {
        name: '🌐 Général',
        value:
          `• **Langue :** \`${guildConfig.language.toUpperCase()}\`\n` +
          `• **Fuseau horaire :** \`${guildConfig.timezone}\``,
        inline: false,
      }
    )
    .setFooter({
      text: `${guildConfig.botName} • Utilisez le menu ci-dessous pour modifier`,
    })
    .setTimestamp();

  // Menu déroulant de sélection d'actions
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('settings_select_category')
    .setPlaceholder('Sélectionnez une catégorie à modifier...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Modifier les Couleurs (HEX)')
        .setDescription('Personnaliser la couleur principale, secondaire, succès et erreur')
        .setValue('edit_colors')
        .setEmoji('🎨'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Modifier le Nom du Bot')
        .setDescription('Changer le nom affiché dans les embeds et messages')
        .setValue('edit_name')
        .setEmoji('📝'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Modifier le Préfixe')
        .setDescription('Changer le préfixe textuel (ex: !, ?, $, >>)')
        .setValue('edit_prefix')
        .setEmoji('⌨️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Modifier les Emojis')
        .setDescription('Personnaliser les emojis de succès, erreur, chargement...')
        .setValue('edit_emojis')
        .setEmoji('😀'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Modifier la Langue & Fuseau')
        .setDescription('Changer la langue (FR/EN) et le fuseau horaire')
        .setValue('edit_general')
        .setEmoji('🌐')
    );

  // Rangée de boutons pour les bascules rapides (Toggles)
  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_toggle_prefix')
      .setLabel(guildConfig.prefixCommandsEnabled ? 'Désactiver Préfixe' : 'Activer Préfixe')
      .setStyle(guildConfig.prefixCommandsEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(guildConfig.emojis.prefix),
    new ButtonBuilder()
      .setCustomId('settings_toggle_slash')
      .setLabel(guildConfig.slashCommandsEnabled ? 'Désactiver Slash' : 'Activer Slash')
      .setStyle(guildConfig.slashCommandsEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(guildConfig.emojis.slash),
    new ButtonBuilder()
      .setCustomId('settings_refresh')
      .setLabel('Actualiser')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('settings_reset')
      .setLabel('Réinitialiser')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️')
  );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  return {
    embeds: [embed],
    components: [selectRow, buttonsRow],
  };
}

export const settingsCommand: Command = {
  name: 'settings',
  description: 'Panneau de configuration et personnalisation du bot pour ce serveur',
  category: 'Administration',
  aliases: ['config', 'set'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Panneau de configuration et personnalisation du bot pour ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) {
      await ctx.reply({
        content: '❌ Cette commande ne peut être exécutée que dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    // Sécurité supplémentaire : vérifier les permissions côté préfixe
    if (!ctx.isSlash && ctx.member) {
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await ctx.reply({
          content: '❌ Vous devez avoir la permission `Gérer le serveur` pour accéder à ces réglages.',
        });
        return;
      }
    }

    const payload = buildSettingsMessage(ctx.guildConfig, ctx.author.username);
    await ctx.reply(payload);
  },
};
