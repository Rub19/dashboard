import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import {
  LastFmAlbum,
  LastFmArtist,
  LastFmProfile,
  LastFmTasteComparison,
  LastFmTrack,
} from "../types/lastfmTypes.js";

const LASTFM_RED = 0xd51007;

export function buildNowPlayingEmbed(username: string, track: LastFmTrack): {
  embed: EmbedBuilder;
  row?: ActionRowBuilder<ButtonBuilder>;
} {
  const statusLabel = track.playing ? "🟢 En direct sur Last.fm" : "⏱️ Dernier scrobble";
  const embed = new EmbedBuilder()
    .setColor(LASTFM_RED)
    .setAuthor({
      name: `${username} · ${statusLabel}`,
      iconURL: "https://www.last.fm/static/images/favicon.702b239b6194.ico",
      url: track.profileUrl,
    })
    .setTitle(track.name)
    .setDescription(`**${track.artist}**${track.album ? `\n*Album : ${track.album}*` : ""}`)
    .setFooter({
      text: "Etho Last.fm Integration",
      iconURL: "https://www.last.fm/static/images/favicon.702b239b6194.ico",
    })
    .setTimestamp();

  if (track.artworkUrl) {
    embed.setThumbnail(track.artworkUrl);
  }

  const buttons: ButtonBuilder[] = [];
  if (track.profileUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Last.fm")
        .setStyle(ButtonStyle.Link)
        .setURL(track.profileUrl)
    );
  }

  const query = encodeURIComponent(`${track.artist} ${track.name}`);
  buttons.push(
    new ButtonBuilder()
      .setLabel("Spotify")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://open.spotify.com/search/${query}`)
  );
  buttons.push(
    new ButtonBuilder()
      .setLabel("YouTube")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.youtube.com/results?search_query=${query}`)
  );

  const row = buttons.length > 0 ? new ActionRowBuilder<ButtonBuilder>().addComponents(buttons) : undefined;

  return { embed, row };
}

export function buildRecentTracksEmbed(username: string, tracks: LastFmTrack[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LASTFM_RED)
    .setAuthor({
      name: `Récents scrobbles de ${username}`,
      iconURL: "https://www.last.fm/static/images/favicon.702b239b6194.ico",
      url: `https://www.last.fm/user/${encodeURIComponent(username)}`,
    })
    .setFooter({ text: "Etho Last.fm Integration" })
    .setTimestamp();

  if (tracks.length === 0) {
    embed.setDescription("Aucun scrobble récent trouvé pour ce profil.");
    return embed;
  }

  const lines = tracks.map((t, i) => {
    const playIndicator = t.playing ? "🟢" : "▫️";
    const albumPart = t.album ? ` · *${t.album}*` : "";
    return `${playIndicator} **${i + 1}.** [${t.name}](${t.profileUrl}) — **${t.artist}**${albumPart}`;
  });

  embed.setDescription(lines.join("\n\n"));
  if (tracks[0]?.artworkUrl) {
    embed.setThumbnail(tracks[0].artworkUrl);
  }

  return embed;
}

export function buildTopArtistsEmbed(
  username: string,
  artists: LastFmArtist[],
  period: string
): EmbedBuilder {
  const periodMap: Record<string, string> = {
    "7day": "7 derniers jours",
    "1month": "30 derniers jours",
    "3month": "3 derniers mois",
    "6month": "6 derniers mois",
    "12month": "12 derniers mois",
    overall: "tout temps",
  };
  const periodLabel = periodMap[period] || period;

  const embed = new EmbedBuilder()
    .setColor(LASTFM_RED)
    .setAuthor({
      name: `Top Artistes de ${username} (${periodLabel})`,
      iconURL: "https://www.last.fm/static/images/favicon.702b239b6194.ico",
      url: `https://www.last.fm/user/${encodeURIComponent(username)}`,
    })
    .setFooter({ text: "Etho Last.fm Integration" })
    .setTimestamp();

  if (artists.length === 0) {
    embed.setDescription("Aucun artiste trouvé pour cette période.");
    return embed;
  }

  const lines = artists.map((a, i) => {
    const plays = a.playCount > 0 ? ` · \`${a.playCount} écoutes\`` : "";
    return `**${i + 1}.** [${a.name}](${a.profileUrl})${plays}`;
  });

  embed.setDescription(lines.join("\n"));
  return embed;
}

export function buildTopAlbumsEmbed(
  username: string,
  albums: LastFmAlbum[],
  period: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LASTFM_RED)
    .setAuthor({
      name: `Top Albums de ${username}`,
      iconURL: "https://www.last.fm/static/images/favicon.702b239b6194.ico",
      url: `https://www.last.fm/user/${encodeURIComponent(username)}`,
    })
    .setFooter({ text: "Etho Last.fm Integration" })
    .setTimestamp();

  if (albums.length === 0) {
    embed.setDescription("Aucun album trouvé pour cette période.");
    return embed;
  }

  const lines = albums.map((a, i) => {
    const plays = a.playCount > 0 ? ` · \`${a.playCount} écoutes\`` : "";
    return `**${i + 1}.** [${a.name}](${a.profileUrl}) — **${a.artist}**${plays}`;
  });

  embed.setDescription(lines.join("\n"));
  return embed;
}

export function buildProfileEmbed(profile: LastFmProfile): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LASTFM_RED)
    .setAuthor({
      name: `Profil Last.fm · ${profile.username}`,
      iconURL: "https://www.last.fm/static/images/favicon.702b239b6194.ico",
      url: profile.profileUrl,
    })
    .addFields(
      { name: "Scrobbles totaux", value: profile.playCount.toLocaleString("fr-FR"), inline: true },
      { name: "Pays", value: profile.country || "Non renseigné", inline: true },
      {
        name: "Inscrit le",
        value: profile.registeredAt ? new Date(profile.registeredAt).toLocaleDateString("fr-FR") : "Inconnu",
        inline: true,
      }
    )
    .setFooter({ text: "Etho Last.fm Integration" })
    .setTimestamp();

  if (profile.avatarUrl) {
    embed.setThumbnail(profile.avatarUrl);
  }

  return embed;
}

export function buildTasteEmbed(comp: LastFmTasteComparison): EmbedBuilder {
  const barLength = 10;
  const filled = Math.round((comp.compatibility / 100) * barLength);
  const bar = "█".repeat(filled) + "░".repeat(Math.max(0, barLength - filled));

  const embed = new EmbedBuilder()
    .setColor(LASTFM_RED)
    .setTitle("Comparateur de Goûts Musicaux")
    .setDescription(`Compatibilité entre **${comp.user1}** et **${comp.user2}** :`)
    .addFields(
      {
        name: "Indice d'affinité",
        value: `\`[${bar}]\` **${comp.compatibility}%**`,
      },
      {
        name: "Artistes en commun",
        value:
          comp.commonArtists.length > 0
            ? comp.commonArtists.map((a) => `• ${a}`).join("\n")
            : "Aucun artiste en commun dans le top récent.",
      }
    )
    .setFooter({ text: "Etho Last.fm Taste Engine" })
    .setTimestamp();

  return embed;
}
