import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifier la latence du bot 🏓'),

  async execute(interaction, client) {
    const sent = await interaction.reply({ content: 'Calcul...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({
      content: null,
      embeds: [
        new EmbedBuilder()
          .setColor(latency < 100 ? 0x57F287 : latency < 300 ? 0xFEE75C : 0xED4245)
          .setTitle('🏓 Pong !')
          .addFields(
            { name: 'Latence bot', value: `**${latency}ms**`, inline: true },
            { name: 'Latence API', value: `**${Math.round(client.ws.ping)}ms**`, inline: true },
          ),
      ],
    });
  },
};
