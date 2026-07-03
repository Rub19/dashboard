import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Lancer une pièce 🪙'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? '🪙 Pile' : '🪙 Face';
    await interaction.reply({ embeds: [infoEmbed('Lancer de pièce', `Résultat : **${result}**`)] });
  },
};
