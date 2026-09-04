import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageCreateOptions,
} from 'discord.js';
import { DiscordEvent } from './eventsTypes.js';

export function buildEventDiscordPanel(event: DiscordEvent, dashboardBaseUrl: string = 'https://ethone.app'): MessageCreateOptions {
  const startUnix = Math.floor(new Date(event.startDate).getTime() / 1000);
  const endUnix = Math.floor(new Date(event.endDate).getTime() / 1000);

  // Status badge & color
  let color = 0x5865f2; // Blurple
  let statusText = '🗓️ Planifié';
  if (event.status === 'LIVE') {
    color = 0x22c55e; // Green
    statusText = '🔴 EN DIRECT';
  } else if (event.status === 'COMPLETED') {
    color = 0x64748b; // Slate
    statusText = '✅ Terminé';
  } else if (event.status === 'CANCELLED') {
    color = 0xef4444; // Red
    statusText = '❌ Annulé';
  }

  // Location display
  let locationLabel = 'Non spécifié';
  if (event.location.type === 'VOICE') {
    locationLabel = event.location.channelName ? `🔊 ${event.location.channelName}` : (event.location.channelId ? `<#${event.location.channelId}>` : 'Canal Vocal');
  } else if (event.location.type === 'STAGE') {
    locationLabel = event.location.channelName ? `🎭 ${event.location.channelName}` : (event.location.channelId ? `<#${event.location.channelId}>` : 'Conférence Scène');
  } else if (event.location.type === 'TEXT') {
    locationLabel = event.location.channelName ? `💬 ${event.location.channelName}` : (event.location.channelId ? `<#${event.location.channelId}>` : 'Salon Textuel');
  } else if (event.location.type === 'EXTERNAL') {
    locationLabel = `🌐 ${event.location.details || 'Lien Externe'}${event.location.externalUrl ? ` (${event.location.externalUrl})` : ''}`;
  }

  // Capacity display
  const maxCap = !event.capacity.unlimited && event.capacity.maxParticipants > 0 ? event.capacity.maxParticipants : null;
  const isFull = maxCap ? event.stats.goingCount >= maxCap : false;
  const capacityStr = maxCap
    ? `${event.stats.goingCount} / ${maxCap} ${isFull ? '🔴 (Complet)' : '🟢'}`
    : `${event.stats.goingCount} participant(s)`;

  const embed = new EmbedBuilder()
    .setTitle(`${event.emoji ? `${event.emoji} ` : ''}${event.title}`)
    .setDescription(event.description || '*Aucune description fournie.*')
    .setColor(color)
    .addFields(
      {
        name: '📅 Date & Heure',
        value: `<t:${startUnix}:F>\n<t:${startUnix}:R>\nFin : <t:${endUnix}:t>`,
        inline: true,
      },
      {
        name: '📍 Lieu',
        value: locationLabel,
        inline: true,
      },
      {
        name: '👥 Statut & Inscriptions',
        value: `**Statut :** ${statusText}\n**Confirmés :** ${capacityStr}\n**Peut-être :** ${event.stats.maybeCount}${event.stats.waitlistCount ? `\n**File d'attente :** ${event.stats.waitlistCount}` : ''}`,
        inline: false,
      }
    )
    .setFooter({
      text: `ETHONE Events 2.0 • ID: ${event.id}`,
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
    ? `File d'attente (${event.stats.waitlistCount})`
    : `Participer (${event.stats.goingCount})`;

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_rsvp:${event.id}:GOING`)
      .setLabel(goingLabel)
      .setStyle(isFull && event.capacity.waitlistEnabled ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji(isFull && event.capacity.waitlistEnabled ? '⏳' : '✅')
      .setDisabled(isCancelledOrDone || (isFull && !event.capacity.waitlistEnabled)),

    new ButtonBuilder()
      .setCustomId(`event_rsvp:${event.id}:MAYBE`)
      .setLabel(`Peut-être (${event.stats.maybeCount})`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🤔')
      .setDisabled(isCancelledOrDone),

    new ButtonBuilder()
      .setCustomId(`event_rsvp:${event.id}:NOT_GOING`)
      .setLabel('Ne participe pas')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(isCancelledOrDone)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_checkin:${event.id}`)
      .setLabel('Pointage / Check-in')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎟️')
      .setDisabled(isCancelledOrDone),

    new ButtonBuilder()
      .setLabel('Détails & Calendrier')
      .setStyle(ButtonStyle.Link)
      .setURL(`${dashboardBaseUrl.replace(/\/$/, '')}/discord/events/${event.id}`)
      .setEmoji('🌐')
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}
