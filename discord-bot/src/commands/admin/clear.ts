import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  User,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Supprime un nombre défini de messages dans le salon avec filtre optionnel par membre',
  category: 'Modération',
  aliases: ['purge', 'clean'],
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
    .addUserOption((option) =>
      option
        .setName('membre')
        .setDescription('Supprimer uniquement les messages de ce membre spécifique (anti-spam)')
        .setRequired(false)
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
    let targetUser: User | null = null;

    if (ctx.isSlash && ctx.interaction) {
      const slash = ctx.interaction as any;
      amount = slash.options?.getInteger('nombre') ?? 10;
      targetUser = slash.options?.getUser('membre') ?? null;
    } else if (ctx.args.length > 0) {
      const parsed = parseInt(ctx.args[0], 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
        amount = parsed;
      }
      if (ctx.message?.mentions.users.first()) {
        targetUser = ctx.message.mentions.users.first()!;
      }
    }

    const channel = ctx.channel as TextChannel;
    if (!channel || !('bulkDelete' in channel)) {
      await ctx.reply({ content: 'Impossible de supprimer les messages dans ce type de salon.' });
      return;
    }

    try {
      if (targetUser) {
        // Filtrer les messages du membre spécifique
        const messages = await channel.messages.fetch({ limit: 100 });
        const userMessages = messages
          .filter((m) => m.author.id === targetUser!.id)
          .first(amount);

        if (userMessages.length === 0) {
          await ctx.reply({
            content: `ℹ️ Aucun message récent trouvé pour **${targetUser.tag}** dans ce salon.`,
            ephemeral: true,
          });
          return;
        }

        const deleted = await channel.bulkDelete(userMessages, true);
        const embed = ctx
          .createEmbed('success')
          .setDescription(
            `${config.emojis.success || '✅'} **${deleted.size}** message(s) de **${targetUser.tag}** supprimé(s) avec succès.`
          );
        await ctx.reply({ embeds: [embed], ephemeral: true });
      } else {
        // Suppression standard de masse
        const deleted = await channel.bulkDelete(amount, true);
        const embed = ctx
          .createEmbed('success')
          .setDescription(
            `${config.emojis.success || '✅'} **${deleted.size}** message(s) supprimé(s) avec succès.`
          );
        await ctx.reply({ embeds: [embed], ephemeral: true });
      }
    } catch {
      await ctx.reply({
        content: `${config.emojis.error || '❌'} Impossible de supprimer les messages (les messages de plus de 14 jours ne peuvent pas être supprimés en masse par l'API Discord).`,
        ephemeral: true,
      });
    }
  },
};
