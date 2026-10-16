import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  User,
} from 'discord.js';
import { SpotifyTrack } from '../types/spotify.js';
import { trg } from '../../../utils/tr.js';

export const SPOTIFY_GREEN = 0x1db954;

export function formatMs(ms: number): string {
  if (!ms || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function buildProgressBar(progressMs: number, durationMs: number, size = 12): string {
  if (!durationMs || durationMs <= 0) {
    return `${formatMs(progressMs)} 🔘${'▬'.repeat(size - 1)} --:--`;
  }
  const ratio = Math.min(1, Math.max(0, progressMs / durationMs));
  const progressIndex = Math.min(size - 1, Math.max(0, Math.floor(ratio * size)));
  const left = '▬'.repeat(progressIndex);
  const right = '▬'.repeat(size - progressIndex - 1);
  return `${formatMs(progressMs)} ${left}🔘${right} ${formatMs(durationMs)}`;
}

export function createSpotifyEmbed(track: SpotifyTrack, user: User, isLivePresence = false, scope?: unknown): EmbedBuilder {
  const t = (s: string, v?: Record<string, unknown>) => trg(scope, s, v);
  const embed = new EmbedBuilder()
    .setColor(SPOTIFY_GREEN)
    .setAuthor({
      name: t('{username} sur Spotify', { username: user.username }),
      iconURL: user.displayAvatarURL(),
      url: track.url || undefined,
    })
    .setTitle(track.name || t('Titre inconnu'))
    .setURL(track.url || 'https://open.spotify.com')
    .setFooter({
      text: t(isLivePresence ? 'Détecté via Discord Presence • Spotify' : 'Synchronisé via Spotify Connect • ETHONE'),
      iconURL: 'https://open.spotify.com/favicon.ico',
    });

  if (track.albumArt) {
    embed.setThumbnail(track.albumArt);
  }

  const artists = track.artists.length > 0 ? track.artists.join(', ') : t('Artiste inconnu');
  const lines: string[] = [
    t('**Artiste :** {artists}', { artists }),
    t('**Album :** {album}', { album: track.album || 'Single' }),
    '',
    buildProgressBar(track.progressMs, track.durationMs),
    '',
  ];

  if (track.device) {
    const devIcon = track.device.type === 'Smartphone' ? '📱' : track.device.type === 'Computer' ? '💻' : '🔊';
    lines.push(`${devIcon} ${t('**Appareil :** {name}', { name: track.device.name })} • 🔊 **${track.device.volume_percent}%**`);
  } else if (isLivePresence) {
    lines.push(`🟢 ${t('**En écoute active sur Spotify**')}`);
  }

  if (track.isSaved) {
    lines.push(`💚 ${t('**Ce titre fait partie de vos favoris**')}`);
  }

  embed.setDescription(lines.join('\n'));
  return embed;
}

export function createSpotifyActionRow(
  userId: string,
  isPlaying: boolean,
  isSaved = false
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`spotify:prev:${userId}`)
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`spotify:toggle:${userId}`)
      .setEmoji(isPlaying ? '⏸️' : '▶️')
      .setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`spotify:next:${userId}`)
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`spotify:like:${userId}`)
      .setEmoji(isSaved ? '💔' : '💚')
      .setLabel(isSaved ? 'Unlike' : 'Like')
      .setStyle(isSaved ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`spotify:vc:${userId}`)
      .setEmoji('🔊')
      .setLabel('Diffuser en Vocal')
      .setStyle(ButtonStyle.Secondary)
  );

  return row;
}

export async function handleSpotifyButton(interaction: any): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const targetUserId = parts[2];

  if (interaction.user.id !== targetUserId) {
    await interaction.reply({
      content: trg(interaction, 'Vous ne pouvez contrôler que votre propre session Spotify (ou tapez `/spotify login` pour associer votre compte).'),
      ephemeral: true,
    });
    return;
  }

  const { spotifyService } = await import('../services/spotifyService.js');

  if (action === 'vc') {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: trg(interaction, 'Cette action doit être effectuée sur un serveur.'), ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const res = await spotifyService.streamToVoice(interaction.guild, interaction.member);
    if (!res.success) {
      await interaction.editReply({ content: res.error || 'Impossible de diffuser dans le salon vocal.' });
      return;
    }
    await interaction.editReply({ content: trg(interaction, '🎶 **{trackTitle}** est maintenant diffusé dans le salon vocal **{channelName}** !', { trackTitle: res.trackTitle, channelName: res.channelName }) });
    return;
  }

  await interaction.deferUpdate();

  if (action === 'toggle') {
    const current = await spotifyService.getPlaybackState(targetUserId);
    if (current?.isPlaying) {
      await spotifyService.pause(targetUserId);
    } else {
      await spotifyService.resume(targetUserId);
    }
  } else if (action === 'next') {
    await spotifyService.next(targetUserId);
  } else if (action === 'prev') {
    await spotifyService.previous(targetUserId);
  } else if (action === 'like') {
    const current = await spotifyService.getPlaybackState(targetUserId);
    if (current?.isSaved) {
      await spotifyService.unlikeTrack(targetUserId, current.id);
    } else if (current?.id) {
      await spotifyService.likeTrack(targetUserId, current.id);
    }
  }

  await new Promise((r) => setTimeout(r, 450));
  const updatedTrack = await spotifyService.getPlaybackState(targetUserId);
  if (updatedTrack) {
    const embed = createSpotifyEmbed(updatedTrack, interaction.user, false, interaction);
    const row = createSpotifyActionRow(targetUserId, updatedTrack.isPlaying, updatedTrack.isSaved);
    await interaction.editReply({ embeds: [embed], components: [row] });
  }
}
