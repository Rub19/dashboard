import { Collection, REST, Routes } from 'discord.js';
import { helpCommand } from '../commands/general/help.js';
import { pingCommand } from '../commands/general/ping.js';
import { botCommand } from '../commands/general/bot.js';
import { ticketCommand } from '../commands/general/ticket.js';
import { askCommand } from '../commands/general/ask.js';
import { summarizeCommand } from '../commands/general/summarize.js';
import { formCommand } from '../commands/general/form.js';
import { imagineCommand } from '../commands/general/imagineCommand.js';
import { clearCommand } from '../commands/admin/clear.js';
import { prefixCommand } from '../commands/admin/prefix.js';
import { settingsCommand } from '../commands/admin/settings.js';
import { permissionsCommand } from '../commands/admin/permissionsCommand.js';
import { aiSetupCommand } from '../commands/admin/aiSetupCommand.js';
import { statusCommand } from '../commands/admin/statusCommand.js';
import { godmodeCommand } from '../commands/admin/godmodeCommand.js';
import { rescueCommand } from '../commands/admin/rescueCommand.js';
import { moduleCommand } from '../commands/admin/moduleCommand.js';
import { setupCommand } from '../commands/admin/setupCommand.js';
import { languageCommand } from '../commands/general/language.js';

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
import { verificationCommand } from '../modules/welcome/commands/verificationCommand.js';
import { economyCommand } from '../modules/economy/commands/economyCommand.js';
import {
  dailyCommand,
  workCommand,
  balanceCommand,
  payCommand,
  gambleCommand,
  robCommand,
  shopCommand,
} from '../modules/economy/commands/economyShortcuts.js';
import { antinukeCommand } from '../modules/security/commands/antinukeCommand.js';
import { automodCommand } from '../modules/automod/commands/automodCommand.js';
import { musicCommand } from '../commands/music/music.js';
import {
  playCommand,
  skipCommand,
  pauseCommand,
  resumeCommand,
  stopCommand,
  queueCommand,
  nowPlayingCommand,
  volumeCommand,
  loopCommand,
  shuffleCommand,
  previousCommand,
  clearQueueCommand,
  playerCommand,
} from '../commands/music/musicShortcuts.js';
import { playlistCommand } from '../commands/music/playlistBrowser.js';
import { joinCommand, disconnectCommand, voiceStatusCommand } from '../commands/music/voiceCommands.js';
import { pollCommand } from '../modules/polls/commands/pollCommand.js';
import { eventCommand } from '../modules/events/eventsCommand.js';
import { voiceCommand } from '../modules/voice/commands/voiceCommand.js';
import { starboardCommand } from '../modules/starboard/commands/starboardCommand.js';
import { stickyCommand } from '../modules/stickyMessages/commands/stickyCommand.js';
import { reminderCommand } from '../modules/reminders/commands/reminderCommand.js';
import { afkCommand } from '../modules/afk/commands/afkCommand.js';
import { countingCommand } from '../modules/counting/commands/countingCommand.js';
import { statsCommand } from '../modules/stats/commands/statsCommand.js';
import { statrolesCommand } from '../modules/statroles/commands/statrolesCommand.js';
import { elevateCommand } from '../modules/secureroles/commands/elevateCommand.js';
import { previewMessagesCommand } from '../modules/preview/commands/previewMessagesCommand.js';
import { reportCommand, REPORT_CONTEXT_MENUS } from '../modules/reports/commands/reportCommands.js';
import { birthdayCommand } from '../modules/birthdays/commands/birthdayCommand.js';
import { tagCommand } from '../modules/tags/commands/tagCommand.js';
import { serverStatsCommand } from '../modules/serverStats/commands/serverStatsCommand.js';
import { logsCommand } from '../modules/logs/commands/logsCommand.js';
import { highlightCommand } from '../modules/highlights/commands/highlightCommand.js';

import { config } from '../config.js';
import { Command } from '../types/command.js';
import { logger } from '../utils/logger.js';

class CommandRegistry {
  private commands = new Collection<string, Command>();
  private aliases = new Collection<string, string>();

