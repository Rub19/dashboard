import {
  ActionRowBuilder,
  ButtonInteraction,
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

  if (selected === 'edit_colors') {
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

  if (interaction.customId === 'settings_toggle_prefix') {
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

      const language = rawLang === 'en' ? 'en' : 'fr';
      const updated = guildConfigService.updateConfig(guildId, {
        language,
        timezone: tz || 'Europe/Paris',
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

