import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser } from '../../utils/database.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Voir ton solde et niveau 💰')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre (défaut: toi)')),

  async execute(interaction) {
    const target = interaction.options.getUser('membre') ?? interaction.user;
    const data = getUser(target.id, interaction.guild.id);
    const xpNeeded = data.level * 100;
    const progress = Math.round((data.xp / xpNeeded) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle(`💰 Profil de ${target.username}`)
          .setThumbnail(target.displayAvatarURL({ size: 128 }))
          .addFields(
            { name: '🏆 Niveau', value: `**${data.level}**`, inline: true },
            { name: '⭐ XP', value: `**${data.xp}** / ${xpNeeded}`, inline: true },
            { name: '🪙 Coins', value: `**${data.coins}**`, inline: true },
            { name: 'Progression', value: `\`${bar}\` ${data.xp}/${xpNeeded}` },
          ),
      ],
    });
  },
};
