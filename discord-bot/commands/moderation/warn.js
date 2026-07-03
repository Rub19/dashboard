import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { addWarning, getWarnings, clearWarnings } from '../../utils/database.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Gérer les avertissements')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Ajouter un avertissement')
        .addUserOption(opt => opt.setName('membre').setDescription('Membre à avertir').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Raison').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Voir les avertissements d\'un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Membre').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Effacer les avertissements d\'un membre')
        .addUserOption(opt => opt.setName('membre').setDescription('Membre').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('membre');

    if (sub === 'add') {
      const reason = interaction.options.getString('raison');
      addWarning(target.id, interaction.guild.id, reason, interaction.user.id);
      const warns = getWarnings(target.id, interaction.guild.id);
      await interaction.reply({
        embeds: [successEmbed('Avertissement ajouté', `**${target.tag}** a reçu un avertissement.\n**Raison :** ${reason}\n**Total :** ${warns.length} avertissement(s)`)],
      });
    } else if (sub === 'list') {
      const warns = getWarnings(target.id, interaction.guild.id);
      if (!warns.length) return interaction.reply({ embeds: [infoEmbed('Avertissements', `**${target.tag}** n'a aucun avertissement.`)], ephemeral: true });
      const list = warns.map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.moderator_id}> le ${w.created_at}`).join('\n');
      await interaction.reply({ embeds: [infoEmbed(`Avertissements de ${target.tag}`, list)], ephemeral: true });
    } else if (sub === 'clear') {
      clearWarnings(target.id, interaction.guild.id);
      await interaction.reply({ embeds: [successEmbed('Avertissements effacés', `Les avertissements de **${target.tag}** ont été supprimés.`)] });
    }
  },
};
