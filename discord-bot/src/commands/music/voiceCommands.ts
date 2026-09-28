import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type VoiceBasedChannel } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { config } from '../../config.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { lavalinkManager } from '../../modules/music/services/lavalinkManager.js';
import { voiceStayService } from '../../modules/music/services/voiceStayService.js';
import type { MusicSource } from '../../modules/music/types/music.js';
import { formatString, getTranslation, type TranslationDictionary } from '../../utils/i18n.js';

/**
 * /join · /disconnect · /voice-status — présence du bot dans un salon vocal, dont le mode
 * « 24h/24 » : le bot reste dans le salon choisi et y revient tout seul (voir voiceStayService).
 */

const sourceLabel = (source: MusicSource, t: TranslationDictionary): string => {
  const labels: Record<MusicSource, string> = {
    YOUTUBE: '▶️ YouTube',
    SOUNDCLOUD: '🟠 SoundCloud',
    SPOTIFY: '🟢 Spotify',
    DIRECT: t.vc_source_direct,
    CUSTOM: t.vc_source_custom,
  };
  return labels[source] ?? source;
};

const replyError = (ctx: CommandContext, msg: string) =>
  ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(msg)], ephemeral: true });

/** « 3 j 4 h 12 min » — au plus trois unités, la plus grande d'abord. */
function formatDuration(ms: number, t: TranslationDictionary): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} ${t.uptime_day_unit}`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (!d && !h && !m) parts.push(`${s} s`);
  return parts.slice(0, 3).join(' ');
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function progressBar(position: number, duration: number, t: TranslationDictionary, length = 16): string {
  if (!duration || duration <= 0) return t.vc_live_stream;
  const filled = Math.min(length, Math.max(0, Math.round((position / duration) * length)));
  return '▰'.repeat(filled) + '▱'.repeat(length - filled);
}

const megabytes = (bytes: number, t: TranslationDictionary): string => `${Math.round(bytes / 1024 / 1024)} ${t.vc_unit_mb}`;

/** « 3 titres » / « vide » — pluriel selon la langue du serveur. */
const trackCount = (n: number, t: TranslationDictionary): string =>
  n > 0 ? formatString(n > 1 ? t.vc_track_other : t.vc_track_one, { count: n }) : t.vc_queue_empty;

function canManageVoice(ctx: CommandContext): boolean {
  if (ctx.author.id === config.botOwnerId) return true;
  const perms = ctx.member?.permissions;
  return Boolean(perms?.has(PermissionFlagsBits.ManageGuild) || perms?.has(PermissionFlagsBits.MoveMembers));
}

const listenersIn = (channel: VoiceBasedChannel): number => channel.members.filter((m) => !m.user.bot).size;

function voicePing(guildId: string, t: TranslationDictionary): string {
  if (config.musicBackend !== 'lavalink') return t.vc_na;
  const ping = lavalinkManager.getPlayer(guildId)?.ping;
  return typeof ping === 'number' && ping >= 0 ? `${ping} ms` : t.vc_na;
}

export const joinCommand: Command = {
  name: 'join',
  description: 'Fait rejoindre le bot dans un salon vocal (et le garde 24h/24)',
  category: 'Musique',
  aliases: ['rejoindre'],
  slashData: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Fait rejoindre le bot dans un salon vocal et l\'y garde 24h/24')
    .addChannelOption((opt) =>
      opt
        .setName('salon')
        .setDescription('Salon vocal à rejoindre (par défaut : celui où tu es)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)
    ),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild || !ctx.member) return;
    const t = getTranslation(ctx.guildConfig.language);
    if (!canManageVoice(ctx)) {
      await replyError(ctx, t.vc_need_permission);
      return;
    }

    const pickedId = (ctx.interaction?.options.getChannel('salon') as { id: string } | null)?.id;
    const picked = pickedId ? ctx.guild.channels.cache.get(pickedId) : null;
    const target = (picked ?? ctx.member.voice?.channel ?? null) as VoiceBasedChannel | null;
    if (!target || !target.isVoiceBased()) {
      await replyError(ctx, t.vc_join_first);
      return;
    }

    const me = ctx.guild.members.me;
    const perms = me ? target.permissionsFor(me) : null;
    const missing: string[] = [];
    if (!perms?.has(PermissionFlagsBits.Connect)) missing.push(t.vc_perm_connect);
    if (!perms?.has(PermissionFlagsBits.Speak)) missing.push(t.vc_perm_speak);
    if (missing.length > 0) {
      await replyError(ctx, formatString(t.vc_missing_permission, { permissions: missing.join(`** ${t.vc_and} **`), channel: target.id }));
      return;
    }

    const permanent = true; // le bot ne quitte le vocal que sur /disconnect
    await ctx.deferReply();

    const player = musicService.getPlayer(ctx.guild.id, true);
    if (!player) {
      await replyError(ctx, t.vc_player_unavailable);
      return;
    }
    const alreadyThere = voiceStayService.isConnected(ctx.guild, target.id);
    const connected = alreadyThere ? true : await player.connect(target);
    if (!connected) {
      await replyError(ctx, formatString(t.vc_cannot_join, { channel: target.id }));
      return;
    }
    if (!alreadyThere || voiceStayService.getJoinedAt(ctx.guild.id) === null) voiceStayService.markJoined(ctx.guild.id);
    musicService.updateSettings(ctx.guild.id, { stayChannelId: permanent ? target.id : null });

    const embed = ctx
      .createEmbed('success')
      .setTitle(t.vc_connected_title)
      .setDescription(formatString(permanent ? t.vc_connected_desc_permanent : t.vc_connected_desc_temporary, { channel: target.id }))
      .addFields(
        { name: t.vc_field_channel, value: `<#${target.id}>`, inline: true },
        { name: t.vc_field_mode, value: permanent ? t.vc_mode_enabled : t.vc_mode_paused, inline: true },
        { name: t.vc_field_listeners, value: `${listenersIn(target)}`, inline: true },
        { name: t.vc_field_voice_latency, value: voicePing(ctx.guild.id, t), inline: true }
      );
    await ctx.reply({ embeds: [embed] });
  },
};

