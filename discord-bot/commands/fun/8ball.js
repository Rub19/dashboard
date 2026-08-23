import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

const RESPONSES = [
  '🟢 Oui, absolument !', '🟢 C\'est certain.', '🟢 Sans aucun doute.', '🟢 Très probablement.',
  '🟢 Les signes disent oui.', '🟡 Difficile à dire, réessaie.', '🟡 Concentre-toi et réessaie.',
  '🟡 Je ne peux pas prédire maintenant.', '🔴 Non.', '🔴 Mes sources disent non.',
  '🔴 Très improbable.', '🔴 Ne compte pas là-dessus.',
];

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Pose une question à la boule magique 🎱')
    .addStringOption(opt => opt.setName('question').setDescription('Ta question').setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    await interaction.reply({
      embeds: [
        infoEmbed('🎱 Boule Magique', `**Question :** ${question}\n**Réponse :** ${response}`)
          .setFooter({ text: `Demandé par ${interaction.user.username}` }),
      ],
    });
  },
};
