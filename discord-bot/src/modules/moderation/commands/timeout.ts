import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) return null;

  const val = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();

  switch (unit) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return val * 60;
  }
}

export const timeoutCommand: Command = {
  name: 'timeout',
  description: 'Met en sourdine temporaire un membre (Modération)',
  category: 'Modération',
  aliases: ['mute'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Met en sourdine un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à mute').setRequired(true))
    .addStringOption((opt) => opt.setName('duree').setDescription('Durée (ex: 10m, 1h, 1d)').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(ctx: CommandContext): Promise<void> {
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)] });
      return;
    }

    // Différer immédiatement : le fetch membre + le log de modération ci-dessous peuvent
    // dépasser la fenêtre de 3s de Discord et invalider le token d'interaction
    // ("Unknown interaction" / 10062) si on ne le fait pas.
    await ctx.deferReply();

    let targetId: string | undefined;
    let durationStr = '10m';
    let reason = 'Comportement inapproprié';

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
      durationStr = ctx.interaction.options.getString('duree', true);
      reason = ctx.interaction.options.getString('raison') || reason;
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
      durationStr = ctx.args[1] || '10m';
      if (ctx.args.length > 2) {
        reason = ctx.args.slice(2).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(formatString(t.mod_usage, { emoji: conf.emojis.error, usage: `${ctx.prefix}timeout @membre [durée] [raison]` }))] });
      return;
    }

    const seconds = parseDuration(durationStr);
    if (!seconds || seconds <= 0 || seconds > 28 * 86400) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.timeout_invalid_duration)] });
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.mod_member_not_found)] });
      return;
    }

    // Hiérarchie
    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(`${conf.emojis.error} ${check.reason}`)] });
      return;
    }

    try {
      await targetMember.timeout(seconds * 1000, reason);

      const { sanction } = sanctionService.createSanction({
        guildId: ctx.guild.id,
        userId: targetMember.id,
        userTag: targetMember.user.tag,
        moderatorId: ctx.author.id,
        moderatorTag: ctx.author.tag,
        type: 'timeout',
        reason,
        durationSeconds: seconds,
      });

      await ModLogger.logSanction(ctx.guild, sanction);

      const embed = ctx
        .createEmbed('info')
        .setTitle(formatString(t.timeout_title, { id: sanction.id }))
        .setDescription(
          formatString(t.timeout_desc, { target: targetMember.toString(), duration: durationStr, reason, moderator: ctx.author.toString() })
        );

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.timeout_fail)] });
    }
  },
};