export const disconnectCommand: Command = {
  name: 'disconnect',
  description: 'Déconnecte le bot du salon vocal (et désactive le mode 24h/24)',
  category: 'Musique',
  aliases: ['deconnecter', 'dc'],
  slashData: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Déconnecte le bot du salon vocal et désactive le mode 24h/24'),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild || !ctx.member) return;
    const t = getTranslation(ctx.guildConfig.language);
    if (!canManageVoice(ctx)) {
      await replyError(ctx, t.vc_need_permission);
      return;
    }

    const gid = ctx.guild.id;
    const current = ctx.guild.members.me?.voice.channel ?? null;
    const stayId = voiceStayService.getStayChannelId(gid);
    if (!current && !stayId) {
      await ctx.reply({ embeds: [ctx.createEmbed('neutral').setDescription(t.vc_not_in_voice)], ephemeral: true });
      return;
    }

    const state = musicService.getState(gid);
    const joinedAt = voiceStayService.getJoinedAt(gid);
    const cleared = state.queueLength + (state.currentTrack ? 1 : 0);

    // Le mode 24h/24 est retiré AVANT de partir : sinon le service de surveillance ramènerait le bot.
    musicService.updateSettings(gid, { stayChannelId: null });
    musicService.getPlayer(gid, false)?.disconnect();
    voiceStayService.markLeft(gid);
    // Filet de sécurité : si Discord garde encore le bot dans le salon (session orpheline), on l'en retire.
    await ctx.guild.members.me?.voice.disconnect().catch(() => {});

    const where = current?.id ?? stayId;
    const embed = ctx
      .createEmbed('neutral')
      .setTitle(t.vc_disconnected_title)
      .setDescription(where ? formatString(t.vc_left_channel, { channel: where }) : t.vc_left_voice)
      .addFields(
        { name: t.vc_field_mode, value: t.vc_mode_disabled, inline: true },
        { name: t.vc_field_presence, value: joinedAt ? formatDuration(Date.now() - joinedAt, t) : t.vc_na, inline: true },
        { name: t.vc_field_queue_cleared, value: trackCount(cleared, t), inline: true }
      );
    await ctx.reply({ embeds: [embed] });
  },
};

