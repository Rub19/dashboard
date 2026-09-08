import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { Command, CommandContext } from '../../types/command.js';
import { GuildConfig } from '../../types/guildConfig.js';
import { baseEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

/**
 * Construit l'embed et les composants pour la vue principale des paramètres
 */
export function buildSettingsMessage(guildConfig: GuildConfig, memberName?: string) {
  const t = getTranslation(guildConfig.language);

  const languageDisplay =
    guildConfig.language === 'fr'
      ? '🇫🇷 Français (`FR`)'
      : guildConfig.language === 'en'
      ? '🇬🇧 English (`EN`)'
      : guildConfig.language === 'es'
      ? '🇪🇸 Español (`ES`)'
      : guildConfig.language === 'de'
      ? '🇩🇪 Deutsch (`DE`)'
      : '🇫🇷 Français';

  const embed = baseEmbed('primary', {
    color: guildConfig.primaryColor,
    footerText: formatString(t.settings_footer, { botName: guildConfig.botName }),
  })
    .setTitle(`${guildConfig.emojis.settings} ${t.settings_title}`)
    .setDescription(
      `${formatString(t.settings_description, { botName: guildConfig.botName })}\n${t.settings_admin_only_note}`
    )
    .addFields(
      {
        name: t.settings_field_appearance,
        value:
          `• **${t.settings_label_display_name} :** \`${guildConfig.botName}\`\n` +
          `• **${t.settings_label_theme_preset} :** \`${guildConfig.themePreset || 'DEFAULT'}\`\n` +
          `• **${t.settings_label_primary_color} :** \`${guildConfig.primaryColor}\`\n` +
          `• **${t.settings_label_secondary_color} :** \`${guildConfig.secondaryColor}\`\n` +
          `• **${t.settings_label_success_error_color} :** \`${guildConfig.successColor}\` / \`${guildConfig.errorColor}\`\n` +
          `• **${t.settings_label_key_emojis} :** ${guildConfig.emojis.success} ${guildConfig.emojis.error} ${guildConfig.emojis.info}`,
        inline: false,
      },
      {
        name: t.settings_field_commands,
        value:
          `• **${t.settings_label_text_prefix} :** \`${guildConfig.prefix}\`\n` +
          `• **${formatString(t.settings_label_prefix_commands, { prefix: guildConfig.prefix })} :** ${
            guildConfig.prefixCommandsEnabled ? t.settings_state_enabled : t.settings_state_disabled
          }\n` +
          `• **${t.settings_label_slash_commands} :** ${
            guildConfig.slashCommandsEnabled ? t.settings_state_enabled : t.settings_state_disabled
          }\n` +
          `• **${t.settings_label_cooldown} :** \`${guildConfig.commandCooldown || 0}s\`\n` +
          `• **${t.settings_label_autodelete} :** ${guildConfig.autoDeleteCommands ? t.settings_state_yes : t.settings_state_no}`,
        inline: false,
      },
      {
        name: t.settings_field_language_audio,
        value:
          `• **${t.settings_label_language} :** ${languageDisplay}\n` +
          `• **${t.settings_label_default_volume} :** \`${guildConfig.musicDefaultVolume ?? 80}%\`\n` +
          `• **${t.settings_label_timezone} :** \`${guildConfig.timezone}\``,
        inline: false,
      },
      {
        name: t.settings_field_privacy,
        value:
          `• **${t.settings_label_response_visibility} :** ${
            guildConfig.responseVisibility === 'EPHEMERAL' ? t.settings_visibility_private : t.settings_visibility_public
          }\n` +
          `• **${t.settings_label_personality} :** \`${guildConfig.botPersonality || 'FRIENDLY'}\``,
        inline: false,
      }
    );

  // Menu déroulant de sélection d'actions
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('settings_select_category')
    .setPlaceholder(t.settings_select_placeholder)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_language_label)
        .setDescription(t.settings_opt_language_desc)
        .setValue('edit_language')
        .setEmoji('🌐'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_theme_label)
        .setDescription(t.settings_opt_theme_desc)
        .setValue('edit_theme')
        .setEmoji('🎨'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_privacy_label)
        .setDescription(t.settings_opt_privacy_desc)
        .setValue('edit_privacy')
        .setEmoji('🔒'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_personality_label)
        .setDescription(t.settings_opt_personality_desc)
        .setValue('edit_personality')
        .setEmoji('🎭'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_audio_label)
        .setDescription(t.settings_opt_audio_desc)
        .setValue('edit_audio')
        .setEmoji('🎛️'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_colors_label)
        .setDescription(t.settings_opt_colors_desc)
        .setValue('edit_colors')
        .setEmoji('🖌️'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_name_label)
        .setDescription(t.settings_opt_name_desc)
        .setValue('edit_name')
        .setEmoji('📝'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_prefix_label)
        .setDescription(t.settings_opt_prefix_desc)
        .setValue('edit_prefix')
        .setEmoji('⌨️'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_emojis_label)
        .setDescription(t.settings_opt_emojis_desc)
        .setValue('edit_emojis')
        .setEmoji('😀'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.settings_opt_autodelete_label)
        .setDescription(t.settings_opt_autodelete_desc)
        .setValue('toggle_autodelete')
        .setEmoji('🧹')
    );

  // Rangée de boutons pour les bascules rapides (Toggles)
  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_toggle_privacy')
      .setLabel(guildConfig.responseVisibility === 'EPHEMERAL' ? t.settings_btn_private_replies : t.settings_btn_public_replies)
      .setStyle(guildConfig.responseVisibility === 'EPHEMERAL' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji(guildConfig.responseVisibility === 'EPHEMERAL' ? '🔒' : '👁️'),
    new ButtonBuilder()
      .setCustomId('settings_toggle_prefix')
      .setLabel(guildConfig.prefixCommandsEnabled ? t.settings_btn_disable_prefix : t.settings_btn_enable_prefix)
      .setStyle(guildConfig.prefixCommandsEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(guildConfig.emojis.prefix),
    new ButtonBuilder()
      .setCustomId('settings_toggle_slash')
      .setLabel(guildConfig.slashCommandsEnabled ? t.settings_btn_disable_slash : t.settings_btn_enable_slash)
      .setStyle(guildConfig.slashCommandsEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(guildConfig.emojis.slash),
    new ButtonBuilder()
      .setCustomId('settings_refresh')
      .setLabel(t.settings_btn_refresh)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('settings_reset')
      .setLabel(t.settings_btn_reset)
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
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.guild) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)],
        ephemeral: true,
      });
      return;
    }

    // Sécurité supplémentaire : vérifier les permissions côté préfixe
    if (!ctx.isSlash && ctx.member) {
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(t.settings_perm_denied)],
        });
        return;
      }
    }

    const payload = buildSettingsMessage(ctx.guildConfig, ctx.author.username);
    await ctx.reply(payload);
  },
};
