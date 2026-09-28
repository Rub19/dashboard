import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { formatString, getTranslation } from '../../utils/i18n.js';

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

    switch (subcommand) {
      case 'ping': {
        const start = Date.now();
        await ctx.deferReply();
        const latency = Date.now() - start;

        const embed = ctx
          .createEmbed('info')
          .setTitle(t.bot_ping_title)
          .setDescription(formatString(t.bot_ping_desc, { ws: wsPing, latency }))
          .setTimestamp();

        await ctx.reply({ embeds: [embed], components: [actionRow] });
        break;
      }

      case 'info': {
        const embed = ctx
          .createEmbed('default')
          .setTitle(`🤖 ${ctx.guildConfig.botName} • Bot Control Center`)
          .setDescription(formatString(t.bot_info_long_desc, { botName: ctx.guildConfig.botName }))
          .addFields(
            {
              name: t.bot_field_version,
              value: t.bot_field_version_value,
              inline: true,
            },
            {
              name: t.bot_field_global_stats,
              value: formatString(t.bot_global_stats_value, { guilds: guildCount, users: userCount }),
              inline: true,
            },
            {
              name: t.bot_field_availability,
              value: formatString(t.bot_availability_value, { uptime: formattedUptime, ws: wsPing }),
              inline: true,
            },
            {
              name: t.bot_field_config,
              value: formatString(t.bot_config_value, {
                prefix: ctx.guildConfig.prefix,
                visibility: ctx.guildConfig.responseVisibility === 'EPHEMERAL' ? t.bot_visibility_private : t.bot_visibility_public,
                style: ctx.guildConfig.botPersonality || 'FRIENDLY',
              }),
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
          .setTitle(`${t.bot_status_title} • ${ctx.guildConfig.botName}`)
          .setDescription(t.bot_status_desc)
          .addFields(
            {
              name: t.bot_field_subsystems,
              value: formatString(t.bot_subsystems_value, { ws: wsPing, style: ctx.guildConfig.botPersonality || 'FRIENDLY' }),
              inline: false,
            },
            {
              name: t.bot_field_memory,
              value: formatString(t.bot_memory_value, { used: heapUsedMb, total: heapTotalMb, rss: rssMb, uptime: formattedUptime }),
              inline: true,
            },
            {
              name: t.bot_field_load,
              value: formatString(t.bot_load_value, { guilds: guildCount, users: userCount }),
              inline: true,
            }
          )
          .setFooter({
            text: `${ctx.guildConfig.botName} • ${t.bot_footer_control} • ethone.dev/discord/bot`,
            iconURL: client.user?.displayAvatarURL(),
          });

        await ctx.reply({ embeds: [embed], components: [actionRow] });
        break;
      }
    }
  },
};
