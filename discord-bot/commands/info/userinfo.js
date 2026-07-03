import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser } from '../../utils/database.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Afficher les informations d\'un utilisateur')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre (défaut: toi)')),

  async execute(interaction) {
    const target = interaction.options.getMember('membre') ?? interaction.member;
    const user = target.user;
    const dbUser = getUser(user.id, interaction.guild.id);

    const roles = target.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 10)
      .join(', ') || 'Aucun';

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(target.displayColor || 0x5865F2)
          .setTitle(`👤 ${user.username}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'ID', value: user.id, inline: true },
            { name: 'Surnom', value: target.nickname ?? 'Aucun', inline: true },
            { name: 'Bot', value: user.bot ? 'Oui' : 'Non', inline: true },
            { name: 'Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'A rejoint', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: `Rôles (${target.roles.cache.size - 1})`, value: roles },
            { name: 'Niveau', value: `${dbUser.level} (${dbUser.xp} XP)`, inline: true },
            { name: 'Coins', value: `🪙 ${dbUser.coins}`, inline: true },
            { name: 'Avertissements', value: `⚠️ ${dbUser.warnings}`, inline: true },
          )
          .setTimestamp(),
      ],
    });
  },
};
