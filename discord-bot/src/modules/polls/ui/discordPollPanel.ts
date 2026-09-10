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
import { baseEmbed } from '../../../utils/embeds.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export class DiscordPollPanel {
  private client: Client | null = null;

  public initialize(client: Client): void {
    this.client = client;
  }

  /**
   * Build Discord Embed for a poll.
   */
  public buildPanelEmbed(poll: DiscordPoll): EmbedBuilder {
    const t = getTranslation(guildConfigService.getConfig(poll.guildId).language);
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
      .setColor((config.embedColor as any) || '#5865F2')
      .setFooter({
        text:
          config.footerText ||
          formatString(t.poll_panel_footer_default, {
            date: poll.endsAt ? new Date(poll.endsAt).toLocaleDateString() : t.poll_panel_no_end_date,
          }),
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
    const t = getTranslation(guildConfigService.getConfig(poll.guildId).language);
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
          .setLabel(t.poll_btn_view_results)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📊')
      );
    }

    utilRow.addComponents(
      new ButtonBuilder()
        .setLabel(t.poll_btn_vote_web)
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

    const t = getTranslation(guildConfigService.getConfig(interaction.guildId).language);

    const poll = pollRepository.getPollById(interaction.guildId, pollId);
    if (!poll) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(t.poll_deleted)], ephemeral: true });
      return;
    }

    // 1. Live Results View
    if (action === 'poll_view_results') {
      const results = pollResultService.calculateResults(poll);
      const firstQ = results.questionsResults[0];

      const lines = firstQ?.options.map(
        (o: any) => `${o.emoji || '🔹'} **${o.label}**\n${'█'.repeat(Math.round(o.percentage / 10))}${'░'.repeat(10 - Math.round(o.percentage / 10))} **${o.percentage}%** (${o.votesCount} votes)`
      ).join('\n\n');

      const resultsEmbed = baseEmbed('info', {
        footerText: formatString(t.poll_live_results_footer, { count: results.uniqueParticipants }),
      })
        .setTitle(formatString(t.poll_live_results_title, { title: poll.title }))
        .setDescription(lines || t.poll_no_votes_recorded);

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
          embeds: [baseEmbed('error').setDescription(formatString(t.poll_vote_error, { error: result.error || '' }))],
          ephemeral: true,
        });
        return;
      }

      const chosenOpt = poll.questions[0]?.options.find((o) => o.id === optionId);
      const confirmEmbed = baseEmbed('success', { footerText: 'ETHONE Sondages' })
        .setTitle(t.poll_vote_success_title)
        .setDescription(
          formatString(t.poll_vote_success_desc, {
            label: chosenOpt?.label || optionId,
            weight: result.vote?.weight || 1,
            visibility: poll.anonymity === 'PUBLIC' ? t.poll_visibility_public : t.poll_visibility_anonymous,
          })
        );

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
  }
}

export const discordPollPanel = new DiscordPollPanel();
