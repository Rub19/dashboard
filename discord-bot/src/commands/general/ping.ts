import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { GuildConfig } from '../../types/guildConfig.js';
import { baseEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

function formatUptime(uptimeMs: number, dayUnit: string): string {
  const seconds = Math.floor((uptimeMs / 1000) % 60);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}${dayUnit}`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function buildPingMessage(client: Client, guildConfig: GuildConfig, apiLatencyMs: number) {
  const t = getTranslation(guildConfig.language);
  const wsPing = client.ws.ping >= 0 ? client.ws.ping : 20;

  const wsStatus = wsPing < 60 ? t.ping_status_excellent : wsPing < 150 ? t.ping_status_good : t.ping_status_high;
  const apiStatus = apiLatencyMs < 80 ? t.ping_api_fast : apiLatencyMs < 200 ? t.ping_api_stable : t.ping_api_slow;

  const memUsage = process.memoryUsage();
  const heapUsedMb = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
  const uptimeStr = formatUptime(client.uptime || 0, t.uptime_day_unit);

  const embed = baseEmbed(wsPing < 150 ? 'success' : 'error', {
    color: (wsPing < 150 ? guildConfig.successColor : guildConfig.errorColor) || null,
    footerText: `${guildConfig.botName} • ${t.ping_footer}`,
    footerIconURL: client.user?.displayAvatarURL(),
  })
    .setTitle(t.ping_title)
    .setDescription(t.ping_desc)
    .addFields(
      {
        name: t.ping_field_ws,
        value: `\`${wsPing} ms\` (${wsStatus})`,
        inline: true,
      },
      {
        name: t.ping_field_api,
        value: `\`${apiLatencyMs} ms\` (${apiStatus})`,
        inline: true,
      },
      {
        name: t.ping_field_uptime,
        value: `\`${uptimeStr}\``,
        inline: true,
      },
      {
        name: t.ping_field_memory,
        value: `\`${heapUsedMb} MB\` (Heap)`,
        inline: true,
      },
      {
        name: t.ping_field_shards,
        value: t.ping_shards_value,
        inline: true,
      },
      {
        name: t.ping_field_servers,
        value: formatString(t.ping_servers_value, { guilds: client.guilds.cache.size, users: client.users.cache.size }),
        inline: true,
      }
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ping_retest')
      .setLabel(t.ping_retest_label)
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
