import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

const DURATIONS = {
  '60': 60,
  '300': 300,
  '600': 600,
  '1800': 1800,
  '3600': 3600,
  '21600': 21600,
  '86400': 86400,
  '604800': 604800,
};

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Mettre un membre en sourdine temporairement')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à mettre en timeout').setRequired(true))
    .addStringOption(opt =>
      opt.setName('durée').setDescription('Durée du timeout').setRequired(true).addChoices(
        { name: '1 minute', value: '60' },
        { name: '5 minutes', value: '300' },
        { name: '10 minutes', value: '600' },
        { name: '30 minutes', value: '1800' },
        { name: '1 heure', value: '3600' },
        { name: '6 heures', value: '21600' },
        { name: '1 jour', value: '86400' },
        { name: '1 semaine', value: '604800' },
      )
    )
    .addStringOption(opt => opt.setName('raison').setDescription('Raison du timeout')),

  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const duration = interaction.options.getString('durée');
    const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Membre introuvable.')], ephemeral: true });
    if (!target.moderatable) return interaction.reply({ embeds: [errorEmbed('Je ne peux pas mettre ce membre en timeout.')], ephemeral: true });

    const seconds = DURATIONS[duration];
    await target.timeout(seconds * 1000, reason);

    const labels = { '60': '1 min', '300': '5 min', '600': '10 min', '1800': '30 min', '3600': '1h', '21600': '6h', '86400': '1 jour', '604800': '1 semaine' };
    await interaction.reply({
      embeds: [successEmbed('Timeout appliqué', `**${target.user.tag}** est en timeout pour **${labels[duration]}**.\n**Raison :** ${reason}`)],
    });
  },
};
