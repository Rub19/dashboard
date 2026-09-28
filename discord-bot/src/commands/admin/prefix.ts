import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { Command, CommandContext } from '../../types/command.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

export const prefixCommand: Command = {
  name: 'prefix',
  description: 'Affiche ou modifie le préfixe des commandes pour ce serveur',
  category: 'Administration',
  aliases: ['setprefix'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Affiche ou modifie le préfixe des commandes pour ce serveur')
    .addStringOption((option) =>
      option
        .setName('nouveau')
        .setDescription('Le nouveau préfixe souhaité (ex: !, ?, $, >>)')
        .setRequired(false)
        .setMaxLength(5)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  execute: async (ctx: CommandContext) => {
    const conf = ctx.guildConfig;
    const t = getTranslation(conf.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_must_run)] });
      return;
    }

    const newPrefix = ctx.getString('nouveau', 0)?.trim();

    // Si aucun nouvel argument n'est fourni, on affiche le préfixe actuel
    if (!newPrefix) {
      const embed = ctx
        .createEmbed('info')
        .setTitle(`${conf.emojis.settings} ${t.prefix_title}`)
        .setDescription(formatString(t.prefix_current_desc, { prefix: conf.prefix }));
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // Vérification des permissions pour le mode préfixe
    if (!ctx.isSlash && ctx.member) {
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`${conf.emojis.error} ${t.prefix_need_permission}`)],
        });
        return;
      }
    }

    if (newPrefix.length > 5 || /\s/.test(newPrefix)) {
      await ctx.reply({
        embeds: [ctx.createEmbed('error').setDescription(`${conf.emojis.error} ${t.prefix_invalid}`)],
      });
      return;
    }

    // Sauvegarde centralisée
    guildConfigService.updateConfig(ctx.guild.id, { prefix: newPrefix });

    const embed = ctx
      .createEmbed('success')
      .setTitle(`${conf.emojis.success} ${t.prefix_updated_title}`)
      .setDescription(formatString(t.prefix_updated_desc, { prefix: newPrefix }));

    await ctx.reply({ embeds: [embed] });
  },
};
