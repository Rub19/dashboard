"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Disc,
  ExternalLink,
  Film,
  Gamepad2,
  Image as ImageIcon,
  Music,
  Quote,
  Radio,
  Search,
  Tv,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import ClientImage from "@/components/ClientImage";
import { ConsolePage, Panel, Segmented } from "../kit";

interface FunCommandMeta {
  name: string;
  description: string;
  argumentName: string;
  syntax: string;
  example: string;
  category: string;
  icon: any;
}

const FUN_COMMANDS: FunCommandMeta[] = [
  {
    name: "lyrics",
    description: "Gets lyrics for the given song",
    argumentName: "query",
    syntax: "/lyrics query:<titre>",
    example: "/lyrics Bohemian Rhapsody",
    category: "Musique",
    icon: Music,
  },
  {
    name: "quote",
    description: "Quote a message",
    argumentName: "text",
    syntax: "/quote text:<message> [author:<auteur>]",
    example: "/quote text:La simplicité est la sophistication suprême",
    category: "Social",
    icon: Quote,
  },
  {
    name: "image",
    description: "Search Google for an image",
    argumentName: "search",
    syntax: "/image search:<recherche>",
    example: "/image search:cyberpunk neon city",
    category: "Médias",
    icon: ImageIcon,
  },
  {
    name: "duckduckgoimage",
    description: "Search duckduckgo for an image",
    argumentName: "search",
    syntax: "/duckduckgoimage search:<recherche>",
    example: "/duckduckgoimage search:aurora borealis",
    category: "Médias",
    icon: ImageIcon,
  },
  {
    name: "reverseimage",
    description: "Reverse Images on Google",
    argumentName: "url",
    syntax: "/reverseimage url:<lien_image>",
    example: "/reverseimage url:https://example.com/art.png",
    category: "Outils",
    icon: ExternalLink,
  },
  {
    name: "tvshow",
    description: "Returns information about the specified TV show title given",
    argumentName: "title",
    syntax: "/tvshow title:<nom_série>",
    example: "/tvshow title:Breaking Bad",
    category: "Cinéma & TV",
    icon: Tv,
  },
  {
    name: "movie",
    description: "Returns information about the specified movie title given",
    argumentName: "title",
    syntax: "/movie title:<nom_film>",
    example: "/movie title:Inception",
    category: "Cinéma & TV",
    icon: Film,
  },
  {
    name: "game",
    description: "Returns information about the specified game title given",
    argumentName: "title",
    syntax: "/game title:<nom_jeu>",
    example: "/game title:Cyberpunk 2077",
    category: "Jeux Vidéo",
    icon: Gamepad2,
  },
  {
    name: "lastfm",
    description: "Integrate your Last.fm account and view listening stats",
    argumentName: "subcommand",
    syntax: "/lastfm nowplaying [username:<pseudo>]",
    example: "/lastfm nowplaying username:rj",
    category: "Last.fm",
    icon: Radio,
  },
  {
    name: "lastfm recent",
    description: "View your recent tracks on Last.fm",
    argumentName: "limit",
    syntax: "/lastfm recent [limit:<1-10>] [username:<pseudo>]",
    example: "/lastfm recent limit:5",
    category: "Last.fm",
    icon: Disc,
  },
  {
    name: "lastfm topartists",
    description: "View your most listened to artists",
    argumentName: "period",
    syntax: "/lastfm topartists [period:<7day|1month|overall>]",
    example: "/lastfm topartists period:7day",
    category: "Last.fm",
    icon: Music,
  },
  {
    name: "lastfm taste",
    description: "Compare your music taste with another member",
    argumentName: "target",
    syntax: "/lastfm taste target:<@membre>",
    example: "/lastfm taste target:@Alex",
    category: "Last.fm",
    icon: Radio,
  },
  {
    name: "lastfm user",
    description: "View Last.fm profile stats and total scrobbles",
    argumentName: "username",
    syntax: "/lastfm user [username:<pseudo>]",
    example: "/lastfm user username:rj",
    category: "Last.fm",
    icon: ExternalLink,
  },
];

