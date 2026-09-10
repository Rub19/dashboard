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
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { BRAND_COLORS } from '../../../utils/embeds.js';

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
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.guild_only_command)], ephemeral: true });
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
      // Échelle de menace à 5 paliers : les extrêmes (SAFE/DANGEROUS) et le palier
      // intermédiaire (SUSPICIOUS) reprennent les tons de marque success/warning/error.
      // ELEVATED et CRITICAL n'ont pas d'équivalent dans la palette à 5 tons — ce sont
      // des nuances d'escalade dédiées (orange puis rouge foncé) entre warning et error.
      const levelColors: Record<string, number> = {
        SAFE: BRAND_COLORS.success,
        SUSPICIOUS: BRAND_COLORS.warning,
        ELEVATED: 0xf97316, // Orange — palier d'escalade entre warning et error
        DANGEROUS: BRAND_COLORS.error,
        CRITICAL: 0x991b1b, // Rouge foncé — palier au-delà de error (menace confirmée)
      };

      const embed = new EmbedBuilder()
        .setTitle(formatString(t.antiraid_status_title, { guildName: ctx.guild.name }))
        .setColor(levelColors[metrics.threatLevel] || BRAND_COLORS.info)
        .setThumbnail(ctx.guild.iconURL({ size: 128 }) ?? null)
        .addFields(
          {
            name: t.antiraid_field_risk_score,
            value: `**${metrics.currentRiskScore}/100** (\`${metrics.threatLevel}\`)`,
            inline: true,
          },
          {
            name: t.antiraid_field_raidmode,
            value: metrics.raidModeActive ? t.antiraid_raidmode_active : t.antiraid_raidmode_normal,
            inline: true,
          },
          {
            name: t.antiraid_field_lockdown,
            value: metrics.lockdownActive
              ? formatString(t.antiraid_lockdown_active, { count: metrics.lockedChannelsCount })
              : t.antiraid_lockdown_inactive,
            inline: true,
          },
          {
            name: t.antiraid_field_joins,
            value: formatString(t.antiraid_joins_value, { count: metrics.joinsPerMinute }),
            inline: true,
          },
          {
            name: t.antiraid_field_messages,
            value: formatString(t.antiraid_messages_value, { count: metrics.messagesPerMinute }),
            inline: true,
          },
          {
            name: t.antiraid_field_mentions,
            value: formatString(t.antiraid_mentions_value, { count: metrics.mentionsPerMinute }),
            inline: true,
          }
        )
        .setFooter({ text: t.antiraid_status_footer })
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

      // Différer immédiatement : l'activation/désactivation du Raid Mode peut itérer sur les
      // salons du serveur et dépasser la fenêtre de 3s de Discord ("Unknown interaction" / 10062).
      await ctx.deferReply();

      if (activate) {
        await raidModeService.activateRaidMode(
          ctx.guild,
          formatString(t.antiraid_raidmode_reason, { tag: ctx.author.tag }),
          ctx.author.tag
        );
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(t.antiraid_raidmode_on_success)],
        });
      } else {
        await raidModeService.deactivateRaidMode(ctx.guild, ctx.author.tag);
        await ctx.reply({
          embeds: [ctx.createEmbed('success').setDescription(t.antiraid_raidmode_off_success)],
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

      // Différer immédiatement : le (dé)verrouillage itère sur tous les salons textuels du
      // serveur et peut dépasser la fenêtre de 3s de Discord ("Unknown interaction" / 10062).
      await ctx.deferReply();

      if (activate) {
        const count = await raidActionService.executeLockdown(
          ctx.guild,
          formatString(t.antiraid_lockdown_reason, { tag: ctx.author.tag })
        );
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(formatString(t.antiraid_lockdown_on_success, { count }))],
        });
      } else {
        const count = await raidActionService.releaseLockdown(ctx.guild);
        await ctx.reply({
          embeds: [ctx.createEmbed('success').setDescription(formatString(t.antiraid_lockdown_off_success, { count }))],
        });
      }
      return;
    }

    await ctx.reply({
      embeds: [ctx.createEmbed('info').setDescription(t.antiraid_usage_fallback)],
      ephemeral: true,
    });
  },
};
