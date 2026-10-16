import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { parseDuration, reasonAutocomplete, runSanctionCommand } from './sanctionRunner.js';
import { trg } from '../../../utils/tr.js';

export const banCommand: Command = {
  name: 'ban',
  description: 'Bannit un utilisateur, définitivement ou pour une durée (Modération)',
  category: 'Modération',
  userPermissions: [PermissionFlagsBits.BanMembers],
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un utilisateur')
    .addUserOption((opt) => opt.setName('utilisateur').setDescription('Utilisateur à bannir').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison ou raison prédéfinie').setRequired(false).setAutocomplete(true))
    .addStringOption((opt) => opt.setName('duree').setDescription('Ban temporaire : 1h, 3d, 7d… Vide : définitif'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async autocomplete(interaction) {
    await reasonAutocomplete(interaction, ['BAN', 'TEMPBAN', 'SOFTBAN']);
  },

  async execute(ctx: CommandContext): Promise<void> {
    const raw = ctx.isSlash ? ctx.interaction!.options.getString('duree') : null;
    const seconds = raw ? parseDuration(raw) : null;
    if (raw && !seconds) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(trg(ctx.guild?.id, 'Durée invalide : utilise par exemple 1h, 3d ou 7d.'))] });
      return;
    }
    await runSanctionCommand(ctx, {
      action: seconds ? 'TEMPBAN' : 'BAN',
      targetId: ctx.isSlash ? ctx.interaction!.options.getUser('utilisateur', true).id : ctx.args[0]?.replace(/[^0-9]/g, ''),
      reason: ctx.isSlash ? ctx.interaction!.options.getString('raison') : ctx.args.slice(1).join(' '),
      durationSeconds: seconds,
    });
  },
};
