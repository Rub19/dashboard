import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  GuildMember,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';
import { musicService } from '../../modules/music/services/musicService.js';
import { musicProviderManager } from '../../modules/music/providers/musicProvider.js';
import type { Track } from '../../modules/music/types/music.js';
import { baseEmbed } from '../../utils/embeds.js';

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
  const pages = Math.max(1, Math.ceil(s.tracks.length / PAGE_SIZE));
  const start = s.page * PAGE_SIZE;
  const slice = s.tracks.slice(start, start + PAGE_SIZE);
  const total = s.tracks.reduce((a, t) => a + (t.duration || 0), 0);

  const embed = baseEmbed('primary')
    .setTitle(`🎶 ${clip(s.tracks[0]?.album || 'Playlist', 200)}`)
    .setDescription(
      slice
        .map((t, i) => `\`${String(start + i + 1).padStart(3, ' ')}\` **${clip(t.title, 60)}** — ${clip(t.artist, 40)} \`${fmt(t.duration)}\``)
        .join('\n') || '*Aucun titre.*'
    )
    .setFooter({ text: `${s.tracks.length} titres · ${Math.round(total / 60)} min · page ${s.page + 1}/${pages}` });
  if (s.tracks[0]?.thumbnail) embed.setThumbnail(s.tracks[0].thumbnail);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`plbrowse:${sid}:pick`)
    .setPlaceholder('Choisir un titre à jouer…')
    .addOptions(
      slice.map((t, i) => ({
        label: clip(`${start + i + 1}. ${t.title}`, 100),
        description: clip(t.artist, 100),
        value: String(start + i),
      }))
    );

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:prev`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(s.page === 0),
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:next`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(s.page >= pages - 1),
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:all`).setLabel('Tout jouer').setEmoji('🎵').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`plbrowse:${sid}:shuffle`).setLabel('Tout mélanger').setEmoji('🔀').setStyle(ButtonStyle.Primary)
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
    const url = String(((ctx.interaction as any)?.options?.getString('lien') as string | undefined) ?? ctx.args[0] ?? '').trim();
    if (!/^https?:\/\//i.test(url)) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Donne un lien de playlist ou d\'album (Spotify, YouTube).')], ephemeral: true });
      return;
    }
    await ctx.deferReply();
    const tracks = await musicProviderManager.resolveMany(url, {
      id: ctx.author.id,
      tag: ctx.author.tag,
      avatar: ctx.author.displayAvatarURL?.() ?? null,
    });
    if (tracks.length === 0) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Impossible de lire cette playlist (privée, vide ou inaccessible).')] });
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
  if (!s) {
    await interaction.reply({ content: 'Cette liste a expiré — relance `/playlist`.', ephemeral: true });
    return null;
  }
  if (interaction.user.id !== s.userId) {
    await interaction.reply({ content: 'Seule la personne qui a lancé `/playlist` peut utiliser ce menu.', ephemeral: true });
    return null;
  }
  return s;
}

export async function handlePlaylistBrowser(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
  const [, sid, action] = interaction.customId.split(':');
  const s = await ownerCheck(interaction, sessions.get(sid));
  if (!s || !interaction.guild) return;

  if (action === 'prev' || action === 'next') {
    s.page = Math.max(0, s.page + (action === 'next' ? 1 : -1));
    await (interaction as ButtonInteraction).update(render(sid, s));
    return;
  }

  const member = interaction.member as GuildMember;
  if (!member?.voice?.channel) {
    await interaction.reply({ content: 'Rejoins d\'abord un salon vocal.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  if (action === 'pick' && interaction.isStringSelectMenu()) {
    const track = s.tracks[Number(interaction.values[0])];
    if (!track) {
      await interaction.editReply('Titre introuvable.');
      return;
    }
    const res = await musicService.play(interaction.guild, member, `${track.title} ${track.artist}`, { textChannelId: interaction.channelId });
    await interaction.editReply(res.success ? `✅ **${track.title}** — ${track.artist} ${res.queuePosition === 0 ? 'est en lecture.' : `ajouté à la file (#${res.queuePosition}).`}` : `❌ ${res.error || 'Lecture impossible.'}`);
    return;
  }

  if (action === 'all' || action === 'shuffle') {
    const res = await musicService.play(interaction.guild, member, s.url, { textChannelId: interaction.channelId, shuffle: action === 'shuffle' });
    await interaction.editReply(
      res.success
        ? `✅ ${res.playlistCount ? `**${res.playlistCount}** titres ajoutés` : 'Ajouté'}${action === 'shuffle' ? ' (dans un ordre aléatoire)' : ''}.`
        : `❌ ${res.error || 'Lecture impossible.'}`
    );
  }
}
