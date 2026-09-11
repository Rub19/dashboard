import { Message, PermissionFlagsBits } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { statsService } from '../services/statsService.js';
import { cooldownService } from '../services/cooldownService.js';
import { CommandContext } from '../types/command.js';
import { autoModService } from '../modules/automod/services/autoModService.js';
import { levelingService } from '../modules/leveling/services/levelingService.js';
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

  // 1. Analyse Anti-Raid 2.0 (Spam burst, Mention Raid, @everyone)
  await raidDetectionService.handleMessage(message);

  // 2. Analyse AutoMod 2.0 (Pipeline de détection modulaire & Rule Engine)
  const triggered = await autoModService.processMessage(message);
  if (triggered) {
    // Si le message a enfreint une règle et a été supprimé / sanctionné, on stoppe là
    return;
  }

  // 2. Traitement du système de Leveling & XP
  await levelingService.handleMessage(message);

  // 3. Enregistrement Analytics
  analyticsService.recordMessage(message);

  // 4. Traitement par l'Assistant IA (si mentionné ou salon automatique)
  const aiHandled = await aiService.handleMessage(message);
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
  const isBotOwner = message.author.id === '825124006209388616';
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
