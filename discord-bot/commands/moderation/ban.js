import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison du bannissement'))
    .addIntegerOption(opt => opt.setName('jours').setDescription('Jours de messages à supprimer (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';
    const days = interaction.options.getInteger('jours') ?? 0;

    if (!target) return interaction.reply({ embeds: [errorEmbed('Membre introuvable.')], ephemeral: true });
    if (!target.bannable) return interaction.reply({ embeds: [errorEmbed('Je ne peux pas bannir ce membre.')], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Tu ne peux pas te bannir toi-même.')], ephemeral: true });

    await target.ban({ deleteMessageSeconds: days * 86400, reason });
    await interaction.reply({
      embeds: [successEmbed('Membre banni', `**${target.user.tag}** a été banni.\n**Raison :** ${reason}`)],
    });
  },
};
