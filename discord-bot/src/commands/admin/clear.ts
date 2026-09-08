import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  User,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

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
    const config = ctx.guildConfig;
    const t = getTranslation(config.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    // Vérifier si le module Modération est activé
    if (!config.modules.moderation) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_module_disabled, { emoji: config.emojis.error || '❌' }))],
        ephemeral: true,
      });
      return;
    }

    // Vérifier les permissions du membre
    if (!ctx.isSlash && ctx.member && !ctx.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(`${config.emojis.error || '❌'} Vous devez avoir la permission **Gérer les messages** pour utiliser cette commande.`)],
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
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Impossible de supprimer les messages dans ce type de salon.')] });
      return;
    }

    // Différer immédiatement : la récupération des messages + la suppression en masse ci-dessous
    // peuvent dépasser la fenêtre de 3s de Discord et invalider le token d'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply({ ephemeral: true });

    try {
      if (targetUser) {
        // Filtrer les messages du membre spécifique
        const messages = await channel.messages.fetch({ limit: 100 });
        const userMessages = messages
          .filter((m) => m.author.id === targetUser!.id)
          .first(amount);

        if (userMessages.length === 0) {
          await ctx.reply({
            embeds: [ctx.createEmbed('info').setDescription(`ℹ️ Aucun message récent trouvé pour **${targetUser.tag}** dans ce salon.`)],
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
          .setDescription(formatString(t.clear_success, { count: deleted.size }));
        await ctx.reply({ embeds: [embed], ephemeral: true });
      }
    } catch {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(`${config.emojis.error || '❌'} Impossible de supprimer les messages (les messages de plus de 14 jours ne peuvent pas être supprimés en masse par l'API Discord).`)],
        ephemeral: true,
      });
    }
  },
};
