import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { HelpPanel, HELP_CATEGORIES } from './helpPanel.js';

export const helpCommand: Command = {
  name: 'help',
  description: 'Affiche le centre d\'aide interactif et le catalogue des commandes',
  category: 'Général',
  aliases: ['aide', 'h'],
  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche le centre d\'aide interactif et le catalogue des commandes')
    .addStringOption((opt) =>
      opt
        .setName('module')
        .setDescription('Ouvrir directement la page d\'un module spécifique')
        .setRequired(false)
        .addChoices(
          { name: '🏠 Accueil (Vue d\'ensemble)', value: 'home' },
          ...HELP_CATEGORIES.map((c) => ({
            name: `${c.emoji} ${c.name}`.slice(0, 100),
            value: c.id,
          }))
        )
    ),
  execute: async (ctx: CommandContext) => {
    const rawChoice =
      (ctx.isSlash && ctx.interaction ? ctx.interaction.options.getString('module') : null) ||
      (ctx.args[0]?.toLowerCase()) ||
      'home';

    const matchedCategory = HELP_CATEGORIES.find(
      (c) => c.id === rawChoice || c.name.toLowerCase().includes(rawChoice)
    );

    const categoryKey = rawChoice === 'home' ? 'home' : matchedCategory ? matchedCategory.id : 'home';

    const { commandRegistry } = await import('../../handlers/commandHandler.js');

    const view = HelpPanel.buildView({
      categoryKey,
      guildConfig: ctx.guildConfig,
      requesterTag: ctx.author.username,
      requesterAvatarUrl: ctx.author.displayAvatarURL(),
      botAvatarUrl: ctx.client.user?.displayAvatarURL(),
      commands: commandRegistry.getAllCommands(),
    });

    await ctx.reply({
      embeds: view.embeds,
      components: view.components,
    });
  },
};

