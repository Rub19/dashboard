import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { parseDuration, reasonAutocomplete, runSanctionCommand } from './sanctionRunner.js';

export const timeoutCommand: Command = {
  name: 'timeout',
  description: 'Rend un membre muet pour une durée (Modération)',
  category: 'Modération',
  aliases: ['mute'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Rend un membre muet')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à rendre muet').setRequired(true))
    .addStringOption((opt) => opt.setName('duree').setDescription('Durée (ex: 10m, 1h, 1d)').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison ou raison prédéfinie').setRequired(false).setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async autocomplete(interaction) {
    await reasonAutocomplete(interaction, ['TIMEOUT']);
  },

  async execute(ctx: CommandContext): Promise<void> {
    const raw = ctx.isSlash ? ctx.interaction!.options.getString('duree', true) : ctx.args[1] || '10m';
    const seconds = parseDuration(raw);
    if (!seconds || seconds > 28 * 86400) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Durée invalide : entre 1 minute et 28 jours (ex : 10m, 1h, 1d).')] });
      return;
    }
    await runSanctionCommand(ctx, {
      action: 'TIMEOUT',
      targetId: ctx.isSlash ? ctx.interaction!.options.getUser('membre', true).id : ctx.args[0]?.replace(/[^0-9]/g, ''),
      reason: ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.slice(2).join(' '),
      durationSeconds: seconds,
    });
  },
};
