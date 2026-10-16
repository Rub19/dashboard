import { GuildMember, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { findPreset, reasonAutocomplete, runSanctionCommand } from './sanctionRunner.js';
import { canModerate } from '../services/sanctionPipeline.js';

export const modCommand: Command = {
  name: 'mod',
  description: 'Applique une raison prédéfinie du serveur à un membre',
  category: 'Modération',
  slashData: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Applique une raison prédéfinie à un membre')
    .addUserOption((opt) => opt.setName('membre').setDescription('Membre à sanctionner').setRequired(true))
    .addStringOption((opt) => opt.setName('raison').setDescription('Raison prédéfinie').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    await reasonAutocomplete(interaction);
  },

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.isSlash) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Utilise la commande slash `/mod` sur un serveur.')], ephemeral: true });
      return;
    }
    const preset = findPreset(ctx.guild.id, ctx.interaction!.options.getString('raison', true));
    if (!preset) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Choisis une raison prédéfinie dans la liste.')], ephemeral: true });
      return;
    }
    const member = ctx.member as GuildMember | null;
    if (!canModerate(member) && !preset.roleIds.some((id) => member?.roles.cache.has(id))) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Tu ne peux pas utiliser cette raison.')], ephemeral: true });
      return;
    }
    await runSanctionCommand(ctx, {
      action: preset.action,
      targetId: ctx.interaction!.options.getUser('membre', true).id,
      reason: `preset:${preset.id}`,
      durationSeconds: preset.action === 'TIMEOUT' || preset.action === 'TEMPBAN' ? preset.durationSeconds : null,
      severity: preset.severity,
    });
  },
};
