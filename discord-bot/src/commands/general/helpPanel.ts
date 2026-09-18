import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { GuildConfig } from '../../types/guildConfig.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { config } from '../../config.js';
import { BRAND_COLORS } from '../../utils/embeds.js';
import { container, footer, sectionWithThumbnail, separator, text, V2_FLAGS } from '../../utils/components.js';

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
    color: 0x8b5cf6,
    description: "Assistant IA du serveur : réponses et résumés de salon",
    commandNames: ['ask', 'summarize', 'imagine'],
  },
  {
    id: 'moderation',
    name: 'Modération & Sanctions',
    emoji: '🛡️',
    color: 0xef4444,
    description: "Outils de modération pour le staff : sanctions, gestion des salons et membres",
    commandNames: ['clear', 'warn', 'warnings', 'timeout', 'untimeout', 'kick', 'ban', 'unban', 'slowmode', 'lock', 'unlock', 'nickname'],
  },
  {
    id: 'security',
    name: 'Sécurité & Anti-Raid',
    emoji: '🚨',
    color: 0xf97316,
    description: "Protection automatique contre les raids, le spam, les mentions et abus",
    commandNames: ['antiraid', 'automod'],
  },
  {
    id: 'leveling',
    name: 'Niveaux & Économie',
    emoji: '⭐',
    color: 0xf59e0b,
    description: "XP, cartes de rang, classement et Crédits ETHONE",
    commandNames: ['rank', 'leaderboard', 'xp', 'economy'],
  },
  {
    id: 'community',
    name: 'Communauté & Loisirs',
    emoji: '🎉',
    color: 0xec4899,
    description: "Giveaways automatiques, boîte à suggestions, sondages et événements",
    commandNames: ['giveaway', 'suggest', 'poll', 'event'],
  },
  {
    id: 'voice_music',
    name: 'Musique & Salons Vocaux',
    emoji: '🎧',
    color: 0x10b981,
    description: "Lecteur musical et salons vocaux temporaires personnalisés",
    commandNames: ['music', 'play', 'skip', 'pause', 'resume', 'stop', 'queue', 'nowplaying', 'voice'],
  },
  {
    id: 'support',
    name: 'Support & Formulaires',
    emoji: '🎫',
    color: 0x06b6d4,
    description: "Tickets d'assistance privés et formulaires dynamiques de candidature",
    commandNames: ['ticket', 'form'],
  },
  {
    id: 'admin',
    name: 'Administration & Système',
    emoji: '⚙️',
    color: 0x6366f1,
    description: "Configuration globale du serveur, gestion des préfixes et activation des modules",
    commandNames: ['settings', 'prefix', 'language', 'permissions', 'ai-setup'],
  },
  {
    id: 'general',
    name: 'Général & Utilitaires',
    emoji: '⚡',
    color: 0x3b82f6,
    description: "Commandes générales, vérification de latence et aide du serveur",
    commandNames: ['bot', 'help', 'ping'],
  },
];

/**
 * Retourne les noms de sous-commandes réellement déclarées dans le SlashData
 * d'une commande (source de vérité = la définition slash elle-même).
 */
export function getCommandSubcommandNames(cmd: Command): string[] {
  if (!cmd.slashData) return [];
  let json: { options?: Array<{ name: string; type: number }> };
  try {
    json = (cmd.slashData as { toJSON: () => typeof json }).toJSON();
  } catch {
    return [];
  }
  return (json.options || []).filter((opt) => opt.type === ApplicationCommandOptionType.Subcommand).map((opt) => opt.name);
}

export function buildCommandSyntax(cmd: Command, prefix: string, includePrefixAlias: boolean): string {
  const subcommands = getCommandSubcommandNames(cmd);
  if (subcommands.length === 0) {
    return includePrefixAlias ? `\`/${cmd.name}\` ou \`${prefix}${cmd.name}\`` : `\`/${cmd.name}\``;
  }
  const maxShown = 4;
  const shown = subcommands.slice(0, maxShown).map((s) => `\`/${cmd.name} ${s}\``);
  const remaining = subcommands.length - maxShown;
  return remaining > 0 ? `${shown.join(', ')} *(+${remaining} autres)*` : shown.join(', ');
}

export function resolveCategoryCommands(cat: HelpCategoryMeta, allCommands: Command[]): Command[] {
  const wanted = new Set(cat.commandNames.map((n) => n.toLowerCase()));
  if (cat.id === 'general') {
    const categorized = new Set(HELP_CATEGORIES.flatMap((c) => c.commandNames.map((n) => n.toLowerCase())));
    return allCommands.filter((cmd) => wanted.has(cmd.name.toLowerCase()) || !categorized.has(cmd.name.toLowerCase()));
  }
  return allCommands.filter((cmd) => wanted.has(cmd.name.toLowerCase()));
}

export interface HelpView {
  components: ContainerBuilder[];
}

/**
 * Centre d'aide en Components V2 : une carte par page (accueil ou module),
 * menu déroulant + navigation intégrés dans la carte.
 */
