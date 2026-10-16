import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { reasonAutocomplete, runSanctionCommand } from './sanctionRunner.js';

export const kickCommand: Command = {
  name: 'kick',
  description: 'Expulse un membre du serveur (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.KickMembers],
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison ou raison prédéfinie').setRequired(false).setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async autocomplete(interaction) {
    await reasonAutocomplete(interaction, ['KICK']);
  },

  async execute(ctx: CommandContext): Promise<void> {
    await runSanctionCommand(ctx, {
      action: 'KICK',
      targetId: ctx.isSlash ? ctx.interaction!.options.getUser('membre', true).id : ctx.args[0]?.replace(/[^0-9]/g, ''),
      reason: ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.slice(1).join(' '),
    });
  },
};
