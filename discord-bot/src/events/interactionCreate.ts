import { Interaction } from 'discord.js';
import { config } from '../config.js';
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
import { handlePlaylistBrowser } from '../commands/music/playlistBrowser.js';
import { DiscordMusicPanel } from '../modules/music/ui/discordMusicPanel.js';
import { WelcomeInteractionHandler } from '../modules/welcome/interactions/welcomeInteractionHandler.js';
import { OnboardingRunner } from '../modules/welcome/services/onboardingRunner.js';
import { DiscordVoicePanel } from '../modules/voice/ui/discordVoicePanel.js';
import { DiscordAiPanel } from '../modules/ai/ui/discordAiPanel.js';
import { discordFormPanel } from '../modules/forms/ui/discordFormPanel.js';
import { discordPollPanel } from '../modules/polls/ui/discordPollPanel.js';
import { handleEventButton } from '../modules/events/eventsInteractionHandler.js';
import { handleLogsInteraction } from '../modules/logs/interactions/logsInteractionHandler.js';
import { youtubeSuggestions } from '../modules/music/providers/searchSuggest.js';
import { discordOwnerPanel } from '../modules/presence/ui/discordOwnerPanel.js';
import { handlePermissionPresetButton } from '../commands/admin/permissionsCommand.js';
import { baseEmbed, noticeEmbed } from '../utils/embeds.js';
import { disabledModuleEmbeds, disabledComponentEmbed } from '../services/moduleGate.js';
import { HelpPanel } from '../commands/general/helpPanel.js';
import { syncEngine } from '../services/syncEngine.js';
import { BotCommandStatsService } from '../modules/botControl/services/botCommandStatsService.js';
import { BotTelemetryService } from '../modules/botControl/services/botTelemetryService.js';
import { handleEconomyButton, handleRankButton } from '../modules/economy/interactions/economyButtonHandler.js';
import { handleModButton } from '../modules/moderation/interactions/modButtonHandler.js';
import { BotConfigService } from '../modules/botControl/services/botConfigService.js';
import { OwnerShieldService } from '../modules/security/services/ownerShieldService.js';
import { guildSetupService } from '../services/guildSetupService.js';
import { reportsService } from '../modules/reports/services/reportsService.js';
import { REPORT_CONTEXT_MENUS } from '../modules/reports/commands/reportCommands.js';
import { logger } from '../utils/logger.js';

const botCommandStatsService = BotCommandStatsService.getInstance();
const botTelemetryService = BotTelemetryService.getInstance();
import { formatString, getTranslation } from '../utils/i18n.js';

