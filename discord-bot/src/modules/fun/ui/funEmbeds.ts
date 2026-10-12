import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import {
  GameResult,
  LyricsResult,
  MovieResult,
  ReverseImageLinks,
  TvShowResult,
} from '../services/funService.js';

export function buildLyricsEmbed(lyrics: LyricsResult): EmbedBuilder {
  const cleanLyrics = lyrics.lyrics.length > 3900 ? `${lyrics.lyrics.slice(0, 3900)}…` : lyrics.lyrics;

  return new EmbedBuilder()
    .setColor(0xec4899)
    .setTitle(`🎵 ${lyrics.trackName}`)
    .setDescription(`**${lyrics.artistName}**${lyrics.albumName ? ` • *${lyrics.albumName}*` : ''}\n\n${cleanLyrics}`)
    .setFooter({ text: 'Etho Fun • Paroles synchronisées LRCLib' })
    .setTimestamp();
}

export function buildQuoteEmbed(text: string, authorName: string, authorAvatar?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setDescription(`> *« ${text.trim()} »*`)
    .setFooter({
      text: `— ${authorName}`,
      iconURL: authorAvatar,
    })
    .setTimestamp();

  return embed;
}

export function buildTvShowEmbed(show: TvShowResult): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
  const genres = show.genres.length > 0 ? show.genres.join(', ') : 'Général';
  const ratingText = show.rating ? `⭐ **${show.rating}**/10` : 'Non noté';

  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(`📺 ${show.title}`)
    .setURL(show.url)
    .setDescription(show.summary.length > 2000 ? `${show.summary.slice(0, 2000)}…` : show.summary)
    .addFields(
      { name: 'Note', value: ratingText, inline: true },
      { name: 'Genres', value: genres, inline: true },
      { name: 'Statut', value: show.status || 'Inconnu', inline: true },
      { name: 'Première diffusion', value: show.premiered || 'N/A', inline: true },
      { name: 'Réseau / Chaîne', value: show.network || 'N/A', inline: true }
    )
    .setFooter({ text: 'Etho Fun • TVMaze' })
    .setTimestamp();

  if (show.image) {
    embed.setImage(show.image);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel('Fiche TVMaze').setStyle(ButtonStyle.Link).setURL(show.url)
  );

  return { embed, row };
}

export function buildMovieEmbed(movie: MovieResult): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle(`🎬 ${movie.title}${movie.year ? ` (${movie.year})` : ''}`)
    .setURL(movie.url)
    .setDescription(movie.synopsis.length > 2000 ? `${movie.synopsis.slice(0, 2000)}…` : movie.synopsis)
    .setFooter({ text: movie.description || 'Etho Fun • Cinéma' })
    .setTimestamp();

  if (movie.poster) {
    embed.setImage(movie.poster);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel('Wikipédia').setStyle(ButtonStyle.Link).setURL(movie.url)
  );

  return { embed, row };
}

export function buildGameEmbed(game: GameResult): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
  const platformsList = [];
  if (game.platforms?.windows) platformsList.push('Windows');
  if (game.platforms?.mac) platformsList.push('macOS');
  if (game.platforms?.linux) platformsList.push('Linux');
  const platformsStr = platformsList.length > 0 ? platformsList.join(', ') : 'PC';

  const embed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`🎮 ${game.title}`)
    .setDescription(game.description ? (game.description.length > 2000 ? `${game.description.slice(0, 2000)}…` : game.description) : 'Jeu vidéo')
    .addFields(
      { name: 'Plateformes', value: platformsStr, inline: true },
      { name: 'Note Metacritic', value: game.metacriticScore ? `⭐ **${game.metacriticScore}**/100` : 'N/A', inline: true },
      { name: 'Date de sortie', value: game.releaseDate || 'N/A', inline: true },
      { name: 'Développeur', value: game.developers || 'N/A', inline: true },
      { name: 'Éditeur', value: game.publishers || 'N/A', inline: true },
      { name: 'Meilleur prix', value: game.cheapestPrice || 'Voir offre', inline: true }
    )
    .setFooter({ text: 'Etho Fun • Steam & CheapShark' })
    .setTimestamp();

  if (game.thumb) {
    embed.setImage(game.thumb);
  }

  const row = new ActionRowBuilder<ButtonBuilder>();
  if (game.website) {
    row.addComponents(new ButtonBuilder().setLabel('Page du jeu').setStyle(ButtonStyle.Link).setURL(game.website));
  }
  if (game.steamAppId) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Steam Store')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://store.steampowered.com/app/${game.steamAppId}`)
    );
  }

  return { embed, row };
}

export function buildReverseImageEmbed(links: ReverseImageLinks): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
  const embed = new EmbedBuilder()
    .setColor(0x06b6d4)
    .setTitle('🔍 Recherche Inversée d\'Image')
    .setDescription('Cliquez sur l\'un des moteurs de recherche ci-dessous pour analyser cette image et retrouver sa source originale.')
    .setImage(links.url)
    .setFooter({ text: 'Etho Fun • Google Lens & Reverse Search' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel('Google Lens').setStyle(ButtonStyle.Link).setURL(links.googleLens),
    new ButtonBuilder().setLabel('Bing Visual').setStyle(ButtonStyle.Link).setURL(links.bingVisual),
    new ButtonBuilder().setLabel('TinEye').setStyle(ButtonStyle.Link).setURL(links.tinEye),
    new ButtonBuilder().setLabel('Yandex').setStyle(ButtonStyle.Link).setURL(links.yandex),
    new ButtonBuilder().setLabel('SauceNAO').setStyle(ButtonStyle.Link).setURL(links.sauceNao)
  );

  return { embed, row };
}
