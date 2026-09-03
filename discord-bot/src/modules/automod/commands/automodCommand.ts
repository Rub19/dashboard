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
            name: '⚡ Détecteurs Intégrés',
            value: 'Spam, Flood, Links, Invites, Mentions, GhostPing, Caps, Mots, Regex',
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
        await ctx.reply({ content: 'Veuillez préciser le message de test.', ephemeral: true });
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
        content: `🧠 **Smart Mode ${active ? 'ACTIVÉ' : 'DÉSACTIVÉ'} !** ${
          active
            ? 'Les seuils s’ajusteront automatiquement en cas d’attaque et selon le flux d’événements.'
            : 'Seuils statiques normaux appliqués.'
        }`,
      });
      return;
    }

    await ctx.reply({
      content: 'Usage : `/automod status`, `/automod test <message>`, `/automod smartmode <activer>`',
      ephemeral: true,
    });
  },
};