// Component/modal handlers (buttons, select menus, modals) previously ran
// with no try/catch at all, unlike the slash-command path below — a throw
// inside one of them left the interaction hanging ("This interaction
// failed" in Discord) with no reply and no error logged with context.
async function safeHandleComponent(
  interaction: Interaction,
  label: string,
  handler: () => Promise<unknown>
): Promise<void> {
  try {
    await handler();
  } catch (error) {
    logger.error(`[INTERACTION ERREUR] Erreur lors du traitement de "${label}" (customId=${(interaction as any).customId}) :`, error);
    const errorMessage = 'Une erreur interne est survenue lors du traitement de cette action.';
    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          // followUp posts a new ephemeral message instead of overwriting
          // whatever the original reply already showed.
          await interaction.followUp({ embeds: [noticeEmbed('error', errorMessage)], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [noticeEmbed('error', errorMessage)], ephemeral: true });
        }
      }
    } catch (replyError) {
      logger.error(`[INTERACTION ERREUR] Échec de la réponse d'erreur pour "${label}" :`, replyError);
    }
  }
}

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
  // Composant d'un module désactivé (panneau resté dans un salon) : réponse claire, rien n'est exécuté.
  if (interaction.guildId && (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit())) {
    const notice = disabledComponentEmbed(interaction.guildId, interaction.customId);
    if (notice) {
      await interaction.reply({ embeds: [notice], ephemeral: true }).catch(() => null);
      return;
    }
  }
  // 1. Gestion des composants d'interaction (Boutons, Menus déroulants, Modals)
  if (interaction.isAnySelectMenu()) {
    if (interaction.customId.startsWith('rep_sanction:') && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'report_sanction', () => reportsService.handleSelect(interaction));
      return;
    }
    if (interaction.customId.startsWith('qsetup:') && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'quick_setup', () => guildSetupService.handle(interaction));
      return;
    }
    if (interaction.customId.startsWith('plbrowse:') && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'playlist_browser', () => handlePlaylistBrowser(interaction));
      return;
    }
    if (interaction.customId.startsWith('onb:') && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'onboarding_select', () => OnboardingRunner.handleSelect(interaction));
      return;
    }
    if (interaction.customId === 'settings_select_category' && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'settings_select_category', () => handleSettingsSelectMenu(interaction));
    } else if (interaction.customId === 'help_select_category' && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'help_select_category', () => HelpPanel.handleSelectMenu(interaction));
    } else if (interaction.customId.startsWith('role_select:') && interaction.isStringSelectMenu()) {
      await safeHandleComponent(interaction, 'role_select', () => handleRoleSelect(interaction));
    } else if (interaction.customId.startsWith('voice_')) {
      await safeHandleComponent(interaction, 'voice_select', () => DiscordVoicePanel.handleSelectMenu(interaction));
    } else if (interaction.customId.startsWith('logs_')) {
      await safeHandleComponent(interaction, 'logs_select', () => handleLogsInteraction(interaction));
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('qsetup:')) {
      await safeHandleComponent(interaction, 'quick_setup', () => guildSetupService.handle(interaction));
      return;
    }
    if (interaction.customId.startsWith('rep_')) {
      await safeHandleComponent(interaction, 'report_button', () => reportsService.handleButton(interaction));
      return;
    }
    if (interaction.customId.startsWith('plbrowse:')) {
      await safeHandleComponent(interaction, 'playlist_browser', () => handlePlaylistBrowser(interaction));
      return;
    }
    if (interaction.customId.startsWith('onb:')) {
      await safeHandleComponent(interaction, 'onboarding_button', () => OnboardingRunner.handleButton(interaction));
      return;
    }
    if (interaction.customId === 'ping_retest') {
      await safeHandleComponent(interaction, 'ping_retest', async () => {
        const gConf = guildConfigService.getConfig(interaction.guildId);
        const start = Date.now();
        const latency = Math.max(1, Date.now() - start);
        const payload = buildPingMessage(interaction.client, gConf, latency);
        await interaction.update(payload);
      });
    } else if (interaction.customId.startsWith('apply_preset_')) {
      await safeHandleComponent(interaction, 'apply_preset', () => handlePermissionPresetButton(interaction));
    } else if (interaction.customId.startsWith('settings_') || interaction.customId.startsWith('set_lang_')) {
      await safeHandleComponent(interaction, 'settings_button', () => handleSettingsButton(interaction));
    } else if (interaction.customId.startsWith('help_btn_')) {
      await safeHandleComponent(interaction, 'help_btn', () => HelpPanel.handleButton(interaction));
    } else if (interaction.customId.startsWith('ticket_')) {
      await safeHandleComponent(interaction, 'ticket_button', () => handleTicketButton(interaction));
    } else if (interaction.customId.startsWith('role_btn:')) {
      await safeHandleComponent(interaction, 'role_button', () => handleRoleButton(interaction));
    } else if (interaction.customId.startsWith('giveaway_')) {
      await safeHandleComponent(interaction, 'giveaway_button', () => handleGiveawayButton(interaction));
    } else if (interaction.customId.startsWith('sugg_')) {
      await safeHandleComponent(interaction, 'suggestion_button', () => handleSuggestionButton(interaction));
    } else if (interaction.customId.startsWith('music_')) {
      await safeHandleComponent(interaction, 'music_button', () => DiscordMusicPanel.handleButtonInteraction(interaction));
    } else if (interaction.customId.startsWith('welcome_')) {
      await safeHandleComponent(interaction, 'welcome_button', () => WelcomeInteractionHandler.handleButton(interaction));
    } else if (interaction.customId.startsWith('voice_')) {
      await safeHandleComponent(interaction, 'voice_button', () => DiscordVoicePanel.handleButton(interaction));
    } else if (interaction.customId.startsWith('ai_')) {
      await safeHandleComponent(interaction, 'ai_button', () => DiscordAiPanel.handleButton(interaction));
    } else if (interaction.customId.startsWith('form_')) {
      await safeHandleComponent(interaction, 'form_button', () => discordFormPanel.handleButton(interaction));
    } else if (interaction.customId.startsWith('poll_')) {
      await safeHandleComponent(interaction, 'poll_button', () => discordPollPanel.handleButton(interaction));
    } else if (interaction.customId.startsWith('event_')) {
      await safeHandleComponent(interaction, 'event_button', () => handleEventButton(interaction));
    } else if (interaction.customId.startsWith('owner_presence_')) {
      await safeHandleComponent(interaction, 'owner_presence_button', () => discordOwnerPanel.handleButton(interaction));
    } else if (interaction.customId.startsWith('logs_')) {
      await safeHandleComponent(interaction, 'logs_button', () => handleLogsInteraction(interaction));
    } else if (interaction.customId.startsWith('eco_btn_')) {
      await safeHandleComponent(interaction, 'economy_button', () => handleEconomyButton(interaction));
    } else if (interaction.customId.startsWith('rank_btn_')) {
      await safeHandleComponent(interaction, 'rank_button', () => handleRankButton(interaction));
    } else if (interaction.customId.startsWith('mod_btn_')) {
      await safeHandleComponent(interaction, 'mod_button', () => handleModButton(interaction));
    } else if (interaction.customId.startsWith('sh_')) {
      await safeHandleComponent(interaction, 'owner_shield_button', () => OwnerShieldService.getInstance().handleButtonInteraction(interaction));
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('rep_modal:')) {
      await safeHandleComponent(interaction, 'report_modal', () => reportsService.handleModal(interaction));
    } else if (interaction.customId.startsWith('onb_modal:')) {
      await safeHandleComponent(interaction, 'onboarding_modal', () => OnboardingRunner.handleModal(interaction));
    } else if (interaction.customId.startsWith('modal_settings_')) {
      await safeHandleComponent(interaction, 'modal_settings', () => handleSettingsModal(interaction));
    } else if (interaction.customId.startsWith('modal_ticket_')) {
      await safeHandleComponent(interaction, 'modal_ticket', () => handleTicketModal(interaction));
    } else if (
      interaction.customId.startsWith('modal_sugg_') ||
      interaction.customId === 'modal_suggest_create'
    ) {
      await safeHandleComponent(interaction, 'modal_suggestion', () => handleSuggestionModal(interaction));
    } else if (interaction.customId.startsWith('modal_voice_')) {
      await safeHandleComponent(interaction, 'modal_voice', () => DiscordVoicePanel.handleModal(interaction));
    } else if (interaction.customId.startsWith('form_modal_submit:')) {
      await safeHandleComponent(interaction, 'modal_form', () => discordFormPanel.handleModalSubmit(interaction));
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
      // Un lien collé : ne rien suggérer, le laisser tel quel.
      if (/^https?:\/\//i.test(query)) {
        await interaction.respond([{ name: `🔗 ${query}`.slice(0, 100), value: query.slice(0, 100) }]).catch(() => null);
        return;
      }
      const suggestions = await youtubeSuggestions(query);
      const filtered = suggestions
        .slice(0, 25)
        .map((s) => ({ name: s.slice(0, 100), value: s.slice(0, 100) }));
      await interaction.respond(filtered).catch(() => null);
      return;
    }

    // Fallback générique : une commande peut fournir son propre handler d'autocomplétion.
    const acCmd = commandRegistry.getCommand(interaction.commandName);
    if (acCmd?.autocomplete) {
      await acCmd.autocomplete(interaction).catch(() => null);
      return;
    }

    await interaction.respond([]).catch(() => null);
    return;
  }

  // 1.8 Menus contextuels (clic droit sur un message ou un membre)
  if (interaction.isContextMenuCommand()) {
    const menu = REPORT_CONTEXT_MENUS.find((m) => m.data.name === interaction.commandName);
    if (menu && interaction.guildId) await safeHandleComponent(interaction, 'context_menu', () => menu.run(interaction as any));
    return;
  }

  // 2. Gestion des Slash Commands
  if (!interaction.isChatInputCommand()) return;

  logger.info(`[INTERACTION RECUE] /${interaction.commandName} par ${interaction.user.tag} dans ${interaction.guild?.name || 'DM'}`);

  // Mode maintenance global : seules les commandes du propriétaire sont acceptées
  const botGlobalSettings = BotConfigService.getInstance().getSettings();
  if (botGlobalSettings.maintenanceMode && interaction.user.id !== config.botOwnerId) {
    await interaction.reply({
      embeds: [
        baseEmbed('warning')
          .setTitle('🛠️ Bot en maintenance')
          .setDescription(botGlobalSettings.maintenanceReason || 'Le bot est actuellement en maintenance. Veuillez réessayer plus tard.')
      ],
      ephemeral: true,
    });
    return;
  }

  const guildConfig = guildConfigService.getConfig(interaction.guildId);

  // Vérifier si les slash commands sont désactivées sur ce serveur (sauf /settings qui reste toujours accessible aux admins)
  if (!guildConfig.slashCommandsEnabled && interaction.commandName !== 'settings') {
    await interaction.reply({
      embeds: [baseEmbed('error').setDescription(`${guildConfig.emojis.error} Les commandes Slash sont actuellement **désactivées** sur ce serveur par les administrateurs.`)],
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
      embeds: [baseEmbed('error').setDescription('❌ Cette commande n\'est plus disponible.')],
      ephemeral: true,
    });
    return;
  }

  // Cooldown Anti-Spam
  const isStaffOrAdmin = Boolean(
    (interaction.memberPermissions && interaction.memberPermissions.has('ManageGuild')) ||
    (interaction.memberPermissions && interaction.memberPermissions.has('Administrator'))
  );

  // Module désactivé sur ce serveur : la commande est remplacée par un message d'erreur (et, pour le staff, la façon de le réactiver)
  const disabledEmbeds = disabledModuleEmbeds({
    guildId: interaction.guildId,
    commandName: command.name,
    isStaff:
      isStaffOrAdmin ||
      interaction.user.id === config.botOwnerId ||
      Boolean(
        interaction.member && 'roles' in interaction.member &&
          [...(guildConfig.adminRoles ?? []), ...(guildConfig.modRoles ?? [])].some((r) => (interaction.member!.roles as any).cache?.has(r))
      ),
    prefix: null,
  });
  if (disabledEmbeds) {
    await interaction.reply({ embeds: disabledEmbeds, ephemeral: true });
    return;
  }
  const cooldownDuration = guildConfig.commandCooldown || 0;
  const { onCooldown, remainingSeconds } = cooldownService.checkAndApply(
    interaction.guildId || 'dm',
    interaction.user.id,
    command.name,
    cooldownDuration,
    isStaffOrAdmin
  );

  if (onCooldown) {
    const tCooldown = getTranslation(guildConfig.language);
    await interaction.reply({ embeds: [noticeEmbed('warning', formatString(tCooldown.cooldown_wait, {
        seconds: remainingSeconds,
        command: `/${command.name}`,
      }))], ephemeral: true });
    return;
  }

  // Contrôle d'accès centralisé : Administration & Modération
  const isBotOwner = interaction.user.id === config.botOwnerId;
  const isGuildOwner = Boolean(interaction.guild && interaction.user.id === interaction.guild.ownerId);
  const hasAdminPerm = Boolean(interaction.memberPermissions && interaction.memberPermissions.has('Administrator'));

  if (!isBotOwner && !isGuildOwner && !hasAdminPerm) {
    const memberRoles = (interaction.member && 'roles' in interaction.member)
      ? Array.from((interaction.member.roles as any).cache?.keys() || []) as string[]
      : [];

    const hasConfiguredAdminRole = guildConfig.adminRoles?.some((r) => memberRoles.includes(r)) ?? false;
    const hasConfiguredModRole = guildConfig.modRoles?.some((r) => memberRoles.includes(r)) ?? false;

    const tAccess = getTranslation(guildConfig.language);

    if (command.category === 'Administration') {
      if (!hasConfiguredAdminRole) {
        await interaction.reply({
          embeds: [baseEmbed('error').setDescription(`${guildConfig.emojis.error} ${tAccess.access_denied_admin}`)],
          ephemeral: true,
        });
        return;
      }
    } else if (command.category === 'Modération') {
      const hasPermissionFlags = command.userPermissions?.every((perm) =>
        interaction.memberPermissions?.has(perm)
      ) ?? false;

      if (!hasConfiguredAdminRole && !hasConfiguredModRole && !hasPermissionFlags) {
        await interaction.reply({
          embeds: [baseEmbed('error').setDescription(`${guildConfig.emojis.error} ${tAccess.access_denied_mod}`)],
          ephemeral: true,
        });
        return;
      }
    }
  }

  const context = new CommandContext({
    interaction,
    guildConfig,
  });

  const commandStartedAt = Date.now();
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
    botCommandStatsService.recordCommandExecution(command.name, Date.now() - commandStartedAt, true);
    botTelemetryService.incrementCommandCount();
    logger.info(`[INTERACTION SUCCES] /${command.name} exécutée avec succès pour ${interaction.user.tag}`);
  } catch (error) {
    botCommandStatsService.recordCommandExecution(command.name, Date.now() - commandStartedAt, false, error instanceof Error ? error.message : String(error));
    botTelemetryService.incrementCommandCount();
    logger.error(`[INTERACTION ERREUR] Erreur lors de l'exécution de /${command.name} :`, error);

    const errorMessage = `${guildConfig.emojis.error} Une erreur interne est survenue lors de l'exécution de la commande.`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [baseEmbed('error').setDescription(errorMessage)] });
    } else {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(errorMessage)], ephemeral: true });
    }
  }
}
