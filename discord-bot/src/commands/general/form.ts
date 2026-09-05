import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { formRepository } from '../../modules/forms/storage/formRepository.js';
import { discordFormPanel } from '../../modules/forms/ui/discordFormPanel.js';

export const formCommand: Command = {
  name: 'form',
  description: 'Commandes du module ETHONE Forms & Applications',
  category: 'Général',
  slashData: new SlashCommandBuilder()
    .setName('form')
    .setDescription('Commandes du module ETHONE Forms & Applications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('open')
        .setDescription('Ouvrir un formulaire Discord')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du formulaire').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Publier un panneau de candidature interactif dans un salon')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du formulaire').setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('salon')
            .setDescription('Salon textuel de destination')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('stats')
        .setDescription("Afficher les statistiques de réponses d'un formulaire")
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID du formulaire').setRequired(true)
        )
    ),

  execute: async (ctx: CommandContext) => {
    const guildId = ctx.guild?.id;
    if (!guildId) {
      await ctx.reply({ content: '❌ Commande réservée aux serveurs Discord.', ephemeral: true });
      return;
    }

    let subcommand = 'stats';
    let formId = '';

    if (ctx.isSlash && ctx.interaction) {
      subcommand = ctx.interaction.options.getSubcommand();
      formId = ctx.interaction.options.getString('id', true);
    } else {
      subcommand = ctx.args[0]?.toLowerCase() || 'stats';
      formId = ctx.args[1] || '';
    }

    if (!formId) {
      await ctx.reply({
        content: '❌ Usage : `!form open <id>`, `!form panel <id>`, ou `!form stats <id>`',
      });
      return;
    }

    const form = formRepository.getFormById(guildId, formId);
    if (!form) {
      await ctx.reply({
        content: `❌ Formulaire avec l'identifiant \`${formId}\` introuvable.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'open') {
      if (ctx.isSlash && ctx.interaction && discordFormPanel.canUseDiscordModal(form)) {
        const modal = discordFormPanel.buildDiscordModal(form);
        await ctx.interaction.showModal(modal);
      } else {
        await ctx.reply({
          content: `📝 **${form.title}**\n\nCe formulaire est disponible sur le portail Web ETHONE :\nhttps://ethone.dev/discord/forms/${form.id}?guildId=${form.guildId}`,
          ephemeral: true,
        });
      }
      return;
    }

    if (subcommand === 'panel') {
      let targetChannel: any = ctx.channel;
      if (ctx.isSlash && ctx.interaction) {
        targetChannel = ctx.interaction.options.getChannel('salon') || ctx.interaction.options.getChannel('channel') || ctx.channel;
      }

      if (!targetChannel || !targetChannel.isTextBased() || !('send' in targetChannel)) {
        await ctx.reply({ content: '❌ Salon textuel invalide.', ephemeral: true });
        return;
      }

      const embed = discordFormPanel.buildPanelEmbed(form);
      const row = discordFormPanel.buildPanelActionRow(form);

      await targetChannel.send({ embeds: [embed], components: [row] });
      await ctx.reply({
        content: `✅ Panneau interactif pour **${form.title}** publié avec succès dans <#${targetChannel.id}>.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'stats') {
      const responses = formRepository.getResponses(guildId, formId);
      const pending = responses.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING').length;
      const approved = responses.filter((r) => r.status === 'APPROVED').length;
      const rejected = responses.filter((r) => r.status === 'REJECTED').length;

      const avgScore =
        responses.length > 0
          ? Math.round(responses.reduce((acc, r) => acc + r.score, 0) / responses.length)
          : 0;

      await ctx.reply({
        content:
          `📊 **Statistiques — ${form.title}**\n\n` +
          `• **Total réponses :** ${responses.length}\n` +
          `• **En attente de review :** ${pending}\n` +
          `• **Approuvées :** ${approved}\n` +
          `• **Rejetées :** ${rejected}\n` +
          `• **Score moyen :** ${avgScore}/100\n` +
          `• **Statut du formulaire :** \`${form.status}\``,
        ephemeral: true,
      });
    }
  },
};
