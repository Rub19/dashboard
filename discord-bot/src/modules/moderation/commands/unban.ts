import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const unbanCommand: Command = {
  name: 'unban',
  description: 'Révoque le bannissement d’un utilisateur (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.BanMembers],
  slashData: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannit un utilisateur')
    .addStringOption((opt) => opt.setName('user_id').setDescription('Identifiant Discord (ID) de l’utilisateur').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison du débannissement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(ctx: CommandContext): Promise<void> {
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    // Différer immédiatement : la vérification du ban + le log de modération ci-dessous
    // peuvent dépasser la fenêtre de 3s de Discord et invalider le token d'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    let targetId: string | undefined;
    let reason = 'Révocation de sanction par un modérateur';

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getString('user_id', true).trim();
      reason = ctx.interaction.options.getString('raison') || reason;
    } else {
      targetId = ctx.args[0]?.trim();
      if (ctx.args.length > 1) {
        reason = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId || !/^\d{17,20}$/.test(targetId)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.unban_invalid_id, { example: `${ctx.prefix}unban 123456789012345678` }))] });
      return;
    }

    try {
      const banInfo = await ctx.guild.bans.fetch(targetId).catch(() => null);
      if (!banInfo) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.unban_not_banned)] });
        return;
      }

      await ctx.guild.bans.remove(targetId, reason);

      const { sanction } = sanctionService.createSanction({
        guildId: ctx.guild.id,
        userId: targetId,
        userTag: banInfo.user.tag,
        moderatorId: ctx.author.id,
        moderatorTag: ctx.author.tag,
        type: 'unban',
        reason,
      });

      await ModLogger.logSanction(ctx.guild, sanction);

      const embed = ctx
        .createEmbed('success')
        .setTitle(formatString(t.unban_title, { id: sanction.id }))
        .setDescription(formatString(t.unban_desc, { userTag: banInfo.user.tag }));

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.unban_fail)] });
    }
  },
};
