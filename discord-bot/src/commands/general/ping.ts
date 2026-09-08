import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { GuildConfig } from '../../types/guildConfig.js';
import { baseEmbed } from '../../utils/embeds.js';

function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor((uptimeMs / 1000) % 60);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function buildPingMessage(client: Client, guildConfig: GuildConfig, apiLatencyMs: number) {
  const wsPing = client.ws.ping >= 0 ? client.ws.ping : 20;

  const wsStatus = wsPing < 60 ? '🟢 Excellent' : wsPing < 150 ? '🟡 Bon' : '🔴 Élevé';
  const apiStatus = apiLatencyMs < 80 ? '🟢 Ultra-rapide' : apiLatencyMs < 200 ? '🟡 Stable' : '🔴 Ralenti';

  const memUsage = process.memoryUsage();
  const heapUsedMb = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
  const uptimeStr = formatUptime(client.uptime || 0);

  const embed = baseEmbed(wsPing < 150 ? 'success' : 'error', {
    color: (wsPing < 150 ? guildConfig.successColor : guildConfig.errorColor) || null,
    footerText: `${guildConfig.botName} • Diagnostic temps réel`,
    footerIconURL: client.user?.displayAvatarURL(),
  })
    .setTitle('🏓 Télémétrie Réseau & Diagnostic')
    .setDescription(
      `Connexion active avec les serveurs Discord Gateway.\n` +
      `*Cliquez sur le bouton ci-dessous pour rafraîchir instantanément les mesures.*`
    )
    .addFields(
      {
        name: '⚡ Passerelle WebSocket',
        value: `\`${wsPing} ms\` (${wsStatus})`,
        inline: true,
      },
      {
        name: '🌐 API REST Discord',
        value: `\`${apiLatencyMs} ms\` (${apiStatus})`,
        inline: true,
      },
      {
        name: '⏱️ Disponibilité (Uptime)',
        value: `\`${uptimeStr}\``,
        inline: true,
      },
      {
        name: '🧠 Mémoire Dédiée',
        value: `\`${heapUsedMb} MB\` (Heap)`,
        inline: true,
      },
      {
        name: '🖥️ Shards Connectés',
        value: `\`Shard 0 / 1\` (Nominal)`,
        inline: true,
      },
      {
        name: '📡 Serveurs & Membres',
        value: `\`${client.guilds.cache.size}\` serv. / \`${client.users.cache.size}\` users`,
        inline: true,
      }
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ping_retest')
      .setLabel('Re-tester la latence')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

export const pingCommand: Command = {
  name: 'ping',
  description: 'Mesure la latence réseau Gateway et API REST avec diagnostic en direct',
  category: 'Général',
  aliases: ['latency', 'p', 'lag'],
  slashData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mesure la latence réseau Gateway et API REST avec diagnostic en direct'),
  execute: async (ctx: CommandContext) => {
    const start = Date.now();
    await ctx.deferReply();
    const latency = Date.now() - start;

    const payload = buildPingMessage(ctx.client, ctx.guildConfig, latency);
    await ctx.editReply(payload);
  },
};
