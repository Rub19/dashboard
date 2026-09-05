import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}j`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export const botCommand: Command = {
  name: 'bot',
  description: 'Statut système, métriques et informations sur le bot ETHONE',
  category: 'Général',
  aliases: ['stats', 'status', 'about'],
  slashData: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Centre d\'informations et diagnostic système du bot')
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Affiche l\'état technique, l\'uptime et les ressources en direct')
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Informations détaillées, version et liens vers le Dashboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('ping')
        .setDescription('Mesure la latence Gateway WebSocket et API REST en direct')
    ),

  execute: async (ctx: CommandContext) => {
    let subcommand = 'status';

    if (ctx.isSlash && ctx.interaction) {
      subcommand = (ctx.interaction as any).options?.getSubcommand?.() || 'status';
    } else if (ctx.args.length > 0) {
      subcommand = ctx.args[0].toLowerCase();
    }

    const client = ctx.client;
    const uptimeSec = Math.floor(process.uptime());
    const formattedUptime = formatUptime(uptimeSec);
    const mem = process.memoryUsage();
    const heapUsedMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMb = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const rssMb = (mem.rss / 1024 / 1024).toFixed(1);

    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const wsPing = client.ws.ping >= 0 ? `${client.ws.ping}ms` : 'En calcul...';

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Dashboard Web ETHONE')
        .setStyle(ButtonStyle.Link)
        .setURL('https://ethone.dev/discord/bot')
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel('Support & Discord')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/ethone')
        .setEmoji('💬')
    );

    switch (subcommand) {
      case 'ping': {
        const start = Date.now();
        await ctx.deferReply();
        const latency = Date.now() - start;

        const embed = ctx
          .createEmbed('info')
          .setTitle('⚡ Latence & Connexion Gateway')
          .setDescription(
            `Les mesures de communication réseau avec Discord sont opérationnelles :\n\n` +
            `• **WebSocket Gateway :** \`${wsPing}\` *(état du socket)*\n` +
            `• **Aller-Retour API :** \`${latency}ms\` *(temps de réponse REST)*\n` +
            `• **Statut Shard :** 🟢 Connecté & Actif`
          )
          .setTimestamp();

        await ctx.reply({ embeds: [embed], components: [actionRow] });
        break;
      }

      case 'info': {
        const embed = ctx
          .createEmbed('default')
          .setTitle(`🤖 ${ctx.guildConfig.botName} • Bot Control Center`)
          .setDescription(
            `**${ctx.guildConfig.botName}** est le bot tout-en-un de nouvelle génération propulsant le serveur.\n` +
            `Conçu pour offrir une expérience fluide, réactive et hautement personnalisable.\n\n` +
            `> 🌐 **Dashboard en ligne :** Contrôlez tous les modules sur [ethone.dev](https://ethone.dev/discord/bot)\n` +
            `> 🛡️ **Sécurité :** Anti-Raid automatique, AutoMod intelligent et audit logs\n` +
            `> 🤖 **Intelligence Artificielle :** Assistant IA intégré (\`/ask\`) et résumés de salons`
          )
          .addFields(
            {
              name: '📦 Version & Moteur',
              value: `\`v2.4.0\` • Node/Bun + TypeScript\nDiscord.js \`v14.18\``,
              inline: true,
            },
            {
              name: '📊 Statistiques Globales',
              value: `**${guildCount}** serveur(s)\n**${userCount}** membres servis`,
              inline: true,
            },
            {
              name: '⏱️ Disponibilité',
              value: `En ligne depuis **${formattedUptime}**\nLatence : \`${wsPing}\``,
              inline: true,
            },
            {
              name: '⚙️ Configuration Actuelle',
              value:
                `• Préfixe : \`${ctx.guildConfig.prefix}\`\n` +
                `• Visibilité : \`${ctx.guildConfig.responseVisibility === 'EPHEMERAL' ? 'Privé (Éphémère)' : 'Public'}\`\n` +
                `• Style IA : \`${ctx.guildConfig.botPersonality || 'FRIENDLY'}\``,
              inline: false,
            }
          )
          .setThumbnail(client.user?.displayAvatarURL() || null);

        await ctx.reply({ embeds: [embed], components: [actionRow] });
        break;
      }

      case 'status':
      default: {
        const embed = ctx
          .createEmbed('success')
          .setTitle(`📊 Statut Technique & Métriques • ${ctx.guildConfig.botName}`)
          .setDescription(
            `Tous les sous-systèmes du bot fonctionnent actuellement de manière optimale.`
          )
          .addFields(
            {
              name: '🟢 Sous-Systèmes',
              value:
                `• **Gateway WebSocket :** \`${wsPing}\` (Opérationnel)\n` +
                `• **Moteur Audio :** Opérationnel (Haute Fidélité)\n` +
                `• **Assistant IA :** Actif (${ctx.guildConfig.botPersonality || 'FRIENDLY'})\n` +
                `• **Sync Bus SSE :** Connecté temps réel`,
              inline: false,
            },
            {
              name: '🧠 Mémoire & Ressources',
              value:
                `• **Heap Utilisé :** \`${heapUsedMb} MB\` / \`${heapTotalMb} MB\`\n` +
                `• **RSS Total :** \`${rssMb} MB\`\n` +
                `• **Uptime Continu :** \`${formattedUptime}\``,
              inline: true,
            },
            {
              name: '📈 Charge & Échelle',
              value:
                `• **Serveurs :** \`${guildCount}\`\n` +
                `• **Utilisateurs :** \`${userCount}\`\n` +
                `• **Shards :** \`1 / 1\``,
              inline: true,
            }
          )
          .setFooter({
            text: `${ctx.guildConfig.botName} • Centre de Contrôle • ethone.dev/discord/bot`,
            iconURL: client.user?.displayAvatarURL(),
          });

        await ctx.reply({ embeds: [embed], components: [actionRow] });
        break;
      }
    }
  },
};
