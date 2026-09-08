import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { buildSettingsMessage } from '../commands/admin/settings.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { GuildConfig, HexColorRegex } from '../types/guildConfig.js';
import { aiRepository } from '../modules/ai/storage/aiRepository.js';
import { baseEmbed } from '../utils/embeds.js';
import { formatString, getTranslation, SupportedLanguage, TranslationDictionary } from '../utils/i18n.js';
import { logger } from '../utils/logger.js';

function backButton(t: TranslationDictionary): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId('settings_back_overview')
    .setLabel(t.settings_btn_back)
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary);
}

function personalityOptions(t: TranslationDictionary) {
  return [
    { key: 'FRIENDLY', label: t.settings_personality_friendly_label, emoji: '😊', desc: t.settings_personality_friendly_desc },
    { key: 'PROFESSIONAL', label: t.settings_personality_professional_label, emoji: '💼', desc: t.settings_personality_professional_desc },
    { key: 'HUMOROUS', label: t.settings_personality_humorous_label, emoji: '😄', desc: t.settings_personality_humorous_desc },
    { key: 'CONCISE', label: t.settings_personality_concise_label, emoji: '⚡', desc: t.settings_personality_concise_desc },
    { key: 'CYBER', label: t.settings_personality_cyber_label, emoji: '🤖', desc: t.settings_personality_cyber_desc },
  ] as const;
}

function themeOptions(t: TranslationDictionary) {
  return [
    { key: 'DEFAULT', label: t.settings_theme_default_label, emoji: '🎨', primary: '#5865F2', secondary: '#4752C4' },
    { key: 'CYBERPUNK', label: t.settings_theme_cyberpunk_label, emoji: '🌆', primary: '#00F0FF', secondary: '#7000FF' },
    { key: 'EMERALD', label: t.settings_theme_emerald_label, emoji: '💚', primary: '#10B981', secondary: '#047857' },
    { key: 'SUNSET', label: t.settings_theme_sunset_label, emoji: '🌅', primary: '#F59E0B', secondary: '#D97706' },
    { key: 'DARK', label: t.settings_theme_dark_label, emoji: '⚫', primary: '#1F2937', secondary: '#111827' },
  ] as const;
}

const LANGUAGE_OPTIONS: { key: SupportedLanguage; flag: string }[] = [
  { key: 'fr', flag: '🇫🇷' },
  { key: 'en', flag: '🇬🇧' },
  { key: 'es', flag: '🇪🇸' },
  { key: 'de', flag: '🇩🇪' },
];