export class HelpPanel {
  public static buildView(params: {
    categoryKey?: string;
    guildConfig: GuildConfig;
    requesterTag: string;
    requesterAvatarUrl?: string;
    botAvatarUrl?: string;
    commands?: Command[];
  }): HelpView {
    const { categoryKey = 'home', guildConfig, requesterTag, botAvatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png', commands = [] } = params;
    const prefix = guildConfig.prefix || '!';
    const isHome = categoryKey === 'home';
    const parts: Parameters<typeof container>[1] = [];
    let color: number = BRAND_COLORS.primary;

    if (isHome) {
      parts.push(
        sectionWithThumbnail(
          [
            `## 📚 ${guildConfig.botName} — Centre d'aide`,
            `**${commands.length}** commandes · **${HELP_CATEGORIES.length}** modules`,
            `-# Préfixe \`${prefix}\` ou commandes slash \`/\` · choisis un module ci-dessous`,
          ],
          botAvatarUrl,
          guildConfig.botName,
        ),
        separator(),
        text(
          HELP_CATEGORIES.map((cat) => {
            const n = resolveCategoryCommands(cat, commands).length;
            return `${cat.emoji} **${cat.name}** — ${n} cmd${n > 1 ? 's' : ''}`;
          }).join('\n'),
        ),
        separator(false),
        text('**Raccourcis :** `/ask` assistant IA · `/rank` carte de niveau · `/music play` musique · `/ticket` support · `/settings` configuration'),
      );
    } else {
      const idx = HELP_CATEGORIES.findIndex((c) => c.id === categoryKey);
      const cat = idx >= 0 ? HELP_CATEGORIES[idx] : HELP_CATEGORIES[0];
      color = cat.color;
      const categoryCommands = resolveCategoryCommands(cat, commands);
      parts.push(
        sectionWithThumbnail(
          [`## ${cat.emoji} ${cat.name}`, `*${cat.description}*`, `-# Module ${(idx >= 0 ? idx : 0) + 1}/${HELP_CATEGORIES.length} · ${categoryCommands.length} commande(s)`],
          botAvatarUrl,
          cat.name,
        ),
        separator(),
      );
      if (categoryCommands.length === 0) {
        parts.push(text("*Aucune commande n'est actuellement assignée à ce module.*"));
      } else {
        // 4000 caractères max par message : on groupe en blocs de 6 commandes.
        const blocks: string[] = [];
        for (const cmd of categoryCommands) {
          const isStaff = cmd.userPermissions && cmd.userPermissions.length > 0;
          const aliases = cmd.aliases?.length ? ` · alias ${cmd.aliases.map((a) => `\`${a}\``).join(', ')}` : '';
          blocks.push(`**/${cmd.name}**${isStaff ? ' 🔒' : ''} — ${cmd.description}\n${buildCommandSyntax(cmd, prefix, guildConfig.prefixCommandsEnabled)}${aliases}`);
        }
        for (let i = 0; i < blocks.length; i += 6) {
          parts.push(text(blocks.slice(i, i + 6).join('\n\n')));
        }
      }
    }

    // Menu déroulant
    const selectRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select_category')
        .setPlaceholder('🔍 Explorer un module…')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("🏠 Accueil (vue d'ensemble)").setValue('home').setDescription('Sommaire de tous les modules').setDefault(isHome),
          ...HELP_CATEGORIES.map((c) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${c.name} (${resolveCategoryCommands(c, commands).length})`)
              .setEmoji(c.emoji)
              .setValue(c.id)
              .setDescription(c.description.slice(0, 95))
              .setDefault(categoryKey === c.id),
          ),
        ),
    );

    // Navigation
    let prevCatId = 'home';
    let nextCatId = 'home';
    if (isHome) {
      prevCatId = HELP_CATEGORIES[HELP_CATEGORIES.length - 1].id;
      nextCatId = HELP_CATEGORIES[0].id;
    } else {
      const idx = HELP_CATEGORIES.findIndex((c) => c.id === categoryKey);
      prevCatId = idx <= 0 ? 'home' : HELP_CATEGORIES[idx - 1].id;
      nextCatId = idx >= HELP_CATEGORIES.length - 1 ? 'home' : HELP_CATEGORIES[idx + 1].id;
    }
    const navRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`help_btn_nav:${prevCatId}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help_btn_home').setLabel('Accueil').setEmoji('🏠').setStyle(isHome ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`help_btn_nav:${nextCatId}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary),
    );
    if (config.dashboardUrl) {
      navRow.addComponents(new ButtonBuilder().setLabel('Dashboard').setEmoji('🌐').setStyle(ButtonStyle.Link).setURL(config.dashboardUrl));
    }

    parts.push(separator(false), selectRow, navRow, footer(`Demandé par ${requesterTag}`));
    return { components: [container(color, parts)] };
  }

  public static async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    await this.render(interaction, interaction.values[0] || 'home');
  }

  public static async handleButton(interaction: ButtonInteraction): Promise<void> {
    const id = interaction.customId;
    const target = id.startsWith('help_btn_nav:') ? id.replace('help_btn_nav:', '') : 'home';
    await this.render(interaction, target);
  }

  private static async render(interaction: ButtonInteraction | StringSelectMenuInteraction, categoryKey: string): Promise<void> {
    const conf = guildConfigService.getConfig(interaction.guildId);
    const { commandRegistry } = await import('../../handlers/commandHandler.js');
    const view = HelpPanel.buildView({
      categoryKey,
      guildConfig: conf,
      requesterTag: interaction.user.username,
      requesterAvatarUrl: interaction.user.displayAvatarURL(),
      botAvatarUrl: interaction.client.user?.displayAvatarURL(),
      commands: commandRegistry.getAllCommands(),
    });
    try {
      await interaction.update({ ...view, embeds: [], content: null, flags: V2_FLAGS } as any);
    } catch {
      // Message d'aide d'avant migration (embed classique) : on renvoie une carte fraîche.
      await interaction.reply({ ...view, flags: V2_FLAGS }).catch(() => {});
    }
  }
}