export const voiceStatusCommand: Command = {
  name: 'voice-status',
  description: 'Affiche l\'état du bot dans le vocal : salon, mode 24h/24, lecture, latence et serveur audio',
  category: 'Musique',
  aliases: ['vstatus', 'vocal'],
  slashData: new SlashCommandBuilder()
    .setName('voice-status')
    .setDescription('État du bot dans le vocal : salon, mode 24h/24, lecture, latence et serveur audio'),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const t = getTranslation(ctx.guildConfig.language);
    const gid = ctx.guild.id;
    const guild = ctx.guild;
    const me = guild.members.me;
    const current = me?.voice.channel ?? null;
    const stayId = voiceStayService.getStayChannelId(gid);
    const state = musicService.getState(gid);
    const track = state.currentTrack;
    const connected = Boolean(current);

    const embed = ctx
      .createEmbed(connected ? 'success' : 'neutral')
      .setTitle(t.vc_status_title)
      .setDescription(
        connected
          ? formatString(t.vc_status_connected, { channel: current!.id })
          : stayId
            ? formatString(t.vc_status_offline, { channel: stayId })
            : t.vc_status_not_connected
      );

    const thumb = track?.thumbnail || ctx.client.user?.displayAvatarURL();
    if (thumb) embed.setThumbnail(thumb);

    const joinedAt = voiceStayService.getJoinedAt(gid);
    embed.addFields(
      {
        name: t.vc_field_mode,
        value: stayId ? formatString(t.vc_mode_active, { channel: stayId }) : t.vc_mode_inactive,
        inline: true,
      },
      {
        name: t.vc_field_connected_since,
        value: connected && joinedAt ? `<t:${Math.floor(joinedAt / 1000)}:R>` : '—',
        inline: true,
      },
      { name: t.vc_field_listeners, value: current ? `${listenersIn(current)}` : '—', inline: true }
    );

    if (track) {
      const statusIcon = state.status === 'PAUSED' ? '⏸️' : '▶️';
      embed.addFields({
        name: formatString(t.vc_field_playing, { icon: statusIcon }),
        value: [
          `**${track.title}** — ${track.artist}`,
          `${progressBar(state.position, state.duration, t)} \`${formatClock(state.position)} / ${state.duration ? formatClock(state.duration) : '∞'}\``,
          formatString(t.vc_requested_by, { source: sourceLabel(track.source, t), tag: track.requestedBy.tag }),
        ].join('\n'),
      });
    } else {
      embed.addFields({ name: formatString(t.vc_field_playing, { icon: '🎵' }), value: t.vc_nothing_playing });
    }

    embed.addFields(
      { name: t.vc_field_volume, value: state.muted ? t.vc_muted : `${state.volume}%`, inline: true },
      {
        name: t.vc_field_repeat,
        value: state.repeatMode === 'OFF' ? t.vc_repeat_off : state.repeatMode === 'SONG' ? t.vc_repeat_song : t.vc_repeat_queue,
        inline: true,
      },
      { name: t.vc_field_queue, value: trackCount(state.queueLength, t), inline: true },
      {
        name: t.vc_field_latency,
        value: formatString(t.vc_latency_value, { discord: Math.round(ctx.client.ws.ping), voice: voicePing(gid, t) }),
        inline: true,
      }
    );

    if (config.musicBackend === 'lavalink') {
      const node = lavalinkManager.getNodeStats();
      embed.addFields({
        name: t.vc_field_audio_server,
        value: node
          ? [
              formatString(t.vc_lavalink_line, {
                icon: node.connected ? '🟢' : '🔴',
                uptime: node.uptimeMs ? formatDuration(node.uptimeMs, t) : t.vc_na,
              }),
              `🧠 ${megabytes(node.memoryUsed, t)} / ${megabytes(node.memoryAllocated, t)} · ⚙️ CPU ${Math.round(node.cpuLavalink * 100)}%`,
              formatString(node.playing > 1 ? t.vc_players_other : t.vc_players_one, { playing: node.playing, players: node.players }),
            ].join('\n')
          : t.vc_lavalink_down,
        inline: true,
      });
    }

    const mem = process.memoryUsage();
    const guildCount = ctx.client.guilds.cache.size;
    embed.addFields({
      name: t.vc_field_bot,
      value: [
        `⏳ ${formatDuration(process.uptime() * 1000, t)}`,
        `🧠 ${megabytes(mem.rss, t)}`,
        formatString(guildCount > 1 ? t.vc_servers_other : t.vc_servers_one, { count: guildCount }),
      ].join('\n'),
      inline: true,
    });

    await ctx.reply({ embeds: [embed] });
  },
};
