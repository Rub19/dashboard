import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from '../services/levelCalculator.js';
import { levelingStorage } from '../storage/levelingStorage.js';

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
    const guild = ctx.guild;
    if (!guild) return;

    const targetUser = ctx.isSlash
      ? (ctx.interaction as ChatInputCommandInteraction).options.getUser('membre') || ctx.author
      : ctx.message?.mentions.users.first() || ctx.author;

    const config = levelingStorage.getConfig(guild.id);
    if (!config.enabled) {
      await ctx.reply({
        content: '⚠️ Le système de niveaux est actuellement désactivé sur ce serveur.',
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
        name: `Progression de ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '🏆 Rang', value: `#${userRank}`, inline: true },
        { name: '⭐ Niveau', value: `${progress.level}`, inline: true },
        { name: '💬 Messages', value: `${userData.messagesCount.toLocaleString()}`, inline: true },
        {
          name: '📊 Progression vers le Niveau Suivant',
          value: `\`${progressBar}\` **${progress.progressPercentage}%**\n\`${progress.currentLevelXp.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()} XP\` (Total : ${userData.totalXp.toLocaleString()} XP)`,
          inline: false,
        }
      )
      .setFooter({ text: `${guild.name} • Système de Progression` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};
