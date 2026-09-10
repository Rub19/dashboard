import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
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
import { BRAND_COLORS } from '../../utils/embeds.js';

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
    description: "Assistant IA du serveur : réponses et résumés de salon",
    commandNames: ['ask', 'summarize', 'imagine'],
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
    commandNames: ['music', 'play', 'skip', 'pause', 'resume', 'stop', 'queue', 'nowplaying', 'voice'],
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
    commandNames: ['settings', 'prefix', 'language', 'permissions', 'ai-setup'],
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

/**
 * Retourne les noms de sous-commandes réellement déclarées dans le SlashData
 * d'une commande (source de vérité = la définition slash elle-même, pas une
 * liste maintenue à la main). Permet à /help de ne jamais afficher une syntaxe
 * du type `/automod` alors que la commande ne s'exécute qu'avec une sous-commande
 * (ex : `/automod status`).
 */
export function getCommandSubcommandNames(cmd: Command): string[] {
  if (!cmd.slashData) return [];

  let json: { options?: Array<{ name: string; type: number }> };
  try {
    json = (cmd.slashData as { toJSON: () => typeof json }).toJSON();
  } catch {
    return [];
  }

  const options = json.options || [];
  return options
    .filter((opt) => opt.type === ApplicationCommandOptionType.Subcommand)
    .map((opt) => opt.name);
}

/**
 * Construit un texte de syntaxe fidèle à la réalité : si la commande exige une
 * sous-commande, on liste les sous-commandes valides plutôt que la commande nue.
 */
export function buildCommandSyntax(
  cmd: Command,
  prefix: string,
  includePrefixAlias: boolean
): string {
  const subcommands = getCommandSubcommandNames(cmd);

  if (subcommands.length === 0) {
    return includePrefixAlias
      ? `\`/${cmd.name}\` ou \`${prefix}${cmd.name}\``
      : `\`/${cmd.name}\``;
  }

  const maxShown = 4;
  const shown = subcommands.slice(0, maxShown).map((s) => `\`/${cmd.name} ${s}\``);
  const remaining = subcommands.length - maxShown;
  return remaining > 0 ? `${shown.join(', ')} *(+${remaining} autres)*` : shown.join(', ');
}

/**
 * Résout la liste réelle des commandes appartenant à une catégorie du /help :
 * on part toujours de `allCommands` (le registre effectif) et on ne garde que
 * les commandes dont le nom apparaît dans `cat.commandNames` — une commande
 * retirée du registre ne peut donc jamais s'afficher (pas de "fantôme").
 * Pour la catégorie "general", on rattache aussi toute commande enregistrée
 * qui n'aurait été oubliée dans aucune catégorie, pour ne jamais la perdre.
 */
export function resolveCategoryCommands(cat: HelpCategoryMeta, allCommands: Command[]): Command[] {
  const wanted = new Set(cat.commandNames.map((n) => n.toLowerCase()));

  if (cat.id === 'general') {
    const categorized = new Set(
      HELP_CATEGORIES.flatMap((c) => c.commandNames.map((n) => n.toLowerCase()))
    );
    return allCommands.filter(
      (cmd) => wanted.has(cmd.name.toLowerCase()) || !categorized.has(cmd.name.toLowerCase())
    );
  }

  return allCommands.filter((cmd) => wanted.has(cmd.name.toLowerCase()));
}

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
        .setColor(BRAND_COLORS.primary) // Couleur de marque ETHONE
        .setAuthor({
          name: `${guildConfig.botName} — Aide`,
          iconURL: botAvatarUrl,
        })
        .setTitle('Commandes & modules')
        .setDescription(
          `Choisis un module dans le menu déroulant ci-dessous, ou utilise \`◀\` \`▶\` pour parcourir les pages.`
        )
        .addFields(
          {
            name: 'Vue d\'ensemble',
            value:
              `${allCommands.length} commandes · ${HELP_CATEGORIES.length} modules\n` +
              `Préfixe : \`${prefix}\` — ou commandes slash \`/\``,
            inline: true,
          },
          {
            name: 'Raccourcis',
            value:
              `\`/ask\` — assistant IA\n` +
              `\`/rank\` — carte de niveau\n` +
              `\`/settings\` — configuration`,
            inline: true,
          },
          {
            name: 'Modules',
            value: HELP_CATEGORIES.slice(0, 7)
              .map((cat) => {
                const cmdCount = resolveCategoryCommands(cat, allCommands).length;
                return `${cat.emoji} **${cat.name}** — ${cmdCount} cmd${cmdCount > 1 ? 's' : ''}`;
              })
              .join('\n'),
            inline: false,
          },
          {
            name: '​',
            value: HELP_CATEGORIES.slice(7)
              .map((cat) => {
                const cmdCount = resolveCategoryCommands(cat, allCommands).length;
                return `${cat.emoji} **${cat.name}** — ${cmdCount} cmd${cmdCount > 1 ? 's' : ''}`;
              })
              .join('\n'),
            inline: false,
          }
        )
        .setFooter({
          text: `Demandé par ${requesterTag}`,
          iconURL: requesterAvatarUrl,
        })
        .setTimestamp();
    } else {
      // 2. PAGE DE CATÉGORIE SPÉCIFIQUE
      const currentCatIndex = HELP_CATEGORIES.findIndex((c) => c.id === categoryKey);
      const cat = currentCatIndex >= 0 ? HELP_CATEGORIES[currentCatIndex] : HELP_CATEGORIES[0];
      const categoryCommands = resolveCategoryCommands(cat, allCommands);

      embed
        .setColor(cat.color)
        .setAuthor({
          name: `${guildConfig.botName} — Aide`,
          iconURL: botAvatarUrl,
        })
        .setTitle(`${cat.emoji} ${cat.name}`)
        .setDescription(`*${cat.description}*`);

      if (categoryCommands.length === 0) {
        embed.addFields({
          name: 'Aucune commande',
          value: 'Aucune commande n\'est actuellement assignée à ce module.',
        });
      } else {
        for (const cmd of categoryCommands) {
          const isStaff = cmd.userPermissions && cmd.userPermissions.length > 0;
          const syntaxText = buildCommandSyntax(cmd, prefix, guildConfig.prefixCommandsEnabled);

          const aliasesText =
            cmd.aliases && cmd.aliases.length > 0
              ? ` · alias ${cmd.aliases.map((a) => `\`${a}\``).join(', ')}`
              : '';

          embed.addFields({
            name: `/${cmd.name}${isStaff ? ' 🔒' : ''}`,
            value: `${cmd.description}\n${syntaxText}${aliasesText}`,
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
          .setLabel(`${c.name} (${resolveCategoryCommands(c, allCommands).length})`)
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
