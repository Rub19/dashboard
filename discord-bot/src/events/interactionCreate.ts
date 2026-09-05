import { Interaction } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import {
  handleSettingsButton,
  handleSettingsModal,
  handleSettingsSelectMenu,
} from '../handlers/settingsInteractionHandler.js';
import { cooldownService } from '../services/cooldownService.js';
import { buildPingMessage } from '../commands/general/ping.js';
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
import { handleEventButton } from '../modules/events/eventsInteractionHandler.js';
import { discordOwnerPanel } from '../modules/presence/ui/discordOwnerPanel.js';
import { HelpPanel } from '../commands/general/helpPanel.js';
import { syncEngine } from '../services/syncEngine.js';
import { logger } from '../utils/logger.js';

export async function onInteractionCreate(interaction: Interaction) {
  // Diffusion temps réel dans le Sync Engine
  syncEngine.emit(
    'DISCORD_EVENT',
    {
      kind: 'interaction',
      customId: (interaction as any).customId,
      commandName: interaction.isChatInputCommand() ? interaction.commandName : undefined,
      userTag: interaction.user.tag,
    },
    interaction.guildId || undefined,
    'DISCORD_COMMAND',
    interaction.user.id
  );
  // 1. Gestion des composants d'interaction (Boutons, Menus déroulants, Modals)
  if (interaction.isAnySelectMenu()) {
    if (interaction.customId === 'settings_select_category' && interaction.isStringSelectMenu()) {
      await handleSettingsSelectMenu(interaction);
    } else if (interaction.customId === 'help_select_category' && interaction.isStringSelectMenu()) {
      await HelpPanel.handleSelectMenu(interaction);
    } else if (interaction.customId.startsWith('role_select:') && interaction.isStringSelectMenu()) {
      await handleRoleSelect(interaction);
    } else if (interaction.customId.startsWith('voice_')) {
      await DiscordVoicePanel.handleSelectMenu(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'ping_retest') {
      const gConf = guildConfigService.getConfig(interaction.guildId);
      const start = Date.now();
      const latency = Math.max(1, Date.now() - start);
      const payload = buildPingMessage(interaction.client, gConf, latency);
      await interaction.update(payload);
    } else if (interaction.customId.startsWith('settings_') || interaction.customId.startsWith('set_lang_')) {
      await handleSettingsButton(interaction);
    } else if (interaction.customId.startsWith('help_btn_')) {
      await HelpPanel.handleButton(interaction);
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
    } else if (interaction.customId.startsWith('event_')) {
      await handleEventButton(interaction);
    } else if (interaction.customId.startsWith('owner_presence_')) {
      await discordOwnerPanel.handleButton(interaction);
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

  // 1.5 Gestion de l'Autocomplétion intelligente
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);
    const query = (focused.value || '').toLowerCase().trim();

    if (interaction.commandName === 'help' && focused.name === 'commande') {
      const allCommands = commandRegistry.getAllCommands();
      const filtered = allCommands
        .filter((c) => c.name.toLowerCase().includes(query) || (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(query))))
        .slice(0, 25)
        .map((c) => ({
          name: `/${c.name} — ${c.description || 'Commande'}`.slice(0, 100),
          value: c.name,
        }));
      await interaction.respond(filtered).catch(() => null);
      return;
    }

    if ((interaction.commandName === 'music' || interaction.commandName === 'play') && focused.name === 'recherche') {
      const suggestions = [
        'Lo-Fi Hip Hop Beats to relax/study',
        'Synthwave 80s Retro Chill',
        'Phonk Gym Gaming Mix 2026',
        'Chillhop Music Lounge',
        'Acoustic Guitar Cozy Songs',
        'Deep House Club Mix',
        'Cyberpunk Electro Bass Boosted',
        'Piano Instrumental Relaxing',
      ];
      const filtered = suggestions
        .filter((s) => !query || s.toLowerCase().includes(query))
        .slice(0, 25)
        .map((s) => ({ name: s, value: s }));
      await interaction.respond(filtered).catch(() => null);
      return;
    }

    await interaction.respond([]).catch(() => null);
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

  // Cooldown Anti-Spam
  const isStaffOrAdmin = Boolean(
    (interaction.memberPermissions && interaction.memberPermissions.has('ManageGuild')) ||
    (interaction.memberPermissions && interaction.memberPermissions.has('Administrator'))
  );
  const cooldownDuration = guildConfig.commandCooldown || 0;
  const { onCooldown, remainingSeconds } = cooldownService.checkAndApply(
    interaction.guildId || 'dm',
    interaction.user.id,
    command.name,
    cooldownDuration,
    isStaffOrAdmin
  );

  if (onCooldown) {
    await interaction.reply({
      content: `⏳ **Anti-Spam** : Veuillez patienter encore **${remainingSeconds}s** avant de réutiliser la commande \`/${command.name}\`.`,
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
