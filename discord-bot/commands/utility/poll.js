import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Créer un sondage 📊')
    .addStringOption(opt => opt.setName('question').setDescription('Question du sondage').setRequired(true))
    .addStringOption(opt => opt.setName('choix1').setDescription('Choix 1').setRequired(true))
    .addStringOption(opt => opt.setName('choix2').setDescription('Choix 2').setRequired(true))
    .addStringOption(opt => opt.setName('choix3').setDescription('Choix 3'))
    .addStringOption(opt => opt.setName('choix4').setDescription('Choix 4'))
    .addStringOption(opt => opt.setName('choix5').setDescription('Choix 5')),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const choices = [1, 2, 3, 4, 5]
      .map(i => interaction.options.getString(`choix${i}`))
      .filter(Boolean);

    const description = choices.map((c, i) => `${EMOJIS[i]} ${c}`).join('\n');

    const msg = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`📊 ${question}`)
          .setDescription(description)
          .setFooter({ text: `Sondage par ${interaction.user.username}` })
          .setTimestamp(),
      ],
      fetchReply: true,
    });

    for (let i = 0; i < choices.length; i++) {
      await msg.react(EMOJIS[i]);
    }
  },
};
