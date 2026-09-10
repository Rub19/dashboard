import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { autoModRepository } from '../storage/autoModRepository.js';
import { RuleTesterService } from '../services/ruleTesterService.js';
import { AutoModRiskEngine } from '../services/autoModRiskEngine.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';

export const automodCommand: Command = {
  name: 'automod',
  description: 'Modération automatique : statut, règles, test',
  category: 'Sécurité',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Centre AutoMod')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Affiche le statut et la configuration AutoMod')
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Teste un message dans le bac à sable sans appliquer de sanctions')
        .addStringOption((opt) =>
          opt.setName('message').setDescription('Message à simuler').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('smartmode')
        .setDescription('Active ou désactive le mode adaptatif intelligent')
        .addBooleanOption((opt) =>
          opt.setName('activer').setDescription('Activer (True) ou Désactiver (False)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription("Active ou désactive AutoMod dans son ensemble, ou un détecteur précis (anti-spam, liens, etc.)")
        .addStringOption((opt) =>
          opt
            .setName('module')
            .setDescription('Quoi activer/désactiver')
            .setRequired(true)
            .addChoices(
              { name: '🛡️ AutoMod (tout le moteur)', value: 'all' },
              { name: '💬 Anti-Spam', value: 'spam' },
              { name: '🌊 Anti-Flood (répétitions)', value: 'flood' },
              { name: '🔗 Filtre de Liens', value: 'links' },
              { name: '✉️ Filtre d\'Invitations Discord', value: 'invites' },
              { name: '📢 Anti-Mention Spam', value: 'mentions' },
              { name: '👻 Anti-Ghost Ping', value: 'ghostPing' },
              { name: '🔠 Anti-CAPS LOCK', value: 'caps' },
              { name: '🚫 Mots Interdits', value: 'keywords' },
              { name: '🧩 Règles Regex Personnalisées', value: 'regex' },
              { name: '👤 Filtre de Profils (pseudo/avatar)', value: 'profiles' },
              { name: '⚠️ Strikes & Sanctions Progressives', value: 'strikes' }
            )
        )
        .addBooleanOption((opt) =>
          opt.setName('activer').setDescription('Activer (True) ou Désactiver (False)').setRequired(true)
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

    const config = autoModRepository.getConfig(guildId);
    const rules = autoModRepository.getRules(guildId);

    // 1. STATUS
    if (sub === 'status') {
      const incidents = autoModRepository.getIncidents(guildId, 20);
      const recentRisk = incidents.slice(0, 10).reduce((sum, i) => sum + i.totalRiskScore, 0);
      const avgRisk = incidents.length > 0 ? Math.round(recentRisk / Math.min(10, incidents.length)) : 10;
      const riskLevel = AutoModRiskEngine.getRiskLevel(avgRisk);

      // Les détecteurs ont chacun leur propre flag `enabled`, indépendant de l'interrupteur
      // général `config.enabled`. Un détecteur "on" alors que le moteur est "off" est une
      // config valide (il s'activerait si on rallumait le moteur), mais afficher un simple
      // 🟢 dans ce cas donne l'illusion trompeuse que la protection est active. On distingue
      // donc "actif" (🟢, moteur ON) de "configuré mais non appliqué" (⚫, moteur OFF) tout
      // en gardant ⚪ pour "désactivé" dans les deux cas — l'info de config individuelle n'est
      // jamais perdue.
      const detectorEntries: Array<[string, boolean]> = [
        [t.automod_detector_spam, config.spam.enabled],
        [t.automod_detector_flood, config.flood.enabled],
        [t.automod_detector_links, config.links.enabled],
        [t.automod_detector_invites, config.invites.enabled],
        [t.automod_detector_mentions, config.mentions.enabled],
        [t.automod_detector_ghostping, config.ghostPing.enabled],
        [t.automod_detector_caps, config.caps.enabled],
        [t.automod_detector_keywords, config.keywords.enabled],
        [t.automod_detector_regex, config.regex.enabled],
        [t.automod_detector_profiles, config.profiles.enabled],
      ];
      const renderDetector = ([name, on]: [string, boolean]) => {
        if (!on) return `⚪ ${name}`;
        return config.enabled ? `🟢 ${name}` : `⚫ ${name}`;
      };
      const half = Math.ceil(detectorEntries.length / 2);
      const detectorsCol1 = detectorEntries.slice(0, half).map(renderDetector).join('\n');
      const detectorsCol2 = detectorEntries.slice(half).map(renderDetector).join('\n');

      const embed = ctx
        .createEmbed(config.enabled ? 'success' : 'neutral')
        .setTitle(formatString(t.automod_status_title, { guildName: ctx.guild.name }))
        .setThumbnail(ctx.guild.iconURL({ size: 128 }) ?? null)
        .addFields(
          {
            name: t.automod_status_field_protection,
            value: config.enabled ? t.automod_status_active : t.automod_status_inactive,
            inline: true,
          },
          {
            name: t.automod_status_field_smartmode,
            value: config.smartMode ? t.automod_smartmode_on : t.automod_smartmode_standard,
            inline: true,
          },
          {
            name: t.automod_status_field_risk,
            value: `\`${riskLevel}\` (~${avgRisk}/100)`,
            inline: true,
          },
          {
            name: t.automod_status_field_rules,
            value: formatString(t.automod_status_rules_value, { count: rules.length }),
            inline: true,
          },
          {
            name: t.automod_status_field_strikes,
            value: formatString(t.automod_status_strikes_value, { count: config.strikes.progressiveSteps.length }),
            inline: true,
          },
          {
            name: '​',
            value: '​',
            inline: true,
          },
          {
            name: t.automod_status_field_detectors,
            value: detectorsCol1,
            inline: true,
          },
          {
            name: '​',
            value: detectorsCol2,
            inline: true,
          }
        );

      if (!config.enabled) {
        embed.setDescription(t.automod_status_disabled_notice);
      }

      embed.setFooter({ text: t.automod_status_footer }).setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    // 2. TEST
    if (sub === 'test') {
      let testMsg = '';
      if (isSlash) {
        const interaction = ctx.interaction as ChatInputCommandInteraction;
        testMsg = interaction.options.getString('message') || '';
      } else {
        testMsg = ctx.args.slice(1).join(' ');
      }

      if (!testMsg) {
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.automod_test_missing_message)], ephemeral: true });
        return;
      }

      const result = RuleTesterService.testMessage({
        guildId,
        messageContent: testMsg,
        userId: ctx.author.id,
        channelId: ctx.channel?.id,
      });

      const embed = ctx
        .createEmbed(result.totalRiskScore > 40 ? 'error' : 'success')
        .setTitle(t.automod_test_title)
        .addFields(
          {
            name: t.automod_test_field_message,
            value: `\`\`\`${testMsg.slice(0, 300)}\`\`\``,
            inline: false,
          },
          {
            name: t.automod_test_field_score,
            value: formatString(t.automod_test_score_value, { score: result.totalRiskScore, level: result.riskLevel }),
            inline: true,
          },
          {
            name: t.automod_test_field_actions,
            value: result.actionsToExecute.length > 0 ? result.actionsToExecute.map((a) => `\`${a}\``).join(', ') : t.automod_test_no_action,
            inline: true,
          },
          {
            name: t.automod_test_field_strikes_added,
            value: `+${result.wouldAddStrikes}`,
            inline: true,
          },
          {
            name: t.automod_test_field_detectors_triggered,
            value: result.matchedDetectors.length > 0 ? result.matchedDetectors.join(', ') : t.automod_test_detectors_none,
            inline: true,
          },
          {
            name: t.automod_status_field_rules,
            value: result.matchedCustomRules.length > 0 ? result.matchedCustomRules.join(', ') : t.automod_test_rules_none,
            inline: true,
          }
        )
        .setFooter({ text: t.automod_test_footer })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
      return;
    }

    // 3. SMART MODE
    if (sub === 'smartmode') {
      let active = false;
      if (isSlash) {
        const interaction = ctx.interaction as ChatInputCommandInteraction;
        active = interaction.options.getBoolean('activer') || false;
      } else {
        active = ctx.args[1]?.toLowerCase() === 'on' || ctx.args[1]?.toLowerCase() === 'true';
      }

      autoModRepository.updateConfig(guildId, { smartMode: active });
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(active ? t.automod_smartmode_toggle_on : t.automod_smartmode_toggle_off)],
      });
      return;
    }

    // 4. TOGGLE (moteur entier ou détecteur précis)
    if (sub === 'toggle') {
      let moduleKey = '';
      let active = false;
      if (isSlash) {
        const interaction = ctx.interaction as ChatInputCommandInteraction;
        moduleKey = interaction.options.getString('module', true);
        active = interaction.options.getBoolean('activer', true);
      } else {
        moduleKey = ctx.args[1] || '';
        active = ctx.args[2]?.toLowerCase() === 'on' || ctx.args[2]?.toLowerCase() === 'true';
      }

      const moduleLabels: Record<string, string> = {
        all: t.automod_toggle_label_all,
        spam: t.automod_toggle_label_spam,
        flood: t.automod_toggle_label_flood,
        links: t.automod_toggle_label_links,
        invites: t.automod_toggle_label_invites,
        mentions: t.automod_toggle_label_mentions,
        ghostPing: t.automod_toggle_label_ghostping,
        caps: t.automod_toggle_label_caps,
        keywords: t.automod_toggle_label_keywords,
        regex: t.automod_toggle_label_regex,
        profiles: t.automod_toggle_label_profiles,
        strikes: t.automod_toggle_label_strikes,
      };

      const label = moduleLabels[moduleKey];
      if (!label) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(formatString(t.automod_toggle_unknown_module, { module: moduleKey }))],
          ephemeral: true,
        });
        return;
      }

      // Toggle du moteur AutoMod entier (champ racine, pas un sous-objet détecteur)
      if (moduleKey === 'all') {
        autoModRepository.updateConfig(guildId, { enabled: active });
      } else {
        // Fusion superficielle dans updateConfig() : on doit repartir de l'objet
        // détecteur EXISTANT et n'écraser que `enabled`, sinon Zod réinitialiserait
        // silencieusement tous les autres réglages du détecteur (seuils, actions,
        // listes blanches/noires...) à leurs valeurs par défaut.
        const currentDetector = (config as Record<string, unknown>)[moduleKey] as Record<string, unknown> | undefined;
        autoModRepository.updateConfig(guildId, {
          [moduleKey]: { ...(currentDetector || {}), enabled: active },
        } as Partial<typeof config>);
      }

      await ctx.reply({
        embeds: [
          ctx.createEmbed('success').setDescription(
            formatString(t.automod_toggle_success, {
              emoji: active ? '🟢' : '⚪',
              label,
              state: active ? t.automod_toggle_state_on : t.automod_toggle_state_off,
            }) + (moduleKey !== 'all' && !config.enabled ? t.automod_toggle_disabled_note : '')
          ),
        ],
      });
      return;
    }

    await ctx.reply({
      embeds: [ctx.createEmbed('info').setDescription(t.automod_usage_fallback)],
      ephemeral: true,
    });
  },
};
