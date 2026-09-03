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
    if (!ctx.isSlash) {
      await ctx.reply({
        content: 'Cette commande doit être exécutée via Slash Command.',
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
          content: '❌ Veuillez spécifier un salon textuel valide.',
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
        content: `✅ Giveaway pour **${prize}** lancé avec succès dans <#${gw.channelId}> ! (ID: \`${gw.id}\`)`,
        ephemeral: true,
      });
    } else if (sub === 'end') {
      const id = interaction.options.getString('id', true);
      const gw = giveawayStorage.getById(id);

      if (!gw || gw.guildId !== guild.id) {
        await ctx.reply({ content: '❌ Giveaway introuvable sur ce serveur.', ephemeral: true });
        return;
      }

      await ctx.deferReply(true);
      const winners = await giveawayService.endGiveawayManual(id, interaction.client);

      await ctx.reply({
        content: `🎉 Giveaway terminé avec succès ! Gagnant(s) : ${
          winners.length > 0 ? winners.map((w) => `<@${w}>`).join(', ') : 'Aucun participant éligible.'
        }`,
        ephemeral: true,
      });
    } else if (sub === 'reroll') {
      const id = interaction.options.getString('id', true);
      const count = interaction.options.getInteger('nombre') || 1;
      const gw = giveawayStorage.getById(id);

      if (!gw || gw.guildId !== guild.id) {
        await ctx.reply({ content: '❌ Giveaway introuvable sur ce serveur.', ephemeral: true });
        return;
      }

      await ctx.deferReply(true);
      const newWinners = await giveawayService.reroll(id, interaction.client, count);

      await ctx.reply({
        content: `🎲 Reroll effectué ! Nouveau(x) gagnant(s) : ${
          newWinners.length > 0 ? newWinners.map((w) => `<@${w}>`).join(', ') : 'Aucun autre participant disponible.'
        }`,
        ephemeral: true,
      });
    } else if (sub === 'cancel') {
      const id = interaction.options.getString('id', true);
      const gw = giveawayStorage.getById(id);

      if (!gw || gw.guildId !== guild.id) {
        await ctx.reply({ content: '❌ Giveaway introuvable sur ce serveur.', ephemeral: true });
        return;
      }

      await giveawayService.cancelGiveaway(id, interaction.client);
      await ctx.reply({ content: '❌ Le giveaway a été annulé avec succès.', ephemeral: true });
    } else if (sub === 'list') {
      const list = giveawayStorage.getForGuild(guild.id).filter((g) => g.status === 'active');

      if (list.length === 0) {
        await ctx.reply({
          content: 'ℹ️ Aucun giveaway n’est actuellement actif sur ce serveur.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#6366F1')
        .setTitle(`🎁 Giveaways Actifs • ${guild.name}`)
        .setDescription(
          list
            .map(
              (g) =>
                `• **${g.prize}** (<#${g.channelId}>) — \`${g.participants.length}\` participants — Fin : <t:${Math.floor(
                  new Date(g.endsAt).getTime() / 1000
                )}:R>\n  ID: \`${g.id}\``
            )
            .join('\n\n')
        )
        .setFooter({ text: 'Pour terminer un giveaway : /giveaway end <id>' });

      await ctx.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
