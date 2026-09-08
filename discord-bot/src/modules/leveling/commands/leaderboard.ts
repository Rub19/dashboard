import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  description: 'Affiche le classement des membres les plus actifs du serveur.',
  category: 'Leveling',
  slashData: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des membres les plus actifs du serveur.'),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);
    const guild = ctx.guild;
    if (!guild) return;

    const config = levelingStorage.getConfig(guild.id);
    if (!config.enabled) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.leveling_module_disabled)],
        ephemeral: true,
      });
      return;
    }

    const topUsers = levelingStorage.getLeaderboard(guild.id, undefined, 10);

    if (topUsers.length === 0) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription(t.leveling_leaderboard_empty)],
        ephemeral: true,
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    const lines = topUsers.map((user, idx) => {
      const medal = medals[idx] || `**#${idx + 1}**`;
      return formatString(t.leveling_leaderboard_line, { medal, userId: user.userId, level: user.level, xp: user.totalXp.toLocaleString() });
    });

    const embed = new EmbedBuilder()
      .setColor('#F59E0B')
      .setTitle(formatString(t.leveling_leaderboard_title, { guildName: guild.name }))
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: t.leveling_leaderboard_footer })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};
