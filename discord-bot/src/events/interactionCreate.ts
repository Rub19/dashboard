import { Interaction } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import {
  handleSettingsButton,
  handleSettingsModal,
  handleSettingsSelectMenu,
} from '../handlers/settingsInteractionHandler.js';
import { handleTicketButton } from '../modules/tickets/interactions/ticketButtonHandler.js';
import { handleTicketModal } from '../modules/tickets/interactions/ticketModalHandler.js';
import {
  handleRoleButton,
  handleRoleSelect,
} from '../modules/roles/interactions/roleInteractionHandler.js';
import { handleGiveawayButton } from '../modules/giveaways/interactions/giveawayInteractionHandler.js';
import {
  handleSuggestionButton,
  handleSuggestionModal,
} from '../modules/suggestions/interactions/suggestionInteractionHandler.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { customCommandStorage } from '../modules/customCommands/storage/customCommandStorage.js';
import { CustomCommandService } from '../modules/customCommands/services/customCommandService.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { statsService } from '../services/statsService.js';
import { CommandContext } from '../types/command.js';
import { DiscordMusicPanel } from '../modules/music/ui/discordMusicPanel.js';
import { WelcomeInteractionHandler } from '../modules/welcome/interactions/welcomeInteractionHandler.js';
import { DiscordVoicePanel } from '../modules/voice/ui/discordVoicePanel.js';
import { DiscordAiPanel } from '../modules/ai/ui/discordAiPanel.js';
import { discordFormPanel } from '../modules/forms/ui/discordFormPanel.js';
import { discordPollPanel } from '../modules/polls/ui/discordPollPanel.js';
import { logger } from '../utils/logger.js';

export async function onInteractionCreate(interaction: Interaction) {
  // 1. Gestion des composants d'interaction (Boutons, Menus déroulants, Modals)
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'settings_select_category') {
      await handleSettingsSelectMenu(interaction);
    } else if (interaction.customId.startsWith('role_select:')) {
      await handleRoleSelect(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('settings_')) {
      await handleSettingsButton(interaction);
    } else if (interaction.customId.startsWith('ticket_')) {
      await handleTicketButton(interaction);
    } else if (interaction.customId.startsWith('role_btn:')) {
      await handleRoleButton(interaction);
    } else if (interaction.customId.startsWith('giveaway_')) {
      await handleGiveawayButton(interaction);
    } else if (interaction.customId.startsWith('sugg_')) {
      await handleSuggestionButton(interaction);
    } else if (interaction.customId.startsWith('music_')) {
      await DiscordMusicPanel.handleButtonInteraction(interaction);
    } else if (interaction.customId.startsWith('welcome_')) {
      await WelcomeInteractionHandler.handleButton(interaction);
    } else if (interaction.customId.startsWith('voice_')) {
      await DiscordVoicePanel.handleButton(interaction);
    } else if (interaction.customId.startsWith('ai_')) {
      await DiscordAiPanel.handleButton(interaction);
    } else if (interaction.customId.startsWith('form_')) {
      await discordFormPanel.handleButton(interaction);
    } else if (interaction.customId.startsWith('poll_')) {
      await discordPollPanel.handleButton(interaction);
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('modal_settings_')) {
      await handleSettingsModal(interaction);
    } else if (interaction.customId.startsWith('modal_ticket_')) {
      await handleTicketModal(interaction);
    } else if (
      interaction.customId.startsWith('modal_sugg_') ||
      interaction.customId === 'modal_suggest_create'
    ) {
      await handleSuggestionModal(interaction);
    } else if (interaction.customId.startsWith('modal_voice_')) {
      await DiscordVoicePanel.handleModal(interaction);
    } else if (interaction.customId.startsWith('form_modal_submit:')) {
      await discordFormPanel.handleModalSubmit(interaction);
    }
    return;
  }

  // 2. Gestion des Slash Commands
  if (!interaction.isChatInputCommand()) return;

  logger.info(`[INTERACTION RECUE] /${interaction.commandName} par ${interaction.user.tag} dans ${interaction.guild?.name || 'DM'}`);

  const guildConfig = guildConfigService.getConfig(interaction.guildId);

  // Vérifier si les slash commands sont désactivées sur ce serveur (sauf /settings qui reste toujours accessible aux admins)
  if (!guildConfig.slashCommandsEnabled && interaction.commandName !== 'settings') {
    await interaction.reply({
      content: `${guildConfig.emojis.error} Les commandes Slash sont actuellement **désactivées** sur ce serveur par les administrateurs.`,
      ephemeral: true,
    });
    return;
  }

  const command = commandRegistry.getCommand(interaction.commandName);
  if (!command) {
    // Try custom commands (slash)
    if (interaction.guildId) {
      const customCmd = customCommandStorage.getByName(interaction.guildId, interaction.commandName);
      if (customCmd && customCmd.enabled && (customCmd.triggerType === 'slash' || customCmd.triggerType === 'both')) {
        await CustomCommandService.executeSlash(customCmd, interaction as any).catch(() => null);
        return;
      }
    }
    logger.warn(`Commande Slash introuvable : ${interaction.commandName}`);
    await interaction.reply({
      content: '❌ Cette commande n\'est plus disponible.',
      ephemeral: true,
    });
    return;
  }

  const context = new CommandContext({
    interaction,
    guildConfig,
  });

  try {
    statsService.recordCommand(
      interaction.guildId || 'dm',
      interaction.guild?.name || 'Direct Message',
      interaction.user.tag,
      command.name,
      'slash'
    );
    if (interaction.guildId) {
      analyticsService.recordCommand(interaction.guildId, command.name, interaction.user.id);
    }
    await command.execute(context);
    logger.info(`[INTERACTION SUCCES] /${command.name} exécutée avec succès pour ${interaction.user.tag}`);
  } catch (error) {
    logger.error(`[INTERACTION ERREUR] Erreur lors de l'exécution de /${command.name} :`, error);

    const errorMessage = `${guildConfig.emojis.error} Une erreur interne est survenue lors de l'exécution de la commande.`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
