import { ModalSubmitInteraction } from 'discord.js';
import { ticketService } from '../services/ticketService.js';
import { logger } from '../../../utils/logger.js';

export async function handleTicketModal(interaction: ModalSubmitInteraction): Promise<void> {
  const customId = interaction.customId;
  const guild = interaction.guild;
  if (!guild) return;

  // 1. Soumission d'un formulaire de création de ticket (modal_ticket_open:categoryId)
  if (customId.startsWith('modal_ticket_open:')) {
    const categoryId = customId.split(':')[1];
    const category = ticketService.getCategories(guild.id).find((c) => c.id === categoryId);

    const answers: Record<string, string> = {};
    if (category?.formFields) {
      for (const field of category.formFields) {
        try {
          const val = interaction.fields.getTextInputValue(field.id);
          if (val) answers[field.label] = val;
        } catch {
          // Ignorer si champ non requis omis
        }
      }
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const ticket = await ticketService.createTicket(guild, interaction.user, categoryId, answers);
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
}
