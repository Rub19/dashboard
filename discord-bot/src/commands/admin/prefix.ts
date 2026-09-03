import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { guildConfigService } from '../../services/guildConfigService.js';
import { Command, CommandContext } from '../../types/command.js';

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
    if (!ctx.guild) {
      await ctx.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.' });
      return;
    }

    const conf = ctx.guildConfig;
    const newPrefix = ctx.getString('nouveau', 0)?.trim();

    // Si aucun nouvel argument n'est fourni, on affiche le préfixe actuel
    if (!newPrefix) {
      const embed = ctx
        .createEmbed('info')
        .setTitle(`${conf.emojis.settings} Préfixe du serveur`)
        .setDescription(
          `Le préfixe actuel sur ce serveur est : \`${conf.prefix}\`\n\n` +
          `Pour le changer, utilisez :\n` +
          `• En slash : \`/prefix nouveau:[votre_prefixe]\`\n` +
          `• En préfixe : \`${conf.prefix}prefix [votre_prefixe]\`\n` +
          `• Ou via le panneau interactif : \`/settings\``
        );
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // Vérification des permissions pour le mode préfixe
    if (!ctx.isSlash && ctx.member) {
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await ctx.reply({
          content: `${conf.emojis.error} Vous devez avoir la permission \`Gérer le serveur\` pour modifier le préfixe.`,
        });
        return;
      }
    }

    if (newPrefix.length > 5 || /\s/.test(newPrefix)) {
      await ctx.reply({
        content: `${conf.emojis.error} Le préfixe ne doit pas comporter d'espaces et faire maximum 5 caractères.`,
      });
      return;
    }

    // Sauvegarde centralisée
    guildConfigService.updateConfig(ctx.guild.id, { prefix: newPrefix });

    const embed = ctx
      .createEmbed('success')
      .setTitle(`${conf.emojis.success} Préfixe mis à jour !`)
      .setDescription(
        `Le préfixe pour ce serveur est désormais : \`${newPrefix}\`\n\n` +
        `Exemple : \`${newPrefix}ping\` ou \`${newPrefix}help\``
      );

    await ctx.reply({ embeds: [embed] });
  },
};
