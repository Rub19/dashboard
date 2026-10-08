import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { guildSetupService } from '../../services/guildSetupService.js';
import { guildJoinService } from '../../services/guildJoinService.js';
import { noticeEmbed } from '../../utils/embeds.js';
import { getTranslation } from '../../utils/i18n.js';

export const setupCommand: Command = {
  name: 'setup',
  aliases: ['configuration', 'modules-setup', 'setup-welcome'],
  description: 'Ouvre la configuration rapide : choisissez les modules à activer sur ce serveur',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Ouvre la configuration rapide : choisissez les modules à activer sur ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName('vue')
        .setDescription('Choisir la vue à afficher')
        .setRequired(false)
        .addChoices(
          { name: 'Modules & préréglages', value: 'modules' },
          { name: 'Message d\'arrivée & diagnostic', value: 'welcome' }
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [noticeEmbed('error', getTranslation(ctx.guildConfig.language).guild_only_reserved)], ephemeral: true });
      return;
    }

    const viewChoice = ctx.isSlash && ctx.interaction
      ? (ctx.interaction as any).options?.getString?.('vue')
      : ctx.args[0]?.toLowerCase();

    if (viewChoice === 'welcome' || viewChoice === 'join') {
      const payload = guildJoinService.buildJoinMessage(ctx.guild, ctx.author.id);
      await ctx.reply({ ...payload, ephemeral: true } as any);
      return;
    }

    await ctx.reply(guildSetupService.buildPanel(ctx.guild.id, false) as any);
  },
};
