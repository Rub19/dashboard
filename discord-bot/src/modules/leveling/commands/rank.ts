import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from '../services/levelCalculator.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

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
    const progressBar = LevelCalculator.renderProgressBar(progress.progressPercentage, 12);

    const embed = new EmbedBuilder()
      .setColor('#6366F1')
      .setAuthor({
        name: formatString(t.leveling_rank_author, { username: targetUser.username }),
        iconURL: targetUser.displayAvatarURL(),
      })
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: t.leveling_field_rank, value: `#${userRank}`, inline: true },
        { name: t.leveling_field_level, value: `${progress.level}`, inline: true },
        { name: t.leveling_field_messages, value: `${userData.messagesCount.toLocaleString()}`, inline: true },
        {
          name: t.leveling_field_progress,
          value: formatString(t.leveling_progress_value, {
            bar: progressBar,
            percent: progress.progressPercentage,
            cur: progress.currentLevelXp.toLocaleString(),
            next: progress.nextLevelXp.toLocaleString(),
            total: userData.totalXp.toLocaleString(),
          }),
          inline: false,
        }
      )
      .setFooter({ text: formatString(t.leveling_rank_footer, { guildName: guild.name }) })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};