export default function ConsoleFun({ guildId: _guildId }: { guildId?: string } = {}) {
  const [tab, setTab] = useState<string>("catalog");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const toast = useToast();

  const [lyricsQuery, setLyricsQuery] = useState("Bohemian Rhapsody");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsData, setLyricsData] = useState<any>(null);

  const [quoteText, setQuoteText] = useState("La simplicité est la sophistication suprême.");
  const [quoteAuthor, setQuoteAuthor] = useState("Léonard de Vinci");

  const [imageQuery, setImageQuery] = useState("Cyberpunk neon");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResults, setImageResults] = useState<any[]>([]);

  const [reverseUrl, setReverseUrl] = useState("https://images.unsplash.com/photo-1579783900882-c0d3dad7b119");

  const [tvQuery, setTvQuery] = useState("Breaking Bad");
  const [tvLoading, setTvLoading] = useState(false);
  const [tvData, setTvData] = useState<any>(null);

  const [movieQuery, setMovieQuery] = useState("Inception");
  const [movieLoading, setMovieLoading] = useState(false);
  const [movieData, setMovieData] = useState<any>(null);

  const [gameQuery, setGameQuery] = useState("Cyberpunk 2077");
  const [gameLoading, setGameLoading] = useState(false);
  const [gameData, setGameData] = useState<any>(null);

  const [lastfmUsername, setLastfmUsername] = useState("rj");
  const [lastfmLoading, setLastfmLoading] = useState(false);
  const [lastfmNowPlaying, setLastfmNowPlaying] = useState<any>(null);
  const [lastfmRecent, setLastfmRecent] = useState<any[]>([]);
  const [lastfmTopArtists, setLastfmTopArtists] = useState<any[]>([]);

  const copyToClipboard = useCallback(
    (textToCopy: string, cmdName: string) => {
      navigator.clipboard.writeText(textToCopy);
      setCopiedCmd(cmdName);
      toast.show({
        type: "success",
        title: "Copié dans le presse-papier",
        message: textToCopy,
      });
      setTimeout(() => setCopiedCmd(null), 2000);
    },
    [toast]
  );

  const searchLyrics = useCallback(async () => {
    if (!lyricsQuery.trim()) return;
    setLyricsLoading(true);
    setLyricsData(null);
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(lyricsQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const match = data.find((d: any) => d.plainLyrics || d.syncedLyrics) || data[0];
          setLyricsData({
            trackName: match.trackName || match.name || lyricsQuery,
            artistName: match.artistName || "Artiste inconnu",
            albumName: match.albumName,
            duration: match.duration,
            lyrics: match.plainLyrics || (match.syncedLyrics ? match.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, "") : "Pas de paroles textuelles disponibles."),
          });
        } else {
          toast.show({ type: "error", title: "Aucune parole trouvée", message: lyricsQuery });
        }
      }
    } catch {
      toast.show({ type: "error", title: "Erreur réseau", message: "Impossible de joindre le service de paroles." });
    } finally {
      setLyricsLoading(false);
    }
  }, [lyricsQuery, toast]);

  const searchTvShow = useCallback(async () => {
    if (!tvQuery.trim()) return;
    setTvLoading(true);
    setTvData(null);
    try {
      const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(tvQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const s = data[0].show;
          setTvData({
            title: s.name,
            image: s.image?.original || s.image?.medium,
            rating: s.rating?.average,
            genres: s.genres || [],
            status: s.status,
            premiered: s.premiered,
            network: s.network?.name || s.webChannel?.name,
            url: s.url,
            summary: (s.summary || "").replace(/<[^>]+>/g, "").trim(),
          });
        } else {
          toast.show({ type: "error", title: "Aucune série trouvée", message: tvQuery });
        }
      }
    } catch {
      toast.show({ type: "error", title: "Erreur", message: "Impossible de charger les données TV." });
    } finally {
      setTvLoading(false);
    }
  }, [tvQuery, toast]);

  const searchMovie = useCallback(async () => {
    if (!movieQuery.trim()) return;
    setMovieLoading(true);
    setMovieData(null);
    try {
      const openRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(movieQuery.trim())}&limit=5&namespace=0&format=json&origin=*`
      );
      if (openRes.ok) {
        const openData = await openRes.json();
        const titles = openData[1];
        if (Array.isArray(titles) && titles.length > 0) {
          const target = titles.find((t: string) => t.toLowerCase().includes("film") || t.toLowerCase().includes("movie")) || titles[0];
          const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(target)}`);
          if (summaryRes.ok) {
            const summary = await summaryRes.json();
            setMovieData({
              title: summary.title || target,
              description: summary.description || "Film",
              poster: summary.originalimage?.source || summary.thumbnail?.source,
              synopsis: summary.extract || "Aucun synopsis.",
              url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(target)}`,
            });
          }
        } else {
          toast.show({ type: "error", title: "Aucun film trouvé", message: movieQuery });
        }
      }
    } catch {
      toast.show({ type: "error", title: "Erreur", message: "Impossible de joindre le répertoire cinéma." });
    } finally {
      setMovieLoading(false);
    }
  }, [movieQuery, toast]);

  const searchGame = useCallback(async () => {
    if (!gameQuery.trim()) return;
    setGameLoading(true);
    setGameData(null);
    try {
      const cheapRes = await fetch(
        `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameQuery.trim())}&limit=3`
      );
      if (cheapRes.ok) {
        const list = await cheapRes.json();
        if (Array.isArray(list) && list.length > 0) {
          const best = list[0];
          const partial: any = {
            title: best.external,
            thumb: best.thumb,
            cheapestPrice: best.cheapest,
            steamAppId: best.steamAppID,
          };
          if (best.steamAppID) {
            try {
              const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${best.steamAppID}`);
              if (steamRes.ok) {
                const steamData = await steamRes.json();
                const d = steamData[best.steamAppID]?.data;
                if (d) {
                  partial.title = d.name || partial.title;
                  partial.thumb = d.header_image || d.capsule_image || partial.thumb;
                  partial.description = d.short_description;
                  partial.releaseDate = d.release_date?.date;
                  partial.metacritic = d.metacritic?.score;
                  partial.developers = (d.developers || []).join(", ");
                }
              }
            } catch {}
          }
          setGameData(partial);
        } else {
          toast.show({ type: "error", title: "Aucun jeu trouvé", message: gameQuery });
        }
      }
    } catch {
      toast.show({ type: "error", title: "Erreur", message: "Impossible de charger les données du jeu." });
    } finally {
      setGameLoading(false);
    }
  }, [gameQuery, toast]);

  const searchImages = useCallback(async () => {
    if (!imageQuery.trim()) return;
    setImageLoading(true);
    setImageResults([]);
    try {
      const res = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          imageQuery.trim()
        )}&gsrnamespace=6&prop=imageinfo&iiprop=url|thumburl|dimensions&iiurlwidth=600&format=json&origin=*`
      );
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          const list = [];
          for (const k of Object.keys(pages)) {
            const info = pages[k].imageinfo?.[0];
            if (info?.thumburl) {
              list.push({
                title: (pages[k].title || "").replace(/^File:/i, "").replace(/\.[^/.]+$/, "").replace(/_/g, " "),
                thumb: info.thumburl,
                full: info.url || info.thumburl,
                width: info.width,
                height: info.height,
              });
            }
          }
          setImageResults(list);
        }
      }
    } catch {
      toast.show({ type: "error", title: "Erreur", message: "Impossible de rechercher les images." });
    } finally {
      setImageLoading(false);
    }
  }, [imageQuery, toast]);

  const searchLastfm = useCallback(
    async (explicitUser?: string) => {
      const user = (explicitUser || lastfmUsername).trim();
      if (!user) return;
      setLastfmLoading(true);
      try {
        const [npRes, recentRes, topRes] = await Promise.allSettled([
          fetch(
            `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/now-playing?source=lastfm&username=${encodeURIComponent(
              user
            )}`
          ),
          fetch(
            `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/lastfm/recent-tracks?username=${encodeURIComponent(
              user
            )}&limit=5`
          ),
          fetch(
            `https://raspy-fog-bf5b.rub19-mailpro.workers.dev/api/lastfm/top-artists?username=${encodeURIComponent(
              user
            )}&period=7day&limit=5`
          ),
        ]);

        if (npRes.status === "fulfilled" && npRes.value.ok) {
          const body = await npRes.value.json();
          setLastfmNowPlaying(body?.data?.track || null);
        } else {
          setLastfmNowPlaying(null);
        }

        if (recentRes.status === "fulfilled" && recentRes.value.ok) {
          const body = await recentRes.value.json();
          setLastfmRecent(Array.isArray(body?.data) ? body.data : []);
        } else {
          setLastfmRecent([]);
        }

        if (topRes.status === "fulfilled" && topRes.value.ok) {
          const body = await topRes.value.json();
          setLastfmTopArtists(Array.isArray(body?.data) ? body.data : []);
        } else {
          setLastfmTopArtists([]);
        }
      } catch {
        toast.show({ type: "error", title: "Erreur Last.fm", message: "Impossible de joindre le service Last.fm." });
      } finally {
        setLastfmLoading(false);
      }
    },
    [lastfmUsername, toast]
  );

  return (
    <ConsolePage title="Fun & Médias">
      <div className="space-y-6">
        <p className="text-xs text-[var(--text-muted)]">
          Commandes interactives de divertissement et médias : Last.fm, paroles, citations, recherche d'images, films, séries TV et base de jeux vidéo.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Catégories Fun"
            options={[
              ["catalog", "Catalogue des Commandes"],
              ["lastfm", "Studio Last.fm"],
              ["lyrics", "Paroles (Lyrics)"],
              ["quote", "Citations (Quote)"],
              ["images", "Images & Google"],
              ["reverse", "Recherche Inversée"],
              ["cinema", "Séries TV & Cinéma"],
              ["game", "Jeux Vidéo"],
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            API & Bot synchronisés
          </div>
        </div>

        {tab === "catalog" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FUN_COMMANDS.map((cmd) => {
              const IconComponent = cmd.icon;
              const isCopied = copiedCmd === cmd.name;
              return (
                <motion.div
                  key={cmd.name}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/90 p-5 shadow-lg backdrop-blur-md transition-shadow hover:shadow-xl hover:border-amber-400/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 group-hover:bg-amber-400/20 transition-colors">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <h3 className="font-mono text-base font-bold text-[var(--text-primary)]">{cmd.name}</h3>
                      </div>
                      <button
                        onClick={() => copyToClipboard(cmd.syntax, cmd.name)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Copier la commande"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-emerald-400 animate-bounce" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{cmd.description}</p>
                  </div>

                  <div className="mt-6 space-y-3 pt-4 border-t border-[var(--panel-border)]/50">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">arguments</p>
                      <span className="inline-block rounded-md bg-[var(--surface-sunken)] px-2.5 py-1 font-mono text-[11px] italic text-[var(--text-secondary)] border border-[var(--panel-border)]">
                        {cmd.argumentName}
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">permissions</p>
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">none</span>
                    </div>

                    <div className="pt-1">
                      <p className="font-mono text-[10px] text-[var(--text-muted)]/70 truncate">{cmd.syntax}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {tab === "lastfm" && (
          <Panel
            title="Studio Last.fm (/lastfm)"
            subtitle="Scrobbles réels, lecture en direct, historique et artistes les plus écoutés connectés à l'API Last.fm."
          >
            <div className="space-y-6 p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={lastfmUsername}
                  onChange={(e) => setLastfmUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLastfm()}
                  placeholder="Pseudo Last.fm (ex: rj)..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#d51007] font-mono"
                />
                <button
                  onClick={() => searchLastfm()}
                  disabled={lastfmLoading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#d51007]/20 border border-[#d51007]/40 px-5 py-2 text-xs font-semibold text-rose-300 hover:bg-[#d51007]/30 transition-colors"
                >
                  {lastfmLoading ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : (
                    <Radio className="h-4 w-4 text-[#d51007]" />
                  )}
                  <span>Interroger Last.fm</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>Comptes suggérés :</span>
                {["rj", "ethone"].map((u) => (
                  <button
                    key={u}
                    onClick={() => {
                      setLastfmUsername(u);
                      searchLastfm(u);
                    }}
                    className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[11px] font-mono text-[var(--text-secondary)] hover:border-[#d51007]/40 hover:text-rose-300 transition-colors"
                  >
                    @{u}
                  </button>
                ))}
              </div>

              {lastfmNowPlaying ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-[#d51007]/30 bg-gradient-to-br from-[#d51007]/10 via-[var(--surface-sunken)] to-[var(--surface-raised)] p-5 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d51007]/30 bg-[#d51007]/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
                        {lastfmNowPlaying.playing ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            En direct sur Last.fm
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            Dernier scrobble
                          </>
                        )}
                      </span>
                      <div className="flex items-end gap-1">
                        {[0.5, 1, 0.4, 0.8, 0.6].map((h, i) => (
                          <motion.span
                            key={i}
                            className="w-1 rounded-full bg-[#d51007]"
                            animate={{ height: lastfmNowPlaying.playing ? [4, 14 * h, 4] : 4 }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      {lastfmNowPlaying.artworkUrl ? (
                        <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-black/50">
                          <ClientImage src={lastfmNowPlaying.artworkUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#d51007]/30 bg-[#d51007]/10 text-[#d51007]">
                          <Disc className="h-8 w-8" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-white truncate">{lastfmNowPlaying.name}</h4>
                        <p className="text-sm font-semibold text-rose-300 truncate">{lastfmNowPlaying.artist}</p>
                        {lastfmNowPlaying.album && (
                          <p className="text-xs text-[var(--text-muted)] truncate">{lastfmNowPlaying.album}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--panel-border)]/60 pt-4">
                      {lastfmNowPlaying.profileUrl && (
                        <a
                          href={lastfmNowPlaying.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-white transition-colors"
                        >
                          Last.fm ↗
                        </a>
                      )}
                      <a
                        href={`https://open.spotify.com/search/${encodeURIComponent(
                          `${lastfmNowPlaying.artist} ${lastfmNowPlaying.name}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      >
                        Spotify ↗
                      </a>
                      <button
                        onClick={() => copyToClipboard(`/lastfm nowplaying username:${lastfmUsername}`, "lastfm-np")}
                        className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-2.5 py-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        {copiedCmd === "lastfm-np" ? "✓ Copié" : "/lastfm nowplaying"}
                      </button>
                    </div>
                  </div>

                  {lastfmTopArtists.length > 0 && (
                    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                        Top Artistes de la semaine
                      </h4>
                      <div className="space-y-2">
                        {lastfmTopArtists.map((artist, idx) => (
                          <div
                            key={artist.name}
                            className="flex items-center justify-between rounded-lg bg-[var(--surface-raised)]/60 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] text-[var(--text-muted)]">#{idx + 1}</span>
                              <span className="font-bold text-[var(--text-primary)] truncate">{artist.name}</span>
                            </div>
                            <span className="font-mono text-[11px] text-rose-300 shrink-0">
                              {artist.playCount} écoutes
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--panel-border)] p-8 text-center text-xs text-[var(--text-muted)]">
                  <Radio className="mx-auto h-8 w-8 text-[#d51007]/50 mb-2" />
                  <p>Entre un pseudo Last.fm ci-dessus pour inspecter son profil en direct.</p>
                </div>
              )}

              {lastfmRecent.length > 0 && (
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Historique des scrobbles récents
                  </h4>
                  <div className="divide-y divide-[var(--panel-border)]/40">
                    {lastfmRecent.map((track, i) => (
                      <div key={`${track.name}-${i}`} className="flex items-center justify-between py-2.5 text-xs">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="font-bold text-[var(--text-primary)] truncate">{track.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">{track.artist}</p>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
                          {track.playing ? "🟢 En cours" : "Écouté"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Commandes Discord Fun & Médias
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    "/lastfm nowplaying",
                    "/lastfm recent limit:5",
                    "/lastfm topartists period:7day",
                    "/lastfm toptracks",
                    "/lastfm topalbums",
                    "/lastfm taste target:@Alex",
                    "/lastfm login username:rj",
                  ].map((syntax) => (
                    <button
                      key={syntax}
                      onClick={() => copyToClipboard(syntax, syntax)}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)] hover:border-[#d51007]/40 hover:text-white transition-colors"
                    >
                      {copiedCmd === syntax ? "✓ Copié !" : syntax}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {tab === "lyrics" && (
          <Panel title="Studio Paroles (Lyrics)" subtitle="Recherche instantanée de paroles avec synchronisation et durée.">
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lyricsQuery}
                  onChange={(e) => setLyricsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLyrics()}
                  placeholder="Titre du morceau ou artiste..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  onClick={searchLyrics}
                  disabled={lyricsLoading}
                  className="flex items-center gap-2 rounded-lg bg-amber-400/20 border border-amber-400/40 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-400/30 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  {lyricsLoading ? "Recherche..." : "Rechercher"}
                </button>
              </div>

              {lyricsData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-6 space-y-4"
                >
                  <div className="border-b border-[var(--panel-border)] pb-3">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{lyricsData.trackName}</h3>
                    <p className="text-xs text-amber-400 font-semibold">{lyricsData.artistName}</p>
                    {lyricsData.albumName && (
                      <p className="text-[11px] text-[var(--text-muted)] italic">{lyricsData.albumName}</p>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto whitespace-pre-line font-mono text-xs text-[var(--text-secondary)] leading-relaxed pr-2 select-text">
                    {lyricsData.lyrics}
                  </div>
                </motion.div>
              )}
            </div>
          </Panel>
        )}

        {tab === "quote" && (
          <Panel title="Générateur de Citations (Quote)" subtitle="Prévisualisation en temps réel du rendu Discord de la commande /quote.">
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Texte de la citation</label>
                  <textarea
                    rows={3}
                    value={quoteText}
                    onChange={(e) => setQuoteText(e.target.value)}
                    className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Auteur de la citation</label>
                  <input
                    type="text"
                    value={quoteAuthor}
                    onChange={(e) => setQuoteAuthor(e.target.value)}
                    className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Aperçu Embed Discord :</p>
                <div className="rounded-xl border border-blue-500/30 bg-[#2b2d31] p-4 text-white max-w-xl shadow-lg">
                  <div className="border-l-4 border-blue-500 pl-3 space-y-2">
                    <p className="text-sm italic text-zinc-200">« {quoteText} »</p>
                    <div className="flex items-center gap-2 pt-2 text-xs text-zinc-400">
                      <div className="h-4 w-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                        E
                      </div>
                      <span>— {quoteAuthor || "Anonyme"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {tab === "images" && (
          <Panel title="Recherche d'Images (Image & DuckDuckGo)" subtitle="Moteur de recherche d'images en ligne avec affichage en grille animée.">
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchImages()}
                  placeholder="Sujet de recherche d'image..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  onClick={searchImages}
                  disabled={imageLoading}
                  className="flex items-center gap-2 rounded-lg bg-amber-400/20 border border-amber-400/40 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-400/30 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  {imageLoading ? "Recherche..." : "Trouver"}
                </button>
              </div>

              {imageResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                  {imageResults.map((img, idx) => (
                    <motion.a
                      key={idx}
                      href={img.full}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03 }}
                      className="group relative block aspect-video overflow-hidden rounded-xl border border-[var(--panel-border)] bg-black/40"
                    >
                      <ClientImage src={img.thumb} alt={img.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                        <p className="truncate text-[10px] text-white font-medium">{img.title}</p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        )}

        {tab === "reverse" && (
          <Panel title="Recherche Inversée d'Image (Reverse Image)" subtitle="Analysez une image via Google Lens, Bing Visual Search, TinEye, Yandex et SauceNAO.">
            <div className="space-y-5 p-5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">URL publique de l'image</label>
                <input
                  type="text"
                  value={reverseUrl}
                  onChange={(e) => setReverseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {reverseUrl.startsWith("http") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  <div className="rounded-xl border border-[var(--panel-border)] overflow-hidden bg-black/30 aspect-video flex items-center justify-center">
                    <ClientImage src={reverseUrl} alt="Aperçu" className="h-full w-full object-contain" />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">Ouvrir la recherche inversée directe :</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(reverseUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
                      >
                        Google Lens ↗
                      </a>
                      <a
                        href={`https://www.bing.com/images/search?view=detailv2&iss=sbi&FORM=SBIHMP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(reverseUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20"
                      >
                        Bing Visual ↗
                      </a>
                      <a
                        href={`https://tineye.com/search?url=${encodeURIComponent(reverseUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                      >
                        TinEye ↗
                      </a>
                      <a
                        href={`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(reverseUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                      >
                        Yandex Images ↗
                      </a>
                      <a
                        href={`https://saucenao.com/search.php?db=999&url=${encodeURIComponent(reverseUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20"
                      >
                        SauceNAO (Anime/Art) ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        {tab === "cinema" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="Séries TV (/tvshow)" subtitle="Recherche officielle TVMaze avec notes, saisons et statuts.">
              <div className="space-y-4 p-5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tvQuery}
                    onChange={(e) => setTvQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchTvShow()}
                    placeholder="Nom de la série..."
                    className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-400 font-mono"
                  />
                  <button
                    onClick={searchTvShow}
                    disabled={tvLoading}
                    className="rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-3.5 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/30"
                  >
                    {tvLoading ? "..." : "Voir"}
                  </button>
                </div>

                {tvData && (
                  <div className="flex gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-4">
                    {tvData.image && (
                      <div className="h-32 w-24 shrink-0 rounded-lg overflow-hidden bg-black/40">
                        <ClientImage src={tvData.image} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{tvData.title}</h4>
                      <p className="text-[11px] text-indigo-400 font-medium">
                        {tvData.rating ? `⭐ ${tvData.rating}/10` : "Non noté"} • {tvData.premiered?.slice(0, 4)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-3">{tvData.summary}</p>
                      {tvData.genres.length > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">{tvData.genres.join(", ")}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Cinéma & Films (/movie)" subtitle="Fiches complètes Wikipédia & Cinéma avec affiches et synopsis.">
              <div className="space-y-4 p-5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={movieQuery}
                    onChange={(e) => setMovieQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchMovie()}
                    placeholder="Nom du film..."
                    className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-rose-400 font-mono"
                  />
                  <button
                    onClick={searchMovie}
                    disabled={movieLoading}
                    className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/30"
                  >
                    {movieLoading ? "..." : "Voir"}
                  </button>
                </div>

                {movieData && (
                  <div className="flex gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-4">
                    {movieData.poster && (
                      <div className="h-32 w-24 shrink-0 rounded-lg overflow-hidden bg-black/40">
                        <ClientImage src={movieData.poster} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{movieData.title}</h4>
                      <p className="text-[11px] text-rose-400 font-medium">{movieData.description}</p>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-3">{movieData.synopsis}</p>
                      <a
                        href={movieData.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-[10px] text-rose-400 hover:underline"
                      >
                        En savoir plus sur Wikipédia ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {tab === "game" && (
          <Panel title="Jeux Vidéo (/game)" subtitle="Recherche Steam & CheapShark avec jacquettes, notes Metacritic et développeurs.">
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gameQuery}
                  onChange={(e) => setGameQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchGame()}
                  placeholder="Nom du jeu vidéo..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-400 font-mono"
                />
                <button
                  onClick={searchGame}
                  disabled={gameLoading}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30"
                >
                  {gameLoading ? "..." : "Rechercher"}
                </button>
              </div>

              {gameData && (
                <div className="flex flex-col sm:flex-row gap-5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-5">
                  {gameData.thumb && (
                    <div className="h-36 w-full sm:w-60 shrink-0 rounded-lg overflow-hidden bg-black/40">
                      <ClientImage src={gameData.thumb} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-base text-[var(--text-primary)] truncate">{gameData.title}</h4>
                      {gameData.metacritic && (
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-400">
                          Metacritic: {gameData.metacritic}
                        </span>
                      )}
                    </div>
                    {gameData.developers && (
                      <p className="text-xs text-[var(--text-muted)]">Développeur : {gameData.developers}</p>
                    )}
                    {gameData.releaseDate && (
                      <p className="text-xs text-[var(--text-muted)]">Sortie : {gameData.releaseDate}</p>
                    )}
                    {gameData.description && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-3">{gameData.description}</p>
                    )}
                    {gameData.steamAppId && (
                      <a
                        href={`https://store.steampowered.com/app/${gameData.steamAppId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline pt-1"
                      >
                        Page Steam Store ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </ConsolePage>
  );
}
