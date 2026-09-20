import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { GuildMusicState, Track } from '../types/music.js';
import { musicService } from '../services/musicService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { baseEmbed } from '../../../utils/embeds.js';
import {
  container,
  footer,
  formatDuration,
  sectionWithThumbnail,
  separator,
  statsLine,
  text,
  toneToColor,
  V2_EPHEMERAL_FLAGS,
  V2_FLAGS,
} from '../../../utils/components.js';

const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

/** Payload V2 prêt pour ctx.reply({ ...payload, componentsV2: true }) ou interaction.editReply({ ...payload, flags }). */
export interface V2Payload {
  components: ContainerBuilder[];
}

/**
 * Cartes Components V2 du lecteur musique : "Lecture en cours" avec les
 * boutons de contrôle, "Ajouté à la file", "File d'attente". Même accent
 * que le module (vert = lecture, ambre = pause, indigo = idle).
 */
export class DiscordMusicPanel {
  public static createProgressBar(currentSec: number, totalSec: number, length: number = 16): string {
    if (!totalSec || totalSec <= 0) return '━'.repeat(Math.floor(length / 2)) + '●' + '━'.repeat(Math.ceil(length / 2) - 1);
    const ratio = Math.min(1, Math.max(0, currentSec / totalSec));
    const filled = Math.round(ratio * length);
    return '━'.repeat(Math.max(0, filled - 1)) + '●' + '━'.repeat(Math.max(0, length - filled));
  }

  /** Barre de progression textuelle (12 segments). */
  private static progressBar(position: number, duration: number, width = 12): string {
    if (!duration || duration <= 0) return '▱'.repeat(width);
    const filled = Math.max(0, Math.min(width, Math.round((position / duration) * width)));
    return '▰'.repeat(filled) + '▱'.repeat(width - filled);
  }

  public static formatTime(seconds: number): string {
    return formatDuration(seconds);
  }

  private static sourceBadge(source: string): string {
    const map: Record<string, string> = { YOUTUBE: '▶️ YouTube', SPOTIFY: '🟢 Spotify', SOUNDCLOUD: '🟠 SoundCloud', DIRECT: '📻 Flux direct' };
    return map[source] || source;
  }

