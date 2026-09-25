import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { guildSetupService } from '../../services/guildSetupService.js';
import { noticeEmbed } from '../../utils/embeds.js';

/**
 * /setup — (Re)lance la configuration rapide : menus par famille de modules et préréglages. Les changements s'appliquent
 * tout de suite et apparaissent dans le dashboard (même registre que /module).
 */
export const setupCommand: Command = {
  name: 'setup',
  aliases: ['configuration', 'modules-setup'],
  description: 'Ouvre la configuration rapide : choisissez les modules à activer sur ce serveur',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Ouvre la configuration rapide : choisissez les modules à activer sur ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [noticeEmbed('error', 'Cette commande est réservée aux serveurs.')], ephemeral: true });
      return;
    }
    await ctx.reply(guildSetupService.buildPanel(ctx.guild.id, false) as any);
  },
};
