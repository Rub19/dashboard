import { isModuleEnabled } from '../../services/moduleRegistry.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageActionRowComponentBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { formatString, getTranslation } from '../../utils/i18n.js';
import { container, footer, sectionWithThumbnail, separator, text, toneToColor } from '../../utils/components.js';

export const ticketCommand: Command = {
  name: 'ticket',
  description: 'Ouvre un ticket d’assistance privé sur le serveur (Module Tickets)',
  category: 'Support',
  slashData: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ouvre un ticket d’assistance privé auprès de l\'équipe')
    .addStringOption((opt) =>
      opt
        .setName('sujet')
        .setDescription('Motif ou description de votre demande')
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    const config = ctx.guildConfig;

    // Vérifier si le module Tickets est activé
    if (!isModuleEnabled(ctx.guild.id, 'tickets')) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(formatString(t.ticket_module_disabled, { emoji: config.emojis.error || '❌' }))],
        ephemeral: true,
      });
      return;
    }

    const existingTicket = ctx.guild.channels.cache.find(
      (c) => c.name === `ticket-${ctx.author.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    );

    if (existingTicket) {
      await ctx.reply({
        embeds: [ctx.createEmbed('info').setDescription(formatString(t.ticket_already_open, { emoji: config.emojis.info || 'ℹ️', channel: existingTicket.toString() }))],
        ephemeral: true,
      });
      return;
    }

    const subject =
      (ctx.isSlash && ctx.interaction ? (ctx.interaction as any).options?.getString('sujet') : null) ||
      ctx.args.join(' ') ||
      null;

    // Différer immédiatement : la création du salon privé ci-dessous peut dépasser la fenêtre de
    // 3s de Discord et invalider le token d'interaction ("Unknown interaction" / 10062).
    await ctx.deferReply({ ephemeral: true });

    try {
      // Création du salon privé
      const ticketChannel = await ctx.guild.channels.create({
        name: `ticket-${ctx.author.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: ctx.guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: ctx.author.id, // Le créateur
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: ctx.guild.members.me!.id, // Le bot
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      // Carte d'accueil V2 dans le salon du ticket (avatar du demandeur,
      // sujet, consignes) + bouton de fermeture.
      const welcome = container(toneToColor('primary', config.primaryColor), [
        sectionWithThumbnail(
          [
            `## 🎫 ${formatString(t.ticket_channel_embed_title, { user: ctx.author.username })}`,
            formatString(t.ticket_welcome, { user: ctx.author.toString() }),
            `-# Ouvert <t:${Math.floor(Date.now() / 1000)}:R>`,
          ],
          ctx.author.displayAvatarURL(),
          ctx.author.username,
        ),
        subject ? text(`**${formatString(t.ticket_subject_label, { subject })}**`) : null,
        separator(),
        text(t.ticket_detail_prompt),
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`ticket_close_simple:${ticketChannel.id}`).setLabel('Fermer le ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        ),
        footer(`${config.botName} · Support`),
      ]);
      await ticketChannel.send({ content: `${ctx.author}`, components: [welcome], flags: MessageFlags.IsComponentsV2 });

      await ctx.reply({
        components: [
          container(toneToColor('success', config.successColor), [
            text(`## ✅ Ticket ouvert`),
            text(formatString(t.ticket_created, { channel: ticketChannel.toString() })),
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
              new ButtonBuilder().setLabel('Ouvrir le ticket').setEmoji('🎫').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${ctx.guild.id}/${ticketChannel.id}`),
            ),
          ]),
        ],
        componentsV2: true,
        ephemeral: true,
      });
    } catch {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(formatString(t.ticket_create_failed, { emoji: config.emojis.error || '❌' }))],
        ephemeral: true,
      });
    }
  },
};
