import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';

export const unlockCommand: Command = {
  name: 'unlock',
  description: 'Déverrouille le salon pour autoriser à nouveau les messages (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouille le salon textuel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const channel = ctx.channel as TextChannel;
    if (!channel || !('permissionOverwrites' in channel)) {
      await ctx.reply({ content: 'Impossible de déverrouiller ce salon.' });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(ctx.guild.id, {
        SendMessages: null, // Réinitialise pour hériter des permissions normales
      });

      const embed = ctx
        .createEmbed('success')
        .setTitle('🔓 Salon Déverrouillé')
        .setDescription('Ce salon est à nouveau ouvert à la discussion.');

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: '❌ Impossible de déverrouiller le salon.' });
    }
  },
};
