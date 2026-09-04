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
    if (!ctx.guild) {
      await ctx.reply({ content: '❌ Cette commande ne peut être utilisée que sur un serveur Discord.', ephemeral: true });
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
          .setTitle('🗓️ Aucun événement prévu')
          .setDescription('Il n’y a aucun événement planifié pour le moment.\nUtilisez le dashboard ETHONE pour en programmer un !');
        await ctx.reply({ embeds: [embed] });
        return;
      }

      const embed = ctx.createEmbed('default')
        .setTitle(`🗓️ Événements à venir • ${ctx.guild.name}`)
        .setDescription(`Voici les **${upcoming.length}** prochains événements :`);

      for (const ev of upcoming.slice(0, 5)) {
        const startUnix = Math.floor(new Date(ev.startDate).getTime() / 1000);
        const capStr = !ev.capacity.unlimited && ev.capacity.maxParticipants > 0
          ? `${ev.stats.goingCount}/${ev.capacity.maxParticipants}`
          : `${ev.stats.goingCount} participants`;

        const locationStr = ev.location.channelName ? `🔊 ${ev.location.channelName}` : ev.location.type;

        embed.addFields({
          name: `${ev.emoji || '📅'} ${ev.title} (\`${ev.id}\`)`,
          value: `📅 <t:${startUnix}:F> (<t:${startUnix}:R>)\n👥 **${capStr}** • 📍 ${locationStr}\nStatut : \`${ev.status}\``,
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
        await ctx.reply({ content: '❌ Veuillez fournir un identifiant d’événement valide.', ephemeral: true });
        return;
      }

      const event = eventRepository.getEventById(guildId, eventId);
      if (!event) {
        await ctx.reply({ content: `❌ Événement avec l’identifiant \`${eventId}\` introuvable.`, ephemeral: true });
        return;
      }

      const panel = buildEventDiscordPanel(event);
      await ctx.reply(panel);
      return;
    }

    // 3. SUBCOMMAND: RSVP
    if (subcommand === 'rsvp') {
      const eventId = ctx.getString('event_id', 1);
      let statusStr = (ctx.getString('status', 2) || '').toUpperCase() as RSVPStatus;

      if (!eventId || !statusStr) {
        await ctx.reply({ content: '❌ Utilisation : `/event rsvp event_id:<id> status:<GOING|MAYBE|NOT_GOING>`', ephemeral: true });
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
        await ctx.reply({ content: `❌ ${res.error || 'Erreur lors du RSVP.'}`, ephemeral: true });
        return;
      }

      const embed = ctx.createEmbed('success')
        .setTitle('✅ Inscription mise à jour !')
        .setDescription(`Votre statut pour l'événement **${eventId}** est maintenant : **${res.status}**.\n${res.message}`);

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 4. SUBCOMMAND: CHECKIN
    if (subcommand === 'checkin') {
      const eventId = ctx.getString('event_id', 1);
      if (!eventId) {
        await ctx.reply({ content: '❌ Utilisation : `/event checkin event_id:<id>`', ephemeral: true });
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
        await ctx.reply({ content: `❌ ${res.message}`, ephemeral: true });
        return;
      }

      const embed = ctx.createEmbed('success')
        .setTitle('🎟️ Présence validée !')
        .setDescription(`Votre présence à l'événement a bien été confirmée.\nMerci de participer !`);

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 5. SUBCOMMAND: POST
    if (subcommand === 'post') {
      if (ctx.member && !ctx.member.permissions.has(PermissionsBitField.Flags.ManageEvents) && !ctx.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await ctx.reply({ content: '❌ Vous devez avoir la permission `Gérer les événements` pour publier ce panneau.', ephemeral: true });
        return;
      }

      const eventId = ctx.getString('event_id', 1);
      if (!eventId) {
        await ctx.reply({ content: '❌ Veuillez fournir un ID d’événement.', ephemeral: true });
        return;
      }

      const event = eventRepository.getEventById(guildId, eventId);
      if (!event) {
        await ctx.reply({ content: `❌ Événement \`${eventId}\` introuvable.`, ephemeral: true });
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
        await ctx.reply({ content: '❌ Salon textuel introuvable.', ephemeral: true });
        return;
      }

      const panel = buildEventDiscordPanel(event);
      const sentMsg = await (targetChannel as TextChannel).send(panel);

      event.discordPanelChannelId = targetChannel.id;
      event.discordPanelMessageId = sentMsg.id;
      eventRepository.saveEvent(event);

      await ctx.reply({ content: `✅ Panneau de l'événement publié dans <#${targetChannel.id}> !`, ephemeral: true });
      return;
    }

    await ctx.reply({ content: '❌ Sous-commande inconnue. Utilisez `/event list` ou `/event info`.', ephemeral: true });
  },
};
