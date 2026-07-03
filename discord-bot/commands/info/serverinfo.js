import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Afficher les informations du serveur 🏠'),

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.fetch();

    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels = channels.filter(c => c.type === 2).size;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🏠 ${guild.name}`)
          .setThumbnail(guild.iconURL({ size: 256 }))
          .addFields(
            { name: 'ID', value: guild.id, inline: true },
            { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: 'Membres', value: `👥 ${guild.memberCount}`, inline: true },
            { name: 'Salons texte', value: `💬 ${textChannels}`, inline: true },
            { name: 'Salons vocaux', value: `🔊 ${voiceChannels}`, inline: true },
            { name: 'Rôles', value: `🏷️ ${guild.roles.cache.size}`, inline: true },
            { name: 'Boosts', value: `✨ ${guild.premiumSubscriptionCount ?? 0} (Niveau ${guild.premiumTier})`, inline: true },
            { name: 'Vérification', value: guild.verificationLevel.toString(), inline: true },
          )
          .setTimestamp(),
      ],
    });
  },
};
