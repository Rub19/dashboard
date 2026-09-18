import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';

// Only status/toggle here — channel, verified/unverified roles, and the
// button label/prompt text stay dashboard-only, matching how the rest of
// this config's fields are edited (same split as antiraidCommand.ts, which
// only exposes a handful of the full config as Discord subcommands).
export const verificationCommand: Command = {
  name: 'verification',
  description: 'Vérification des nouveaux membres : statut, activation',
  category: 'Sécurité',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Vérification des nouveaux membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Affiche la configuration actuelle de la vérification')
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Active ou désactive la vérification des nouveaux membres')
        .addBooleanOption((opt) =>
          opt.setName('actif').setDescription('Activer (True) ou désactiver (False)').setRequired(true)
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande doit être utilisée sur un serveur.')], ephemeral: true });
      return;
    }

    const guildId = ctx.guild.id;
    const sub = ctx.isSlash ? (ctx.interaction as ChatInputCommandInteraction).options.getSubcommand() : (ctx.args[0]?.toLowerCase() || 'status');

    if (sub === 'toggle') {
      const active = (ctx.interaction as ChatInputCommandInteraction).options.getBoolean('actif', true);
      const current = welcomeRepository.getVerificationConfig(guildId);
      const updated = { ...current, enabled: active };
      welcomeRepository.saveVerificationConfig(guildId, updated);
      emitConfigUpdated('welcomeVerification', guildId, updated, 'DISCORD_COMMAND', ctx.author.id);

      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(active ? 'success' : 'neutral')
            .setDescription(
              active
                ? '✅ Vérification **activée** : les nouveaux membres devront cliquer sur le bouton de vérification avant de recevoir leurs rôles automatiques.'
                : '⚪ Vérification **désactivée** : les nouveaux membres reçoivent leurs rôles automatiques normalement dès leur arrivée.'
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    // status
    const config = welcomeRepository.getVerificationConfig(guildId);
    const embed = ctx
      .createEmbed(config.enabled ? 'success' : 'neutral')
      .setAuthor({ name: `Vérification — ${ctx.guild.name}`, iconURL: ctx.guild.iconURL({ size: 128 }) ?? undefined })
      .setDescription(config.enabled ? '🟢 **Activée**' : '⚪ **Désactivée**')
      .addFields(
        { name: 'Salon', value: config.channelId ? `<#${config.channelId}>` : 'Non défini', inline: true },
        { name: 'Rôle vérifié', value: config.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : 'Non défini', inline: true },
        { name: 'Rôle non-vérifié', value: config.unverifiedRoleId ? `<@&${config.unverifiedRoleId}>` : 'Non défini', inline: true }
      )
      .setFooter({ text: 'Réglages détaillés (salon, rôles, texte) : Dashboard → Discord → Bienvenue' });

    await ctx.reply({ embeds: [embed] });
  },
};
