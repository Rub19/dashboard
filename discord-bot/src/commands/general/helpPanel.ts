import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { GuildConfig } from '../../types/guildConfig.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';

export interface HelpCategoryMeta {
  id: string;
  name: string;
  emoji: string;
  color: number;
  description: string;
  commandNames: string[];
}

export const HELP_CATEGORIES: HelpCategoryMeta[] = [
  {
    id: 'ai',
    name: 'Intelligence Artificielle',
    emoji: '🤖',
    color: 0x8b5cf6, // Violet vibrant
    description: "Assistant IA 2.0, réponses intelligentes du serveur et résumés de salon",
    commandNames: ['ask', 'summarize'],
  },
  {
    id: 'moderation',
    name: 'Modération & Sanctions',
    emoji: '🛡️',
    color: 0xef4444, // Rouge écarlate
    description: "Outils de modération pour le staff : sanctions, gestion des salons et membres",
    commandNames: [
      'clear',
      'warn',
      'warnings',
      'timeout',
      'untimeout',
      'kick',
      'ban',
      'unban',
      'slowmode',
      'lock',
      'unlock',
      'nickname',
    ],
  },
  {
    id: 'security',
    name: 'Sécurité & Anti-Raid',
    emoji: '🚨',
    color: 0xf97316, // Orange sécurité
    description: "Protection automatique contre les raids, le spam, les mentions et abus",
    commandNames: ['antiraid', 'automod'],
  },
  {
    id: 'leveling',
    name: 'Niveaux & Réputation',
    emoji: '⭐',
    color: 0xf59e0b, // Ambre doré
    description: "Système d'expérience (XP), cartes de rang personnalisées et classement",
    commandNames: ['rank', 'leaderboard', 'xp'],
  },
  {
    id: 'community',
    name: 'Communauté & Loisirs',
    emoji: '🎉',
    color: 0xec4899, // Rose néon
    description: "Giveaways automatiques, boîte à suggestions, sondages et événements",
    commandNames: ['giveaway', 'suggest', 'poll', 'event'],
  },
  {
    id: 'voice_music',
    name: 'Musique & Salons Vocaux',
    emoji: '🎧',
    color: 0x10b981, // Vert Émeraude
    description: "Lecteur musical haute fidélité et salons vocaux temporaires personnalisés",
    commandNames: ['music', 'voice'],
  },
  {
    id: 'support',
    name: 'Support & Formulaires',
    emoji: '🎫',
    color: 0x06b6d4, // Cyan turquoise
    description: "Tickets d'assistance privés et formulaires dynamiques de candidature",
    commandNames: ['ticket', 'form'],
  },
  {
    id: 'admin',
    name: 'Administration & Système',
    emoji: '⚙️',
    color: 0x6366f1, // Indigo
    description: "Configuration globale du serveur, gestion des préfixes et activation des modules",
    commandNames: ['settings', 'prefix'],
  },
  {
    id: 'general',
    name: 'Général & Utilitaires',
    emoji: '⚡',
    color: 0x3b82f6, // Bleu Royal
    description: "Commandes générales, vérification de latence et aide du serveur",
    commandNames: ['bot', 'help', 'ping'],
  },
];

