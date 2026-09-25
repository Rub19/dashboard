import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { PREVIEW_CATEGORIES, sendPreview } from '../services/messagePreviewService.js';
import { noticeEmbed } from '../../../utils/embeds.js';

/** /previewmessages — envoie en message privé un exemplaire de chaque message du bot (données d'exemple). */
export const previewMessagesCommand: Command = {
  name: 'previewmessages',
  aliases: ['apercu-messages'],
  description: 'Reçois en message privé un exemple de tous les messages du bot',
  category: 'Administration',
  slashData: new SlashCommandBuilder()
    .setName('previewmessages')
    .setDescription('Reçois en message privé un exemple de tous les messages du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName('categorie')
        .setDescription('Une seule catégorie (tout par défaut)')
        .addChoices(...PREVIEW_CATEGORIES.map(([value, name]) => ({ name, value })))
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.isSlash || !ctx.interaction) {
      await ctx.reply({ embeds: [noticeEmbed('error', 'Utilise la commande slash **/previewmessages** sur un serveur.')], ephemeral: true });
      return;
    }
    if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await ctx.reply({ embeds: [noticeEmbed('denied', 'Réservé aux membres qui ont la permission **Gérer le serveur**.')], ephemeral: true });
      return;
    }
    const i = ctx.interaction;
    await i.deferReply({ ephemeral: true });
    const res = await sendPreview(i.client, ctx.guild, i.user.id, i.options.getString('categorie'));
    if (res.dmClosed) {
      await i.editReply({ embeds: [noticeEmbed('error', 'Je ne peux pas t’écrire en message privé. Autorise les messages privés des membres de ce serveur (Paramètres de confidentialité), puis réessaie.')] });
      return;
    }
    await i.editReply({ embeds: [noticeEmbed(res.failed === 0 ? 'success' : 'warning', `${res.sent}/${res.total} message(s) envoyé(s) en message privé${res.failed ? ` · ${res.failed} n’ont pas pu être envoyés` : ''}.`)] });
  },
};
