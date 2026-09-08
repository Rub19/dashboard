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
import { TicketPriority } from '../types/ticket.js';
import { logger } from '../../../utils/logger.js';
import { baseEmbed } from '../../../utils/embeds.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  const guild = interaction.guild;
  if (!guild) return;

  const t = getTranslation(guildConfigService.getConfig(guild.id).language);

  // 1. Création d'un ticket (ticket_open:categoryId)
  if (customId.startsWith('ticket_open:')) {
    const categoryId = customId.split(':')[1];
    const category = ticketService.getCategories(guild.id).find((c) => c.id === categoryId);

    if (!category) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(t.ticket_category_not_found)], ephemeral: true });
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
        embeds: [baseEmbed('success').setDescription(formatString(t.ticket_created, { channel: `<#${ticket.channelId}>` }))],
      });
    } catch (err: any) {
      await interaction.editReply({
        embeds: [baseEmbed('warning').setDescription(`⚠️ ${err.message || t.ticket_open_failed_default}`)],
      });
    }
    return;
  }

  // 2. Prise en charge (Claim)
  if (customId.startsWith('ticket_claim:')) {
    const ticketId = customId.split(':')[1];
    try {
      await ticketService.claimTicket(guild.id, ticketId, {
        id: interaction.user.id,
        tag: interaction.user.tag,
        avatar: interaction.user.displayAvatarURL(),
      });

      // Met à jour les boutons du message
      const updatedButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_unclaim:${ticketId}`)
          .setLabel(formatString(t.ticket_btn_assigned_unclaim, { user: interaction.user.username }))
          .setEmoji('👤')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketId}`)
          .setLabel(t.ticket_btn_close)
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket_priority:${ticketId}`)
          .setLabel(t.ticket_btn_priority)
          .setEmoji('📌')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_transcript:${ticketId}`)
          .setLabel(t.ticket_btn_transcript)
          .setEmoji('📄')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({ components: [updatedButtons] });
    } catch (err: any) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(`❌ ${err.message}`)], ephemeral: true });
    }
    return;
  }

  // 3. Libération de la prise en charge (Unclaim)
  if (customId.startsWith('ticket_unclaim:')) {
    const ticketId = customId.split(':')[1];
    try {
      await ticketService.unclaimTicket(guild.id, ticketId, {
        id: interaction.user.id,
        tag: interaction.user.tag,
      });

      const updatedButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim:${ticketId}`)
          .setLabel(t.ticket_btn_claim)
          .setEmoji('👤')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticketId}`)
          .setLabel(t.ticket_btn_close)
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket_priority:${ticketId}`)
          .setLabel(t.ticket_btn_priority)
          .setEmoji('📌')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_transcript:${ticketId}`)
          .setLabel(t.ticket_btn_transcript)
          .setEmoji('📄')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({ components: [updatedButtons] });
    } catch (err: any) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(`❌ ${err.message}`)], ephemeral: true });
    }
    return;
  }

  // 4. Fermeture du ticket
  if (customId.startsWith('ticket_close:')) {
    const ticketId = customId.split(':')[1];
    await interaction.deferReply();
    try {
      await ticketService.closeTicket(
        guild,
        ticketId,
        { id: interaction.user.id, tag: interaction.user.tag },
        'Fermé depuis les contrôles Discord'
      );
      await interaction.deleteReply().catch(() => {});
    } catch (err: any) {
      await interaction.editReply({ embeds: [baseEmbed('error').setDescription(`❌ ${err.message}`)] });
    }
    return;
  }

  // 5. Modification cyclique de priorité
  if (customId.startsWith('ticket_priority:')) {
    const ticketId = customId.split(':')[1];
    const ticket = ticketService.getTicketById(guild.id, ticketId);
    if (!ticket) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(t.ticket_not_found)], ephemeral: true });
      return;
    }

    const priorityCycle: Record<TicketPriority, TicketPriority> = {
      LOW: 'NORMAL',
      NORMAL: 'HIGH',
      HIGH: 'URGENT',
      URGENT: 'LOW',
    };

    const newPriority = priorityCycle[ticket.priority] || 'NORMAL';
    try {
      await ticketService.updatePriority(guild.id, ticketId, newPriority, {
        id: interaction.user.id,
        tag: interaction.user.tag,
      });

      await interaction.reply({
        embeds: [baseEmbed('info').setDescription(formatString(t.ticket_priority_updated, { old: ticket.priority, new: newPriority }))],
      });
    } catch (err: any) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(`❌ ${err.message}`)], ephemeral: true });
    }
    return;
  }

  // 6. Génération de Transcript
  if (customId.startsWith('ticket_transcript:')) {
    const ticketId = customId.split(':')[1];
    await interaction.deferReply();
    try {
      const ticket = ticketService.getTicketById(guild.id, ticketId);
      if (!ticket) throw new Error('Ticket introuvable.');

      const { filePath } = await TranscriptService.generateTranscript(
        interaction.channel as TextChannel,
        ticket
      );
      const attachment = new AttachmentBuilder(filePath, { name: `transcript-${ticketId}.html` });

      await interaction.editReply({
        embeds: [baseEmbed('info').setDescription(t.ticket_transcript_ready)],
        files: [attachment],
      });
    } catch (err: any) {
      await interaction.editReply({ embeds: [baseEmbed('error').setDescription(`❌ ${err.message}`)] });
    }
    return;
  }
}