/** Vue dédiée : Personnalité & Style du Bot — embed + boutons de choix direct. */
function buildPersonalityView(conf: GuildConfig) {
  const t = getTranslation(conf.language);
  const options = personalityOptions(t);
  const current = conf.botPersonality || 'FRIENDLY';
  const active = options.find((o) => o.key === current) || options[0];

  const embed = baseEmbed('primary', { color: conf.primaryColor, footerText: formatString(t.settings_personality_view_footer, { botName: conf.botName }) })
    .setTitle(t.settings_personality_view_title)
    .setDescription(
      formatString(t.settings_personality_view_desc, {
        botName: conf.botName,
        emoji: active.emoji,
        label: active.label,
        desc: active.desc,
      })
    )
    .addFields(
      options.map((o) => ({
        name: `${o.emoji} ${o.label}${o.key === current ? ' ✅' : ''}`,
        value: o.desc,
        inline: true,
      }))
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    options.slice(0, 3).map((o) =>
      new ButtonBuilder()
        .setCustomId(`settings_set_personality_${o.key}`)
        .setLabel(o.label)
        .setEmoji(o.emoji)
        .setStyle(o.key === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...options.slice(3).map((o) =>
      new ButtonBuilder()
        .setCustomId(`settings_set_personality_${o.key}`)
        .setLabel(o.label)
        .setEmoji(o.emoji)
        .setStyle(o.key === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
    ),
    backButton(t)
  );

  return { embeds: [embed], components: [row1, row2] };
}

/** Vue dédiée : Thème Graphique — embed + boutons de choix direct. */
function buildThemeView(conf: GuildConfig) {
  const t = getTranslation(conf.language);
  const options = themeOptions(t);
  const current = conf.themePreset || 'DEFAULT';
  const active = options.find((o) => o.key === current) || options[0];

  const embed = baseEmbed('primary', { color: active.primary, footerText: formatString(t.settings_theme_view_footer, { botName: conf.botName }) })
    .setTitle(t.settings_theme_view_title)
    .setDescription(
      formatString(t.settings_theme_view_desc, {
        emoji: active.emoji,
        label: active.label,
        primary: active.primary,
        secondary: active.secondary,
      })
    )
    .addFields(
      options.map((o) => ({
        name: `${o.emoji} ${o.label}${o.key === current ? ' ✅' : ''}`,
        value: `\`${o.primary}\``,
        inline: true,
      }))
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    options.slice(0, 3).map((o) =>
      new ButtonBuilder()
        .setCustomId(`settings_set_theme_${o.key}`)
        .setLabel(o.label)
        .setEmoji(o.emoji)
        .setStyle(o.key === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...options.slice(3).map((o) =>
      new ButtonBuilder()
        .setCustomId(`settings_set_theme_${o.key}`)
        .setLabel(o.label)
        .setEmoji(o.emoji)
        .setStyle(o.key === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
    ),
    backButton(t)
  );

  return { embeds: [embed], components: [row1, row2] };
}

/** Vue dédiée : Confidentialité des Réponses — embed + boutons de choix direct. */
function buildPrivacyView(conf: GuildConfig) {
  const t = getTranslation(conf.language);
  const isEphemeral = conf.responseVisibility === 'EPHEMERAL';

  const embed = baseEmbed('primary', { color: conf.primaryColor, footerText: formatString(t.settings_privacy_view_footer, { botName: conf.botName }) })
    .setTitle(t.settings_privacy_view_title)
    .setDescription(
      formatString(t.settings_privacy_view_desc, {
        state: isEphemeral ? `🔒 ${t.settings_privacy_private_label}` : `👁️ ${t.settings_privacy_public_label}`,
      })
    )
    .addFields(
      { name: `👁️ ${t.settings_privacy_public_label}${!isEphemeral ? ' ✅' : ''}`, value: t.settings_privacy_field_public_value, inline: true },
      { name: `🔒 ${t.settings_privacy_private_label}${isEphemeral ? ' ✅' : ''}`, value: t.settings_privacy_field_private_value, inline: true }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_set_privacy_PUBLIC')
      .setLabel(t.settings_privacy_public_label)
      .setEmoji('👁️')
      .setStyle(!isEphemeral ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('settings_set_privacy_EPHEMERAL')
      .setLabel(t.settings_privacy_private_label)
      .setEmoji('🔒')
      .setStyle(isEphemeral ? ButtonStyle.Primary : ButtonStyle.Secondary),
    backButton(t)
  );

  return { embeds: [embed], components: [row] };
}

/** Vue dédiée : Langue du Bot — embed + boutons de choix direct (propre au panneau /settings). */
function buildLanguageView(conf: GuildConfig) {
  const current = (conf.language as SupportedLanguage) || 'fr';
  const t = getTranslation(current);

  const embed = baseEmbed('primary', { color: conf.primaryColor, footerText: formatString(t.settings_language_view_footer, { botName: conf.botName }) })
    .setTitle(t.settings_language_view_title)
    .setDescription(
      formatString(t.settings_language_view_desc, {
        botName: conf.botName,
        flag: t.lang_flag,
        name: t.lang_name,
        code: current.toUpperCase(),
      })
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...LANGUAGE_OPTIONS.map((o) =>
      new ButtonBuilder()
        .setCustomId(`settings_set_lang_${o.key}`)
        .setLabel(getTranslation(o.key).lang_name)
        .setEmoji(o.flag)
        .setStyle(o.key === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
    ),
    backButton(t)
  );

  return { embeds: [embed], components: [row] };
}

function syncAiLanguage(guildId: string, language: SupportedLanguage) {
  try {
    const aiSettings = aiRepository.getSettings(guildId);
    aiRepository.saveSettings(guildId, {
      personality: {
        ...aiSettings.personality,
        language,
        replyInUserLanguage: true,
      },
    });
  } catch (e) {
    logger.warn('Failed to sync AI settings language:', e);
  }
}

export async function handleSettingsSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const confForPerm = interaction.guildId ? guildConfigService.getConfig(interaction.guildId) : null;
  if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    const t = getTranslation(confForPerm?.language);
    await interaction.reply({
      embeds: [baseEmbed('error').setDescription(t.settings_perm_denied_modify)],
      ephemeral: true,
    });
    return;
  }

  const selected = interaction.values[0];
  const conf = guildConfigService.getConfig(interaction.guildId);
  const t = getTranslation(conf.language);

  if (selected === 'edit_language') {
    await interaction.update(buildLanguageView(conf));
    return;
  } else if (selected === 'edit_theme') {
    await interaction.update(buildThemeView(conf));
    return;
  } else if (selected === 'toggle_autodelete') {
    const updated = guildConfigService.updateConfig(interaction.guildId, {
      autoDeleteCommands: !conf.autoDeleteCommands,
    });
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
    return;
  } else if (selected === 'edit_audio') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_audio')
      .setTitle(t.settings_modal_audio_title);

    const volumeInput = new TextInputBuilder()
      .setCustomId('input_music_volume')
      .setLabel(t.settings_modal_audio_volume_label)
      .setStyle(TextInputStyle.Short)
      .setValue(String(conf.musicDefaultVolume ?? 80))
      .setRequired(true)
      .setMaxLength(3);

    const cooldownInput = new TextInputBuilder()
      .setCustomId('input_cooldown')
      .setLabel(t.settings_modal_audio_cooldown_label)
      .setStyle(TextInputStyle.Short)
      .setValue(String(conf.commandCooldown ?? 0))
      .setRequired(true)
      .setMaxLength(2);

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(volumeInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(cooldownInput)
    );

    await interaction.showModal(modal);
    return;
  } else if (selected === 'edit_privacy') {
    await interaction.update(buildPrivacyView(conf));
    return;
  } else if (selected === 'edit_personality') {
    await interaction.update(buildPersonalityView(conf));
    return;
  } else if (selected === 'edit_colors') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_colors')
      .setTitle(t.settings_modal_colors_title);

    const primaryInput = new TextInputBuilder()
      .setCustomId('input_primary_color')
      .setLabel(t.settings_modal_colors_primary_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.primaryColor)
      .setRequired(true)
      .setMaxLength(7);

    const secondaryInput = new TextInputBuilder()
      .setCustomId('input_secondary_color')
      .setLabel(t.settings_modal_colors_secondary_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.secondaryColor)
      .setRequired(true)
      .setMaxLength(7);

    const successInput = new TextInputBuilder()
      .setCustomId('input_success_color')
      .setLabel(t.settings_modal_colors_success_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.successColor)
      .setRequired(true)
      .setMaxLength(7);

    const errorInput = new TextInputBuilder()
      .setCustomId('input_error_color')
      .setLabel(t.settings_modal_colors_error_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.errorColor)
      .setRequired(true)
      .setMaxLength(7);

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(primaryInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(secondaryInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(successInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(errorInput)
    );

    await interaction.showModal(modal);
  } else if (selected === 'edit_name') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_name')
      .setTitle(t.settings_modal_name_title);

    const nameInput = new TextInputBuilder()
      .setCustomId('input_bot_name')
      .setLabel(t.settings_modal_name_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.botName)
      .setRequired(true)
      .setMaxLength(32);

    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nameInput));
    await interaction.showModal(modal);
  } else if (selected === 'edit_prefix') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_prefix')
      .setTitle(t.settings_modal_prefix_title);

    const prefixInput = new TextInputBuilder()
      .setCustomId('input_prefix')
      .setLabel(t.settings_modal_prefix_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.prefix)
      .setRequired(true)
      .setMaxLength(5);

    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(prefixInput));
    await interaction.showModal(modal);
  } else if (selected === 'edit_emojis') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_emojis')
      .setTitle(t.settings_modal_emojis_title);

    const successEmoji = new TextInputBuilder()
      .setCustomId('input_emoji_success')
      .setLabel(t.settings_modal_emojis_success_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.emojis.success)
      .setRequired(true)
      .setMaxLength(10);

    const errorEmoji = new TextInputBuilder()
      .setCustomId('input_emoji_error')
      .setLabel(t.settings_modal_emojis_error_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.emojis.error)
      .setRequired(true)
      .setMaxLength(10);

    const infoEmoji = new TextInputBuilder()
      .setCustomId('input_emoji_info')
      .setLabel(t.settings_modal_emojis_info_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.emojis.info)
      .setRequired(true)
      .setMaxLength(10);

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(successEmoji),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(errorEmoji),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(infoEmoji)
    );

    await interaction.showModal(modal);
  } else if (selected === 'edit_general') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_general')
      .setTitle(t.settings_modal_general_title);

    const langInput = new TextInputBuilder()
      .setCustomId('input_language')
      .setLabel(t.settings_modal_general_lang_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.language)
      .setRequired(true)
      .setMaxLength(2);

    const tzInput = new TextInputBuilder()
      .setCustomId('input_timezone')
      .setLabel(t.settings_modal_general_tz_label)
      .setStyle(TextInputStyle.Short)
      .setValue(conf.timezone)
      .setRequired(true)
      .setMaxLength(32);

    modal.addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(langInput),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(tzInput)
    );

    await interaction.showModal(modal);
  }
}

