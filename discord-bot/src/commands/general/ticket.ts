import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';

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
    if (!ctx.guild) {
      await ctx.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.' });
      return;
    }

    const config = ctx.guildConfig;

    // Vérifier si le module Tickets est activé
    if (!config.modules.tickets) {
      await ctx.reply({
        content: `${config.emojis.error || '❌'} Le module **Tickets** est désactivé sur ce serveur. Activez-le depuis le dashboard web.`,
        ephemeral: true,
      });
      return;
    }

    const existingTicket = ctx.guild.channels.cache.find(
      (c) => c.name === `ticket-${ctx.author.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    );

    if (existingTicket) {
      await ctx.reply({
        content: `${config.emojis.info || 'ℹ️'} Vous avez déjà un ticket ouvert dans ${existingTicket}.`,
        ephemeral: true,
      });
      return;
    }

    const subject =
      (ctx.isSlash && ctx.interaction ? (ctx.interaction as any).options?.getString('sujet') : null) ||
      ctx.args.join(' ') ||
      null;

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

      const ticketEmbed = ctx
        .createEmbed('default')
        .setTitle(`🎫 Ticket Support • ${ctx.author.username}`)
        .setDescription(
          `Bonjour ${ctx.author} ! Un membre de l'équipe d'assistance va vous répondre sous peu.\n\n` +
          (subject ? `📌 **Motif :** *${subject}*\n\n` : '') +
          `Veuillez détailler votre situation ou question ci-dessous.`
        );

      await ticketChannel.send({ content: `${ctx.author}`, embeds: [ticketEmbed] });

      await ctx.reply({
        content: `${config.emojis.success || '✅'} Votre ticket a été créé avec succès : ${ticketChannel}`,
        ephemeral: true,
      });
    } catch {
      await ctx.reply({
        content: `${config.emojis.error || '❌'} Impossible de créer le ticket (vérifiez que le bot a la permission de gérer les salons).`,
        ephemeral: true,
      });
    }
  },
};
