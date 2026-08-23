import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison de l\'expulsion')),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Membre introuvable.')], ephemeral: true });
    if (!target.kickable) return interaction.reply({ embeds: [errorEmbed('Je ne peux pas expulser ce membre.')], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Tu ne peux pas t\'expulser toi-même.')], ephemeral: true });

    await target.kick(reason);
    await interaction.reply({
      embeds: [successEmbed('Membre expulsé', `**${target.user.tag}** a été expulsé.\n**Raison :** ${reason}`)],
    });
  },
};
