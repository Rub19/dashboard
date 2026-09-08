import { ButtonInteraction } from 'discord.js';
import { eventRepository } from './eventsRepository.js';
import { EventRSVPService } from './eventsRsvpService.js';
import { EventsCheckinService } from './eventsCheckinService.js';
import { buildEventDiscordPanel } from './eventsUiPanel.js';
import { RSVPStatus } from './eventsTypes.js';
import { baseEmbed } from '../../utils/embeds.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

export async function handleEventButton(interaction: ButtonInteraction): Promise<boolean> {
  const customId = interaction.customId;
  if (!customId.startsWith('event_rsvp:') && !customId.startsWith('event_checkin:')) {
    return false;
  }

  if (!interaction.guildId) {
    await interaction.reply({ embeds: [baseEmbed('error').setDescription('❌ Cette action ne peut être effectuée que sur un serveur.')], ephemeral: true });
    return true;
  }

  const guildId = interaction.guildId;
  const t = getTranslation(guildConfigService.getConfig(guildId).language);

  // 1. RSVP: event_rsvp:{eventId}:{status}
  if (customId.startsWith('event_rsvp:')) {
    const parts = customId.split(':');
    const eventId = parts[1];
    const status = parts[2] as RSVPStatus;

    const res = EventRSVPService.handleRSVP(
      guildId,
      eventId,
      {
        id: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.member && 'displayName' in interaction.member ? (interaction.member as any).displayName : interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
      },
      status
    );

    if (!res.success) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(formatString(t.events_generic_error_prefix, { error: res.error || t.events_rsvp_error_fallback }))], ephemeral: true });
      return true;
    }

    const statusLabels: Record<string, string> = {
      GOING: t.events_rsvp_status_going,
      MAYBE: t.events_rsvp_status_maybe,
      NOT_GOING: t.events_rsvp_status_notgoing,
      WAITLIST: t.events_rsvp_status_waitlist,
    };

    await interaction.reply({
      embeds: [baseEmbed('success').setDescription(formatString(t.events_rsvp_button_success, { message: res.message || '', statusLabel: statusLabels[res.status || ''] || res.status || '' }))],
      ephemeral: true,
    });

    // Update message panel
    try {
      const updatedEvent = eventRepository.getEventById(guildId, eventId);
      if (updatedEvent && interaction.message.editable) {
        const freshPanel = buildEventDiscordPanel(updatedEvent, guildConfigService.getConfig(guildId).language);
        await interaction.message.edit({
          embeds: freshPanel.embeds,
          components: freshPanel.components,
        });
      }
    } catch (err) {
      // ignore
    }

    return true;
  }

  // 2. Checkin: event_checkin:{eventId}
  if (customId.startsWith('event_checkin:')) {
    const parts = customId.split(':');
    const eventId = parts[1];

    const res = EventsCheckinService.checkInUser({
      guildId,
      eventId,
      userId: interaction.user.id,
      username: interaction.user.username,
      displayName: interaction.member && 'displayName' in interaction.member ? (interaction.member as any).displayName : interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL(),
      method: 'DISCORD_BUTTON',
    });

    if (!res.success) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(formatString(t.events_generic_error_prefix, { error: res.message }))], ephemeral: true });
      return true;
    }

    await interaction.reply({
      embeds: [baseEmbed('success').setDescription(formatString(t.events_checkin_button_success, { message: res.message }))],
      ephemeral: true,
    });

    return true;
  }

  return false;
}
