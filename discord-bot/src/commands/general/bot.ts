import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { formatString, getTranslation } from '../../utils/i18n.js';
import { container, footer, sectionWithThumbnail, separator, text } from '../../utils/components.js';
import { BRAND_RED, icon, v2Container } from '../../utils/v2.js';

function formatUptime(seconds: number, dayUnit: string): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}${dayUnit}`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export const botCommand: Command = {
  name: 'bot',
  description: 'Statut système, métriques et informations sur le bot ETHONE',
  category: 'Général',
  // NOTE: "status" was previously listed here, but it collides with the real,
  // unrelated /status command (admin/statusCommand.ts, Bot Owner presence
  // control) and always resolved to this handler instead — crashing with
  // CommandInteractionOptionNoSubcommand whenever /status was actually
  // invoked. Removed; use /bot status, !botstats, or !about instead.
  aliases: ['botstats', 'about'],
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
      // getSubcommand() defaults to required=true and throws
      // (CommandInteractionOptionNoSubcommand) when the interaction has none —
      // pass false so a missing subcommand falls back to 'status' below
      // instead of crashing the interaction handler.
      subcommand = (ctx.interaction as any).options?.getSubcommand?.(false) || 'status';
    } else if (ctx.args.length > 0) {
      subcommand = ctx.args[0].toLowerCase();
    }

    const t = getTranslation(ctx.guildConfig.language);
    const client = ctx.client;
    const uptimeSec = Math.floor(process.uptime());
    const formattedUptime = formatUptime(uptimeSec, t.uptime_day_unit);
    const mem = process.memoryUsage();
    const heapUsedMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMb = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const rssMb = (mem.rss / 1024 / 1024).toFixed(1);

    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const wsPing = client.ws.ping >= 0 ? `${client.ws.ping}ms` : t.bot_ws_calculating;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(t.bot_btn_dashboard)
        .setStyle(ButtonStyle.Link)
        .setURL('https://ethone.dev/discord/bot')
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel(t.bot_btn_support)
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/ethone')
        .setEmoji('💬')
    );

    const field = (name: string, value: string) => text(`**${name}**
${value}`);
    const send = (card: ContainerBuilder) => ctx.reply({ components: [card], componentsV2: true });

    switch (subcommand) {
      case 'ping': {
        const start = Date.now();
        await ctx.deferReply();
        const latency = Date.now() - start;
        await send(v2Container(`${icon('info', '🏓')} ${t.bot_ping_title}`, [text(formatString(t.bot_ping_desc, { ws: wsPing, latency })), separator(false), actionRow]));
        break;
      }

      case 'info': {
        const visibility = ctx.guildConfig.responseVisibility === 'EPHEMERAL' ? t.bot_visibility_private : t.bot_visibility_public;
        await send(
          container(BRAND_RED, [
            sectionWithThumbnail(
              [`## ${icon('ethone', '🤖')} ${ctx.guildConfig.botName} • Bot Control Center`, formatString(t.bot_info_long_desc, { botName: ctx.guildConfig.botName })],
              client.user?.displayAvatarURL() || 'https://ethone.dev/icons/ethone-icon-512.png?v=r2',
              ctx.guildConfig.botName,
            ),
            separator(),
            field(t.bot_field_version, t.bot_field_version_value),
            field(t.bot_field_global_stats, formatString(t.bot_global_stats_value, { guilds: guildCount, users: userCount })),
            field(t.bot_field_availability, formatString(t.bot_availability_value, { uptime: formattedUptime, ws: wsPing })),
            separator(false),
            field(t.bot_field_config, formatString(t.bot_config_value, { prefix: ctx.guildConfig.prefix, visibility, style: ctx.guildConfig.botPersonality || 'FRIENDLY' })),
            separator(false),
            actionRow,
          ]),
        );
        break;
      }

      case 'status':
      default: {
        await send(
          v2Container(`${icon('success', '✅')} ${t.bot_status_title} • ${ctx.guildConfig.botName}`, [
            text(t.bot_status_desc),
            separator(false),
            field(t.bot_field_subsystems, formatString(t.bot_subsystems_value, { ws: wsPing, style: ctx.guildConfig.botPersonality || 'FRIENDLY' })),
            field(t.bot_field_memory, formatString(t.bot_memory_value, { used: heapUsedMb, total: heapTotalMb, rss: rssMb, uptime: formattedUptime })),
            field(t.bot_field_load, formatString(t.bot_load_value, { guilds: guildCount, users: userCount })),
            separator(false),
            actionRow,
            footer(`${ctx.guildConfig.botName} • ${t.bot_footer_control} • ethone.dev/discord/bot`),
          ]),
        );
        break;
      }
    }
  },
};
