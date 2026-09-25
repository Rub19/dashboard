import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { endMemberSession, elevate } from '../services/secureRolesService.js';
import { noticeEmbed } from '../../../utils/embeds.js';

const groups = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

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
      case 'granted': {
        const ts = Math.floor(res.expiresAt.getTime() / 1000);
        await i.editReply({ embeds: [noticeEmbed('success', `Permissions activées jusqu’à <t:${ts}:t> (<t:${ts}:R>). Elles seront retirées automatiquement. Tu peux les retirer avant avec \`/elevate terminer:True\`.`, { title: 'Session élevée' })] });
        return;
      }
      case 'setup':
        await i.editReply({
          embeds: [
            noticeEmbed(
              'info',
              [
                '**1.** Dans ton application d’authentification (Google Authenticator, Authy, 1Password…), ajoute un compte **par clé** (saisie manuelle) :',
                `\`\`\`${groups(res.secret)}\`\`\``,
                'Type : basé sur l’heure · 6 chiffres · 30 secondes.',
                '**2.** Envoie le code affiché : `/elevate code:123456`.',
                `Lien direct pour les applications qui le supportent :\n\`${res.uri}\``,
                '⚠️ Cette clé n’est montrée qu’à toi et ne sera plus réaffichée une fois activée. Ne la partage jamais.',
              ].join('\n\n'),
              { title: 'Configurer la double authentification' }
            ),
          ],
        });
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
