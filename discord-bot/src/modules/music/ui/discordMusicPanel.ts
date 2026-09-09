import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Guild,
  MessageCreateOptions,
} from 'discord.js';
import { GuildMusicState } from '../types/music.js';
import { musicService } from '../services/musicService.js';
import { guildConfigService } from '../../../services/guildConfigService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { baseEmbed } from '../../../utils/embeds.js';

export class DiscordMusicPanel {
  public static createProgressBar(currentSec: number, totalSec: number, length: number = 14): string {
    if (!totalSec || totalSec <= 0) return '─'.repeat(length);
    const ratio = Math.min(1, Math.max(0, currentSec / totalSec));
    const filled = Math.round(ratio * length);
    const empty = Math.max(0, length - filled);

    return '━'.repeat(Math.max(0, filled - 1)) + '●' + '━'.repeat(empty);
  }

  public static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  public static buildPanelMessage(state: GuildMusicState): MessageCreateOptions {
    const t = getTranslation(guildConfigService.getConfig(state.guildId).language);
    let embed;

    if (!state.currentTrack) {
      embed = baseEmbed('primary', { footerText: t.music_panel_footer_idle })
        .setTitle(t.music_panel_title)
        .setDescription(t.music_panel_idle_desc)
        .addFields(
          { name: t.music_panel_field_voice_channel, value: state.voiceChannel ? `<#${state.voiceChannel.id}>` : t.music_panel_disconnected, inline: true },
          { name: t.music_panel_field_queue, value: formatString(t.music_panel_queue_value, { count: state.queueLength }), inline: true }
        );
    } else {
      const track = state.currentTrack;
      const progress = this.createProgressBar(state.position, state.duration, 14);
      const currentTime = this.formatTime(state.position);
      const totalTime = this.formatTime(state.duration);

      embed = baseEmbed(state.status === 'PLAYING' ? 'success' : 'warning', {
        footerText: t.music_panel_footer_active,
      })
        .setTitle(`${state.status === 'PLAYING' ? '▶️' : '⏸️'} ${track.title}`)
        .setURL(track.url && track.url.startsWith('http') ? track.url : 'https://ethone.dev')
        .setDescription(
          `**${t.music_panel_label_artist} :** ${track.artist}\n` +
          `**${t.music_panel_label_source} :** \`${track.source}\`\n\n` +
          `\`${currentTime}\` ${progress} \`${totalTime}\``
        )
        .addFields(
          { name: t.music_panel_field_requested_by, value: `${track.requestedBy.tag}`, inline: true },
          { name: t.music_panel_field_volume, value: `${state.muted ? `0% (${t.music_panel_muted})` : `${state.volume}%`}`, inline: true },
          { name: t.music_panel_field_repeat, value: `\`${state.repeatMode}\``, inline: true },
          { name: t.music_panel_field_queue, value: formatString(t.music_panel_queue_value, { count: state.queueLength }), inline: true },
          { name: t.music_panel_field_shuffle, value: state.shuffle ? t.music_panel_active : t.music_panel_inactive, inline: true },
          { name: t.music_panel_field_voice, value: state.voiceChannel ? `<#${state.voiceChannel.id}>` : t.music_panel_unknown, inline: true }
        );

      if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
      }
    }

    // Boutons de contrôle
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music_prev')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!state.history || state.history.length === 0),
      new ButtonBuilder()
        .setCustomId('music_playpause')
        .setEmoji(state.status === 'PLAYING' ? '⏸️' : '▶️')
        .setStyle(state.status === 'PLAYING' ? ButtonStyle.Primary : ButtonStyle.Success)
        .setDisabled(!state.currentTrack),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!state.currentTrack),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!state.currentTrack && state.queueLength === 0),
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setEmoji('🔀')
        .setStyle(state.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(state.queueLength < 2)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music_repeat')
        .setLabel(`Loop: ${state.repeatMode}`)
        .setEmoji('🔁')
        .setStyle(state.repeatMode !== 'OFF' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_voldown')
        .setEmoji('🔉')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state.volume <= 0),
      new ButtonBuilder()
        .setCustomId('music_volup')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state.volume >= 100),
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setLabel(`Queue (${state.queueLength})`)
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_fav')
        .setEmoji('❤️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!state.currentTrack)
    );

    return {
      embeds: [embed],
      components: [row1, row2],
    };
  }

  public static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    if (!customId.startsWith('music_')) return;

    const guild = interaction.guild;
    const member = interaction.member && 'voice' in interaction.member ? (interaction.member as any) : null;
    if (!guild) return;

    // Vérification du salon vocal pour les boutons de contrôle musical
    if (customId !== 'music_queue') {
      const t = getTranslation(guildConfigService.getConfig(guild.id).language);
      const userVoice = member?.voice?.channel;
      if (!userVoice) {
        await interaction.reply({
          embeds: [baseEmbed('error').setDescription(t.voice_required)],
          ephemeral: true,
        });
        return;
      }

      const botVoice = guild.members.me?.voice?.channel;
      if (botVoice && botVoice.id !== userVoice.id) {
        await interaction.reply({
          embeds: [baseEmbed('error').setDescription(formatString(t.voice_different, { channel: `<#${botVoice.id}>` }))],
          ephemeral: true,
        });
        return;
      }
    }

    await interaction.deferUpdate().catch(() => {});

    switch (customId) {
      case 'music_playpause': {
        const state = musicService.getState(guild.id);
        if (state.status === 'PLAYING') {
          musicService.pause(guild.id, member);
        } else {
          musicService.resume(guild.id, member);
        }
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
        if (state.currentTrack) {
          musicService.toggleFavorite(guild.id, interaction.user.id, state.currentTrack);
        }
        break;
      }
      case 'music_queue':
        // No-op or updates panel
        break;
    }

    const updatedState = musicService.getState(guild.id);
    const updatedPanel = this.buildPanelMessage(updatedState);
    await interaction.editReply(updatedPanel as any).catch(() => {});
  }
}
