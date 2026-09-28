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
import { formatString, getTranslation, type TranslationDictionary } from '../../utils/i18n.js';

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
    description: "Anti-raid, anti-nuke, AutoMod, vérification des nouveaux membres et journaux d'audit",
    commandNames: ['antiraid', 'antinuke', 'automod', 'verification', 'logs'],
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
    description: "Giveaways, suggestions, sondages, événements, anniversaires, starboard et messages épinglés",
    commandNames: ['giveaway', 'suggest', 'poll', 'event', 'birthday', 'starboard', 'sticky', 'highlight'],
  },
  {
    id: 'voice_music',
    name: 'Musique & Salons Vocaux',
    emoji: '🎧',
    color: 0x10b981,
    description: "Lecteur musical (file, boucle, volume) et salons vocaux temporaires",
    commandNames: ['music', 'player', 'playlist', 'play', 'skip', 'previous', 'pause', 'resume', 'stop', 'queue', 'clearqueue', 'shuffle', 'loop', 'volume', 'nowplaying', 'voice'],
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
    commandNames: ['settings', 'prefix', 'language', 'permissions', 'ai-setup', 'module', 'serverstats', 'godmode'],
  },
  {
    id: 'general',
    name: 'Général & Utilitaires',
    emoji: '⚡',
    color: 0x3b82f6,
    description: "Commandes générales, vérification de latence et aide du serveur",
    commandNames: ['bot', 'help', 'ping', 'status', 'afk', 'reminder', 'tag'],
  },
];

const CATEGORY_TEXT_KEYS: Record<string, { name: keyof TranslationDictionary; description: keyof TranslationDictionary }> = {
  ai: { name: 'help_cat_ai_name', description: 'help_cat_ai_desc' },
  moderation: { name: 'help_cat_moderation_name', description: 'help_cat_moderation_desc' },
  security: { name: 'help_cat_security_name', description: 'help_cat_security_desc' },
  leveling: { name: 'help_cat_leveling_name', description: 'help_cat_leveling_desc' },
  community: { name: 'help_cat_community_name', description: 'help_cat_community_desc' },
  voice_music: { name: 'help_cat_voice_music_name', description: 'help_cat_voice_music_desc' },
  support: { name: 'help_cat_support_name', description: 'help_cat_support_desc' },
  admin: { name: 'help_cat_admin_name', description: 'help_cat_admin_desc' },
  general: { name: 'help_cat_general_name', description: 'help_cat_general_desc' },
};

/** Nom et description d'une catégorie d'aide dans la langue du serveur (repli : texte FR de HELP_CATEGORIES). */
export function localizeCategory(cat: HelpCategoryMeta, t: TranslationDictionary): { name: string; description: string } {
  const keys = CATEGORY_TEXT_KEYS[cat.id];
  return keys ? { name: t[keys.name], description: t[keys.description] } : { name: cat.name, description: cat.description };
}

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

export function buildCommandSyntax(cmd: Command, prefix: string, includePrefixAlias: boolean, t: TranslationDictionary = getTranslation('fr')): string {
  const subcommands = getCommandSubcommandNames(cmd);
  if (subcommands.length === 0) {
    return includePrefixAlias ? `\`/${cmd.name}\` ${t.help_or} \`${prefix}${cmd.name}\`` : `\`/${cmd.name}\``;
  }
  const maxShown = 4;
  const shown = subcommands.slice(0, maxShown).map((s) => `\`/${cmd.name} ${s}\``);
  const remaining = subcommands.length - maxShown;
  return remaining > 0 ? `${shown.join(', ')}${formatString(t.help_more_others, { count: remaining })}` : shown.join(', ');
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
    const { categoryKey = 'home', guildConfig, requesterTag, botAvatarUrl = 'https://ethone.dev/icons/ethone-icon-512.png?v=r2', commands = [] } = params;
    const t = getTranslation(guildConfig.language);
    const prefix = guildConfig.prefix || '!';
    const isHome = categoryKey === 'home';
    const parts: Parameters<typeof container>[1] = [];
    let color: number = BRAND_COLORS.primary;

    if (isHome) {
      parts.push(
        sectionWithThumbnail(
          [
            `## 📚 ${guildConfig.botName} — ${t.help_home_heading}`,
            formatString(t.help_home_counts, { commands: commands.length, modules: HELP_CATEGORIES.length }),
            formatString(t.help_home_hint, { prefix }),
          ],
          botAvatarUrl,
          guildConfig.botName,
        ),
        separator(),
        text(
          HELP_CATEGORIES.map((cat) => {
            const n = resolveCategoryCommands(cat, commands).length;
            return `${cat.emoji} **${localizeCategory(cat, t).name}** — ${formatString(n > 1 ? t.help_cmd_count_other : t.help_cmd_count_one, { count: n })}`;
          }).join('\n'),
        ),
        separator(false),
        text(t.help_home_shortcuts),
      );
    } else {
      const idx = HELP_CATEGORIES.findIndex((c) => c.id === categoryKey);
      const cat = idx >= 0 ? HELP_CATEGORIES[idx] : HELP_CATEGORIES[0];
      color = cat.color;
      const localizedCat = localizeCategory(cat, t);
      const categoryCommands = resolveCategoryCommands(cat, commands);
      parts.push(
        sectionWithThumbnail(
          [
            `## ${cat.emoji} ${localizedCat.name}`,
            `*${localizedCat.description}*`,
            formatString(t.help_module_subtitle, { index: (idx >= 0 ? idx : 0) + 1, total: HELP_CATEGORIES.length, count: categoryCommands.length }),
          ],
          botAvatarUrl,
          localizedCat.name,
        ),
        separator(),
      );
      if (categoryCommands.length === 0) {
        parts.push(text(t.help_module_empty));
      } else {
        // 4000 caractères max par message : on groupe en blocs de 6 commandes.
        const blocks: string[] = [];
        for (const cmd of categoryCommands) {
          const isStaff = cmd.userPermissions && cmd.userPermissions.length > 0;
          const aliases = cmd.aliases?.length ? formatString(t.help_alias_suffix, { aliases: cmd.aliases.map((a) => `\`${a}\``).join(', ') }) : '';
          blocks.push(`**/${cmd.name}**${isStaff ? ' 🔒' : ''} — ${cmd.description}\n${buildCommandSyntax(cmd, prefix, guildConfig.prefixCommandsEnabled, t)}${aliases}`);
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
        .setPlaceholder(t.help_select_placeholder)
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel(t.help_select_home_label).setValue('home').setDescription(t.help_select_home_desc).setDefault(isHome),
          ...HELP_CATEGORIES.map((c) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${localizeCategory(c, t).name} (${resolveCategoryCommands(c, commands).length})`)
              .setEmoji(c.emoji)
              .setValue(c.id)
              .setDescription(localizeCategory(c, t).description.slice(0, 95))
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
      new ButtonBuilder().setCustomId('help_btn_home').setLabel(t.help_btn_home).setEmoji('🏠').setStyle(isHome ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`help_btn_nav:${nextCatId}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary),
    );
    if (config.dashboardUrl) {
      navRow.addComponents(new ButtonBuilder().setLabel('Dashboard').setEmoji('🌐').setStyle(ButtonStyle.Link).setURL(config.dashboardUrl));
    }

    parts.push(separator(false), selectRow, navRow, footer(formatString(t.help_footer_requested_by, { tag: requesterTag })));
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
