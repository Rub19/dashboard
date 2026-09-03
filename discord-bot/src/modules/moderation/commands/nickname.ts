import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { checkHierarchy } from '../permissions/hierarchy.js';

export const nicknameCommand: Command = {
  name: 'nickname',
  description: 'Modifie ou réinitialise le surnom d’un membre sur le serveur (Modération)',
  category: 'Modération',
  aliases: ['setnick', 'nick'],
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  slashData: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Modifie ou réinitialise le surnom d’un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
    .addStringOption((opt) => opt.setName('nouveau_nom').setDescription('Nouveau pseudo (laisser vide pour réinitialiser)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: 'Cette commande ne peut être exécutée que sur un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
    let targetId: string | undefined;
    let newNick: string | null = null;

    if (ctx.isSlash && ctx.interaction) {
      targetId = ctx.interaction.options.getUser('membre', true).id;
      newNick = ctx.interaction.options.getString('nouveau_nom');
    } else {
      targetId = ctx.args[0]?.replace(/[^0-9]/g, '');
      if (ctx.args.length > 1) {
        newNick = ctx.args.slice(1).join(' ');
      }
    }

    if (!targetId) {
      await ctx.reply({ content: `${conf.emojis.error} Utilisation : \`${ctx.prefix}nickname @membre [nouveau_nom]\`` });
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
      await targetMember.setNickname(newNick);
      if (newNick) {
        await ctx.reply({ content: `✅ Le surnom de ${targetMember} a été modifié en **${newNick}**.` });
      } else {
        await ctx.reply({ content: `✅ Le surnom de ${targetMember} a été réinitialisé.` });
      }
    } catch {
      await ctx.reply({ content: `${conf.emojis.error} Impossible de modifier le surnom de ce membre.` });
    }
  },
};
