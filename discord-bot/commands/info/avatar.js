import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Afficher l\'avatar d\'un utilisateur 🖼️')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre (défaut: toi)')),

  async execute(interaction) {
    const target = interaction.options.getUser('membre') ?? interaction.user;
    const avatar = target.displayAvatarURL({ size: 1024, extension: 'png' });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🖼️ Avatar de ${target.username}`)
          .setImage(avatar)
          .setURL(avatar),
      ],
    });
  },
};
