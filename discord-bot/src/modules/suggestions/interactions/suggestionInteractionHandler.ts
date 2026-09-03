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

export async function handleSuggestionButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  if (customId.startsWith('sugg_up:')) {
    const id = customId.split(':')[1];
    const { suggestion, action } = SuggestionVoteService.handleVote(id, interaction.user.id, 'up');
    if (!suggestion) {
      await interaction.reply({ content: '❌ Suggestion introuvable.', ephemeral: true });
      return;
    }
    await SuggestionService.updateDiscordMessage(interaction.client, id);
    await interaction.reply({
      content:
        action === 'removed'
          ? '↩️ Votre vote positif a été retiré.'
          : '👍 Votre vote positif a été pris en compte !',
      ephemeral: true,
    });
  } else if (customId.startsWith('sugg_down:')) {
    const id = customId.split(':')[1];
    const { suggestion, action } = SuggestionVoteService.handleVote(id, interaction.user.id, 'down');
    if (!suggestion) {
      await interaction.reply({ content: '❌ Suggestion introuvable.', ephemeral: true });
      return;
    }
    await SuggestionService.updateDiscordMessage(interaction.client, id);
    await interaction.reply({
      content:
        action === 'removed'
          ? '↩️ Votre vote négatif a été retiré.'
          : '👎 Votre vote négatif a été pris en compte !',
      ephemeral: true,
    });
  } else if (customId.startsWith('sugg_follow:')) {
    const id = customId.split(':')[1];
    const { isFollowing } = SuggestionCommentService.toggleFollow(id, interaction.user.id);
    await SuggestionService.updateDiscordMessage(interaction.client, id);
    await interaction.reply({
      content: isFollowing
        ? '🔔 Vous suivez maintenant cette suggestion. Vous recevrez une notification lors de chaque mise à jour !'
        : '🔕 Vous ne suivez plus cette suggestion.',
      ephemeral: true,
    });
  } else if (customId.startsWith('sugg_comment:')) {
    const id = customId.split(':')[1];
    const modal = new ModalBuilder()
      .setCustomId(`modal_sugg_comment:${id}`)
      .setTitle('Ajouter un commentaire');

    const input = new TextInputBuilder()
      .setCustomId('comment_content')
      .setLabel('Votre commentaire / retour constructif')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Partagez votre avis sur cette idée...')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
  }
}

export async function handleSuggestionModal(interaction: ModalSubmitInteraction): Promise<void> {
  const customId = interaction.customId;

  if (customId.startsWith('modal_sugg_comment:')) {
    const id = customId.split(':')[1];
    const content = interaction.fields.getTextInputValue('comment_content');

    const isStaff = interaction.memberPermissions?.has('ManageGuild') || false;

    SuggestionCommentService.addComment(id, {
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      avatarUrl: interaction.user.displayAvatarURL(),
      content,
      isStaff,
    });

    await SuggestionService.updateDiscordMessage(interaction.client, id);

    await interaction.reply({
      content: '💬 Votre commentaire a bien été ajouté !',
      ephemeral: true,
    });
  } else if (customId === 'modal_suggest_create') {
    const title = interaction.fields.getTextInputValue('sugg_title');
    const description = interaction.fields.getTextInputValue('sugg_description');
    const category = interaction.fields.getTextInputValue('sugg_category') || 'Général';

    if (!interaction.guildId) return;

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

      await interaction.reply({
        content: `✅ Votre suggestion **#${suggestion.numericId}** a bien été soumise et publiée dans le salon dédié !`,
        ephemeral: true,
      });
    } catch (err: any) {
      await interaction.reply({
        content: `❌ Erreur : ${err.message}`,
        ephemeral: true,
      });
    }
  }
}
