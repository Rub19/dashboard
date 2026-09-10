import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { pollRepository } from '../storage/pollRepository.js';
import { pollService } from '../services/pollService.js';
import { pollResultService } from '../services/pollResultService.js';
import { discordPollPanel } from '../ui/discordPollPanel.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const pollCommand: Command = {
  name: 'poll',
  description: 'Sondages, votes et décisions du serveur',
  category: 'Communauté',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Gestion avancée des sondages et votes communautaires')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Publier un panneau de vote interactif dans un salon Discord')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du sondage').setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Salon de destination')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Clôturer immédiatement un sondage et exécuter les automatisations')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du sondage à terminer').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('results')
        .setDescription("Afficher les résultats actuels ou finaux d'un sondage")
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du sondage').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Lister tous les sondages actifs de ce serveur')
    ),

  execute: async (ctx: CommandContext) => {
    const t = getTranslation(ctx.guildConfig.language);
    const guildId = ctx.guild?.id;
    if (!guildId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)], ephemeral: true });
      return;
    }

    let subcommand = 'list';
    let pollId = '';

    if (ctx.isSlash && ctx.interaction) {
      subcommand = ctx.interaction.options.getSubcommand();
      pollId = ctx.interaction.options.getString('id') || '';
    } else {
      subcommand = ctx.args[0]?.toLowerCase() || 'list';
      pollId = ctx.args[1] || '';
    }

    // Différer immédiatement : la publication du panneau et la clôture d'un sondage (subcommandes
    // "panel"/"end" ci-dessous) peuvent dépasser la fenêtre de 3s de Discord et invalider le token
    // d'interaction ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    if (subcommand === 'list') {
      const polls = pollRepository.getPolls(guildId);
      if (polls.length === 0) {
        await ctx.reply({
          embeds: [ctx.createEmbed('info').setDescription(t.poll_list_empty)],
          ephemeral: true,
        });
        return;
      }

      const embed = ctx
        .createEmbed('info')
        .setTitle(t.poll_list_title)
        .setDescription(
          polls
            .map((p) =>
              formatString(t.poll_list_item, {
                title: p.title,
                id: p.id,
                status: p.status,
                type: p.type,
                count: pollRepository.getVotes(guildId, p.id).length,
              })
            )
            .join('\n\n')
        )
        .setFooter({ text: 'ETHONE Sondages' });

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (!pollId) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(t.poll_missing_id)],
        ephemeral: true,
      });
      return;
    }

    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(formatString(t.poll_not_found, { id: pollId }))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'panel') {
      let channel: any = ctx.channel;
      if (ctx.isSlash && ctx.interaction) {
        channel = ctx.interaction.options.getChannel('channel') || ctx.channel;
      }

      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.poll_invalid_channel)], ephemeral: true });
        return;
      }

      const embed = discordPollPanel.buildPanelEmbed(poll);
      const rows = discordPollPanel.buildPanelActionRows(poll);

      await (channel as any).send({ embeds: [embed], components: rows });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.poll_panel_published, { title: poll.title, channel: `<#${channel.id}>` }))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'end') {
      const result = await pollService.endPoll(guildId, pollId, ctx.client);
      if (!result.success) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.poll_end_error, { error: result.error || '' }))], ephemeral: true });
        return;
      }

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.poll_ended_success, { title: poll.title }))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'results') {
      const results = pollResultService.calculateResults(guildId, pollId);
      if (!results) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.poll_results_calc_failed)], ephemeral: true });
        return;
      }

      const embed = ctx
        .createEmbed('success')
        .setTitle(formatString(t.poll_results_title, { title: poll.title }))
        .setDescription(poll.description || t.poll_results_default_desc)
        .addFields(
          { name: t.poll_field_total_voters, value: `${results.totalVoters}`, inline: true },
          { name: t.poll_field_total_weight, value: `${results.totalWeightedVotes}`, inline: true },
          { name: t.poll_field_quorum, value: `${results.quorumStatus} (${results.quorumPercentage.toFixed(1)}%)`, inline: true }
        );

      for (const q of results.questionResults) {
        const lines = q.optionResults.map(
          (opt: any) =>
            `• ${opt.text} : **${opt.voteCount}** votes (${opt.percentage.toFixed(1)}%) - ${opt.weightedScore} pts`
        );
        embed.addFields({
          name: `❓ ${q.title}`,
          value: lines.join('\n') || t.poll_no_votes,
          inline: false,
        });
      }

      await ctx.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
