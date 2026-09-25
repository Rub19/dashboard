import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from '../services/levelCalculator.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { renderRankCard } from '../images/rankCard.js';
import { logger } from '../../../utils/logger.js';
import { container, sectionWithThumbnail, separator, text, footer, progressBar, toneToColor, buttonRow } from '../../../utils/components.js';

export const rankCommand: Command = {
  name: 'rank',
  description: 'Affiche votre niveau, rang et progression d’XP.',
  category: 'Leveling',
  slashData: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Affiche votre niveau, rang et progression d’XP.')
    .addUserOption((opt) =>
      opt
        .setName('membre')
        .setDescription('Le membre dont vous souhaitez consulter le niveau')
        .setRequired(false)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);
    const guild = ctx.guild;
    if (!guild) return;

    const targetUser = ctx.isSlash
      ? (ctx.interaction as ChatInputCommandInteraction).options.getUser('membre') || ctx.author
      : ctx.message?.mentions?.users?.first() || ctx.author;

    const config = levelingStorage.getConfig(guild.id);
    if (!config.enabled) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.leveling_module_disabled)],
        ephemeral: true,
      });
      return;
    }

    const userData = xpWriteBuffer.getUser(guild.id, targetUser.id);
    const progress = LevelCalculator.getProgress(userData.totalXp);
    const leaderboard = levelingStorage.getLeaderboard(guild.id);
    const userRank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1 || leaderboard.length + 1;
    const bar = progressBar(progress.progressPercentage, 14);
    const medal = userRank === 1 ? '🥇' : userRank === 2 ? '🥈' : userRank === 3 ? '🥉' : '🏅';

    // Carte de rang en image (avatar, progression, prochaine récompense) ; si le rendu échoue, la carte texte ci-dessous prend le relais.
    try {
      const nextReward = levelingStorage
        .getRewards(guild.id)
        .filter((r) => r.enabled && r.level > progress.level)
        .sort((a, b) => a.level - b.level)[0];
      const png = await renderRankCard({
        username: targetUser.username,
        avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
        rank: userRank,
        totalMembers: leaderboard.length,
        level: progress.level,
        totalXp: userData.totalXp,
        currentLevelXp: progress.currentLevelXp,
        nextLevelXp: progress.nextLevelXp,
        progressPercentage: progress.progressPercentage,
        messages: userData.messagesCount,
        accent: config.accentColor,
        nextReward: nextReward ? { name: guild.roles.cache.get(nextReward.roleId)?.name ?? 'rôle', level: nextReward.level } : null,
      });
      await ctx.reply({
        files: [new AttachmentBuilder(png, { name: `rank-${targetUser.id}.png` })],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('rank_btn_leaderboard').setLabel('Classement').setEmoji('🏆').setStyle(ButtonStyle.Secondary))],
      });
      return;
    } catch (err) {
      logger.warn('[Rank] Rendu de la carte impossible, carte texte utilisée :', err instanceof Error ? err.message : err);
    }

    // Carte de rang en Components V2 : avatar en vignette, stats en colonnes,
    // barre de progression, pied de page. Même accent ambré que le module
    // Niveaux (ton "warning" des embeds historiques).
    const card = container(toneToColor('warning'), [
      sectionWithThumbnail(
        [
          `## ${medal} ${formatString(t.leveling_rank_author, { username: targetUser.username })}`,
          `**${t.leveling_field_rank}** #${userRank} / ${Math.max(leaderboard.length, 1)}   ·   **${t.leveling_field_level}** ${progress.level}`,
          `**${t.leveling_field_messages}** ${userData.messagesCount.toLocaleString('fr-FR')}   ·   **XP** ${userData.totalXp.toLocaleString('fr-FR')}`,
        ],
        targetUser.displayAvatarURL({ size: 256 }),
        targetUser.username
      ),
      separator(),
      text(`**${t.leveling_field_progress}** — ${progress.progressPercentage}%\n\`${bar}\` ${progress.currentLevelXp.toLocaleString('fr-FR')} / ${progress.nextLevelXp.toLocaleString('fr-FR')} XP`),
      separator(false),
      buttonRow(
        new ButtonBuilder().setCustomId('rank_btn_leaderboard').setLabel('Classement').setEmoji('🏆').setStyle(ButtonStyle.Secondary)
      ),
      footer(formatString(t.leveling_rank_footer, { guildName: guild.name })),
    ]);

    await ctx.reply({ components: [card], componentsV2: true });
  },
};
