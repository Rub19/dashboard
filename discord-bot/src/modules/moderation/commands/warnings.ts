import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { sanctionService } from '../sanctions/sanctionService.js';

export const warningsCommand: Command = {
  name: 'warnings',
  description: 'Affiche l’historique des sanctions et avertissements d’un membre (Modération)',
  category: 'Modération',
  aliases: ['warns', 'history'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Affiche l’historique des sanctions d’un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
    let targetId: string | undefined;

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
    }

    if (!targetId) {
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}warnings @membre\`` });
      return;
    }

    const sanctions = sanctionService.getUserSanctions(ctx.guild.id, targetId);
    const targetUser = await ctx.client.users.fetch(targetId).catch(() => null);
    const targetName = targetUser?.tag || targetId;

    if (sanctions.length === 0) {
      const emptyEmbed = ctx
        .createEmbed('success')
        .setTitle(`🛡️ Historique • ${targetName}`)
        .setDescription('Ce membre ne possède aucun avertissement ou sanction enregistrée.');
      await ctx.reply({ embeds: [emptyEmbed] });
      return;
    }

    const embed = ctx
      .createEmbed('default')
      .setTitle(`🛡️ Historique Disciplinaire • ${targetName}`)
      .setDescription(`Total : **${sanctions.length}** sanction(s) enregistrée(s)\n────────────────────`);

    // Afficher les 10 sanctions les plus récentes
    for (const s of sanctions.slice(0, 10)) {
      const typeIcons: Record<string, string> = {
        warn: '⚠️ Warning',
        timeout: '🔇 Timeout',
        kick: '👢 Kick',
        ban: '🔨 Ban',
        unban: '🔓 Unban',
        untimeout: '🔊 Untimeout',
      };

      const typeLabel = typeIcons[s.type] || s.type.toUpperCase();
      const dateStr = new Date(s.timestamp).toLocaleDateString();

      embed.addFields([
        {
          name: `${typeLabel} • #${s.id}`,
          value: `**Raison :** ${s.reason}\n**Par :** ${s.moderatorTag} • *${dateStr}*`,
          inline: false,
        },
      ]);
    }

    await ctx.reply({ embeds: [embed] });
  },
};
