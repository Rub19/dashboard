import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { endMemberSession, elevate } from '../services/secureRolesService.js';
import { noticeEmbed } from '../../../utils/embeds.js';
import { buildGrantedEmbed, buildSetupEmbed } from '../services/secureMessages.js';

/**
 * /elevate — obtient ses permissions sensibles pour une durée limitée. Première utilisation (après invitation par un
 * administrateur) : le bot affiche la clé à ajouter dans une application d'authentification, puis /elevate code:123456 l'active.
 */
export const elevateCommand: Command = {
  name: 'elevate',
  aliases: ['elever', 'secure'],
  description: 'Active tes permissions sensibles pour une durée limitée (rôles sécurisés)',
  category: 'Sécurité',
  slashData: new SlashCommandBuilder()
    .setName('elevate')
    .setDescription('Active tes permissions sensibles pour une durée limitée (rôles sécurisés)')
    .addStringOption((o) => o.setName('code').setDescription('Code à 6 chiffres de ton application d’authentification').setMinLength(6).setMaxLength(7))
    .addBooleanOption((o) => o.setName('terminer').setDescription('Termine ta session maintenant et retire tes permissions')),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.isSlash || !ctx.interaction || !ctx.member) {
      await ctx.reply({ embeds: [noticeEmbed('error', 'Utilise la commande slash **/elevate** sur un serveur.')], ephemeral: true });
      return;
    }
    const i = ctx.interaction;
    await i.deferReply({ ephemeral: true });
    const member = await ctx.guild.members.fetch(i.user.id);

    if (i.options.getBoolean('terminer')) {
      const ended = await endMemberSession(member);
      await i.editReply({ embeds: [noticeEmbed(ended ? 'success' : 'info', ended ? 'Session terminée : tes permissions sensibles ont été retirées.' : 'Tu n’as pas de session en cours.')] });
      return;
    }

    const res = await elevate(member, i.options.getString('code'));
    switch (res.kind) {
      case 'granted':
        await i.editReply({ embeds: [buildGrantedEmbed(res.expiresAt)] });
        return;
      case 'setup':
        await i.editReply({ embeds: [buildSetupEmbed(res.secret, res.uri)] });
        return;
      case 'need_code':
        await i.editReply({ embeds: [noticeEmbed('info', 'Envoie le code de ton application : `/elevate code:123456`.')] });
        return;
      case 'wrong_code':
        await i.editReply({ embeds: [noticeEmbed('error', `Code incorrect ou déjà utilisé. Il te reste ${res.remaining} essai${res.remaining > 1 ? 's' : ''} avant un blocage de 10 minutes.`)] });
        return;
      case 'locked':
        await i.editReply({ embeds: [noticeEmbed('error', `Trop d’essais : réessaie <t:${Math.floor(res.until.getTime() / 1000)}:R>.`)] });
        return;
      default:
        await i.editReply({ embeds: [noticeEmbed('error', res.message)] });
    }
  },
};
