import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

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
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    let targetId: string | undefined;

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
    }

    if (!targetId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_usage, { emoji: conf.emojis.error, usage: `${ctx.prefix}warnings @membre` }))] });
      return;
    }

    // Différer immédiatement : le fetch de l'utilisateur ci-dessous peut dépasser la fenêtre
    // de 3s de Discord et invalider le token d'interaction ("Unknown interaction" / 10062).
    await ctx.deferReply();

    const sanctions = sanctionService.getUserSanctions(ctx.guild.id, targetId);
    const targetUser = await ctx.client.users.fetch(targetId).catch(() => null);
    const targetName = targetUser?.tag || targetId;

    if (sanctions.length === 0) {
      const emptyEmbed = ctx
        .createEmbed('success')
        .setTitle(formatString(t.warnings_empty_title, { target: targetName }))
        .setDescription(t.warnings_empty_desc);
      await ctx.reply({ embeds: [emptyEmbed] });
      return;
    }

    const embed = ctx
      .createEmbed('default')
      .setTitle(formatString(t.warnings_title, { target: targetName }))
      .setDescription(formatString(t.warnings_total, { count: sanctions.length }));

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
          value: formatString(t.warnings_field_value, { reason: s.reason, moderator: s.moderatorTag, date: dateStr }),
          inline: false,
        },
      ]);
    }

    await ctx.reply({ embeds: [embed] });
  },
};
