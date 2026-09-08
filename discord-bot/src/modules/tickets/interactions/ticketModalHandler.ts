import { ModalSubmitInteraction } from 'discord.js';
import { ticketService } from '../services/ticketService.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export async function handleTicketModal(interaction: ModalSubmitInteraction): Promise<void> {
  const customId = interaction.customId;
  const guild = interaction.guild;
  if (!guild) return;

  const t = getTranslation(guildConfigService.getConfig(guild.id).language);

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
        embeds: [baseEmbed('success').setDescription(formatString(t.ticket_created, { channel: `<#${ticket.channelId}>` }))],
      });
    } catch (err: any) {
      await interaction.editReply({
        embeds: [baseEmbed('warning').setDescription(`⚠️ ${err.message || t.ticket_open_failed_default}`)],
      });
    }
    return;
  }
}
