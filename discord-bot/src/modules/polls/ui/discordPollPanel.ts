import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  Client,
} from 'discord.js';
import { DiscordPoll } from '../types/index.js';
import { pollRepository } from '../storage/pollRepository.js';
import { pollVotingService } from '../services/pollVotingService.js';
import { pollResultService } from '../services/pollResultService.js';
import { logger } from '../../../utils/logger.js';

export class DiscordPollPanel {
  private client: Client | null = null;

  public initialize(client: Client): void {
    this.client = client;
  }

  /**
   * Build Discord Embed for a poll.
   */
  public buildPanelEmbed(poll: DiscordPoll): EmbedBuilder {
    const config = poll.panelConfig;
    const firstQ = poll.questions[0];

    const embed = new EmbedBuilder()
      .setTitle(config.embedTitle || poll.title)
      .setDescription(
        (config.embedDescription ? `${config.embedDescription}\n\n` : '') +
          (firstQ ? `❓ **${firstQ.title}**\n\n` : '') +
          (firstQ?.options
            ? firstQ.options
                .map((opt) => `${opt.emoji || '🔹'} **${opt.label}** ${opt.description ? `• *${opt.description}*` : ''}`)
                .join('\n')
            : '')
      )
      .setColor((config.embedColor as any) || '#8b5cf6')
      .setFooter({
        text: config.footerText || `ETHONE Polls • Fin : ${poll.endsAt ? new Date(poll.endsAt).toLocaleDateString() : 'Non définie'}`,
      })
      .setTimestamp();

    if (config.thumbnailUrl) embed.setThumbnail(config.thumbnailUrl);
    if (config.imageUrl) embed.setImage(config.imageUrl);

    return embed;
  }

  /**
   * Build Discord interactive Action Rows with voting buttons.
   */
  public buildPanelActionRows(poll: DiscordPoll): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const firstQ = poll.questions[0];

    if (firstQ && firstQ.options) {
      // Create option buttons (up to 5 per row, max 2 rows)
      const optionRowsCount = Math.ceil(firstQ.options.length / 5);
      for (let r = 0; r < Math.min(optionRowsCount, 2); r++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const slice = firstQ.options.slice(r * 5, (r + 1) * 5);
        for (const opt of slice) {
          const btn = new ButtonBuilder()
            .setCustomId(`poll_vote:${poll.id}:${opt.id}`)
            .setLabel(opt.label.substring(0, 80))
            .setStyle(ButtonStyle.Primary);

          if (opt.emoji) btn.setEmoji(opt.emoji);
          row.addComponents(btn);
        }
        rows.push(row);
      }
    }

    // Utility row: View Results + Web Link
    const utilRow = new ActionRowBuilder<ButtonBuilder>();
    if (poll.panelConfig.showLiveResultsButton) {
      utilRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_view_results:${poll.id}`)
          .setLabel('Voir les Résultats')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📊')
      );
    }

    utilRow.addComponents(
      new ButtonBuilder()
        .setLabel('Voter sur le Web')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://ethone.dev/discord/polls/${poll.id}/vote?guildId=${poll.guildId}`)
        .setEmoji('🌐')
    );

    rows.push(utilRow);
    return rows;
  }

  /**
   * Handle Button interaction from Discord.
   */
  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const action = parts[0];
    const pollId = parts[1];
    const optionId = parts[2];

    if (!interaction.guildId || !pollId) return;

    const poll = pollRepository.getPollById(interaction.guildId, pollId);
    if (!poll) {
      await interaction.reply({ content: '❌ Ce sondage n\'existe plus ou a été supprimé.', ephemeral: true });
      return;
    }

    // 1. Live Results View
    if (action === 'poll_view_results') {
      const results = pollResultService.calculateResults(poll);
      const firstQ = results.questionsResults[0];

      const lines = firstQ?.options.map(
        (o) => `${o.emoji || '🔹'} **${o.label}**\n${'█'.repeat(Math.round(o.percentage / 10))}${'░'.repeat(10 - Math.round(o.percentage / 10))} **${o.percentage}%** (${o.votesCount} votes)`
      ).join('\n\n');

      const resultsEmbed = new EmbedBuilder()
        .setTitle(`📊 Résultats en direct — ${poll.title}`)
        .setDescription(lines || 'Aucun vote enregistré.')
        .setColor('#8b5cf6')
        .setFooter({ text: `Total participants : ${results.uniqueParticipants} • ETHONE Polls 2.0` })
        .setTimestamp();

      await interaction.reply({ embeds: [resultsEmbed], ephemeral: true });
      return;
    }

    // 2. Cast Vote
    if (action === 'poll_vote' && optionId) {
      const member = interaction.member;
      const roles = member && 'roles' in member && Array.isArray(member.roles) ? (member.roles as string[]) : [];

      const result = await pollVotingService.castVote({
        guildId: poll.guildId,
        pollId: poll.id,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        userAvatar: interaction.user.displayAvatarURL(),
        questionId: poll.questions[0]?.id || 'q-1',
        selectedOptionIds: [optionId],
        userRoleIds: roles,
        accountAgeDays: Math.floor((Date.now() - interaction.user.createdTimestamp) / 86400000),
        guildMemberDays: member && 'joinedTimestamp' in member && member.joinedTimestamp
          ? Math.floor((Date.now() - Number(member.joinedTimestamp)) / 86400000)
          : 0,
      });

      if (!result.success) {
        await interaction.reply({
          content: `❌ **Erreur de vote :** ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      const chosenOpt = poll.questions[0]?.options.find((o) => o.id === optionId);
      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Vote enregistré avec succès !')
        .setDescription(
          `Votre vote pour **${chosenOpt?.label || optionId}** a bien été comptabilisé.\n\n` +
            `⚖️ **Poids du vote :** ${result.vote?.weight || 1} point(s)\n` +
            `🔒 **Confidentialité :** ${poll.anonymity === 'PUBLIC' ? 'Public' : 'Anonyme'}\n\n` +
            `*Merci pour votre participation à la vie du serveur !*`
        )
        .setColor('#10b981')
        .setFooter({ text: 'ETHONE Polls 2.0' })
        .setTimestamp();

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
  }
}

export const discordPollPanel = new DiscordPollPanel();
