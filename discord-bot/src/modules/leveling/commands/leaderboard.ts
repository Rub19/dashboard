import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { levelingStorage } from '../storage/levelingStorage.js';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  description: 'Affiche le classement des membres les plus actifs du serveur.',
  category: 'Leveling',
  slashData: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des membres les plus actifs du serveur.'),

  async execute(ctx: CommandContext): Promise<void> {
    const guild = ctx.guild;
    if (!guild) return;

    const config = levelingStorage.getConfig(guild.id);
    if (!config.enabled) {
      await ctx.reply({
        content: '⚠️ Le système de niveaux est actuellement désactivé sur ce serveur.',
        ephemeral: true,
      });
      return;
    }

    const topUsers = levelingStorage.getLeaderboard(guild.id, undefined, 10);

    if (topUsers.length === 0) {
      await ctx.reply({
        content: '📜 Aucun membre n’a encore acquis d’expérience sur ce serveur.',
        ephemeral: true,
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    const lines = topUsers.map((user, idx) => {
      const medal = medals[idx] || `**#${idx + 1}**`;
      return `${medal} <@${user.userId}> — **Niveau ${user.level}** (\`${user.totalXp.toLocaleString()} XP\`)`;
    });

    const embed = new EmbedBuilder()
      .setColor('#F59E0B')
      .setTitle(`🏆 Classement d'Activité • ${guild.name}`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'Consultez le classement complet sur le Dashboard Web' })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};
