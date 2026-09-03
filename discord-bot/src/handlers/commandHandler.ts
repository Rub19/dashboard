import { Collection, REST, Routes } from 'discord.js';
import { helpCommand } from '../commands/general/help.js';
import { pingCommand } from '../commands/general/ping.js';
import { ticketCommand } from '../commands/general/ticket.js';
import { clearCommand } from '../commands/admin/clear.js';
import { prefixCommand } from '../commands/admin/prefix.js';
import { settingsCommand } from '../commands/admin/settings.js';

// Module Modération
import { warnCommand } from '../modules/moderation/commands/warn.js';
import { warningsCommand } from '../modules/moderation/commands/warnings.js';
import { timeoutCommand } from '../modules/moderation/commands/timeout.js';
import { untimeoutCommand } from '../modules/moderation/commands/untimeout.js';
import { kickCommand } from '../modules/moderation/commands/kick.js';
import { banCommand } from '../modules/moderation/commands/ban.js';
import { unbanCommand } from '../modules/moderation/commands/unban.js';
import { slowmodeCommand } from '../modules/moderation/commands/slowmode.js';
import { lockCommand } from '../modules/moderation/commands/lock.js';
import { unlockCommand } from '../modules/moderation/commands/unlock.js';
import { nicknameCommand } from '../modules/moderation/commands/nickname.js';
import { rankCommand } from '../modules/leveling/commands/rank.js';
import { leaderboardCommand } from '../modules/leveling/commands/leaderboard.js';
import { xpCommand } from '../modules/leveling/commands/xpAdmin.js';
import { giveawayCommand } from '../modules/giveaways/commands/giveawayCommand.js';
import { suggestCommand } from '../modules/suggestions/commands/suggestCommand.js';
import { antiraidCommand } from '../modules/antiRaid/commands/antiraidCommand.js';

import { config } from '../config.js';
import { Command } from '../types/command.js';
import { logger } from '../utils/logger.js';

class CommandRegistry {
  private commands = new Collection<string, Command>();
  private aliases = new Collection<string, string>();

  constructor() {
    // Utilitaires
    this.register(pingCommand);
    this.register(prefixCommand);
    this.register(helpCommand);
    this.register(settingsCommand);
    this.register(ticketCommand);

    // Modération & Sanctions
    this.register(clearCommand);
    this.register(warnCommand);
    this.register(warningsCommand);
    this.register(timeoutCommand);
    this.register(untimeoutCommand);
    this.register(kickCommand);
    this.register(banCommand);
    this.register(unbanCommand);
    this.register(slowmodeCommand);
    this.register(lockCommand);
    this.register(unlockCommand);
    this.register(nicknameCommand);

    // Progression & Leveling
    this.register(rankCommand);
    this.register(leaderboardCommand);
    this.register(xpCommand);

    // Giveaways & Événements
    this.register(giveawayCommand);

    // Suggestions & Feedback
    this.register(suggestCommand);

    // Sécurité & Anti-Raid 2.0
    this.register(antiraidCommand);
  }

  public register(command: Command) {
    this.commands.set(command.name.toLowerCase(), command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      }
    }
    logger.info(`Commande enregistrée : ${command.name}`);
  }

  public getCommand(nameOrAlias: string): Command | undefined {
    const lower = nameOrAlias.toLowerCase();
    const resolvedName = this.aliases.get(lower) ?? lower;
    return this.commands.get(resolvedName);
  }

  public getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Enregistre les Slash Commands auprès de l'API REST de Discord
   */
  public async deploySlashCommands(): Promise<void> {
    const slashDataList = this.getAllCommands()
      .filter((cmd) => cmd.slashData !== undefined)
      .map((cmd) => cmd.slashData!.toJSON());

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
      logger.info(`Déploiement de ${slashDataList.length} slash commands...`);

      if (config.devGuildId) {
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, config.devGuildId),
          { body: slashDataList }
        );
        logger.success(`Slash commands déployées instantanément sur la Guild : ${config.devGuildId}`);
      } else {
        await rest.put(
          Routes.applicationCommands(config.clientId),
          { body: slashDataList }
        );
        logger.success('Slash commands déployées globalement avec succès.');
      }
    } catch (error) {
      logger.error('Erreur lors du déploiement des slash commands :', error);
    }
  }
}

export const commandRegistry = new CommandRegistry();
