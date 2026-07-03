import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const QUESTIONS = [
  { q: 'Quelle est la capitale de la France ?', correct: 'Paris', options: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'] },
  { q: 'Combien de côtés a un hexagone ?', correct: '6', options: ['5', '6', '7', '8'] },
  { q: 'Qui a peint la Joconde ?', correct: 'Léonard de Vinci', options: ['Michel-Ange', 'Raphaël', 'Léonard de Vinci', 'Picasso'] },
  { q: 'Quelle est la planète la plus proche du Soleil ?', correct: 'Mercure', options: ['Vénus', 'Mars', 'Mercure', 'Terre'] },
  { q: 'En quelle année a eu lieu la Révolution française ?', correct: '1789', options: ['1789', '1792', '1804', '1776'] },
  { q: 'Quel est le plus grand océan du monde ?', correct: 'Pacifique', options: ['Atlantique', 'Indien', 'Pacifique', 'Arctique'] },
  { q: 'Combien y a-t-il d\'os dans le corps humain adulte ?', correct: '206', options: ['186', '206', '215', '230'] },
  { q: 'Quel langage de programmation a créé Discord ?', correct: 'Python / Elixir', options: ['Java', 'Python / Elixir', 'C++', 'JavaScript'] },
];

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Réponds à une question de culture générale 🧠'),

  async execute(interaction) {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);

    const row = new ActionRowBuilder().addComponents(
      shuffled.map((opt, i) =>
        new ButtonBuilder().setCustomId(`trivia_${i}`).setLabel(opt).setStyle(ButtonStyle.Primary)
      )
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧠 Trivia')
      .setDescription(q.q)
      .setFooter({ text: 'Tu as 15 secondes pour répondre !' });

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });
    collector.on('collect', async btn => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: 'Ce n\'est pas ta question !', ephemeral: true });
      }
      const chosen = shuffled[parseInt(btn.customId.split('_')[1])];
      const correct = chosen === q.correct;
      collector.stop();
      await btn.update({
        embeds: [
          new EmbedBuilder()
            .setColor(correct ? 0x57F287 : 0xED4245)
            .setTitle(correct ? '✅ Bonne réponse !' : '❌ Mauvaise réponse !')
            .setDescription(`**Question :** ${q.q}\n**Ta réponse :** ${chosen}\n**Bonne réponse :** ${q.correct}`),
        ],
        components: [],
      });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('⏰ Temps écoulé !').setDescription(`La bonne réponse était : **${q.correct}**`)],
          components: [],
        });
      }
    });
  },
};
