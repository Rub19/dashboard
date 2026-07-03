import { SlashCommandBuilder } from 'discord.js';
import { addReminder } from '../../utils/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

const UNITS = { s: 1000, m: 60000, h: 3600000, j: 86400000 };

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|j)$/i);
  if (!match) return null;
  return parseInt(match[1]) * UNITS[match[2].toLowerCase()];
}

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Créer un rappel ⏰')
    .addStringOption(opt => opt.setName('durée').setDescription('Ex: 10m, 2h, 1j').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Message du rappel').setRequired(true)),

  async execute(interaction) {
    const raw = interaction.options.getString('durée');
    const message = interaction.options.getString('message');
    const ms = parseDuration(raw);

    if (!ms) return interaction.reply({ embeds: [errorEmbed('Format invalide. Exemples : `30s`, `10m`, `2h`, `1j`')], ephemeral: true });
    if (ms > 7 * 86400000) return interaction.reply({ embeds: [errorEmbed('La durée maximum est de 7 jours.')], ephemeral: true });

    const remindAt = Date.now() + ms;
    addReminder(interaction.user.id, interaction.channelId, message, remindAt);

    await interaction.reply({
      embeds: [successEmbed('Rappel créé', `Je te rappellerai <t:${Math.floor(remindAt / 1000)}:R> : **${message}**`)],
      ephemeral: true,
    });
  },
};
