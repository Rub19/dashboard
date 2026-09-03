import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';

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
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
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
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}timeout @membre [durée] [raison]\`` });
      return;
    }

    const seconds = parseDuration(durationStr);
    if (!seconds || seconds <= 0 || seconds > 28 * 86400) {
      await ctx.reply({ content: `${conf.emojis.error} Durée invalide (maximum 28 jours, ex: 10m, 2h, 1d).` });
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ content: `${conf.emojis.error} Membre introuvable.` });
      return;
    }

    // Hiérarchie
    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ content: `${conf.emojis.error} ${check.reason}` });
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
        .setTitle(`🔇 Mise en Sourdine • #${sanction.id}`)
        .setDescription(
          `Le membre ${targetMember} a été mis en sourdine pour **${durationStr}**.\n\n` +
          `**Raison :** ${reason}\n` +
          `**Modérateur :** ${ctx.author}`
        );

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: `${conf.emojis.error} Échec de la mise en sourdine.` });
    }
  },
};