export class HelpPanel {
  /**
   * Construit la vue complète (Embed + Menus déroulants + Boutons) pour une catégorie ou la page d'accueil
   */
  public static buildView(params: {
    categoryKey?: string;
    guildConfig: GuildConfig;
    requesterTag: string;
    requesterAvatarUrl?: string;
    botAvatarUrl?: string;
    commands?: Command[];
  }): {
    embeds: [EmbedBuilder];
    components: [ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>];
  } {
    const {
      categoryKey = 'home',
      guildConfig,
      requesterTag,
      requesterAvatarUrl,
      botAvatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png',
      commands = [],
    } = params;

    const allCommands = commands;
    const prefix = guildConfig.prefix || '!';
    const isHome = categoryKey === 'home';

    const embed = new EmbedBuilder();

    // 1. PAGE D'ACCUEIL (VUE D'ENSEMBLE)
    if (isHome) {
      embed
        .setColor(0x5865f2) // Discord Blurple vibrant
        .setAuthor({
          name: `${guildConfig.botName} • Centre d'Aide & Documentation`,
          iconURL: botAvatarUrl,
        })
        .setTitle(`✨ Catalogue des Commandes & Modules`)
        .setDescription(
          `Bienvenue sur le centre d'aide officiel de **${guildConfig.botName}** !\n` +
            `Découvrez l'ensemble de nos outils, commandes et automatisations pour votre serveur.\n\n` +
            `> 💡 **Comment naviguer ?**\n` +
            `> Choisissez un module dans le **menu déroulant** ci-dessous, ou servez-vous des boutons \`◀\` et \`▶\` pour feuilleter toutes les pages !\n`
        )
        .addFields(
          {
            name: '📊 Vue d\'ensemble',
            value:
              `• **${allCommands.length}** commandes prêtes\n` +
              `• **${HELP_CATEGORIES.length}** modules spécialisés\n` +
              `• Préfixe : \`${prefix}\` *(ou commandes Slash \`/\`)*`,
            inline: true,
          },
          {
            name: '🚀 Accès Immédiat',
            value:
              `• **\`/ask\`** : Assistant IA 2.0\n` +
              `• **\`/rank\`** : Carte de niveau XP\n` +
              `• **\`/settings\`** : Configuration serveur`,
            inline: true,
          },
          {
            name: `📂 Modules du Serveur (1/2)`,
            value: HELP_CATEGORIES.slice(0, 5)
              .map((cat) => {
                const cmdCount = cat.commandNames.length;
                return `${cat.emoji} **${cat.name}** (\`${cmdCount} cmd${cmdCount > 1 ? 's' : ''}\`)\n└ *${cat.description}*`;
              })
              .join('\n\n'),
            inline: false,
          },
          {
            name: `📂 Modules du Serveur (2/2)`,
            value: HELP_CATEGORIES.slice(5)
              .map((cat) => {
                const cmdCount = cat.commandNames.length;
                return `${cat.emoji} **${cat.name}** (\`${cmdCount} cmd${cmdCount > 1 ? 's' : ''}\`)\n└ *${cat.description}*`;
              })
              .join('\n\n'),
            inline: false,
          }
        )
        .setFooter({
          text: `Page d'accueil • Sélectionnez un module ci-dessous • Demandé par ${requesterTag}`,
          iconURL: requesterAvatarUrl,
        })
        .setTimestamp();
    } else {
      // 2. PAGE DE CATÉGORIE SPÉCIFIQUE
      const currentCatIndex = HELP_CATEGORIES.findIndex((c) => c.id === categoryKey);
      const cat = currentCatIndex >= 0 ? HELP_CATEGORIES[currentCatIndex] : HELP_CATEGORIES[0];
      const categoryCommands = allCommands.filter((cmd) =>
        cat.commandNames.includes(cmd.name.toLowerCase())
      );

      embed
        .setColor(cat.color)
        .setAuthor({
          name: `${guildConfig.botName} • Guide des Commandes`,
          iconURL: botAvatarUrl,
        })
        .setTitle(`${cat.emoji} Module : ${cat.name}`)
        .setDescription(
          `*${cat.description}*\n` +
            `────────────────────────────────────────`
        );

      if (categoryCommands.length === 0) {
        embed.addFields({
          name: 'Aucune commande',
          value: 'Aucune commande n\'est actuellement assignée à ce module.',
        });
      } else {
        for (const cmd of categoryCommands) {
          const isStaff = cmd.userPermissions && cmd.userPermissions.length > 0;
          const badge = isStaff ? '`🔒 Staff / Admin`' : '`👥 Tous les membres`';

          const syntaxText = guildConfig.prefixCommandsEnabled
            ? `\`/${cmd.name}\` ou \`${prefix}${cmd.name}\``
            : `\`/${cmd.name}\``;

          const aliasesText =
            cmd.aliases && cmd.aliases.length > 0
              ? ` *(alias : ${cmd.aliases.map((a) => `\`${a}\``).join(', ')})*`
              : '';

          embed.addFields({
            name: `${cat.emoji} /${cmd.name} ${isStaff ? '🛡️' : '✨'}`,
            value:
              `> 📝 **Description :** ${cmd.description}\n` +
              `> ⌨️ **Syntaxe :** ${syntaxText}${aliasesText}\n` +
              `> 🏷️ **Accès :** ${badge}`,
            inline: false,
          });
        }
      }

      embed
        .setFooter({
          text: `Module ${currentCatIndex + 1}/${HELP_CATEGORIES.length} • ${cat.name} • Demandé par ${requesterTag}`,
          iconURL: requesterAvatarUrl,
        })
        .setTimestamp();
    }

    // 3. MENU DÉROULANT (SELECT MENU)
    const selectOptions: StringSelectMenuOptionBuilder[] = [
      new StringSelectMenuOptionBuilder()
        .setLabel("🏠 Accueil (Vue d'ensemble)")
        .setValue('home')
        .setDescription('Présentation générale et sommaire de tous les modules')
        .setDefault(isHome),
      ...HELP_CATEGORIES.map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${c.name} (${c.commandNames.length})`)
          .setEmoji(c.emoji)
          .setValue(c.id)
          .setDescription(`${c.description.slice(0, 48)}...`)
          .setDefault(categoryKey === c.id)
      ),
    ];

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select_category')
        .setPlaceholder('🔍 Sélectionner un module à explorer...')
        .addOptions(selectOptions)
    );

    // 4. BOUTONS DE NAVIGATION
    let prevCatId = 'home';
    let nextCatId = 'home';

    if (isHome) {
      prevCatId = HELP_CATEGORIES[HELP_CATEGORIES.length - 1].id;
      nextCatId = HELP_CATEGORIES[0].id;
    } else {
      const idx = HELP_CATEGORIES.findIndex((c) => c.id === categoryKey);
      if (idx === 0) {
        prevCatId = 'home';
        nextCatId = HELP_CATEGORIES[1]?.id || 'home';
      } else if (idx === HELP_CATEGORIES.length - 1) {
        prevCatId = HELP_CATEGORIES[idx - 1]?.id || 'home';
        nextCatId = 'home';
      } else {
        prevCatId = HELP_CATEGORIES[idx - 1]?.id || 'home';
        nextCatId = HELP_CATEGORIES[idx + 1]?.id || 'home';
      }
    }

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`help_btn_nav:${prevCatId}`)
        .setLabel('Précédent')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_btn_home')
        .setLabel('Accueil')
        .setEmoji('🏠')
        .setStyle(isHome ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`help_btn_nav:${nextCatId}`)
        .setLabel('Suivant')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
    );

    if (config.dashboardUrl) {
      buttonRow.addComponents(
        new ButtonBuilder()
          .setLabel('Dashboard Web')
          .setEmoji('🌐')
          .setStyle(ButtonStyle.Link)
          .setURL(config.dashboardUrl)
      );
    }

    return {
      embeds: [embed],
      components: [selectRow, buttonRow],
    };
  }

  /**
   * Gère les changements de sélection dans le menu déroulant /help
   */
  public static async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const selectedCategory = interaction.values[0] || 'home';
    const conf = guildConfigService.getConfig(interaction.guildId);
    const { commandRegistry } = await import('../../handlers/commandHandler.js');

    const view = HelpPanel.buildView({
      categoryKey: selectedCategory,
      guildConfig: conf,
      requesterTag: interaction.user.username,
      requesterAvatarUrl: interaction.user.displayAvatarURL(),
      botAvatarUrl: interaction.client.user?.displayAvatarURL(),
      commands: commandRegistry.getAllCommands(),
    });

    await interaction.update({
      embeds: view.embeds,
      components: view.components,
    });
  }

  /**
   * Gère les clics sur les boutons de navigation /help
   */
  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const conf = guildConfigService.getConfig(interaction.guildId);
    const { commandRegistry } = await import('../../handlers/commandHandler.js');

    let targetCategory = 'home';
    if (customId.startsWith('help_btn_nav:')) {
      targetCategory = customId.replace('help_btn_nav:', '');
    } else if (customId === 'help_btn_home') {
      targetCategory = 'home';
    }

    const view = HelpPanel.buildView({
      categoryKey: targetCategory,
      guildConfig: conf,
      requesterTag: interaction.user.username,
      requesterAvatarUrl: interaction.user.displayAvatarURL(),
      botAvatarUrl: interaction.client.user?.displayAvatarURL(),
      commands: commandRegistry.getAllCommands(),
    });

    await interaction.update({
      embeds: view.embeds,
      components: view.components,
    });
  }
}