export async function handleSettingsButton(interaction: ButtonInteraction): Promise<void> {
  const confForPerm = interaction.guildId ? guildConfigService.getConfig(interaction.guildId) : null;
  if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    const t = getTranslation(confForPerm?.language);
    await interaction.reply({
      embeds: [baseEmbed('error').setDescription(t.settings_perm_denied_interact)],
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId;
  const current = guildConfigService.getConfig(guildId);

  if (interaction.customId === 'settings_back_overview') {
    const updated = guildConfigService.getConfig(guildId);
    await interaction.update(buildSettingsMessage(updated));
    return;
  }

  if (interaction.customId.startsWith('settings_set_personality_')) {
    const nextPersonality = interaction.customId.replace('settings_set_personality_', '') as GuildConfig['botPersonality'];
    if (!personalityOptions(getTranslation(current.language)).some((o) => o.key === nextPersonality)) return;

    const updated = guildConfigService.updateConfig(guildId, { botPersonality: nextPersonality });

    try {
      const toneMap: Record<string, any> = {
        FRIENDLY: 'FRIENDLY',
        PROFESSIONAL: 'PROFESSIONAL',
        HUMOROUS: 'FUNNY',
        CONCISE: 'CONCISE',
        CYBER: 'CUSTOM',
      };
      const aiSettings = aiRepository.getSettings(guildId);
      aiRepository.saveSettings(guildId, {
        personality: {
          ...aiSettings.personality,
          tone: toneMap[nextPersonality as string] || 'FRIENDLY',
        },
      });
    } catch (e) {
      logger.warn('Failed to sync AI settings personality:', e);
    }

    await interaction.update(buildPersonalityView(updated));
    return;
  }

  if (interaction.customId.startsWith('settings_set_theme_')) {
    const key = interaction.customId.replace('settings_set_theme_', '');
    const preset = themeOptions(getTranslation(current.language)).find((o) => o.key === key);
    if (!preset) return;

    const updated = guildConfigService.updateConfig(guildId, {
      themePreset: preset.key,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
    });

    await interaction.update(buildThemeView(updated));
    return;
  }

  if (interaction.customId.startsWith('settings_set_privacy_')) {
    const key = interaction.customId.replace('settings_set_privacy_', '');
    if (key !== 'PUBLIC' && key !== 'EPHEMERAL') return;

    const updated = guildConfigService.updateConfig(guildId, { responseVisibility: key });
    await interaction.update(buildPrivacyView(updated));
    return;
  }

  if (interaction.customId.startsWith('settings_set_lang_')) {
    const targetLang = interaction.customId.replace('settings_set_lang_', '') as SupportedLanguage;
    if (!['fr', 'en', 'es', 'de'].includes(targetLang)) return;

    const updated = guildConfigService.updateConfig(guildId, { language: targetLang });
    syncAiLanguage(guildId, targetLang);

    await interaction.update(buildLanguageView(updated));
    return;
  }

  if (interaction.customId.startsWith('set_lang_')) {
    const targetLang = interaction.customId.replace('set_lang_', '') as SupportedLanguage;
    if (['fr', 'en', 'es', 'de'].includes(targetLang)) {
      const updated = guildConfigService.updateConfig(guildId, { language: targetLang });
      try {
        const aiSettings = aiRepository.getSettings(guildId);
        aiRepository.saveSettings(guildId, {
          personality: {
            ...aiSettings.personality,
            language: targetLang,
            replyInUserLanguage: true,
          },
        });
      } catch (e) {
        logger.warn('Failed to sync AI settings language:', e);
      }

      const t = getTranslation(targetLang);
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`${t.lang_flag} ${t.lang_changed_title}`)
        .setDescription(t.lang_changed_desc)
        .addFields({
          name: '🌐 Language / Idioma / Sprache',
          value: `**${t.lang_flag} ${t.lang_name}** (\`${targetLang.toUpperCase()}\`)`,
          inline: true,
        })
        .setFooter({ text: `${updated.botName} • Multilingual Support 2.0` })
        .setTimestamp();

      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('set_lang_fr')
          .setLabel('Français')
          .setEmoji('🇫🇷')
          .setStyle(targetLang === 'fr' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('set_lang_en')
          .setLabel('English')
          .setEmoji('🇬🇧')
          .setStyle(targetLang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('set_lang_es')
          .setLabel('Español')
          .setEmoji('🇪🇸')
          .setStyle(targetLang === 'es' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('set_lang_de')
          .setLabel('Deutsch')
          .setEmoji('🇩🇪')
          .setStyle(targetLang === 'de' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      await interaction.update({ embeds: [embed], components: [buttonsRow] });
      return;
    }
  }

  if (interaction.customId === 'settings_toggle_privacy') {
    const nextVis = current.responseVisibility === 'EPHEMERAL' ? 'PUBLIC' : 'EPHEMERAL';
    const updated = guildConfigService.updateConfig(guildId, {
      responseVisibility: nextVis,
    });
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
  } else if (interaction.customId === 'settings_toggle_prefix') {
    const updated = guildConfigService.updateConfig(guildId, {
      prefixCommandsEnabled: !current.prefixCommandsEnabled,
    });
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
  } else if (interaction.customId === 'settings_toggle_slash') {
    const updated = guildConfigService.updateConfig(guildId, {
      slashCommandsEnabled: !current.slashCommandsEnabled,
    });
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
  } else if (interaction.customId === 'settings_refresh') {
    const updated = guildConfigService.getConfig(guildId);
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
  } else if (interaction.customId === 'settings_reset') {
    const reset = guildConfigService.resetConfig(guildId);
    const messagePayload = buildSettingsMessage(reset);
    await interaction.update(messagePayload);
  }
}

export async function handleSettingsModal(interaction: ModalSubmitInteraction): Promise<void> {
  const confForPerm = interaction.guildId ? guildConfigService.getConfig(interaction.guildId) : null;
  if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    const t = getTranslation(confForPerm?.language);
    await interaction.reply({
      embeds: [baseEmbed('error').setDescription(t.settings_action_unauthorized)],
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId;
  const t = getTranslation(confForPerm?.language);

  try {
    if (interaction.customId === 'modal_settings_colors') {
      const primary = interaction.fields.getTextInputValue('input_primary_color').trim().toUpperCase();
      const secondary = interaction.fields.getTextInputValue('input_secondary_color').trim().toUpperCase();
      const success = interaction.fields.getTextInputValue('input_success_color').trim().toUpperCase();
      const error = interaction.fields.getTextInputValue('input_error_color').trim().toUpperCase();

      for (const [name, val] of [
        [t.settings_color_name_primary, primary],
        [t.settings_color_name_secondary, secondary],
        [t.settings_color_name_success, success],
        [t.settings_color_name_error, error],
      ]) {
        if (!HexColorRegex.test(val)) {
          await interaction.reply({
            embeds: [baseEmbed('error').setDescription(formatString(t.settings_invalid_hex, { name, val }))],
            ephemeral: true,
          });
          return;
        }
      }

      const updated = guildConfigService.updateConfig(guildId, {
        primaryColor: primary,
        secondaryColor: secondary,
        successColor: success,
        errorColor: error,
      });

      await updateSettingsView(interaction, updated);
    } else if (interaction.customId === 'modal_settings_name') {
      const name = interaction.fields.getTextInputValue('input_bot_name').trim();
      if (name.length < 1 || name.length > 32) {
        await interaction.reply({
          embeds: [baseEmbed('error').setDescription(t.settings_invalid_name_length)],
          ephemeral: true,
        });
        return;
      }

      const updated = guildConfigService.updateConfig(guildId, { botName: name });
      await updateSettingsView(interaction, updated);
    } else if (interaction.customId === 'modal_settings_prefix') {
      const prefix = interaction.fields.getTextInputValue('input_prefix').trim();
      if (prefix.length < 1 || prefix.length > 5 || /\s/.test(prefix)) {
        await interaction.reply({
          embeds: [baseEmbed('error').setDescription(t.settings_invalid_prefix)],
          ephemeral: true,
        });
        return;
      }

      const updated = guildConfigService.updateConfig(guildId, { prefix });
      await updateSettingsView(interaction, updated);
    } else if (interaction.customId === 'modal_settings_emojis') {
      const success = interaction.fields.getTextInputValue('input_emoji_success').trim();
      const error = interaction.fields.getTextInputValue('input_emoji_error').trim();
      const info = interaction.fields.getTextInputValue('input_emoji_info').trim();

      const updated = guildConfigService.updateConfig(guildId, {
        emojis: {
          success: success || '✅',
          error: error || '❌',
          info: info || 'ℹ️',
        },
      });
      await updateSettingsView(interaction, updated);
    } else if (interaction.customId === 'modal_settings_general') {
      const rawLang = interaction.fields.getTextInputValue('input_language').trim().toLowerCase();
      const tz = interaction.fields.getTextInputValue('input_timezone').trim();

      const validLangs: SupportedLanguage[] = ['fr', 'en', 'es', 'de'];
      const language: SupportedLanguage = validLangs.includes(rawLang as any) ? (rawLang as SupportedLanguage) : 'fr';
      const updated = guildConfigService.updateConfig(guildId, {
        language,
        timezone: tz || 'Europe/Paris',
      });
      try {
        const aiSettings = aiRepository.getSettings(guildId);
        aiRepository.saveSettings(guildId, {
          personality: {
            ...aiSettings.personality,
            language,
            replyInUserLanguage: true,
          },
        });
      } catch (e) {
        logger.warn('Failed to sync AI settings language:', e);
      }
      await updateSettingsView(interaction, updated);
    } else if (interaction.customId === 'modal_settings_audio') {
      const rawVol = parseInt(interaction.fields.getTextInputValue('input_music_volume').trim(), 10);
      const rawCd = parseInt(interaction.fields.getTextInputValue('input_cooldown').trim(), 10);

      const musicDefaultVolume = isNaN(rawVol) ? 80 : Math.max(10, Math.min(100, rawVol));
      const commandCooldown = isNaN(rawCd) ? 0 : Math.max(0, Math.min(15, rawCd));

      const updated = guildConfigService.updateConfig(guildId, {
        musicDefaultVolume,
        commandCooldown,
      });
      await updateSettingsView(interaction, updated);
    }
  } catch (err) {
    logger.error('Erreur lors du traitement du modal settings :', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [baseEmbed('error').setDescription(t.settings_update_error)],
        ephemeral: true,
      });
    }
  }
}

async function updateSettingsView(interaction: ModalSubmitInteraction, updatedConfig: import('../types/guildConfig.js').GuildConfig) {
  const t = getTranslation(updatedConfig.language);
  const messagePayload = buildSettingsMessage(updatedConfig);
  if (interaction.isFromMessage() && interaction.message) {
    await interaction.message.edit(messagePayload);
    await interaction.reply({
      embeds: [baseEmbed('success').setDescription(formatString(t.settings_updated_success, { emoji: updatedConfig.emojis.success }))],
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      ...messagePayload,
      ephemeral: true,
    });
  }
}
