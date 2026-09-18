import { Message, PermissionFlagsBits } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { statsService } from '../services/statsService.js';
import { cooldownService } from '../services/cooldownService.js';
import { CommandContext } from '../types/command.js';
import { autoModService } from '../modules/automod/services/autoModService.js';
import { levelingService } from '../modules/leveling/services/levelingService.js';
import { economyService } from '../modules/economy/services/economyService.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { customCommandStorage } from '../modules/customCommands/storage/customCommandStorage.js';
import { CustomCommandService } from '../modules/customCommands/services/customCommandService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { aiService } from '../modules/ai/services/aiService.js';
import { stickyService } from '../modules/stickyMessages/services/stickyService.js';
import { afkService } from '../modules/afk/services/afkService.js';
import { highlightService } from '../modules/highlights/services/highlightService.js';
import { discordOwnerPanel } from '../modules/presence/ui/discordOwnerPanel.js';
import { config } from '../config.js';
import { syncEngine } from '../services/syncEngine.js';
import { logger } from '../utils/logger.js';
import { formatString, getTranslation } from '../utils/i18n.js';

export async function onMessageCreate(message: Message) {
  // Ignorer les bots
  if (message.author.bot) return;

  // Diffusion temps réel dans le Sync Engine
  if (message.guildId) {
    syncEngine.emit(
      'DISCORD_EVENT',
      {
        kind: 'message',
        authorTag: message.author.tag,
        channelId: message.channelId,
      },
      message.guildId,
      'DISCORD_EVENT',
      message.author.id
    );
  }

  // Interception DM pour le Bot Owner (Panneau de Contrôle Présence & Identité)
  if (!message.guild) {
    if (message.author.id === config.botOwnerId) {
      await discordOwnerPanel.sendOwnerPanel(message);
    }
    return;
  }

  // Interception Mention Bot Owner pour statut rapide (@ETHONE status / @ETHONE presence)
  if (message.mentions.has(message.client.user?.id || '') && message.author.id === config.botOwnerId) {
    const text = message.content.toLowerCase();
    if (text.includes('status') || text.includes('statut') || text.includes('presence') || text.includes('panel')) {
      await discordOwnerPanel.sendOwnerPanel(message);
      return;
    }
  }

  // Sticky Messages : repositionner le message épinglé du salon (anti-rebond interne).
  stickyService.handleMessage(message);

  // AFK : retour d'absence de l'auteur + notification des membres AFK mentionnés.
  afkService.handleMessage(message).catch(() => {});

  // Highlights : DM des membres qui surveillent un mot-clé présent dans ce message.
  highlightService.handleMessage(message).catch(() => {});

  // Each downstream step below is independent (raid detection, automod,
  // leveling, analytics, AI) — an uncaught throw in one used to silently
  // abort every step after it for this message (no top-level try/catch
  // existed in this function). Isolating them keeps a bug in a low-priority
  // step (e.g. analytics) from skipping the security-relevant ones after it.

  // 1. Analyse Anti-Raid 2.0 (Spam burst, Mention Raid, @everyone)
  try {
    await raidDetectionService.handleMessage(message);
  } catch (err) {
    logger.error('[messageCreate] raidDetectionService.handleMessage a échoué :', err);
  }

  // 2. Analyse AutoMod 2.0 (Pipeline de détection modulaire & Rule Engine)
  let triggered = false;
  try {
    triggered = await autoModService.processMessage(message);
  } catch (err) {
    logger.error('[messageCreate] autoModService.processMessage a échoué :', err);
  }
  if (triggered) {
    // Si le message a enfreint une règle et a été supprimé / sanctionné, on stoppe là
    return;
  }

  // 2. Traitement du système de Leveling & XP
  try {
    await levelingService.handleMessage(message);
  } catch (err) {
    logger.error('[messageCreate] levelingService.handleMessage a échoué :', err);
  }

  // 2b. Gain passif d'économie (même principe que l'XP : cooldown par membre,
  // longueur minimale, pas de bots) — silencieux, pas de message envoyé.
  if (message.guild && !message.author.bot) {
    try {
      economyService.earnPassive(
        message.guild.id,
        { id: message.author.id, username: message.author.username, avatarUrl: message.author.displayAvatarURL() },
        message.content.trim().length
      );
    } catch (err) {
      logger.error('[messageCreate] economyService.earnPassive a échoué :', err);
    }
  }

  // 3. Enregistrement Analytics
  try {
    analyticsService.recordMessage(message);
  } catch (err) {
    logger.error('[messageCreate] analyticsService.recordMessage a échoué :', err);
  }

  // 4. Traitement par l'Assistant IA (si mentionné ou salon automatique)
  let aiHandled = false;
  try {
    aiHandled = await aiService.handleMessage(message);
  } catch (err) {
    logger.error('[messageCreate] aiService.handleMessage a échoué :', err);
  }
  if (aiHandled) return;

  if (!message.content) return;

  const guildConfig = guildConfigService.getConfig(message.guildId);

  // Si les commandes textuelles avec préfixe sont désactivées sur ce serveur, on ignore
  if (!guildConfig.prefixCommandsEnabled) return;

  const prefix = guildConfig.prefix;

  // Vérifier si le message commence par le préfixe du serveur
  if (!message.content.startsWith(prefix)) return;

  // Découpage des arguments
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command = commandRegistry.getCommand(commandName);

  // Fall-through to custom commands if no built-in command matches
  if (!command && message.guildId) {
    const customCmd = customCommandStorage.getByName(message.guildId, commandName);
    if (customCmd && customCmd.enabled && (customCmd.triggerType === 'prefix' || customCmd.triggerType === 'both')) {
      await CustomCommandService.executePrefix(customCmd, message, args).catch((err) => {
        logger.error(`[CustomCommand] Prefix exec error "${commandName}":`, err);
      });
    }
    return;
  }

  if (!command) return;

  // Vérification du cooldown anti-spam
  const isStaffOrAdmin = Boolean(
    message.member?.permissions.has(PermissionFlagsBits.ManageGuild) ||
    message.member?.permissions.has(PermissionFlagsBits.Administrator)
  );
  const cooldownDuration = guildConfig.commandCooldown || 0;
  const { onCooldown, remainingSeconds } = cooldownService.checkAndApply(
    message.guildId || 'dm',
    message.author.id,
    command.name,
    cooldownDuration,
    isStaffOrAdmin
  );

  if (onCooldown) {
    try {
      const tCooldown = getTranslation(guildConfig.language);
      const cooldownMsg = await message.reply(
        formatString(tCooldown.cooldown_wait, {
          seconds: remainingSeconds,
          command: `${prefix}${command.name}`,
        })
      );
      setTimeout(() => cooldownMsg.delete().catch(() => null), 3000);
    } catch {
      // Ignorer si permissions manquantes
    }
    return;
  }

  // Contrôle d'accès centralisé : Administration & Modération (Préfixe)
  const isBotOwner = message.author.id === config.botOwnerId;
  const isGuildOwner = Boolean(message.guild && message.author.id === message.guild.ownerId);
  const hasAdminPerm = Boolean(message.member?.permissions.has(PermissionFlagsBits.Administrator));

  if (!isBotOwner && !isGuildOwner && !hasAdminPerm) {
    const memberRoles = Array.from(message.member?.roles.cache.keys() || []);
    const hasConfiguredAdminRole = guildConfig.adminRoles?.some((r) => memberRoles.includes(r)) ?? false;
    const hasConfiguredModRole = guildConfig.modRoles?.some((r) => memberRoles.includes(r)) ?? false;

    const tAccess = getTranslation(guildConfig.language);

    if (command.category === 'Administration') {
      if (!hasConfiguredAdminRole) {
        await message.reply(`${guildConfig.emojis.error} ${tAccess.access_denied_admin}`).catch(() => null);
        return;
      }
    } else if (command.category === 'Modération') {
      const hasPermissionFlags = command.userPermissions?.every((perm) =>
        message.member?.permissions.has(perm)
      ) ?? false;

      if (!hasConfiguredAdminRole && !hasConfiguredModRole && !hasPermissionFlags) {
        await message.reply(`${guildConfig.emojis.error} ${tAccess.access_denied_mod}`).catch(() => null);
        return;
      }
    }
  }

  const context = new CommandContext({
    message,
    args,
    guildConfig,
  });

  try {
    statsService.recordCommand(
      message.guildId || 'dm',
      message.guild?.name || 'Direct Message',
      message.author.tag,
      command.name,
      'prefix'
    );
    await command.execute(context);

    // Suppression automatique du message de commande si l'option est activée
    if (guildConfig.autoDeleteCommands && message.deletable) {
      setTimeout(() => message.delete().catch(() => null), 2000);
    }
  } catch (error) {
    logger.error(`Erreur lors de l'exécution de la commande préfixe ${prefix}${command.name} :`, error);
    try {
      await message.reply(`${guildConfig.emojis.error} Une erreur est survenue lors de l'exécution de la commande.`);
    } catch {
      // Ignorer si permissions manquantes
    }
  }
}