  private static controlRows(state: GuildMusicState): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
    const row1 = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(!state.history || state.history.length === 0),
      new ButtonBuilder()
        .setCustomId('music_playpause')
        .setEmoji(state.status === 'PLAYING' ? '⏸️' : '▶️')
        .setStyle(state.status === 'PLAYING' ? ButtonStyle.Primary : ButtonStyle.Success)
        .setDisabled(!state.currentTrack),
      new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(!state.currentTrack),
      new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger).setDisabled(!state.currentTrack && state.queueLength === 0),
      new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(state.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(state.queueLength < 2),
    );
    const row2 = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder().setCustomId('music_repeat').setLabel(state.repeatMode === 'OFF' ? 'Loop' : state.repeatMode === 'SONG' ? 'Titre' : 'File').setEmoji('🔁').setStyle(state.repeatMode !== 'OFF' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_voldown').setEmoji('🔉').setStyle(ButtonStyle.Secondary).setDisabled(state.volume <= 0),
      new ButtonBuilder().setCustomId('music_volup').setEmoji('🔊').setStyle(ButtonStyle.Secondary).setDisabled(state.volume >= 100),
      new ButtonBuilder().setCustomId('music_queue').setLabel(`File (${state.queueLength})`).setEmoji('📜').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_fav').setEmoji('❤️').setStyle(ButtonStyle.Secondary).setDisabled(!state.currentTrack),
    );
    return [row1, row2];
  }

  /** Carte principale : lecture en cours (ou lecteur inactif) + contrôles. */
  public static buildPanelMessage(state: GuildMusicState): V2Payload {
    const gConf = guildConfigService.getConfig(state.guildId);
    const t = getTranslation(gConf.language);
    const track = state.currentTrack;

    if (!track) {
      const card = container(toneToColor('primary', gConf.primaryColor), [
        text(`## 🎵 ${t.music_panel_title}`),
        text(t.music_panel_idle_desc),
        separator(),
        statsLine([
          `🎙️ ${state.voiceChannel ? `<#${state.voiceChannel.id}>` : t.music_panel_disconnected}`,
          `📜 ${formatString(t.music_panel_queue_value, { count: state.queueLength })}`,
          `🔊 ${state.volume}%`,
        ]),
        ...this.controlRows(state),
        footer(t.music_panel_footer_idle),
      ]);
      return { components: [card] };
    }

    const playing = state.status === 'PLAYING';
    const progress = this.createProgressBar(state.position, state.duration);
    const titleLink = track.url && track.url.startsWith('http') ? `[${track.title}](${track.url})` : track.title;
    const card = container(toneToColor(playing ? 'success' : 'warning', playing ? gConf.successColor : null), [
      sectionWithThumbnail(
        [
          `## ${playing ? '▶️' : '⏸️'} ${titleLink}`,
          `**${track.artist}** · ${this.sourceBadge(track.source)}`,
          `-# ${t.music_panel_field_requested_by} ${track.requestedBy.tag}`,
        ],
        track.thumbnail || FALLBACK_THUMB,
        track.title,
      ),
      text(`\`${this.formatTime(state.position)}\` ${progress} \`${this.formatTime(state.duration)}\``),
      separator(),
      statsLine([
        `🔊 ${state.muted ? `0% (${t.music_panel_muted})` : `${state.volume}%`}`,
        `🔁 ${state.repeatMode}`,
        `🔀 ${state.shuffle ? t.music_panel_active : t.music_panel_inactive}`,
        `📜 ${formatString(t.music_panel_queue_value, { count: state.queueLength })}`,
        state.voiceChannel ? `🎙️ <#${state.voiceChannel.id}>` : null,
      ]),
      ...this.controlRows(state),
      footer(t.music_panel_footer_active),
    ]);
    return { components: [card] };
  }

  /** Carte "Ajouté à la file" (ou "Playlist ajoutée"). */
  public static buildQueuedCard(track: Track, position: number, guildId: string, playlistCount?: number): V2Payload {
    const gConf = guildConfigService.getConfig(guildId);
    const t = getTranslation(gConf.language);
    const titleLink = track.url && track.url.startsWith('http') ? `[${track.title}](${track.url})` : track.title;
    const lines = playlistCount && playlistCount > 1
      ? [`## 🎶 Playlist ajoutée`, `**${playlistCount}** titres dans la file`, `-# ${position === 0 ? 'Lecture' : 'Prochain'} : ${titleLink}`]
      : [`## ➕ ${t.music_added_queue_title.replace(/^[^\w]*/u, '')}`, titleLink, `-# ${track.artist} · ${this.formatTime(track.duration)} · position **#${position}**`];
    const card = container(toneToColor('info', gConf.infoColor), [
      sectionWithThumbnail(lines, track.thumbnail || FALLBACK_THUMB, track.title),
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder().setCustomId('music_queue').setLabel('Voir la file').setEmoji('📜').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_panel').setLabel('Lecteur').setEmoji('🎛️').setStyle(ButtonStyle.Primary),
      ),
    ]);
    return { components: [card] };
  }

  /** Carte "File d'attente" : titre en cours + 10 prochains + total. */
  public static buildQueueCard(state: GuildMusicState): V2Payload {
    const gConf = guildConfigService.getConfig(state.guildId);
    const t = getTranslation(gConf.language);
    const queue = state.queue || [];
    const total = queue.reduce((a, q) => a + (q.duration || 0), 0);
    const shown = queue.slice(0, 10);
    const lines = shown.map((q, i) => `**${i + 1}.** ${q.url?.startsWith('http') ? `[${q.title}](${q.url})` : q.title} — ${q.artist} \`${this.formatTime(q.duration)}\``);

    const card = container(toneToColor('primary', gConf.primaryColor), [
      text(`## 📜 File d'attente (${queue.length})`),
      state.currentTrack
        ? text(`${state.status === 'PLAYING' ? '▶️' : '⏸️'} **${state.currentTrack.title}**\n-# ${state.currentTrack.artist}\n\`${this.formatTime(state.position)}\` ${this.progressBar(state.position, state.duration)} \`${this.formatTime(state.duration)}\``)
        : text(t.music_panel_idle_desc),
      separator(),
      queue.length === 0 ? text('*Aucun titre en attente — ajoute-en avec `/play`.*') : text(lines.join('\n')),
      queue.length > shown.length ? text(`-# … et **${queue.length - shown.length}** autre(s)`) : null,
      separator(false),
      statsLine([`⏱️ Total ${this.formatTime(total)}`, `🔁 ${state.repeatMode}`, `🔀 ${state.shuffle ? t.music_panel_active : t.music_panel_inactive}`]),
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder().setCustomId('music_shuffle').setLabel('Mélanger').setEmoji('🔀').setStyle(ButtonStyle.Secondary).setDisabled(queue.length < 2),
        new ButtonBuilder().setCustomId('music_skip').setLabel('Passer').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(!state.currentTrack),
        new ButtonBuilder().setCustomId('music_panel').setLabel('Lecteur').setEmoji('🎛️').setStyle(ButtonStyle.Primary),
      ),
    ]);
    return { components: [card] };
  }

  public static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    if (!customId.startsWith('music_')) return;

    const guild = interaction.guild;
    const member = interaction.member && 'voice' in interaction.member ? (interaction.member as any) : null;
    if (!guild) return;
    const t = getTranslation(guildConfigService.getConfig(guild.id).language);

    // Lecture seule : réponses éphémères, pas besoin d'être en vocal.
    if (customId === 'music_queue') {
      await interaction.reply({ ...this.buildQueueCard(musicService.getState(guild.id)), flags: V2_EPHEMERAL_FLAGS });
      return;
    }
    if (customId === 'music_panel') {
      await interaction.reply({ ...this.buildPanelMessage(musicService.getState(guild.id)), flags: V2_EPHEMERAL_FLAGS });
      return;
    }

    const userVoice = member?.voice?.channel;
    if (!userVoice) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(t.voice_required)], ephemeral: true });
      return;
    }
    const botVoice = guild.members.me?.voice?.channel;
    if (botVoice && botVoice.id !== userVoice.id) {
      await interaction.reply({ embeds: [baseEmbed('error').setDescription(formatString(t.voice_different, { channel: `<#${botVoice.id}>` }))], ephemeral: true });
      return;
    }

    await interaction.deferUpdate().catch(() => {});

    switch (customId) {
      case 'music_playpause': {
        const state = musicService.getState(guild.id);
        if (state.status === 'PLAYING') musicService.pause(guild.id, member);
        else musicService.resume(guild.id, member);
        break;
      }
      case 'music_skip':
        await musicService.skip(guild.id, member);
        break;
      case 'music_prev':
        await musicService.previous(guild.id, member);
        break;
      case 'music_stop':
        musicService.stop(guild.id, member);
        break;
      case 'music_shuffle':
        musicService.shuffle(guild.id, member);
        break;
      case 'music_repeat': {
        const state = musicService.getState(guild.id);
        const nextMode = state.repeatMode === 'OFF' ? 'SONG' : state.repeatMode === 'SONG' ? 'QUEUE' : 'OFF';
        musicService.setRepeatMode(guild.id, nextMode, member);
        break;
      }
      case 'music_voldown': {
        const state = musicService.getState(guild.id);
        musicService.setVolume(guild.id, Math.max(0, state.volume - 15), member);
        break;
      }
      case 'music_volup': {
        const state = musicService.getState(guild.id);
        musicService.setVolume(guild.id, Math.min(100, state.volume + 15), member);
        break;
      }
      case 'music_fav': {
        const state = musicService.getState(guild.id);
        if (state.currentTrack) musicService.toggleFavorite(guild.id, interaction.user.id, state.currentTrack);
        break;
      }
    }

    // Petite latence pour laisser le lecteur (Lavalink) refléter la nouvelle
    // piste avant de redessiner la carte.
    await new Promise((r) => setTimeout(r, 300));
    const updated = this.buildPanelMessage(musicService.getState(guild.id));
    await interaction.editReply({ ...updated, embeds: [], content: null, flags: V2_FLAGS } as any).catch(async () => {
      // Message d'avant migration (embed classique) : Discord refuse le passage en V2 → on répond à côté.
      await interaction.followUp({ ...updated, flags: V2_EPHEMERAL_FLAGS }).catch(() => {});
    });
  }
}
