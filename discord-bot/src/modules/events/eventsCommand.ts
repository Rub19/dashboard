import {
  SlashCommandBuilder,
  TextChannel,
  ChannelType,
  PermissionsBitField,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { eventRepository } from './eventsRepository.js';
import { EventRSVPService } from './eventsRsvpService.js';
import { EventsCheckinService } from './eventsCheckinService.js';
import { buildEventDiscordPanel } from './eventsUiPanel.js';
import { RSVPStatus } from './eventsTypes.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

export const eventCommand: Command = {
  name: 'event',
  description: 'Gérer et consulter les événements du serveur (Events 2.0)',
  category: 'events',
  aliases: ['events', 'evenement', 'calendar'],
  slashData: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Gérer et consulter les événements du serveur (Events 2.0)')
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Afficher la liste des événements à venir sur le serveur')
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription("Afficher les détails et le statut d'un événement")
        .addStringOption((opt) =>
          opt
            .setName('event_id')
            .setDescription("Identifiant de l'événement")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('rsvp')
        .setDescription('Répondre à une invitation ou mettre à jour votre participation')
        .addStringOption((opt) =>
          opt
            .setName('event_id')
            .setDescription("Identifiant de l'événement")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('status')
            .setDescription('Votre réponse')
            .setRequired(true)
            .addChoices(
              { name: 'Participer (Going)', value: 'GOING' },
              { name: 'Peut-être (Maybe)', value: 'MAYBE' },
              { name: 'Ne participe pas (Not Going)', value: 'NOT_GOING' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('checkin')
        .setDescription('Valider votre présence (Pointage)')
        .addStringOption((opt) =>
          opt
            .setName('event_id')
            .setDescription("Identifiant de l'événement")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('post')
        .setDescription("Publier la carte interactive d'un événement dans un salon (Modérateur)")
        .addStringOption((opt) =>
          opt
            .setName('event_id')
            .setDescription("Identifiant de l'événement")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Salon de destination')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)], ephemeral: true });
      return;
    }

    const guildId = ctx.guild.id;
    let subcommand = 'list';

    if (ctx.isSlash && ctx.interaction) {
      subcommand = ctx.interaction.options.getSubcommand();
    } else if (ctx.args.length > 0) {
      subcommand = ctx.args[0].toLowerCase();
    }

    // 1. SUBCOMMAND: LIST
    if (subcommand === 'list') {
      const allEvents = eventRepository.getEventsByGuild(guildId);
      const upcoming = allEvents.filter((e) => e.status === 'SCHEDULED' || e.status === 'LIVE');

      if (upcoming.length === 0) {
        const embed = ctx.createEmbed('info')
          .setTitle(t.events_list_empty_title)
          .setDescription(t.events_list_empty_desc);
        await ctx.reply({ embeds: [embed] });
        return;
      }

      const embed = ctx.createEmbed('default')
        .setTitle(formatString(t.events_list_title, { guildName: ctx.guild.name }))
        .setDescription(formatString(t.events_list_desc, { count: upcoming.length }));

      for (const ev of upcoming.slice(0, 5)) {
        const startUnix = Math.floor(new Date(ev.startDate).getTime() / 1000);
        const capStr = !ev.capacity.unlimited && ev.capacity.maxParticipants > 0
          ? `${ev.stats.goingCount}/${ev.capacity.maxParticipants}`
          : formatString(t.events_participants_suffix, { count: ev.stats.goingCount });

        const locationStr = ev.location.channelName ? `🔊 ${ev.location.channelName}` : ev.location.type;

        embed.addFields({
          name: `${ev.emoji || '📅'} ${ev.title} (\`${ev.id}\`)`,
          value: formatString(t.events_list_field_value, { start: startUnix, capStr, locationStr, status: ev.status }),
          inline: false,
        });
      }

      await ctx.reply({ embeds: [embed] });
      return;
    }

    // 2. SUBCOMMAND: INFO
    if (subcommand === 'info') {
      const eventId = ctx.getString('event_id', 1);
      if (!eventId) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_missing_id)], ephemeral: true });
        return;
      }

      const event = eventRepository.getEventById(guildId, eventId);
      if (!event) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.events_not_found, { id: eventId }))], ephemeral: true });
        return;
      }

      const panel = buildEventDiscordPanel(event, ctx.guildConfig.language);
      await ctx.reply(panel);
      return;
    }

    // 3. SUBCOMMAND: RSVP
    if (subcommand === 'rsvp') {
      const eventId = ctx.getString('event_id', 1);
      let statusStr = (ctx.getString('status', 2) || '').toUpperCase() as RSVPStatus;

      if (!eventId || !statusStr) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_rsvp_usage)], ephemeral: true });
        return;
      }

      const res = EventRSVPService.handleRSVP(
        guildId,
        eventId,
        {
          id: ctx.author.id,
          username: ctx.author.username,
          displayName: ctx.member?.displayName || ctx.author.username,
          avatarUrl: ctx.author.displayAvatarURL(),
        },
        statusStr
      );

      if (!res.success) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.events_generic_error_prefix, { error: res.error || t.events_rsvp_error_fallback }))], ephemeral: true });
        return;
      }

      const embed = ctx.createEmbed('success')
        .setTitle(t.events_rsvp_success_title)
        .setDescription(formatString(t.events_rsvp_success_desc, { eventId, status: res.status || '', message: res.message || '' }));

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 4. SUBCOMMAND: CHECKIN
    if (subcommand === 'checkin') {
      const eventId = ctx.getString('event_id', 1);
      if (!eventId) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_checkin_usage)], ephemeral: true });
        return;
      }

      const res = EventsCheckinService.checkInUser({
        guildId,
        eventId,
        userId: ctx.author.id,
        username: ctx.author.username,
        displayName: ctx.member?.displayName || ctx.author.username,
        avatarUrl: ctx.author.displayAvatarURL(),
        method: 'SLASH_COMMAND',
      });

      if (!res.success) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.events_generic_error_prefix, { error: res.message }))], ephemeral: true });
        return;
      }

      const embed = ctx.createEmbed('success')
        .setTitle(t.events_checkin_success_title)
        .setDescription(t.events_checkin_success_desc);

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 5. SUBCOMMAND: POST
    if (subcommand === 'post') {
      if (ctx.member && !ctx.member.permissions.has(PermissionsBitField.Flags.ManageEvents) && !ctx.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_post_permission_denied)], ephemeral: true });
        return;
      }

      const eventId = ctx.getString('event_id', 1);
      if (!eventId) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_missing_id)], ephemeral: true });
        return;
      }

      const event = eventRepository.getEventById(guildId, eventId);
      if (!event) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.events_not_found, { id: eventId }))], ephemeral: true });
        return;
      }

      let targetChannel = ctx.channel;
      if (ctx.isSlash && ctx.interaction) {
        const ch = ctx.interaction.options.getChannel('channel');
        if (ch && 'isTextBased' in ch && typeof (ch as any).isTextBased === 'function' && (ch as any).isTextBased()) {
          targetChannel = ch as TextChannel;
        }
      }

      if (!targetChannel || !('send' in targetChannel)) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_channel_not_found)], ephemeral: true });
        return;
      }

      // Différer immédiatement : la publication du panneau dans le salon cible ci-dessous peut
      // dépasser la fenêtre de 3s de Discord ("Unknown interaction" / 10062) si on ne le fait pas.
      await ctx.deferReply({ ephemeral: true });

      const panel = buildEventDiscordPanel(event, ctx.guildConfig.language);
      const sentMsg = await (targetChannel as TextChannel).send(panel);

      event.discordPanelChannelId = targetChannel.id;
      event.discordPanelMessageId = sentMsg.id;
      eventRepository.saveEvent(event);

      await ctx.reply({ embeds: [ctx.createEmbed('success').setDescription(formatString(t.events_post_success, { channelId: targetChannel.id }))], ephemeral: true });
      return;
    }

    await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.events_unknown_subcommand)], ephemeral: true });
  },
};
