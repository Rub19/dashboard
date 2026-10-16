import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { runSanctionCommand } from './sanctionRunner.js';

export const untimeoutCommand: Command = {
  name: 'untimeout',
  description: 'Retire le mute d’un membre (Modération)',
  category: 'Modération',
  aliases: ['unmute'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Retire le mute d’un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(ctx: CommandContext): Promise<void> {
    await runSanctionCommand(ctx, {
      action: 'UNTIMEOUT',
      targetId: ctx.isSlash ? ctx.interaction!.options.getUser('membre', true).id : ctx.args[0]?.replace(/[^0-9]/g, ''),
      reason: ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.slice(1).join(' '),
    });
  },
};
