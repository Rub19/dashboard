import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';
import { sanctionService } from '../sanctions/sanctionService.js';
import { ModLogger } from '../logs/modLogger.js';

export const kickCommand: Command = {
  name: 'kick',
  description: 'Expulse un membre du serveur (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.KickMembers],
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre du serveur')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison de l’expulsion').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
    let targetId: string | undefined;
    let reason = 'Expulsion par un modérateur';

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
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}kick @membre [raison]\`` });
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await ctx.reply({ content: `${conf.emojis.error} Membre introuvable sur ce serveur.` });
      return;
    }

    const check = checkHierarchy(ctx.member, targetMember, ctx.guild.members.me!);
    if (!check.allowed) {
      await ctx.reply({ content: `${conf.emojis.error} ${check.reason}` });
      return;
    }

    try {
      // Message MP préventif
      await targetMember.send({
        content: `👢 Vous avez été expulsé du serveur **${ctx.guild.name}**.\n**Raison :** ${reason}`,
      }).catch(() => {});

      await targetMember.kick(reason);

      const { sanction } = sanctionService.createSanction({
        guildId: ctx.guild.id,
        userId: targetMember.id,
        userTag: targetMember.user.tag,
        moderatorId: ctx.author.id,
        moderatorTag: ctx.author.tag,
        type: 'kick',
        reason,
      });

      await ModLogger.logSanction(ctx.guild, sanction);

      const embed = ctx
        .createEmbed('info')
        .setTitle(`👢 Expulsion • #${sanction.id}`)
        .setDescription(
          `Le membre **${targetMember.user.tag}** a été expulsé avec succès.\n\n` +
          `**Raison :** ${reason}\n` +
          `**Modérateur :** ${ctx.author}`
        );

      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: `${conf.emojis.error} Échec de l'expulsion.` });
    }
  },
};
