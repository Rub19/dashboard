import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Supprime un nombre défini de messages dans le salon (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  slashData: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime un nombre défini de messages dans le salon')
    .addIntegerOption((option) =>
      option
        .setName('nombre')
        .setDescription('Nombre de messages à supprimer (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.' });
      return;
    }

    const config = ctx.guildConfig;

    // Vérifier si le module Modération est activé
    if (!config.modules.moderation) {
      await ctx.reply({
        content: `${config.emojis.error || '❌'} Le module **Modération** est désactivé sur ce serveur. Activez-le depuis le dashboard web.`,
        ephemeral: true,
      });
      return;
    }

    // Vérifier les permissions du membre
    if (!ctx.isSlash && ctx.member && !ctx.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await ctx.reply({
        content: `${config.emojis.error || '❌'} Vous devez avoir la permission **Gérer les messages** pour utiliser cette commande.`,
        ephemeral: true,
      });
      return;
    }

    let amount = 10;
    if (ctx.isSlash && ctx.interaction) {
      const slash = ctx.interaction as any;
      amount = slash.options?.getInteger('nombre') ?? 10;
    } else if (ctx.args.length > 0) {
      const parsed = parseInt(ctx.args[0], 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
        amount = parsed;
      }
    }

    const channel = ctx.channel as TextChannel;
    if (!channel || !('bulkDelete' in channel)) {
      await ctx.reply({ content: 'Impossible de supprimer les messages dans ce type de salon.' });
      return;
    }

    try {
      const deleted = await channel.bulkDelete(amount, true);
      const embed = ctx
        .createEmbed('success')
        .setDescription(`${config.emojis.success || '✅'} **${deleted.size}** message(s) supprimé(s) avec succès.`);

      await ctx.reply({ embeds: [embed], ephemeral: true });
    } catch {
      await ctx.reply({
        content: `${config.emojis.error || '❌'} Impossible de supprimer les messages (les messages de plus de 14 jours ne peuvent pas être supprimés en masse).`,
        ephemeral: true,
      });
    }
  },
};
