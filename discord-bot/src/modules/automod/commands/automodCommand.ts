import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { autoModRepository } from '../storage/autoModRepository.js';
import { RuleTesterService } from '../services/ruleTesterService.js';
import { AutoModRiskEngine } from '../services/autoModRiskEngine.js';

export const automodCommand: Command = {
  name: 'automod',
  description: 'Gestion et diagnostic du moteur AutoMod 2.0 (Smart Moderation)',
  category: 'Sécurité',
  userPermissions: [PermissionFlagsBits.Administrator],
  slashData: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Centre de contrôle AutoMod 2.0')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Affiche le statut et la configuration du moteur AutoMod 2.0')
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
    if (!ctx.guild) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Cette commande est réservée aux serveurs.')], ephemeral: true });
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

      const embed = new EmbedBuilder()
        .setTitle(`🤖 AutoMod 2.0 — ${ctx.guild.name}`)
        .setColor(config.enabled ? 0x10b981 : 0x6b7280)
        .addFields(
          {
            name: '🛡️ Protection',
            value: config.enabled ? '🟢 **ACTIVE**' : '⚪ Désactivée',
            inline: true,
          },
          {
            name: '🧠 Smart Mode',
            value: config.smartMode ? '✨ **Activé**' : '⚪ Standard',
            inline: true,
          },
          {
            name: '📊 Niveau de Risque',
            value: `\`${riskLevel}\` (~${avgRisk}/100)`,
            inline: true,
          },
          {
            name: '📋 Règles Personnalisées',
            value: `**${rules.length}** règle(s)`,
            inline: true,
          },
          {
            name: '⚡ Détecteurs',
            value: [
              ['💬 Anti-Spam', config.spam.enabled],
              ['🌊 Anti-Flood', config.flood.enabled],
              ['🔗 Liens', config.links.enabled],
              ["✉️ Invitations", config.invites.enabled],
              ['📢 Mentions', config.mentions.enabled],
              ['👻 Ghost Ping', config.ghostPing.enabled],
              ['🔠 CAPS', config.caps.enabled],
              ['🚫 Mots Interdits', config.keywords.enabled],
              ['🧩 Regex', config.regex.enabled],
              ['👤 Profils', config.profiles.enabled],
            ]
              .map(([name, on]) => `${on ? '🟢' : '⚪'} ${name}`)
              .join('\n'),
            inline: true,
          },
          {
            name: '⚠️ Échelle de Strikes',
            value: `${config.strikes.progressiveSteps.length} paliers configurés`,
            inline: true,
          }
        )
        .setFooter({ text: 'ETHONE Smart Moderation • Dashboard disponible sur /discord/moderation/automod' })
        .setTimestamp();

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
        await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Veuillez préciser le message de test.')], ephemeral: true });
        return;
      }

      const result = RuleTesterService.testMessage({
        guildId,
        messageContent: testMsg,
        userId: ctx.author.id,
        channelId: ctx.channel?.id,
      });

      const embed = new EmbedBuilder()
        .setTitle('🧪 AutoMod Sandbox — Test de Règle')
        .setColor(result.totalRiskScore > 40 ? 0xef4444 : 0x10b981)
        .addFields(
          {
            name: '📝 Message Testé',
            value: `\`\`\`${testMsg.slice(0, 300)}\`\`\``,
            inline: false,
          },
          {
            name: '📊 Risk Score Simulé',
            value: `**${result.totalRiskScore}/100** (\`${result.riskLevel}\`)`,
            inline: true,
          },
          {
            name: '⚡ Actions Simulées',
            value: result.actionsToExecute.length > 0 ? result.actionsToExecute.map((a) => `\`${a}\``).join(', ') : 'Aucune action',
            inline: true,
          },
          {
            name: '⚠️ Strikes Ajoutés',
            value: `+${result.wouldAddStrikes}`,
            inline: true,
          },
          {
            name: '🔍 Détecteurs Déclenchés',
            value: result.matchedDetectors.length > 0 ? result.matchedDetectors.join(', ') : 'Aucun',
            inline: true,
          },
          {
            name: '📋 Règles Personnalisées',
            value: result.matchedCustomRules.length > 0 ? result.matchedCustomRules.join(', ') : 'Aucune',
            inline: true,
          }
        )
        .setFooter({ text: 'Simulation bac à sable : Aucune sanction n’a été appliquée' })
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
        embeds: [ctx.createEmbed('success').setDescription(`🧠 **Smart Mode ${active ? 'ACTIVÉ' : 'DÉSACTIVÉ'} !** ${
          active
            ? 'Les seuils s’ajusteront automatiquement en cas d’attaque et selon le flux d’événements.'
            : 'Seuils statiques normaux appliqués.'
        }`)],
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
        all: 'AutoMod (moteur entier)',
        spam: 'Anti-Spam',
        flood: 'Anti-Flood',
        links: 'Filtre de Liens',
        invites: "Filtre d'Invitations",
        mentions: 'Anti-Mention Spam',
        ghostPing: 'Anti-Ghost Ping',
        caps: 'Anti-CAPS LOCK',
        keywords: 'Mots Interdits',
        regex: 'Règles Regex',
        profiles: 'Filtre de Profils',
        strikes: 'Strikes & Sanctions Progressives',
      };

      const label = moduleLabels[moduleKey];
      if (!label) {
        await ctx.reply({
          embeds: [ctx.createEmbed('error').setDescription(`❌ Module inconnu : \`${moduleKey}\`.`)],
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
            `${active ? '🟢' : '⚪'} **${label}** ${active ? 'activé' : 'désactivé'}.` +
              (moduleKey !== 'all' && !config.enabled
                ? '\n⚠️ Note : le moteur AutoMod global est actuellement désactivé (`/automod toggle module:all activer:True` pour le réactiver) — ce réglage ne prendra effet qu\'une fois AutoMod réactivé.'
                : '')
          ),
        ],
      });
      return;
    }

    await ctx.reply({
      embeds: [ctx.createEmbed('info').setDescription('Usage : `/automod status`, `/automod test <message>`, `/automod smartmode <activer>`, `/automod toggle <module> <activer>`')],
      ephemeral: true,
    });
  },
};
