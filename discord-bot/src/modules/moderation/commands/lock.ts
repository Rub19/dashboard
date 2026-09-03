import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';

export const lockCommand: Command = {
  name: 'lock',
  description: 'Verrouille le salon pour empêcher les membres d’écrire (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  slashData: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouille le salon textuel')
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison du verrouillage').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const channel = ctx.channel as TextChannel;
    if (!channel || !('permissionOverwrites' in channel)) {
      await ctx.reply({ content: 'Impossible de verrouiller ce salon.' });
      return;
    }

    const reason = ctx.isSlash && ctx.interaction
      ? ctx.interaction.options.getString('raison') || 'Salon verrouillé temporairement'
      : ctx.args.join(' ') || 'Salon verrouillé temporairement';

    try {
      await channel.permissionOverwrites.edit(ctx.guild.id, {
        SendMessages: false,
      });

      const embed = ctx
        .createEmbed('error')
        .setTitle('🔒 Salon Verrouillé')
        .setDescription(`Ce salon a été verrouillé par un modérateur.\n**Raison :** ${reason}`);

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: '❌ Impossible de verrouiller le salon.' });
    }
  },
};
