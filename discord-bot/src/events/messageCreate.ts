import { Message } from 'discord.js';
import { commandRegistry } from '../handlers/commandHandler.js';
import { guildConfigService } from '../services/guildConfigService.js';
import { statsService } from '../services/statsService.js';
import { CommandContext } from '../types/command.js';
import { autoModService } from '../modules/automod/services/autoModService.js';
import { levelingService } from '../modules/leveling/services/levelingService.js';
import { analyticsService } from '../modules/analytics/services/analyticsService.js';
import { customCommandStorage } from '../modules/customCommands/storage/customCommandStorage.js';
import { CustomCommandService } from '../modules/customCommands/services/customCommandService.js';
import { raidDetectionService } from '../modules/antiRaid/services/raidDetectionService.js';
import { logger } from '../utils/logger.js';

export async function onMessageCreate(message: Message) {
  // Ignorer les bots et les messages privés
  if (message.author.bot || !message.guild) return;

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
  } catch (error) {
    logger.error(`Erreur lors de l'exécution de la commande préfixe ${prefix}${command.name} :`, error);
    try {
      await message.reply(`${guildConfig.emojis.error} Une erreur est survenue lors de l'exécution de la commande.`);
    } catch {
      // Ignorer si permissions manquantes
    }
  }
}
