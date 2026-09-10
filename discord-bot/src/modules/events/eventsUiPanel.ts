import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageCreateOptions,
} from 'discord.js';
import { DiscordEvent } from './eventsTypes.js';
import { formatString, getTranslation, SupportedLanguage } from '../../utils/i18n.js';
import { BRAND_COLORS } from '../../utils/embeds.js';

export function buildEventDiscordPanel(
  event: DiscordEvent,
  language: SupportedLanguage = 'fr',
  dashboardBaseUrl: string = 'https://ethone.app'
): MessageCreateOptions {
  const t = getTranslation(language);
  const startUnix = Math.floor(new Date(event.startDate).getTime() / 1000);
  const endUnix = Math.floor(new Date(event.endDate).getTime() / 1000);

  // Status badge & color — tons de marque ETHONE partagés (cf. utils/embeds.ts)
  let color: number = BRAND_COLORS.primary;
  let statusText = t.events_status_scheduled;
  if (event.status === 'LIVE') {
    color = BRAND_COLORS.success;
    statusText = t.events_status_live;
  } else if (event.status === 'COMPLETED') {
    color = BRAND_COLORS.neutral;
    statusText = t.events_status_completed;
  } else if (event.status === 'CANCELLED') {
    color = BRAND_COLORS.error;
    statusText = t.events_status_cancelled;
  }

  // Location display
  let locationLabel = t.events_location_unspecified;
  if (event.location.type === 'VOICE') {
    locationLabel = event.location.channelName ? `🔊 ${event.location.channelName}` : (event.location.channelId ? `<#${event.location.channelId}>` : t.events_location_voice_default);
  } else if (event.location.type === 'STAGE') {
    locationLabel = event.location.channelName ? `🎭 ${event.location.channelName}` : (event.location.channelId ? `<#${event.location.channelId}>` : t.events_location_stage_default);
  } else if (event.location.type === 'TEXT') {
    locationLabel = event.location.channelName ? `💬 ${event.location.channelName}` : (event.location.channelId ? `<#${event.location.channelId}>` : t.events_location_text_default);
  } else if (event.location.type === 'EXTERNAL') {
    locationLabel = `🌐 ${event.location.details || t.events_location_external_default}${event.location.externalUrl ? ` (${event.location.externalUrl})` : ''}`;
  }

  // Capacity display
  const maxCap = !event.capacity.unlimited && event.capacity.maxParticipants > 0 ? event.capacity.maxParticipants : null;
  const isFull = maxCap ? event.stats.goingCount >= maxCap : false;
  const capacityStr = maxCap
    ? `${event.stats.goingCount} / ${maxCap} ${isFull ? t.events_capacity_full_suffix : '🟢'}`
    : formatString(t.events_participants_suffix, { count: event.stats.goingCount });

  const embed = new EmbedBuilder()
    .setTitle(`${event.emoji ? `${event.emoji} ` : ''}${event.title}`)
    .setDescription(event.description || t.events_panel_no_description)
    .setColor(color)
    .addFields(
      {
        name: t.events_panel_field_datetime,
        value: formatString(t.events_panel_datetime_value, { start: startUnix, end: endUnix }),
        inline: true,
      },
      {
        name: t.events_panel_field_location,
        value: locationLabel,
        inline: true,
      },
      {
        name: t.events_panel_field_status,
        value:
          formatString(t.events_panel_status_value, { statusText, capacityStr, maybeCount: event.stats.maybeCount }) +
          (event.stats.waitlistCount ? formatString(t.events_panel_waitlist_line, { count: event.stats.waitlistCount }) : ''),
        inline: false,
      }
    )
    .setFooter({
      text: formatString(t.events_panel_footer, { id: event.id }),
      iconURL: 'https://ethone.app/favicon.ico',
    })
    .setTimestamp(new Date(event.startDate));

  if (event.imageUrl) {
    embed.setImage(event.imageUrl);
  } else if (event.thumbnailUrl) {
    embed.setThumbnail(event.thumbnailUrl);
  }

  const isCancelledOrDone = event.status === 'CANCELLED' || event.status === 'COMPLETED';

  const goingLabel = isFull && event.capacity.waitlistEnabled
    ? formatString(t.events_btn_waitlist_label, { count: event.stats.waitlistCount })
    : formatString(t.events_btn_going_label, { count: event.stats.goingCount });

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_rsvp:${event.id}:GOING`)
      .setLabel(goingLabel)
      .setStyle(isFull && event.capacity.waitlistEnabled ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji(isFull && event.capacity.waitlistEnabled ? '⏳' : '✅')
      .setDisabled(isCancelledOrDone || (isFull && !event.capacity.waitlistEnabled)),

    new ButtonBuilder()
      .setCustomId(`event_rsvp:${event.id}:MAYBE`)
      .setLabel(formatString(t.events_btn_maybe_label, { count: event.stats.maybeCount }))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🤔')
      .setDisabled(isCancelledOrDone),

    new ButtonBuilder()
      .setCustomId(`event_rsvp:${event.id}:NOT_GOING`)
      .setLabel(t.events_btn_not_going_label)
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(isCancelledOrDone)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_checkin:${event.id}`)
      .setLabel(t.events_btn_checkin_label)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎟️')
      .setDisabled(isCancelledOrDone),

    new ButtonBuilder()
      .setLabel(t.events_btn_details_label)
      .setStyle(ButtonStyle.Link)
      .setURL(`${dashboardBaseUrl.replace(/\/$/, '')}/discord/events/${event.id}`)
      .setEmoji('🌐')
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}
