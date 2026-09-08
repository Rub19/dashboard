import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { giveawayService } from '../services/giveawayService.js';
import { giveawayStorage } from '../storage/giveawayStorage.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const giveawayCommand: Command = {
  name: 'giveaway',
  description: 'Gère les giveaways et tirages au sort du serveur.',
  category: 'Événements',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gère les giveaways et tirages au sort du serveur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Lance un nouveau tirage au sort instantanément')
        .addStringOption((opt) =>
          opt.setName('lot').setDescription('Le lot ou récompense à remporter').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('duree')
            .setDescription('Durée en minutes avant le tirage')
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('gagnants')
            .setDescription('Nombre de gagnants (défaut : 1)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addChannelOption((opt) =>
          opt
            .setName('salon')
            .setDescription('Salon dans lequel publier le giveaway')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Termine immédiatement un giveaway et effectue le tirage')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Identifiant du giveaway').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Sélectionne de nouveaux gagnants pour un giveaway terminé')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Identifiant du giveaway').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('nombre')
            .setDescription('Nombre de gagnants à retirer (défaut : 1)')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Annule un giveaway en cours sans tirer de gagnant')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Identifiant du giveaway').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Liste les giveaways actifs du serveur')
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.isSlash) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.giveaway_slash_only)],
        ephemeral: true,
      });
      return;
    }

    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const sub = interaction.options.getSubcommand();
    const guild = ctx.guild;
    if (!guild) return;

    if (sub === 'start') {
      const prize = interaction.options.getString('lot', true);
      const durationMinutes = interaction.options.getInteger('duree', true);
      const winnerCount = interaction.options.getInteger('gagnants') || 1;
      const targetChannel =
        interaction.options.getChannel('salon') || interaction.channel;

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(t.giveaway_invalid_channel)],
          ephemeral: true,
        });
        return;
      }

      await ctx.deferReply(true);

      const gw = await giveawayService.createGiveaway(interaction.client, {
        guildId: guild.id,
        channelId: targetChannel.id,
        prize,
        winnerCount,
        durationMinutes,
        hostedById: ctx.author.id,
        hostedByTag: ctx.author.tag,
      });

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.giveaway_start_success, { prize, channelId: gw.channelId, id: gw.id }))],
        ephemeral: true,
      });
    } else if (sub === 'end') {
      const id = interaction.options.getString('id', true);
      const gw = giveawayStorage.getById(id);

      if (!gw || gw.guildId !== guild.id) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.giveaway_not_found)], ephemeral: true });
        return;
      }

      await ctx.deferReply(true);
      const winners = await giveawayService.endGiveawayManual(id, interaction.client);

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.giveaway_end_success, {
          winners: winners.length > 0 ? winners.map((w) => `<@${w}>`).join(', ') : t.giveaway_no_eligible_participant,
        }))],
        ephemeral: true,
      });
    } else if (sub === 'reroll') {
      const id = interaction.options.getString('id', true);
      const count = interaction.options.getInteger('nombre') || 1;
      const gw = giveawayStorage.getById(id);

      if (!gw || gw.guildId !== guild.id) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.giveaway_not_found)], ephemeral: true });
        return;
      }

      await ctx.deferReply(true);
      const newWinners = await giveawayService.reroll(id, interaction.client, count);

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.giveaway_reroll_success, {
          winners: newWinners.length > 0 ? newWinners.map((w) => `<@${w}>`).join(', ') : t.giveaway_no_other_participant,
        }))],
        ephemeral: true,
      });
    } else if (sub === 'cancel') {
      const id = interaction.options.getString('id', true);
      const gw = giveawayStorage.getById(id);

      if (!gw || gw.guildId !== guild.id) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.giveaway_not_found)], ephemeral: true });
        return;
      }

      // Différer immédiatement : l'annulation ci-dessous notifie/édite le message du giveaway et
      // peut dépasser la fenêtre de 3s de Discord ("Unknown interaction" / 10062) si on ne le fait pas.
      await ctx.deferReply(true);
      await giveawayService.cancelGiveaway(id, interaction.client);
      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(t.giveaway_cancel_success)], ephemeral: true });
    } else if (sub === 'list') {
      const list = giveawayStorage.getForGuild(guild.id).filter((g) => g.status === 'active');

      if (list.length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('info').setDescription(t.giveaway_list_empty)],
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#6366F1')
        .setTitle(formatString(t.giveaway_list_title, { guildName: guild.name }))
        .setDescription(
          list
            .map((g) =>
              formatString(t.giveaway_list_item, {
                prize: g.prize,
                channelId: g.channelId,
                count: g.participants.length,
                end: Math.floor(new Date(g.endsAt).getTime() / 1000),
                id: g.id,
              })
            )
            .join('\n\n')
        )
        .setFooter({ text: t.giveaway_list_footer });

      await ctx.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
