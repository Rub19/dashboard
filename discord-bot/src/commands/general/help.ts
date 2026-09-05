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
    )
    .addStringOption((opt) =>
      opt
        .setName('commande')
        .setDescription('Afficher la fiche détaillée d\'une commande spécifique')
        .setRequired(false)
        .setAutocomplete(true)
    ),
  execute: async (ctx: CommandContext) => {
    const { commandRegistry } = await import('../../handlers/commandHandler.js');

    const specificCmdName =
      (ctx.isSlash && ctx.interaction ? (ctx.interaction as any).options?.getString('commande') : null) ||
      (ctx.args.length > 0 && !HELP_CATEGORIES.some((c) => c.id === ctx.args[0].toLowerCase()) ? ctx.args[0].toLowerCase() : null);

    // Si une commande spécifique est demandée
    if (specificCmdName) {
      const cleanName = specificCmdName.replace(/^[/!]/, '').toLowerCase();
      const cmd = commandRegistry.getCommand(cleanName);

      if (cmd) {
        const prefix = ctx.guildConfig.prefix;
        const aliasesText = cmd.aliases?.length
          ? cmd.aliases.map((a) => `\`${prefix}${a}\``).join(', ')
          : '*Aucun alias disponible*';

        let permissionsText = '*Accessible à tous les membres*';
        if (cmd.userPermissions && cmd.userPermissions.length > 0) {
          permissionsText = `\`${cmd.userPermissions.join(', ')}\``;
        }

        const embed = ctx
          .createEmbed('info')
          .setTitle(`📖 Fiche Commande • \`${prefix}${cmd.name}\` & \`/${cmd.name}\``)
          .setDescription(cmd.description || 'Aucune description fournie.')
          .addFields(
            {
              name: '🏷️ Catégorie',
              value: `**${cmd.category || 'Général'}**`,
              inline: true,
            },
            {
              name: '🔀 Alias disponibles',
              value: aliasesText,
              inline: true,
            },
            {
              name: '🔑 Permissions nécessaires',
              value: permissionsText,
              inline: false,
            },
            {
              name: '💡 Exemples d\'invocation',
              value: `• \`/${cmd.name}\`\n• \`${prefix}${cmd.name}\``,
              inline: false,
            }
          )
          .setFooter({
            text: `${ctx.guildConfig.botName} • Tapez /help pour explorer tout le catalogue`,
            iconURL: ctx.client.user?.displayAvatarURL(),
          })
          .setTimestamp();

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('help_btn_home')
            .setLabel('Catalogue Complet')
            .setEmoji('📚')
            .setStyle(ButtonStyle.Primary)
        );

        await ctx.reply({ embeds: [embed], components: [row] });
        return;
      }
    }

    const rawChoice =
      (ctx.isSlash && ctx.interaction ? ctx.interaction.options.getString('module') : null) ||
      (ctx.args[0]?.toLowerCase()) ||
      'home';

    const matchedCategory = HELP_CATEGORIES.find(
      (c) => c.id === rawChoice || c.name.toLowerCase().includes(rawChoice)
    );

    const categoryKey = rawChoice === 'home' ? 'home' : matchedCategory ? matchedCategory.id : 'home';

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

