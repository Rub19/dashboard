import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getLeaderboard } from '../../utils/database.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Voir le classement du serveur 🏆')
    .addStringOption(opt =>
      opt.setName('type').setDescription('Type de classement').addChoices(
        { name: '⭐ Niveaux/XP', value: 'xp' },
        { name: '🪙 Coins', value: 'coins' },
      )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type') ?? 'xp';
    const rows = getLeaderboard(interaction.guild.id, 10);

    if (!rows.length) {
      return interaction.reply({ content: 'Aucun membre dans le classement.', ephemeral: true });
    }

    const sorted = type === 'coins'
      ? [...rows].sort((a, b) => b.coins - a.coins)
      : rows;

    const lines = sorted.map((row, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      const value = type === 'xp' ? `Niv. **${row.level}** (${row.xp} XP)` : `🪙 **${row.coins}**`;
      return `${medal} <@${row.user_id}> — ${value}`;
    });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle(`🏆 Classement ${type === 'xp' ? 'Niveaux' : 'Coins'} — ${interaction.guild.name}`)
          .setDescription(lines.join('\n'))
          .setTimestamp(),
      ],
    });
  },
};
