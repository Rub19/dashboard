import { Collection } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Cooldown handling
    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Collection());
    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown ?? 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
      if (now < expiration) {
        const remaining = ((expiration - now) / 1000).toFixed(1);
        return interaction.reply({
          embeds: [errorEmbed(`Tu dois attendre encore **${remaining}s** avant de réutiliser \`/${command.data.name}\`.`)],
          ephemeral: true,
        });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Erreur commande ${command.data.name}:`, error);
      const reply = { embeds: [errorEmbed('Une erreur est survenue lors de l\'exécution de cette commande.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
