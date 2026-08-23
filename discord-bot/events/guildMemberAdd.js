import { EmbedBuilder } from 'discord.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    const channel = member.guild.systemChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('👋 Nouveau membre !')
      .setDescription(`Bienvenue **${member.user.username}** sur **${member.guild.name}** ! 🎉`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Membre n°', value: `#${member.guild.memberCount}`, inline: true },
        { name: 'Compte créé le', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }
      )
      .setTimestamp();

    channel.send({ embeds: [embed] });
  },
};