  constructor() {
    // Utilitaires
    this.register(botCommand);
    this.register(pingCommand);
    this.register(prefixCommand);
    this.register(helpCommand);
    this.register(settingsCommand);
    this.register(permissionsCommand);
    this.register(aiSetupCommand);
    this.register(statusCommand);
    this.register(godmodeCommand);
    this.register(rescueCommand);
    this.register(moduleCommand);
    this.register(setupCommand);
    this.register(languageCommand);
    this.register(ticketCommand);
    this.register(askCommand);
    this.register(imagineCommand);
    this.register(summarizeCommand);
    this.register(formCommand);

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
    this.register(verificationCommand);
    this.register(economyCommand);
    this.register(dailyCommand);
    this.register(workCommand);
    this.register(balanceCommand);
    this.register(payCommand);
    this.register(gambleCommand);
    this.register(robCommand);
    this.register(shopCommand);
    this.register(antinukeCommand);

    // AutoMod 2.0 (Smart Moderation)
    this.register(automodCommand);

    // Musique 2.0 (Music Center & Shortcuts)
    this.register(musicCommand);
    this.register(playCommand);
    this.register(joinCommand);
    this.register(disconnectCommand);
    this.register(voiceStatusCommand);
    this.register(skipCommand);
    this.register(pauseCommand);
    this.register(resumeCommand);
    this.register(stopCommand);
    this.register(queueCommand);
    this.register(nowPlayingCommand);
    this.register(volumeCommand);
    this.register(loopCommand);
    this.register(shuffleCommand);
    this.register(previousCommand);
    this.register(clearQueueCommand);
    this.register(playerCommand);
    this.register(playlistCommand);

    // Sondages & Votes 2.0 (Polls Center)
    this.register(pollCommand);

    // Événements & Calendrier 2.0 (Events Center)
    this.register(eventCommand);

    // Salons Vocaux 2.0 (Voice Center)
    this.register(voiceCommand);

    // Starboard (hall of fame des messages étoilés)
    this.register(starboardCommand);

    // Sticky Messages (message épinglé en bas d'un salon)
    this.register(stickyCommand);

    // Reminders (« rappelle-moi » — rappels personnels programmés)
    this.register(reminderCommand);

    // AFK (statut absent + notification sur mention)
    this.register(afkCommand);
    this.register(countingCommand);
    this.register(statsCommand);
    this.register(statrolesCommand);
    this.register(elevateCommand);
    this.register(previewMessagesCommand);
    this.register(reportCommand);

    // Birthdays (anniversaires + annonce quotidienne + rôle)
    this.register(birthdayCommand);

    // Tags (réponses réutilisables du serveur)
    this.register(tagCommand);

    // Server Stats (salons compteurs)
    this.register(serverStatsCommand);

    // Journaux du serveur (routage par catégorie, verbosité, rétention)
    this.register(logsCommand);

    // Highlights (mots-clés surveillés — DM quand quelqu'un d'autre les mentionne)
    this.register(highlightCommand);
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
    // A canonical command name always wins over an alias registered under the
    // same string — otherwise a later command that happens to alias e.g.
    // "status" permanently shadows the real, unrelated /status command (this
    // is exactly what caused /status and /resume to crash in production:
    // bot.ts aliases "status" and summarize.ts aliases "resume", both of
    // which collide with real standalone commands of those names).
    const direct = this.commands.get(lower);
    if (direct) return direct;
    const resolvedName = this.aliases.get(lower);
    return resolvedName ? this.commands.get(resolvedName) : undefined;
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
    // Menus contextuels (clic droit) : déployés avec les commandes slash
    const contextMenus = REPORT_CONTEXT_MENUS.map((m) => m.data.toJSON());

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
      logger.info(`Déploiement de ${slashDataList.length} slash commands...`);

      // Déploiement global TOUJOURS effectué : c'est ce qui alimente les vraies
      // commandes visibles sur tous les serveurs de production (propagation Discord
      // jusqu'à ~1h). Avant ce correctif, la présence de DEV_GUILD_ID désactivait
      // complètement le déploiement global — les serveurs réels du bot restaient
      // bloqués sur l'ancien jeu de commandes enregistré la dernière fois que
      // DEV_GUILD_ID n'était pas défini, d'où des commandes manquantes ou obsolètes
      // sur les serveurs de production.
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: [...slashDataList, ...contextMenus] }
      );
      logger.success('Slash commands déployées globalement avec succès (tous les serveurs, propagation ~1h).');

      // Les commandes globales apparaissent déjà sur tous les serveurs, y compris
      // celui de dev. Les enregistrer AUSSI en commandes de guilde les faisait
      // apparaître en double dans le sélecteur Discord (/play x2, etc.) : on vide
      // donc les commandes de guilde résiduelles au lieu de les dupliquer.
      if (config.devGuildId) {
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, config.devGuildId),
          { body: [] }
        );
        logger.info(`Commandes de guilde de dev nettoyées (évite les doublons) : ${config.devGuildId}`);
      }
    } catch (error) {
      logger.error('Erreur lors du déploiement des slash commands :', error);
    }
  }
}

export const commandRegistry = new CommandRegistry();
