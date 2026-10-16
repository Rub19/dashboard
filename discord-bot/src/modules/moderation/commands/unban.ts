import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { runSanctionCommand } from './sanctionRunner.js';

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
    await runSanctionCommand(ctx, {
      action: 'UNBAN',
      targetId: (ctx.isSlash ? ctx.interaction!.options.getString('user_id', true) : ctx.args[0])?.replace(/[^0-9]/g, ''),
      reason: ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.slice(1).join(' '),
    });
  },
};
