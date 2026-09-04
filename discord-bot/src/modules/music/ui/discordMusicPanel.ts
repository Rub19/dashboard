import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  MessageCreateOptions,
} from 'discord.js';
import { GuildMusicState } from '../types/music.js';
import { musicService } from '../services/musicService.js';

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
    const embed = new EmbedBuilder();

    if (!state.currentTrack) {
      embed
        .setColor(0x5865f2)
        .setTitle('🎵 ETHONE Music Player')
        .setDescription(
          '**Aucune musique en cours de lecture.**\n\nUtilisez `/music play <titre/lien>` ou le **Music Center ETHONE** pour lancer un morceau.'
        )
        .addFields(
          { name: '🔊 Salon Vocal', value: state.voiceChannel ? `<#${state.voiceChannel.id}>` : 'Déconnecté', inline: true },
          { name: '📜 File d\'attente', value: `${state.queueLength} titres`, inline: true }
        )
        .setFooter({ text: 'ETHONE Music Center 2.0 • Audio Engine' })
        .setTimestamp();
    } else {
      const track = state.currentTrack;
      const progress = this.createProgressBar(state.position, state.duration, 14);
      const currentTime = this.formatTime(state.position);
      const totalTime = this.formatTime(state.duration);

      embed
        .setColor(state.status === 'PLAYING' ? 0x10b981 : 0xf59e0b)
        .setTitle(`${state.status === 'PLAYING' ? '▶️' : '⏸️'} ${track.title}`)
        .setURL(track.url && track.url.startsWith('http') ? track.url : 'https://ethone.dev')
        .setDescription(
          `**Artiste :** ${track.artist}\n` +
          `**Source :** \`${track.source}\`\n\n` +
          `\`${currentTime}\` ${progress} \`${totalTime}\``
        )
        .addFields(
          { name: '👤 Demandé par', value: `${track.requestedBy.tag}`, inline: true },
          { name: '🔊 Volume', value: `${state.muted ? '0% (Muet)' : `${state.volume}%`}`, inline: true },
          { name: '🔁 Répétition', value: `\`${state.repeatMode}\``, inline: true },
          { name: '📜 File d\'attente', value: `${state.queueLength} titre(s) en attente`, inline: true },
          { name: '🔀 Aléatoire', value: state.shuffle ? 'Actif' : 'Désactivé', inline: true },
          { name: '📍 Salon Vocal', value: state.voiceChannel ? `<#${state.voiceChannel.id}>` : 'Inconnu', inline: true }
        )
        .setFooter({ text: 'ETHONE Music Center 2.0 • Contrôlez la musique en direct' })
        .setTimestamp();

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
