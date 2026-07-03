import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Lancer des dés 🎲')
    .addIntegerOption(opt => opt.setName('faces').setDescription('Nombre de faces (défaut: 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption(opt => opt.setName('nombre').setDescription('Nombre de dés (défaut: 1)').setMinValue(1).setMaxValue(10)),

  async execute(interaction) {
    const faces = interaction.options.getInteger('faces') ?? 6;
    const count = interaction.options.getInteger('nombre') ?? 1;

    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    const display = rolls.map(r => `**${r}**`).join(' + ');

    await interaction.reply({
      embeds: [infoEmbed('🎲 Lancer de dés', `${count}d${faces} → ${display}${count > 1 ? ` = **${total}**` : ''}`)],
    });
  },
};
