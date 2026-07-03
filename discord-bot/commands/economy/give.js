import { SlashCommandBuilder } from 'discord.js';
import { getUser, addCoins, getDb } from '../../utils/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Donner des coins à quelqu\'un 🎁')
    .addUserOption(opt => opt.setName('membre').setDescription('Destinataire').setRequired(true))
    .addIntegerOption(opt => opt.setName('montant').setDescription('Montant à donner').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const amount = interaction.options.getInteger('montant');

    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Tu ne peux pas te donner des coins à toi-même.')], ephemeral: true });
    if (target.bot) return interaction.reply({ embeds: [errorEmbed('Tu ne peux pas donner des coins à un bot.')], ephemeral: true });

    const sender = getUser(interaction.user.id, interaction.guild.id);
    if (sender.coins < amount) return interaction.reply({ embeds: [errorEmbed(`Tu n'as pas assez de coins ! Tu as **${sender.coins} 🪙**.`)], ephemeral: true });

    getDb().prepare('UPDATE users SET coins = coins - ? WHERE user_id = ? AND guild_id = ?').run(amount, interaction.user.id, interaction.guild.id);
    addCoins(target.id, interaction.guild.id, amount);

    await interaction.reply({
      embeds: [successEmbed('Transfert effectué', `**${interaction.user.username}** a donné **${amount} 🪙** à **${target.username}** !`)],
    });
  },
};
