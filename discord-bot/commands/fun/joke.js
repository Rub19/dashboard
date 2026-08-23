import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';

const JOKES = [
  { setup: 'Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ?', punchline: 'Parce que sinon ils tomberaient dans le bateau !' },
  { setup: 'Qu\'est-ce qu\'un canif ?', punchline: 'C\'est le petit fien de la canne !' },
  { setup: 'Pourquoi les informaticiens confondent-ils Halloween et Noël ?', punchline: 'Parce que OCT 31 = DEC 25 !' },
  { setup: 'Qu\'est-ce qu\'un crocodile qui surveille la cour d\'école ?', punchline: 'Un sac à dents !' },
  { setup: 'Pourquoi les poissons n\'utilisent pas d\'ordinateur ?', punchline: 'Parce qu\'ils ont peur du net !' },
  { setup: 'Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ?', punchline: 'Un chat-peint de Noël !' },
  { setup: 'Qu\'est-ce qu\'un panda qui fait la cuisine ?', punchline: 'Un chef cui-sine !' },
  { setup: 'Que dit un mur à un autre mur ?', punchline: 'On se retrouve au coin !' },
  { setup: 'Qu\'est-ce qu\'un chat qui mange des croissants ?', punchline: 'Un chat-croissant !' },
  { setup: 'Pourquoi est-ce que les développeurs portent des lunettes ?', punchline: 'Parce qu\'ils ne peuvent pas C# !' },
];

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Entendre une blague 😂'),

  async execute(interaction) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
    await interaction.reply({
      embeds: [
        infoEmbed('😂 Blague du jour', `${joke.setup}\n\n||${joke.punchline}||`)
          .setFooter({ text: 'Cliquez sur le spoiler pour voir la chute !' }),
      ],
    });
  },
};
