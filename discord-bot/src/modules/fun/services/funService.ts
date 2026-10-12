export interface LyricsResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  lyrics: string;
  syncedLyrics?: string;
}

export interface TvShowResult {
  id: number;
  title: string;
  url: string;
  premiered?: string;
  status?: string;
  genres: string[];
  rating?: number;
  network?: string;
  image?: string;
  summary: string;
}

export interface MovieResult {
  title: string;
  description: string;
  poster?: string;
  synopsis: string;
  url: string;
  year?: string;
}

export interface GameResult {
  gameId: string;
  title: string;
  thumb: string;
  cheapestPrice?: string;
  steamAppId?: string;
  metacriticScore?: number;
  releaseDate?: string;
  developers?: string;
  publishers?: string;
  description?: string;
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
  website?: string;
}

export interface ImageSearchResult {
  title: string;
  thumbUrl: string;
  fullUrl: string;
  width?: number;
  height?: number;
  sourceUrl?: string;
}

export interface ReverseImageLinks {
  url: string;
  googleLens: string;
  bingVisual: string;
  tinEye: string;
  yandex: string;
  sauceNao: string;
}

class FunService {
  async getLyrics(query: string): Promise<LyricsResult | null> {
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`, {
        headers: {
          'User-Agent': 'EthoneBot/1.75.0 (https://ethone.dev)',
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const first = data.find((item: any) => item.plainLyrics || item.syncedLyrics) || data[0];
      const lyrics = first.plainLyrics || (first.syncedLyrics ? first.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, '') : '');

      if (!lyrics) return null;

      return {
        id: first.id,
        trackName: first.trackName || first.name || query,
        artistName: first.artistName || 'Artiste inconnu',
        albumName: first.albumName,
        duration: first.duration,
        lyrics: lyrics.trim(),
        syncedLyrics: first.syncedLyrics,
      };
    } catch {
      return null;
    }
  }

  async getTvShow(query: string): Promise<TvShowResult | null> {
    try {
      const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const show = data[0].show;
      if (!show) return null;

      const cleanSummary = (show.summary || '')
        .replace(/<p>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim();

      return {
        id: show.id,
        title: show.name,
        url: show.url || `https://www.tvmaze.com/shows/${show.id}`,
        premiered: show.premiered,
        status: show.status,
        genres: Array.isArray(show.genres) ? show.genres : [],
        rating: show.rating?.average ?? undefined,
        network: show.network?.name || show.webChannel?.name,
        image: show.image?.original || show.image?.medium,
        summary: cleanSummary || 'Aucun synopsis disponible.',
      };
    } catch {
      return null;
    }
  }

  async getMovie(query: string): Promise<MovieResult | null> {
    try {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query.trim())}&limit=5&namespace=0&format=json`,
        {
          headers: {
            'User-Agent': 'EthoneBot/1.75.0 (https://ethone.dev; contact@ethone.dev)',
          },
        }
      );
      if (!searchRes.ok) return null;
      const searchData = (await searchRes.json()) as any;
      const titles = searchData[1];
      if (!Array.isArray(titles) || titles.length === 0) return null;

      const targetTitle = titles.find((t: string) => t.toLowerCase().includes('film') || t.toLowerCase().includes('movie')) || titles[0];

      const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(targetTitle)}`, {
        headers: {
          'User-Agent': 'EthoneBot/1.75.0 (https://ethone.dev; contact@ethone.dev)',
        },
      });
      if (!summaryRes.ok) return null;
      const summary = (await summaryRes.json()) as any;

      const yearMatch = (summary.description || '').match(/\b(19\d\d|20\d\d)\b/) || (summary.extract || '').match(/\b(19\d\d|20\d\d)\b/);

      return {
        title: summary.title || targetTitle,
        description: summary.description || 'Film',
        poster: summary.originalimage?.source || summary.thumbnail?.source,
        synopsis: summary.extract || 'Aucun résumé disponible.',
        url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(targetTitle)}`,
        year: yearMatch ? yearMatch[1] : undefined,
      };
    } catch {
      return null;
    }
  }

  async getGame(query: string): Promise<GameResult | null> {
    try {
      const searchRes = await fetch(
        `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query.trim())}&limit=5`,
        {
          headers: {
            'User-Agent': 'EthoneBot/1.75.0 (contact@ethone.dev)',
          },
        }
      );
      if (!searchRes.ok) return null;
      const games = await searchRes.json();
      if (!Array.isArray(games) || games.length === 0) return null;

      const best = games[0];
      const result: GameResult = {
        gameId: String(best.gameID),
        title: best.external || query,
        thumb: best.thumb,
        cheapestPrice: best.cheapest ? `${best.cheapest} €` : undefined,
        steamAppId: best.steamAppID || undefined,
      };

      if (best.steamAppID) {
        try {
          const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${best.steamAppID}`);
          if (steamRes.ok) {
            const steamData = (await steamRes.json()) as any;
            const details = steamData[best.steamAppID]?.data;
            if (details) {
              result.title = details.name || result.title;
              result.thumb = details.header_image || details.capsule_image || result.thumb;
              result.description = details.short_description;
              result.releaseDate = details.release_date?.date;
              result.developers = Array.isArray(details.developers) ? details.developers.join(', ') : undefined;
              result.publishers = Array.isArray(details.publishers) ? details.publishers.join(', ') : undefined;
              result.metacriticScore = details.metacritic?.score;
              result.platforms = details.platforms;
              result.website = details.website || `https://store.steampowered.com/app/${best.steamAppID}`;
            }
          }
        } catch {}
      }

      return result;
    } catch {
      return null;
    }
  }

  async searchImages(query: string, limit: number = 6): Promise<ImageSearchResult[]> {
    try {
      const res = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          query.trim()
        )}&gsrnamespace=6&prop=imageinfo&iiprop=url|thumburl|dimensions&iiurlwidth=600&format=json&origin=*`,
        {
          headers: {
            'User-Agent': 'EthoneBot/1.75.0 (contact@ethone.dev)',
          },
        }
      );
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      const pages = data.query?.pages;
      if (!pages) return [];

      const results: ImageSearchResult[] = [];
      for (const pageId of Object.keys(pages)) {
        const p = pages[pageId];
        const info = p.imageinfo?.[0];
        if (!info || !info.thumburl) continue;

        const cleanTitle = (p.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

        results.push({
          title: cleanTitle || query,
          thumbUrl: info.thumburl,
          fullUrl: info.url || info.thumburl,
          width: info.width,
          height: info.height,
          sourceUrl: info.descriptionurl,
        });

        if (results.length >= limit) break;
      }

      return results;
    } catch {
      return [];
    }
  }

  getReverseImageLinks(imageUrl: string): ReverseImageLinks {
    const encoded = encodeURIComponent(imageUrl.trim());
    return {
      url: imageUrl.trim(),
      googleLens: `https://lens.google.com/uploadbyurl?url=${encoded}`,
      bingVisual: `https://www.bing.com/images/search?view=detailv2&iss=sbi&FORM=SBIHMP&sbisrc=UrlPaste&q=imgurl:${encoded}`,
      tinEye: `https://tineye.com/search?url=${encoded}`,
      yandex: `https://yandex.com/images/search?rpt=imageview&url=${encoded}`,
      sauceNao: `https://saucenao.com/search.php?db=999&url=${encoded}`,
    };
  }
}

export const funService = new FunService();
