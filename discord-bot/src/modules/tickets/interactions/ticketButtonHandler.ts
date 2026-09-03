import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ModalBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ticketService } from '../services/ticketService.js';
import { TranscriptService } from '../services/transcriptService.js';
import { logger } from '../../../utils/logger.js';

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  const guild = interaction.guild;
  if (!guild) return;

  // 1. Création d'un ticket (ticket_open:categoryId)
  if (customId.startsWith('ticket_open:')) {
    const categoryId = customId.split(':')[1];
    const category = ticketService.getCategories(guild.id).find((c) => c.id === categoryId);

    if (!category) {
      await interaction.reply({ content: '❌ Catégorie introuvable.', ephemeral: true });
      return;
    }

    // Si des champs de formulaire sont configurés, on ouvre un Modal Discord
    if (category.formFields && category.formFields.length > 0) {
      const modal = new ModalBuilder()
        .setCustomId(`modal_ticket_open:${categoryId}`)
        .setTitle(`Ticket • ${category.name}`.slice(0, 45));

      for (const field of category.formFields.slice(0, 5)) {
        const input = new TextInputBuilder()
          .setCustomId(field.id)
          .setLabel(field.label.slice(0, 45))
          .setPlaceholder(field.placeholder.slice(0, 100))
          .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(field.required);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      }

      await interaction.showModal(modal);
      return;
    }

    // Sinon, création directe du ticket
    await interaction.deferReply({ ephemeral: true });
    try {
      const ticket = await ticketService.createTicket(guild, interaction.user, categoryId);
      await interaction.editReply({
        content: `✅ Votre ticket a été créé : <#${ticket.channelId}>`,
      });
    } catch (err: any) {
      await interaction.editReply({
        content: `⚠️ ${err.message || 'Impossible d’ouvrir le ticket.'}`,
      });
    }
    return;
  }

  // 2. Prise en charge (Claim)
  if (customId.startsWith('ticket_claim:')) {
    const ticketId = customId.split(':')[1];
    try {
      await ticketService.claimTicket(ticketId, interaction.user);

      // Met à jour les boutons du message
      const updatedButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_unclaim:${ticketId}`)
          .setLabel(`Assigné à @${interaction.user.username} (Unclaim)`)
          .setEmoji('👤')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketId}`)
          .setLabel('Fermer le ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ components: [updatedButtons] });
      await interaction.followUp({
        content: `🎯 **${interaction.user}** a pris en charge ce ticket.`,
      });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
    return;
  }

  // 3. Libération de la prise en charge (Unclaim)
  if (customId.startsWith('ticket_unclaim:')) {
    const ticketId = customId.split(':')[1];
    try {
      await ticketService.unclaimTicket(ticketId);

      const updatedButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim:${ticketId}`)
          .setLabel('Prendre en charge (Claim)')
          .setEmoji('🎯')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketId}`)
          .setLabel('Fermer le ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ components: [updatedButtons] });
      await interaction.followUp({
        content: `🔄 La prise en charge de ce ticket a été libérée.`,
      });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
    return;
  }

  // 4. Fermeture du ticket
  if (customId.startsWith('ticket_close:')) {
    const ticketId = customId.split(':')[1];
    await interaction.deferReply();
    try {
      await ticketService.closeTicket(ticketId, interaction.user, guild);
      await interaction.deleteReply().catch(() => {});
    } catch (err: any) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return;
  }

  // 5. Réouverture du ticket
  if (customId.startsWith('ticket_reopen:')) {
    const ticketId = customId.split(':')[1];
    await interaction.deferReply({ ephemeral: true });
    try {
      await ticketService.reopenTicket(ticketId, interaction.user, guild);
      await interaction.editReply({ content: '✅ Le ticket a été rouvert avec succès.' });
    } catch (err: any) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return;
  }

  // 6. Génération de Transcript
  if (customId.startsWith('ticket_transcript:')) {
    const ticketId = customId.split(':')[1];
    await interaction.deferReply();
    try {
      const ticket = ticketService.getGuildTickets(guild.id).find((t) => t.id === ticketId);
      if (!ticket) throw new Error('Ticket introuvable.');

      const { filePath } = await TranscriptService.generateTranscript(
        interaction.channel as TextChannel,
        ticket
      );
      const attachment = new AttachmentBuilder(filePath, { name: `transcript-${ticketId}.html` });

      await interaction.editReply({
        content: '📄 **Voici la transcription complète de ce ticket :**',
        files: [attachment],
      });
    } catch (err: any) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return;
  }

  // 7. Demande de suppression avec confirmation
  if (customId.startsWith('ticket_delete:')) {
    const ticketId = customId.split(':')[1];
    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_delete_confirm:${ticketId}`)
        .setLabel('Confirmer la suppression définitive')
        .setEmoji('⚠️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket_delete_cancel:${ticketId}`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: '⚠️ **Êtes-vous sûr de vouloir supprimer définitivement ce salon de ticket ?**\nCette action est irréversible (un transcript sera archivé).',
      components: [confirmRow],
    });
    return;
  }

  // 8. Confirmation de suppression
  if (customId.startsWith('ticket_delete_confirm:')) {
    const ticketId = customId.split(':')[1];
    await interaction.reply({ content: '🗑️ Suppression du ticket en cours...' });
    try {
      await ticketService.deleteTicket(ticketId, interaction.user, guild);
    } catch (err) {
      logger.error('Erreur suppression ticket :', err);
    }
    return;
  }

  // 9. Annulation de suppression
  if (customId.startsWith('ticket_delete_cancel:')) {
    await interaction.update({
      content: '✅ Suppression annulée.',
      components: [],
    });
    return;
  }
}
