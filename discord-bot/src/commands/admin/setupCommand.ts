import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { guildSetupService } from '../../services/guildSetupService.js';
import { guildJoinService } from '../../services/guildJoinService.js';
import { noticeEmbed } from '../../utils/embeds.js';
import { getTranslation } from '../../utils/i18n.js';

export const setupCommand: Command = {
  name: 'setup',
  aliases: ['configuration', 'modules-setup', 'setup-welcome', 'bienvenue', 'welcome'],
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

    const invokedName = ctx.isSlash && ctx.interaction
      ? ctx.interaction.commandName
      : ctx.message?.content.slice(ctx.prefix.length).trim().split(/\s+/)[0]?.toLowerCase();

    const isWelcomeAlias = invokedName === 'bienvenue' || invokedName === 'welcome' || invokedName === 'setup-welcome';
    if (viewChoice === 'welcome' || viewChoice === 'join' || isWelcomeAlias) {
      const payload = guildJoinService.buildJoinMessage(ctx.guild, ctx.author.id, ctx.channel?.id || null);
      await ctx.reply({
        ...payload,
        flags: ((payload.flags as number) || MessageFlags.IsComponentsV2) | MessageFlags.Ephemeral,
      } as any);
      return;
    }

    await ctx.reply(guildSetupService.buildPanel(ctx.guild.id, false) as any);
  },
};
