import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprimer des messages en masse')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt =>
      opt.setName('nombre').setDescription('Nombre de messages à supprimer (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(opt => opt.setName('membre').setDescription('Filtrer par membre (optionnel)')),

  async execute(interaction) {
    const amount = interaction.options.getInteger('nombre');
    const filterUser = interaction.options.getUser('membre');

    await interaction.deferReply({ ephemeral: true });

    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
    messages = [...messages.values()].slice(0, amount);

    // Discord ne permet de bulk-delete que les messages de moins de 14 jours
    const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 1_209_600_000);
    if (!deletable.length) return interaction.editReply({ embeds: [errorEmbed('Aucun message récent à supprimer.')] });

    const deleted = await interaction.channel.bulkDelete(deletable, true);
    await interaction.editReply({
      embeds: [successEmbed('Messages supprimés', `**${deleted.size}** message(s) supprimé(s)${filterUser ? ` de **${filterUser.tag}**` : ''}.`)],
    });
  },
};
