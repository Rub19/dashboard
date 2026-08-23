import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser, addCoins, getDb } from '../../utils/database.js';
import { errorEmbed } from '../../utils/embeds.js';

const DAILY_AMOUNT = 100;
const STREAK_BONUS = 25;

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Réclamer ta récompense quotidienne 🎁'),

  async execute(interaction) {
    const user = getUser(interaction.user.id, interaction.guild.id);
    const now = Date.now();
    const lastDaily = user.last_daily ? new Date(user.last_daily).getTime() : 0;
    const cooldown = 86400000; // 24h

    if (now - lastDaily < cooldown) {
      const next = lastDaily + cooldown;
      return interaction.reply({
        embeds: [errorEmbed(`Tu as déjà réclamé ta récompense quotidienne.\nProchaine disponibilité : <t:${Math.floor(next / 1000)}:R>`)],
        ephemeral: true,
      });
    }

    const isStreak = now - lastDaily < 172800000 && lastDaily > 0;
    const bonus = isStreak ? STREAK_BONUS : 0;
    const total = DAILY_AMOUNT + bonus;

    addCoins(interaction.user.id, interaction.guild.id, total);
    getDb().prepare('UPDATE users SET last_daily = ? WHERE user_id = ? AND guild_id = ?')
      .run(new Date().toISOString(), interaction.user.id, interaction.guild.id);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🎁 Récompense quotidienne !')
          .setDescription(`Tu as reçu **${DAILY_AMOUNT} 🪙**${bonus ? ` + **${bonus} 🪙** (bonus streak !)` : ''}\n\n**Total : ${total} 🪙**`)
          .setFooter({ text: `Reviens demain pour continuer ta streak !` })
          .setTimestamp(),
      ],
    });
  },
};
