import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { pollRepository } from '../storage/pollRepository.js';
import { pollService } from '../services/pollService.js';
import { pollResultService } from '../services/pollResultService.js';
import { discordPollPanel } from '../ui/discordPollPanel.js';

export const pollCommand: Command = {
  name: 'poll',
  description: 'Gestion des sondages, votes et décisions ETHONE Polls & Voting 2.0',
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
    const guildId = ctx.guild?.id;
    if (!guildId) {
      await ctx.reply({ content: '❌ Commande réservée aux serveurs Discord.', ephemeral: true });
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

    if (subcommand === 'list') {
      const polls = pollRepository.getPolls(guildId);
      if (polls.length === 0) {
        await ctx.reply({
          content: 'ℹ️ Aucun sondage configuré sur ce serveur. Créez-en un depuis le dashboard ETHONE !',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Sondages & Votes ETHONE')
        .setColor(0x6366f1)
        .setDescription(
          polls
            .map(
              (p) =>
                `• **${p.title}** (\`${p.id}\`)\n  Statut: \`${p.status}\` | Type: \`${p.type}\` | Votes: **${p.stats.totalVotes}**`
            )
            .join('\n\n')
        )
        .setFooter({ text: 'ETHONE Polls & Voting 2.0' });

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (!pollId) {
      await ctx.reply({
        content: '❌ ID de sondage manquant. Exemple : `!poll results <id>` ou `!poll panel <id>`',
        ephemeral: true,
      });
      return;
    }

    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) {
      await ctx.reply({
        content: `❌ Sondage avec l'ID \`${pollId}\` introuvable sur ce serveur.`,
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
        await ctx.reply({ content: '❌ Salon textuel invalide.', ephemeral: true });
        return;
      }

      const embed = discordPollPanel.buildPanelEmbed(poll);
      const rows = discordPollPanel.buildPanelActionRows(poll);

      await (channel as any).send({ embeds: [embed], components: rows });
      await ctx.reply({
        content: `✅ Panneau de vote pour **${poll.title}** publié avec succès dans <#${channel.id}>.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'end') {
      const result = await pollService.endPoll(guildId, pollId, ctx.client);
      if (!result.success) {
        await ctx.reply({ content: `❌ Erreur : ${result.error}`, ephemeral: true });
        return;
      }

      await ctx.reply({
        content: `🏁 Le sondage **${poll.title}** a été clôturé avec succès. Les résultats finaux ont été consolidés et les automatisations déclenchées.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'results') {
      const results = pollResultService.calculateResults(guildId, pollId);
      if (!results) {
        await ctx.reply({ content: '❌ Impossible de calculer les résultats.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 Résultats : ${poll.title}`)
        .setDescription(poll.description || 'Statistiques de vote en temps réel')
        .setColor(0x10b981)
        .addFields(
          { name: '👥 Total Votants', value: `${results.totalVoters}`, inline: true },
          { name: '⚖️ Poids Total', value: `${results.totalWeightedVotes}`, inline: true },
          { name: '📌 Quorum', value: `${results.quorumStatus} (${results.quorumPercentage.toFixed(1)}%)`, inline: true }
        );

      for (const q of results.questionResults) {
        const lines = q.optionResults.map(
          (opt) =>
            `• ${opt.text} : **${opt.voteCount}** votes (${opt.percentage.toFixed(1)}%) - ${opt.weightedScore} pts`
        );
        embed.addFields({
          name: `❓ ${q.title}`,
          value: lines.join('\n') || 'Aucun vote',
          inline: false,
        });
      }

      await ctx.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
