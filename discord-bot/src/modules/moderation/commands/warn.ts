import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { reasonAutocomplete, runSanctionCommand } from './sanctionRunner.js';

export const warnCommand: Command = {
  name: 'warn',
  description: 'Avertit officiellement un membre (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertit un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à avertir').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison ou raison prédéfinie').setRequired(false).setAutocomplete(true))
    .addStringOption((opt) => opt.setName('gravite').setDescription('Gravité de l’avertissement').addChoices({ name: 'Légère', value: 'light' }, { name: 'Moyenne', value: 'medium' }, { name: 'Grave', value: 'grave' }))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async autocomplete(interaction) {
    await reasonAutocomplete(interaction, ['WARN']);
  },

  async execute(ctx: CommandContext): Promise<void> {
    await runSanctionCommand(ctx, {
      action: 'WARN',
      targetId: ctx.isSlash ? ctx.interaction!.options.getUser('membre', true).id : ctx.args[0]?.replace(/[^0-9]/g, ''),
      reason: ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.slice(1).join(' '),
      severity: ctx.isSlash ? (ctx.interaction!.options.getString('gravite') as 'light' | 'medium' | 'grave' | null) : null,
    });
  },
};
