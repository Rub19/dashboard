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
import { HexColorRegex } from '../types/guildConfig.js';
import { aiRepository } from '../modules/ai/storage/aiRepository.js';
import { getTranslation, SupportedLanguage } from '../utils/i18n.js';
import { logger } from '../utils/logger.js';

export async function handleSettingsSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ Vous devez avoir la permission `Gérer le serveur` pour modifier ces réglages.',
      ephemeral: true,
    });
    return;
  }

  const selected = interaction.values[0];
  const conf = guildConfigService.getConfig(interaction.guildId);

  if (selected === 'edit_language') {
    const langs: SupportedLanguage[] = ['fr', 'en', 'es', 'de'];
    const currentIdx = langs.indexOf((conf.language as SupportedLanguage) || 'fr');
    const nextLang = langs[(currentIdx + 1) % langs.length];
    const updated = guildConfigService.updateConfig(interaction.guildId, { language: nextLang });

    try {
      const aiSettings = aiRepository.getSettings(interaction.guildId);
      aiRepository.saveSettings(interaction.guildId, {
        persona: {
          ...aiSettings.persona,
          language: nextLang,
          replyInUserLanguage: true,
        },
      });
    } catch (e) {
      logger.warn('Failed to sync AI settings language:', e);
    }

    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
    return;
  } else if (selected === 'edit_theme') {
    const presets = [
      { name: 'DEFAULT', primary: '#5865F2', secondary: '#4752C4' },
      { name: 'CYBER_NEON', primary: '#00F0FF', secondary: '#7000FF' },
      { name: 'EMERALD', primary: '#10B981', secondary: '#047857' },
      { name: 'CRIMSON', primary: '#EF4444', secondary: '#B91C1C' },
      { name: 'SUNSET', primary: '#F59E0B', secondary: '#D97706' },
      { name: 'AMETHYST', primary: '#8B5CF6', secondary: '#6D28D9' },
    ];
    const currentIdx = presets.findIndex((p) => p.name === conf.themePreset);
    const nextPreset = presets[(currentIdx + 1) % presets.length];
    const updated = guildConfigService.updateConfig(interaction.guildId, {
      themePreset: nextPreset.name,
      primaryColor: nextPreset.primary,
      secondaryColor: nextPreset.secondary,
    });
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
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
      .setTitle('🎛️ Audio & Anti-Spam Cooldown');

    const volumeInput = new TextInputBuilder()
      .setCustomId('input_music_volume')
      .setLabel('Volume musique par défaut (10 - 100 %)')
      .setStyle(TextInputStyle.Short)
      .setValue(String(conf.musicDefaultVolume ?? 80))
      .setRequired(true)
      .setMaxLength(3);

    const cooldownInput = new TextInputBuilder()
      .setCustomId('input_cooldown')
      .setLabel('Cooldown anti-spam par commande (0 - 15 s)')
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
    const nextVis = conf.responseVisibility === 'EPHEMERAL' ? 'PUBLIC' : 'EPHEMERAL';
    const updated = guildConfigService.updateConfig(interaction.guildId, {
      responseVisibility: nextVis,
    });
    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
    return;
  } else if (selected === 'edit_personality') {
    const personalities = ['FRIENDLY', 'PROFESSIONAL', 'HUMOROUS', 'CONCISE', 'CYBER'] as const;
    const currentIdx = personalities.indexOf((conf.botPersonality as any) || 'FRIENDLY');
    const nextPersonality = personalities[(currentIdx + 1) % personalities.length];

    const updated = guildConfigService.updateConfig(interaction.guildId, {
      botPersonality: nextPersonality,
    });

    try {
      const toneMap: Record<string, any> = {
        FRIENDLY: 'FRIENDLY',
        PROFESSIONAL: 'PROFESSIONAL',
        HUMOROUS: 'FUNNY',
        CONCISE: 'CONCISE',
        CYBER: 'CUSTOM',
      };
      const aiSettings = aiRepository.getSettings(interaction.guildId);
      aiRepository.saveSettings(interaction.guildId, {
        persona: {
          ...aiSettings.persona,
          tone: toneMap[nextPersonality] || 'FRIENDLY',
        },
      });
    } catch (e) {
      logger.warn('Failed to sync AI settings personality:', e);
    }

    const messagePayload = buildSettingsMessage(updated);
    await interaction.update(messagePayload);
    return;
  } else if (selected === 'edit_colors') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_colors')
      .setTitle('🎨 Couleurs du Bot (Format HEX)');

    const primaryInput = new TextInputBuilder()
      .setCustomId('input_primary_color')
      .setLabel('Couleur Principale (ex: #5865F2)')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.primaryColor)
      .setRequired(true)
      .setMaxLength(7);

    const secondaryInput = new TextInputBuilder()
      .setCustomId('input_secondary_color')
      .setLabel('Couleur Secondaire (ex: #4752C4)')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.secondaryColor)
      .setRequired(true)
      .setMaxLength(7);

    const successInput = new TextInputBuilder()
      .setCustomId('input_success_color')
      .setLabel('Couleur Succès (ex: #57F287)')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.successColor)
      .setRequired(true)
      .setMaxLength(7);

    const errorInput = new TextInputBuilder()
      .setCustomId('input_error_color')
      .setLabel('Couleur Erreur (ex: #ED4245)')
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
      .setTitle('📝 Nom affiché du Bot');

    const nameInput = new TextInputBuilder()
      .setCustomId('input_bot_name')
      .setLabel('Nom affiché dans les messages / embeds')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.botName)
      .setRequired(true)
      .setMaxLength(32);

    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nameInput));
    await interaction.showModal(modal);
  } else if (selected === 'edit_prefix') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_prefix')
      .setTitle('⌨️ Préfixe des Commandes');

    const prefixInput = new TextInputBuilder()
      .setCustomId('input_prefix')
      .setLabel('Nouveau préfixe (ex: !, ?, $, >>)')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.prefix)
      .setRequired(true)
      .setMaxLength(5);

    modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(prefixInput));
    await interaction.showModal(modal);
  } else if (selected === 'edit_emojis') {
    const modal = new ModalBuilder()
      .setCustomId('modal_settings_emojis')
      .setTitle('😀 Personnalisation des Emojis');

    const successEmoji = new TextInputBuilder()
      .setCustomId('input_emoji_success')
      .setLabel('Emoji Succès')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.emojis.success)
      .setRequired(true)
      .setMaxLength(10);

    const errorEmoji = new TextInputBuilder()
      .setCustomId('input_emoji_error')
      .setLabel('Emoji Erreur')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.emojis.error)
      .setRequired(true)
      .setMaxLength(10);

    const infoEmoji = new TextInputBuilder()
      .setCustomId('input_emoji_info')
      .setLabel('Emoji Info')
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
      .setTitle('🌐 Langue & Fuseau Horaire');

    const langInput = new TextInputBuilder()
      .setCustomId('input_language')
      .setLabel('Langue du bot (fr ou en)')
      .setStyle(TextInputStyle.Short)
      .setValue(conf.language)
      .setRequired(true)
      .setMaxLength(2);

    const tzInput = new TextInputBuilder()
      .setCustomId('input_timezone')
      .setLabel('Fuseau horaire (ex: Europe/Paris)')
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
  if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ Vous devez avoir la permission `Gérer le serveur` pour interagir avec ces boutons.',
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId;
  const current = guildConfigService.getConfig(guildId);

  if (interaction.customId.startsWith('set_lang_')) {
    const targetLang = interaction.customId.replace('set_lang_', '') as SupportedLanguage;
    if (['fr', 'en', 'es', 'de'].includes(targetLang)) {
      const updated = guildConfigService.updateConfig(guildId, { language: targetLang });
      try {
        const aiSettings = aiRepository.getSettings(guildId);
        aiRepository.saveSettings(guildId, {
          persona: {
            ...aiSettings.persona,
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
  if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ Action non autorisée.',
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId;

  try {
    if (interaction.customId === 'modal_settings_colors') {
      const primary = interaction.fields.getTextInputValue('input_primary_color').trim().toUpperCase();
      const secondary = interaction.fields.getTextInputValue('input_secondary_color').trim().toUpperCase();
      const success = interaction.fields.getTextInputValue('input_success_color').trim().toUpperCase();
      const error = interaction.fields.getTextInputValue('input_error_color').trim().toUpperCase();

      for (const [name, val] of [
        ['Principale', primary],
        ['Secondaire', secondary],
        ['Succès', success],
        ['Erreur', error],
      ]) {
        if (!HexColorRegex.test(val)) {
          await interaction.reply({
            content: `❌ Le code couleur HEX pour **${name}** est invalide (\`${val}\`). Il doit respecter le format \`#RRGGBB\` (ex: #5865F2).`,
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
          content: '❌ Le nom doit comporter entre 1 et 32 caractères.',
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
          content: '❌ Le préfixe doit comporter entre 1 et 5 caractères et ne pas contenir d\'espace.',
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
          persona: {
            ...aiSettings.persona,
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
        content: '❌ Une erreur est survenue lors de la mise à jour des paramètres.',
        ephemeral: true,
      });
    }
  }
}

async function updateSettingsView(interaction: ModalSubmitInteraction, updatedConfig: import('../types/guildConfig.js').GuildConfig) {
  const messagePayload = buildSettingsMessage(updatedConfig);
  if (interaction.isFromMessage() && interaction.message) {
    await interaction.message.edit(messagePayload);
    await interaction.reply({
      content: `${updatedConfig.emojis.success} Configuration mise à jour avec succès !`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      ...messagePayload,
      ephemeral: true,
    });
  }
}

