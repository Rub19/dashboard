import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { raidDetectionService } from '../services/raidDetectionService.js';
import { raidModeService } from '../services/raidModeService.js';
import { raidActionService } from '../services/raidActionService.js';

export const antiraidCommand: Command = {
  name: 'antiraid',
  description: 'Centre de contrôle Anti-Raid 2.0 (Statut, Raid Mode, Verrouillage)',
  category: 'Sécurité',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Centre de contrôle Anti-Raid 2.0')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Affiche le statut actuel et le Risk Score du serveur')
    )
    .addSubcommand((sub) =>
      sub
        .setName('raidmode')
        .setDescription('Active ou désactive le mode Raid d’urgence')
        .addBooleanOption((opt) =>
          opt
            .setName('activer')
            .setDescription('Activer (True) ou Désactiver (False)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('lockdown')
        .setDescription('Verrouille ou déverrouille les salons textuels')
        .addBooleanOption((opt) =>
          opt
            .setName('activer')
            .setDescription('Verrouiller (True) ou Déverrouiller (False)')
            .setRequired(true)
        )
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild) {
      await ctx.reply({ content: 'Cette commande est réservée aux serveurs.', ephemeral: true });
      return;
    }

    const guildId = ctx.guild.id;
    const isSlash = ctx.isSlash;
    let sub = 'status';

    if (isSlash) {
      const interaction = ctx.interaction as ChatInputCommandInteraction;
      sub = interaction.options.getSubcommand();
    } else if (ctx.args.length > 0) {
      sub = ctx.args[0].toLowerCase();
    }

    if (sub === 'status') {
      const metrics = raidDetectionService.getLiveMetrics(guildId);
      const levelColors: Record<string, number> = {
        SAFE: 0x10b981,
        SUSPICIOUS: 0xf59e0b,
        ELEVATED: 0xf97316,
        DANGEROUS: 0xef4444,
        CRITICAL: 0x991b1b,
      };

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Centre Anti-Raid 2.0 — ${ctx.guild.name}`)
        .setColor(levelColors[metrics.threatLevel] || 0x3b82f6)
        .addFields(
          {
            name: '📊 Risk Score',
            value: `**${metrics.currentRiskScore}/100** (\`${metrics.threatLevel}\`)`,
            inline: true,
          },
          {
            name: '🚨 Raid Mode',
            value: metrics.raidModeActive ? '🔥 **ACTIVÉ**' : '🟢 Normal',
            inline: true,
          },
          {
            name: '🔒 Verrouillage (Lockdown)',
            value: metrics.lockdownActive
              ? `🔴 Actif (${metrics.lockedChannelsCount} salons)`
              : '🟢 Inactif',
            inline: true,
          },
          {
            name: '📥 Arrivées (60s)',
            value: `${metrics.joinsPerMinute} joins`,
            inline: true,
          },
          {
            name: '💬 Messages (60s)',
            value: `${metrics.messagesPerMinute} msgs`,
            inline: true,
          },
          {
            name: '🔔 Mentions (60s)',
            value: `${metrics.mentionsPerMinute} mentions`,
            inline: true,
          }
        )
        .setFooter({ text: 'ETHONE Anti-Raid Engine 2.0 • Dashboard Web disponible' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'raidmode') {
      let activate = false;
      if (isSlash) {
        const interaction = ctx.interaction as ChatInputCommandInteraction;
        activate = interaction.options.getBoolean('activer') || false;
      } else {
        activate = ctx.args[1]?.toLowerCase() === 'on' || ctx.args[1]?.toLowerCase() === 'true';
      }

      if (activate) {
        await raidModeService.activateRaidMode(
          ctx.guild,
          `Déclenché par ${ctx.author.tag}`,
          ctx.author.tag
        );
        await ctx.reply({
          content: '🚨 **Raid Mode ACTIVÉ !** Les protections d’urgence sont en place.',
        });
      } else {
        await raidModeService.deactivateRaidMode(ctx.guild, ctx.author.tag);
        await ctx.reply({
          content: '🔓 **Raid Mode DÉSACTIVÉ.** Retour à la configuration standard.',
        });
      }
      return;
    }

    if (sub === 'lockdown') {
      let activate = false;
      if (isSlash) {
        const interaction = ctx.interaction as ChatInputCommandInteraction;
        activate = interaction.options.getBoolean('activer') || false;
      } else {
        activate = ctx.args[1]?.toLowerCase() === 'on' || ctx.args[1]?.toLowerCase() === 'true';
      }

      if (activate) {
        const count = await raidActionService.executeLockdown(
          ctx.guild,
          `Lockdown d’urgence par ${ctx.author.tag}`
        );
        await ctx.reply({
          content: `🔒 **Lockdown ACTIVÉ !** ${count} salon(s) textuel(s) verrouillé(s).`,
        });
      } else {
        const count = await raidActionService.releaseLockdown(ctx.guild);
        await ctx.reply({
          content: `🔓 **Lockdown LEVÉ !** ${count} salon(s) déverrouillé(s).`,
        });
      }
      return;
    }

    await ctx.reply({
      content: 'Usage : `/antiraid status`, `/antiraid raidmode <activer>`, `/antiraid lockdown <activer>`',
      ephemeral: true,
    });
  },
};
