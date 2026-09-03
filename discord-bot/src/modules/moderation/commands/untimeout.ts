import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';

export const untimeoutCommand: Command = {
  name: 'untimeout',
  description: 'Retire la sourdine d’un membre (Modération)',
  category: 'Modération',
  aliases: ['unmute'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Retire la sourdine d’un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
    let targetId: string | undefined;
    let reason = 'Fin de sanction';

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
      reason = ctx.interaction.options.getString('raison') || reason;
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
      if (ctx.args.length > 1) {
        reason = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}untimeout @membre [raison]\`` });
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ content: `${conf.emojis.error} Membre introuvable.` });
      return;
    }

    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ content: `${conf.emojis.error} ${check.reason}` });
      return;
    }

    try {
      await targetMember.timeout(null, reason);

      const { sanction } = sanctionService.createSanction({
        guildId: ctx.guild.id,
        userId: targetMember.id,
        userTag: targetMember.user.tag,
        moderatorId: ctx.author.id,
        moderatorTag: ctx.author.tag,
        type: 'untimeout',
        reason,
      });

      await ModLogger.logSanction(ctx.guild, sanction);

      const embed = ctx
        .createEmbed('success')
        .setTitle(`🔊 Sourdine Retirée • #${sanction.id}`)
        .setDescription(`La sourdine du membre ${targetMember} a été levée avec succès.`);

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: `${conf.emojis.error} Échec du retrait de la sourdine.` });
    }
  },
};
