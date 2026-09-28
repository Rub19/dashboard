import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  GuildMember,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { musicProviderManager } from '../../modules/music/providers/musicProvider.js';
import type { Track } from '../../modules/music/types/music.js';
import { baseEmbed, noticeEmbed } from '../../utils/embeds.js';
import { formatString, getTranslation } from '../../utils/i18n.js';
import { guildConfigService } from '../../services/guildConfigService.js';

/**
 * /playlist <lien> : affiche TOUS les titres d'une playlist / album Spotify
 * (ou YouTube), avec un menu pour en choisir un, ou tout lancer / tout mélanger.
 * Les listes sont gardées en mémoire 30 min (une session par message).
 */
const PAGE_SIZE = 20;
const TTL_MS = 30 * 60_000;
const MAX_SESSIONS = 200;

interface Session {
  userId: string;
  guildId: string;
  url: string;
  tracks: Track[];
  page: number;
  createdAt: number;
}

const sessions = new Map<string, Session>();

function cleanup(): void {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.createdAt > TTL_MS) sessions.delete(id);
  while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value as string);
}

const fmt = (s: number): string => (s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '—');
const clip = (t: string, n: number): string => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

function render(sid: string, s: Session) {
  const t = getTranslation(guildConfigService.getConfig(s.guildId).language);
  const pages = Math.max(1, Math.ceil(s.tracks.length / PAGE_SIZE));
  const start = s.page * PAGE_SIZE;
  const slice = s.tracks.slice(start, start + PAGE_SIZE);
  const total = s.tracks.reduce((a, tr) => a + (tr.duration || 0), 0);

  const embed = baseEmbed('primary')
    .setTitle(`🎶 ${clip(s.tracks[0]?.album || t.plb_default_title, 200)}`)
    .setDescription(
      slice
        .map((tr, i) => `\`${String(start + i + 1).padStart(3, ' ')}\` **${clip(tr.title, 60)}** — ${clip(tr.artist, 40)} \`${fmt(tr.duration)}\``)
        .join('\n') || t.plb_no_tracks
    )
    .setFooter({ text: formatString(t.plb_footer, { count: s.tracks.length, minutes: Math.round(total / 60), page: s.page + 1, pages }) });
  if (s.tracks[0]?.thumbnail) embed.setThumbnail(s.tracks[0].thumbnail);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`plbrowse:${sid}:pick`)
    .setPlaceholder(t.plb_pick_placeholder)
    .addOptions(
      slice.map((tr, i) => ({
        label: clip(`${start + i + 1}. ${tr.title}`, 100),
        description: clip(tr.artist, 100),
        value: String(start + i),
      }))
    );

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:prev`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(s.page === 0),
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:next`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(s.page >= pages - 1),
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:all`).setLabel(t.plb_btn_all).setEmoji('🎵').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:shuffle`).setLabel(t.plb_btn_shuffle).setEmoji('🔀').setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), nav],
  };
}

export const playlistCommand: Command = {
  name: 'playlist',
  description: 'Affiche les titres d\'une playlist Spotify / YouTube et choisis lequel jouer',
  category: 'Musique',
  slashData: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Affiche les titres d\'une playlist Spotify / YouTube et choisis lequel jouer')
    .addStringOption((opt) =>
      opt.setName('lien').setDescription('Lien de playlist ou d\'album (Spotify, YouTube)').setRequired(true)
    ),
  execute: async (ctx: CommandContext) => {
    if (!ctx.guild) return;
    const t = getTranslation(ctx.guildConfig.language);
    const url = String(((ctx.interaction as any)?.options?.getString('lien') as string | undefined) ?? ctx.args[0] ?? '').trim();
    if (!/^https?:\/\//i.test(url)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.plb_need_link)], ephemeral: true });
      return;
    }
    await ctx.deferReply();
    const tracks = await musicProviderManager.resolveMany(url, {
      id: ctx.author.id,
      tag: ctx.author.tag,
      avatar: ctx.author.displayAvatarURL?.() ?? null,
    });
    if (tracks.length === 0) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.plb_unreadable)] });
      return;
    }
    cleanup();
    const sid = Math.random().toString(36).slice(2, 10);
    const session: Session = { userId: ctx.author.id, guildId: ctx.guild.id, url, tracks, page: 0, createdAt: Date.now() };
    sessions.set(sid, session);
    await ctx.reply(render(sid, session));
  },
};

async function ownerCheck(interaction: ButtonInteraction | StringSelectMenuInteraction, s: Session | undefined): Promise<Session | null> {
  const t = getTranslation(guildConfigService.getConfig(interaction.guildId).language);
  if (!s) {
    await interaction.reply({ embeds: [noticeEmbed('error', t.plb_expired)], flags: MessageFlags.Ephemeral });
    return null;
  }
  if (interaction.user.id !== s.userId) {
    await interaction.reply({ embeds: [noticeEmbed('error', t.plb_not_owner)], flags: MessageFlags.Ephemeral });
    return null;
  }
  return s;
}

export async function handlePlaylistBrowser(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
  const [, sid, action] = interaction.customId.split(':');
  const t = getTranslation(guildConfigService.getConfig(interaction.guildId).language);
  const s = await ownerCheck(interaction, sessions.get(sid));
  if (!s || !interaction.guild) return;

  if (action === 'prev' || action === 'next') {
    s.page = Math.max(0, s.page + (action === 'next' ? 1 : -1));
    await (interaction as ButtonInteraction).update(render(sid, s));
    return;
  }

  const member = interaction.member as GuildMember;
  if (!member?.voice?.channel) {
    await interaction.reply({ embeds: [noticeEmbed('warning', t.plb_join_voice)], flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (action === 'pick' && interaction.isStringSelectMenu()) {
    const track = s.tracks[Number(interaction.values[0])];
    if (!track) {
      await interaction.editReply(t.plb_track_not_found);
      return;
    }
    const res = await musicService.play(interaction.guild, member, `${track.title} ${track.artist}`, { textChannelId: interaction.channelId });
    await interaction.editReply(
      res.success
        ? formatString(res.queuePosition === 0 ? t.plb_track_playing : t.plb_track_queued, { title: track.title, artist: track.artist, position: res.queuePosition ?? 0 })
        : `❌ ${res.error || t.plb_play_impossible}`
    );
    return;
  }

  if (action === 'all' || action === 'shuffle') {
    const res = await musicService.play(interaction.guild, member, s.url, { textChannelId: interaction.channelId, shuffle: action === 'shuffle' });
    await interaction.editReply(
      res.success
        ? `✅ ${res.playlistCount ? formatString(t.plb_added_count, { count: res.playlistCount }) : t.plb_added}${action === 'shuffle' ? t.plb_shuffle_suffix : ''}.`
        : `❌ ${res.error || t.plb_play_impossible}`
    );
  }
}
