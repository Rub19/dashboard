import { SlashCommandBuilder } from 'discord.js';
import { commandRegistry } from '../../handlers/commandHandler.js';
import { Command, CommandContext } from '../../types/command.js';

export const helpCommand: Command = {
  name: 'help',
  description: 'Affiche la liste des commandes disponibles',
  category: 'Général',
  aliases: ['aide', 'h'],
  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles'),
  execute: async (ctx: CommandContext) => {
    const commands = commandRegistry.getAllCommands();
    const conf = ctx.guildConfig;
    const currentPrefix = conf.prefix;

    const embed = ctx
      .createEmbed('default')
      .setTitle(`📚 Commandes — ${conf.botName}`)
      .setDescription('Voici les commandes actuellement disponibles sur ce serveur :');

    // Regrouper par catégorie
    const categories = new Map<string, Command[]>();
    for (const cmd of commands) {
      const cat = cmd.category || 'Général';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(cmd);
    }

    for (const [category, list] of categories.entries()) {
      let currentChunk = '';
      const chunks: string[] = [];

      for (const cmd of list) {
        const callSyntax =
          conf.prefixCommandsEnabled && conf.slashCommandsEnabled
            ? `**\`/${cmd.name}\`** • \`${currentPrefix}${cmd.name}\``
            : conf.prefixCommandsEnabled
            ? `**\`${currentPrefix}${cmd.name}\`**`
            : `**\`/${cmd.name}\`**`;

        const line = `• ${callSyntax} — ${cmd.description}\n`;
        if (currentChunk.length + line.length > 950) {
          chunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          currentChunk += line;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      chunks.forEach((chunk, idx) => {
        const fieldName =
          chunks.length > 1 ? `📁 ${category} (${idx + 1}/${chunks.length})` : `📁 ${category}`;
        embed.addFields({ name: fieldName, value: chunk });
      });
    }

    embed.setFooter({
      text: `${conf.botName} • Préfixe actuel : ${currentPrefix} • Demandé par ${ctx.author.username}`,
      iconURL: ctx.author.displayAvatarURL(),
    });

    await ctx.reply({ embeds: [embed] });
  },
};
