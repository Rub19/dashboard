import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { raidDetectionService } from '../services/raidDetectionService.js';
import { raidConfigService } from '../services/raidConfigService.js';
import { raidModeService } from '../services/raidModeService.js';
import { raidActionService } from '../services/raidActionService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { BRAND_COLORS } from '../../../utils/embeds.js';

export const antiraidCommand: Command = {
  name: 'antiraid',
  description: 'Anti-Raid : statut, activation, détecteurs',
  category: 'Sécurité',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Centre Anti-Raid')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Affiche le statut actuel et le Risk Score du serveur')
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription("Active ou désactive complètement l'Anti-Raid sur ce serveur")
        .addBooleanOption((opt) =>
          opt.setName('actif').setDescription('Activer (True) ou tout désactiver (False)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('botprotection')
        .setDescription("Expulser automatiquement les bots non autorisés qui rejoignent")
        .addBooleanOption((opt) =>
          opt.setName('actif').setDescription('Activer (True) ou désactiver (False)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('trustbot')
        .setDescription('Ajoute (ou retire) un bot de la liste des bots autorisés')
        .addUserOption((opt) => opt.setName('bot').setDescription('Le bot à autoriser').setRequired(true))
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

      const raidCfg = raidConfigService.getConfig(guildId);

      // --- Anti-Raid désactivé : embed court et sans ambiguïté ---
      if (!raidCfg.enabled) {
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(BRAND_COLORS.neutral)
              .setAuthor({ name: `Anti-Raid — ${ctx.guild.name}`, iconURL: ctx.guild.iconURL({ size: 128 }) ?? undefined })
              .setDescription(
                '## ⚪ Désactivé\nAucune détection ni sanction automatique sur ce serveur. Les réglages sont conservés.\n\n**Réactiver :** `/antiraid toggle actif:True`'
              )
              .setTimestamp(),
          ],
        });
        return;
      }

      // --- Anti-Raid actif : tableau de bord ---
      const threatLine =
        metrics.threatLevel === 'SAFE'
          ? '🟢 Aucune menace'
          : metrics.threatLevel === 'SUSPICIOUS'
          ? '🟡 Activité suspecte'
          : metrics.threatLevel === 'ELEVATED'
          ? '🟠 Menace élevée'
          : '🔴 RAID EN COURS';

      const detectors: string[] = [];
      const d = (on: boolean, label: string) => `${on ? '🟢' : '⚫'} ${label}`;
      detectors.push(d(raidCfg.joinRaid.enabled, 'Vague d\'arrivées'));
      detectors.push(d(raidCfg.messageRaid.enabled, 'Spam messages'));
      detectors.push(d(raidCfg.mentionRaid.enabled, 'Spam mentions'));
      detectors.push(d(raidCfg.botRaid.enabled && raidCfg.botRaid.blockUnwhitelistedBots, 'Bots non autorisés'));
      detectors.push(d(raidCfg.serverNuke.enabled, 'Nuke serveur'));
      detectors.push(d(raidCfg.accountAge.enabled, 'Comptes récents'));

      const embed = new EmbedBuilder()
        .setColor(levelColors[metrics.threatLevel] || BRAND_COLORS.success)
        .setAuthor({ name: `Anti-Raid — ${ctx.guild.name}`, iconURL: ctx.guild.iconURL({ size: 128 }) ?? undefined })
        .setDescription(`**${threatLine}** · Risk Score **${metrics.currentRiskScore}/100**`)
        .addFields(
          {
            name: 'Mode d\'urgence',
            value: metrics.raidModeActive ? '🔴 **RAID MODE ACTIF**' : 'Aucun',
            inline: true,
          },
          {
            name: 'Verrouillage',
            value: metrics.lockdownActive
              ? `🔴 ${metrics.lockedChannelsCount} salon${metrics.lockedChannelsCount > 1 ? 's' : ''} verrouillé${metrics.lockedChannelsCount > 1 ? 's' : ''}`
              : 'Aucun',
            inline: true,
          },
          {
            name: 'Activité (60 s)',
            value: `${metrics.joinsPerMinute} arrivées · ${metrics.messagesPerMinute} msg · ${metrics.mentionsPerMinute} mentions`,
            inline: false,
          },
          {
            name: 'Détecteurs',
            value: detectors.join('\n'),
            inline: false,
          }
        )
        .setFooter({ text: '/antiraid toggle · botprotection · trustbot · raidmode · lockdown' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'toggle') {
      const active = (ctx.interaction as ChatInputCommandInteraction).options.getBoolean('actif', true);
      raidConfigService.updateConfig(guildId, { enabled: active });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(active ? 'success' : 'neutral')
            .setDescription(
              active
                ? '🛡️ Anti-Raid **activé** sur ce serveur.'
                : '⚪ Anti-Raid **entièrement désactivé** sur ce serveur (plus aucune détection ni expulsion automatique).'
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'botprotection') {
      const active = (ctx.interaction as ChatInputCommandInteraction).options.getBoolean('actif', true);
      const current = raidConfigService.getConfig(guildId);
      raidConfigService.updateConfig(guildId, {
        botRaid: { ...current.botRaid, blockUnwhitelistedBots: active },
      });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(active ? 'success' : 'neutral')
            .setDescription(
              active
                ? "🤖 Les bots non autorisés seront **expulsés** en rejoignant (sauf s'ils sont invités par un admin)."
                : '🤖 Expulsion automatique des bots **désactivée**. Les bots peuvent rejoindre librement.'
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'trustbot') {
      const bot = (ctx.interaction as ChatInputCommandInteraction).options.getUser('bot', true);
      const current = raidConfigService.getConfig(guildId);
      const set = new Set(current.whitelist.trustedBotIds);
      const added = !set.has(bot.id);
      if (added) set.add(bot.id);
      else set.delete(bot.id);
      raidConfigService.updateWhitelist(guildId, { trustedBotIds: Array.from(set) });
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed('success')
            .setDescription(
              added
                ? `✅ **${bot.tag}** est maintenant un bot autorisé (ne sera plus expulsé).`
                : `✅ **${bot.tag}** a été retiré des bots autorisés.`
            ),
        ],
        ephemeral: true,
      });
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
