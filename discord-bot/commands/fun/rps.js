import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const CHOICES = ['pierre', 'papier', 'ciseaux'];
const EMOJI = { pierre: '🪨', papier: '📄', ciseaux: '✂️' };

function getResult(player, bot) {
  if (player === bot) return 'égalité';
  if (
    (player === 'pierre' && bot === 'ciseaux') ||
    (player === 'papier' && bot === 'pierre') ||
    (player === 'ciseaux' && bot === 'papier')
  ) return 'gagné';
  return 'perdu';
}

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Pierre-Papier-Ciseaux ✂️')
    .addStringOption(opt =>
      opt.setName('choix').setDescription('Ton choix').setRequired(true).addChoices(
        { name: '🪨 Pierre', value: 'pierre' },
        { name: '📄 Papier', value: 'papier' },
        { name: '✂️ Ciseaux', value: 'ciseaux' },
      )
    ),

  async execute(interaction) {
    const player = interaction.options.getString('choix');
    const bot = CHOICES[Math.floor(Math.random() * 3)];
    const result = getResult(player, bot);

    const colors = { gagné: 0x57F287, perdu: 0xED4245, égalité: 0xFEE75C };
    const titles = { gagné: '🏆 Tu as gagné !', perdu: '💀 Tu as perdu !', égalité: '🤝 Égalité !' };

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors[result])
          .setTitle(titles[result])
          .addFields(
            { name: 'Ton choix', value: `${EMOJI[player]} ${player}`, inline: true },
            { name: 'Mon choix', value: `${EMOJI[bot]} ${bot}`, inline: true },
          ),
      ],
    });
  },
};
