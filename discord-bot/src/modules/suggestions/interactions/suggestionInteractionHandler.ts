import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { SuggestionVoteService } from '../services/suggestionVoteService.js';
import { SuggestionCommentService } from '../services/suggestionCommentService.js';
import { SuggestionService } from '../services/suggestionService.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export async function handleSuggestionButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  const t = getTranslation(interaction.guildId ? guildConfigService.getConfig(interaction.guildId).language : 'fr');

  if (customId.startsWith('sugg_up:')) {
    const id = customId.split(':')[1];
    const { suggestion, action } = SuggestionVoteService.handleVote(id, interaction.user.id, 'up');
    if (!suggestion) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(t.suggest_not_found)], ephemeral: true });
      return;
    }
    // Différer immédiatement : la mise à jour du message de suggestion ci-dessous édite un
    // message via l'API Discord et peut dépasser la fenêtre de 3s de l'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await interaction.deferReply({ ephemeral: true });
    await SuggestionService.updateDiscordMessage(interaction.client, id);
    await interaction.editReply({
      embeds: [baseEmbed(action === 'removed' ? 'info' : 'success').setDescription(
        action === 'removed'
          ? t.suggest_upvote_removed
          : t.suggest_upvote_added
      )],
    });
  } else if (customId.startsWith('sugg_down:')) {
    const id = customId.split(':')[1];
    const { suggestion, action } = SuggestionVoteService.handleVote(id, interaction.user.id, 'down');
    if (!suggestion) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(t.suggest_not_found)], ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await SuggestionService.updateDiscordMessage(interaction.client, id);
    await interaction.editReply({
      embeds: [baseEmbed(action === 'removed' ? 'info' : 'success').setDescription(
        action === 'removed'
          ? t.suggest_downvote_removed
          : t.suggest_downvote_added
      )],
    });
  } else if (customId.startsWith('sugg_follow:')) {
    const id = customId.split(':')[1];
    await interaction.deferReply({ ephemeral: true });
    const { isFollowing } = SuggestionCommentService.toggleFollow(id, interaction.user.id);
    await SuggestionService.updateDiscordMessage(interaction.client, id);
    await interaction.editReply({
      embeds: [baseEmbed(isFollowing ? 'success' : 'info').setDescription(
        isFollowing
          ? t.suggest_follow_on
          : t.suggest_follow_off
      )],
    });
  } else if (customId.startsWith('sugg_comment:')) {
    const id = customId.split(':')[1];
    const modal = new ModalBuilder()
      .setCustomId(`modal_sugg_comment:${id}`)
      .setTitle(t.suggest_comment_modal_title);

    const input = new TextInputBuilder()
      .setCustomId('comment_content')
      .setLabel(t.suggest_comment_input_label)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(t.suggest_comment_input_placeholder)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
  }
}

export async function handleSuggestionModal(interaction: ModalSubmitInteraction): Promise<void> {
  const customId = interaction.customId;
  const t = getTranslation(interaction.guildId ? guildConfigService.getConfig(interaction.guildId).language : 'fr');

  if (customId.startsWith('modal_sugg_comment:')) {
    const id = customId.split(':')[1];
    const content = interaction.fields.getTextInputValue('comment_content');

    const isStaff = interaction.memberPermissions?.has('ManageGuild') || false;

    // Différer immédiatement : l'enregistrement du commentaire + la mise à jour du message de
    // suggestion ci-dessous peuvent dépasser la fenêtre de 3s de l'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await interaction.deferReply({ ephemeral: true });

    SuggestionCommentService.addComment(id, {
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      avatarUrl: interaction.user.displayAvatarURL(),
      content,
      isStaff,
    });

    await SuggestionService.updateDiscordMessage(interaction.client, id);

    await interaction.editReply({
      embeds: [baseEmbed('success').setDescription(t.suggest_comment_added)],
    });
  } else if (customId === 'modal_suggest_create') {
    const title = interaction.fields.getTextInputValue('sugg_title');
    const description = interaction.fields.getTextInputValue('sugg_description');
    const category = interaction.fields.getTextInputValue('sugg_category') || t.suggest_default_category;

    if (!interaction.guildId) return;

    // Différer immédiatement : la création + publication de la suggestion ci-dessous peut
    // dépasser la fenêtre de 3s de l'interaction ("Unknown interaction" / 10062).
    await interaction.deferReply({ ephemeral: true });

    try {
      const suggestion = await SuggestionService.createSuggestion(interaction.client, {
        guildId: interaction.guildId,
        authorId: interaction.user.id,
        authorTag: interaction.user.tag,
        authorAvatarUrl: interaction.user.displayAvatarURL(),
        title,
        description,
        category,
      });

      await interaction.editReply({
        embeds: [baseEmbed('success').setDescription(formatString(t.suggest_submitted_success, { numericId: suggestion.numericId }))],
      });
    } catch (err: any) {
      await interaction.editReply({
        embeds: [baseEmbed('error').setDescription(formatString(t.suggest_generic_error, { error: err.message }))],
      });
    }
  }
}
