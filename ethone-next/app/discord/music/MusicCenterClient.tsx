"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ListMusic,
  Heart,
  Clock,
  Settings2,
  BarChart3,
  Search,
  Check,
  X,
  Radio,
  ExternalLink,
  Sparkles,
  GripVertical,
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Sliders,
  Shield,
  Music2,
  Disc,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration: number;
  thumbnail: string;
  url: string;
  source: string;
  requestedBy: {
    id: string;
    tag: string;
    avatar?: string | null;
  };
  addedAt: string;
}

interface GuildMusicState {
  guildId: string;
  voiceChannel: { id: string; name: string } | null;
  status: "PLAYING" | "PAUSED" | "IDLE" | "BUFFERING";
  currentTrack: Track | null;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  previousVolume: number;
  repeatMode: "OFF" | "SONG" | "QUEUE";
  shuffle: boolean;
  queue: Track[];
  queueLength: number;
  history: Track[];
  canSeek: boolean;
  updatedAt: string;
}

interface Playlist {
  id: string;
  name: string;
  guildId: string;
  createdBy: { id: string; tag: string };
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
}

interface MusicSettings {
  maxQueueSize: number;
  allowDuplicates: boolean;
  allowUserRemoveOwn: boolean;
  allowUserSkip: boolean;
  allowUserChangeVolume: boolean;
  djMode: boolean;
  djRoleId: string | null;
  autoDisconnectSeconds: number;
  autoplay: boolean;
  defaultVolume: number;
}

interface MusicStats {
  totalTracksPlayed: number;
  totalListeningSeconds: number;
  topTracks: Array<{ title: string; artist: string; count: number; thumbnail?: string }>;
  topRequesters: Array<{ userId: string; userTag: string; count: number }>;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function MusicCenterClient() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<"queue" | "playlists" | "favorites" | "history" | "settings" | "stats">("queue");
  const [musicState, setMusicState] = useState<GuildMusicState | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Add
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Playlists, Favorites, History, Settings, Stats
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [settings, setSettings] = useState<MusicSettings | null>(null);
  const [stats, setStats] = useState<MusicStats | null>(null);

  // New Playlist Modal
  const [isNewPlaylistOpen, setIsNewPlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Clear Queue Modal
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Local live position scrubber
  const [scrubberPos, setScrubberPos] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Fetch Music State
  const fetchState = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/state`);
      if (res.ok) {
        const data = await res.json();
        setMusicState(data.state);
        if (!isScrubbing) {
          setScrubberPos(data.state.position || 0);
        }
      }
    } catch (err) {
      console.warn("Erreur chargement state musique :", err);
    } finally {
      setLoading(false);
    }
  }, [guildId, isScrubbing]);

  // Polling state every 3 seconds for live sync
  useEffect(() => {
    if (!BOT_API_URL) {
      setLoading(false);
      return;
    }
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Local ticker for progress bar when playing
  useEffect(() => {
    if (musicState?.status !== "PLAYING" || isScrubbing) return;
    const ticker = setInterval(() => {
      setScrubberPos((prev) => {
        const dur = musicState.duration || 180;
        return prev < dur ? prev + 1 : dur;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [musicState?.status, musicState?.duration, isScrubbing]);

  // Load ancillary tab data
  useEffect(() => {
    if (!guildId || !BOT_API_URL) return;

    if (activeTab === "playlists") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists`)
        .then((r) => r.json())
        .then((d) => setPlaylists(d.playlists || []))
        .catch(() => {});
    } else if (activeTab === "favorites") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/favorites`)
        .then((r) => r.json())
        .then((d) => setFavorites(d.favorites || []))
        .catch(() => {});
    } else if (activeTab === "history") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/history`)
        .then((r) => r.json())
        .then((d) => setHistory(d.history || []))
        .catch(() => {});
    } else if (activeTab === "settings") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/settings`)
        .then((r) => r.json())
        .then((d) => setSettings(d.settings || null))
        .catch(() => {});
    } else if (activeTab === "stats") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/stats`)
        .then((r) => r.json())
        .then((d) => setStats(d.stats || null))
        .catch(() => {});
    }
  }, [guildId, activeTab]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch {
      showError("Recherche échouée", "Impossible de joindre le service audio.");
    } finally {
      setIsSearching(false);
    }
  };

  // Playback Control Actions
  const handlePlayQuery = async (query: string, playNext = false) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, playNext }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success("Musique lancée", data.track ? `Ajouté : ${data.track.title}` : "Titre en cours de lecture.");
        fetchState();
      } else {
        showError("Erreur lecture", data.error || "Impossible de lire ce titre.");
      }
    } catch {
      showError("Erreur réseau", "Impossible d'envoyer la commande de lecture.");
    }
  };

  const handlePlayPause = async () => {
    if (!musicState) return;
    const isPlaying = musicState.status === "PLAYING";
    const endpoint = isPlaying ? "pause" : "resume";
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/${endpoint}`, { method: "POST" });
      fetchState();
    } catch {
      showError("Erreur", "Action impossible.");
    }
  };

  const handleSkip = async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/skip`, { method: "POST" });
      const data = await res.json();
      if (data.nextTrack) {
        success("Piste suivante", data.nextTrack.title);
      } else {
        success("File terminée", "Aucun titre supplémentaire en attente.");
      }
      fetchState();
    } catch {
      showError("Erreur", "Impossible de passer le titre.");
    }
  };

  const handlePrevious = async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/previous`, { method: "POST" });
      const data = await res.json();
      if (data.prevTrack) {
        success("Piste précédente", data.prevTrack.title);
      }
      fetchState();
    } catch {
      showError("Erreur", "Impossible de revenir en arrière.");
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/stop`, { method: "POST" });
      success("Lecteur arrêté", "La musique a été stoppée et la file réinitialisée.");
      fetchState();
    } catch {
      showError("Erreur", "Impossible d'arrêter le lecteur.");
    }
  };

  const handleSeek = async (val: number) => {
    setScrubberPos(val);
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/seek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: val }),
      });
      fetchState();
    } catch {
      showError("Erreur", "Seek indisponible.");
    }
  };

  const handleVolume = async (vol: number) => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/volume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: vol }),
      });
      fetchState();
    } catch {
      showError("Erreur", "Impossible de changer le volume.");
    }
  };

  const handleMute = async () => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/mute`, { method: "POST" });
      fetchState();
    } catch {
      showError("Erreur", "Action muet impossible.");
    }
  };

  const handleShuffle = async () => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/shuffle`, { method: "POST" });
      success("File mélangée", "L'ordre des pistes a été réorganisé aléatoirement.");
      fetchState();
    } catch {
      showError("Erreur", "Impossible de mélanger la file.");
    }
  };

  const handleCycleRepeat = async () => {
    if (!musicState) return;
    const nextMode = musicState.repeatMode === "OFF" ? "SONG" : musicState.repeatMode === "SONG" ? "QUEUE" : "OFF";
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      fetchState();
    } catch {
      showError("Erreur", "Impossible de changer la répétition.");
    }
  };

  const handleToggleFavorite = async (track: Track) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, userId: "dashboard" }),
      });
      const data = await res.json();
      if (data.isFavorite) {
        success("Favori ajouté", `"${track.title}" a été ajouté à vos favoris ❤️.`);
      } else {
        success("Favori retiré", `"${track.title}" a été retiré de vos favoris.`);
      }
      setFavorites(data.favorites || []);
    } catch {
      showError("Erreur", "Action favori impossible.");
    }
  };

  // Queue drag & drop reorder
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIndex) || fromIndex === toIndex) return;

    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/queue/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromIndex, toIndex }),
      });
      fetchState();
    } catch {
      showError("Erreur", "Impossible de déplacer le titre.");
    }
  };

  const handleRemoveQueueItem = async (index: number) => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/queue/${index}`, { method: "DELETE" });
      fetchState();
    } catch {
      showError("Erreur", "Impossible de retirer le titre.");
    }
  };

  const handleClearQueue = async () => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/queue/clear`, { method: "POST" });
      success("File vidée", "Tous les titres en attente ont été retirés.");
      setIsClearConfirmOpen(false);
      fetchState();
    } catch {
      showError("Erreur", "Impossible de vider la file.");
    }
  };

  // Playlist create
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName.trim(), tracks: musicState?.queue || [] }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists((p) => [...p, data.playlist]);
        setNewPlaylistName("");
        setIsNewPlaylistOpen(false);
        success("Playlist créée", `Playlist "${data.playlist.name}" enregistrée.`);
      }
    } catch {
      showError("Erreur", "Impossible de créer la playlist.");
    }
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists/${playlistId}/play`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        success("Playlist lancée", `${data.count} titre(s) chargé(s) dans le lecteur.`);
        fetchState();
      }
    } catch {
      showError("Erreur", "Impossible de lancer la playlist.");
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists/${playlistId}`, { method: "DELETE" });
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      success("Playlist supprimée", "La playlist a été retirée.");
    } catch {
      showError("Erreur", "Impossible de supprimer la playlist.");
    }
  };

  // Save Settings
  const handleSaveSettings = async (patch: Partial<MusicSettings>) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        success("Configuration enregistrée", "Paramètres musicaux mis à jour.");
      }
    } catch {
      showError("Erreur", "Impossible d'enregistrer les paramètres.");
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const currentTrack = musicState?.currentTrack;
  const isPlaying = musicState?.status === "PLAYING";
  const duration = musicState?.duration || currentTrack?.duration || 180;
  const isFav = currentTrack ? favorites.some((f) => f.id === currentTrack.id || f.url === currentTrack.url) : false;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#07080A] text-zinc-100 font-sans">
      {/* TOP HEADER */}
      <header className="shrink-0 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/discord?guildId=${guildId}`}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Music Center 2.0</span>
                  <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                </h1>
                <span
                  className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                    isPlaying
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : musicState?.status === "PAUSED"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  )}
                >
                  {musicState?.status || "IDLE"}
                </span>
                {musicState?.voiceChannel && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    🔊 {musicState.voiceChannel.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Lecteur audio haute performance synchronisé en direct avec Discord
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchState}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* SCROLLABLE MAIN CONTENT */}
      <main className="flex-1 min-h-0 overflow-y-auto pb-36 px-4 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-white/10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* NOW PLAYING HERO BANNER */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/60 p-6 backdrop-blur-2xl shadow-2xl">
            {/* Ambient Background Glow */}
            {currentTrack?.thumbnail && (
              <div
                className="absolute inset-0 -z-10 opacity-20 blur-3xl scale-125 pointer-events-none"
                style={{
                  backgroundImage: `url(${currentTrack.thumbnail})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
            )}

            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Cover Art */}
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 shrink-0 rounded-2xl overflow-hidden border border-white/15 bg-zinc-900 shadow-2xl group">
                {currentTrack?.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <Disc className="h-12 w-12 animate-spin-slow" />
                    <span className="text-xs font-medium">Aucun titre</span>
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    EN COURS
                  </div>
                )}
              </div>

              {/* Title, Details, Scrubber, Controls */}
              <div className="flex-1 w-full space-y-4">
                {/* Title & Requester */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {currentTrack?.source || "AUDIO"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1 line-clamp-1">
                      {currentTrack ? currentTrack.title : "Aucune musique en cours"}
                    </h2>
                    <p className="text-sm font-medium text-zinc-400 line-clamp-1">
                      {currentTrack ? currentTrack.artist : "Lancez un titre via la recherche ou Discord"}
                    </p>
                  </div>

                  {currentTrack && (
                    <div className="flex items-center gap-2 self-start">
                      <button
                        onClick={() => handleToggleFavorite(currentTrack)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer",
                          isFav
                            ? "border-rose-500/40 bg-rose-500/20 text-rose-400"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        )}
                        title="Ajouter aux favoris"
                      >
                        <Heart className={cn("h-4 w-4", isFav && "fill-rose-400")} />
                      </button>
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Demandé par</span>
                        <p className="text-xs font-bold text-zinc-300">{currentTrack.requestedBy.tag}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* SEEK SCRUBBER */}
                <div className="space-y-1.5 pt-1">
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      value={scrubberPos}
                      onMouseDown={() => setIsScrubbing(true)}
                      onMouseUp={() => {
                        setIsScrubbing(false);
                        handleSeek(scrubberPos);
                      }}
                      onTouchStart={() => setIsScrubbing(true)}
                      onTouchEnd={() => {
                        setIsScrubbing(false);
                        handleSeek(scrubberPos);
                      }}
                      onChange={(e) => setScrubberPos(Number(e.target.value))}
                      disabled={!currentTrack}
                      className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer accent-violet-500 focus:outline-none disabled:opacity-40"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>{formatTime(scrubberPos)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* MASTER CONTROLS BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  {/* Playback buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      disabled={!musicState?.history || musicState.history.length === 0}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                      title="Précédent"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handlePlayPause}
                      disabled={!currentTrack}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-600/30 hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                      title={isPlaying ? "Mettre en pause" : "Lire"}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
                    </button>

                    <button
                      onClick={handleSkip}
                      disabled={!currentTrack}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                      title="Suivant"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handleStop}
                      disabled={!currentTrack && (!musicState?.queue || musicState.queue.length === 0)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-all cursor-pointer"
                      title="Arrêter et vider"
                    >
                      <Square className="h-4 w-4" />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

                    <button
                      onClick={handleShuffle}
                      className={cn(
                        "flex h-9 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                        musicState?.shuffle
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                      title="Mode Aléatoire"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Aléatoire</span>
                    </button>

                    <button
                      onClick={handleCycleRepeat}
                      className={cn(
                        "flex h-9 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                        musicState?.repeatMode !== "OFF"
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                      title="Mode de répétition"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-mono">{musicState?.repeatMode || "OFF"}</span>
                    </button>
                  </div>

                  {/* VOLUME CONTROLLER */}
                  <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-2xl">
                    <button
                      onClick={handleMute}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                      title={musicState?.muted ? "Activer le son" : "Couper le son"}
                    >
                      {musicState?.muted || (musicState?.volume || 0) === 0 ? (
                        <VolumeX className="h-4 w-4 text-rose-400" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-zinc-300" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicState?.muted ? 0 : musicState?.volume || 75}
                      onChange={(e) => handleVolume(Number(e.target.value))}
                      className="w-24 h-1 rounded-full bg-white/10 appearance-none cursor-pointer accent-violet-500"
                    />
                    <span className="w-9 text-right font-mono text-xs font-bold text-zinc-300">
                      {musicState?.muted ? "0%" : `${musicState?.volume || 75}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH & ADD MODAL / INPUT */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-md">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un titre, artiste ou coller un lien (YouTube, Spotify, SoundCloud)..."
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSearching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>Rechercher</span>
              </button>
            </form>

            {/* Quick Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">Résultats de recherche ({searchResults.length})</span>
                  <button
                    onClick={() => setSearchResults([])}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
                  {searchResults.map((tr) => (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/40 p-2.5 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tr.thumbnail}
                          alt={tr.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{tr.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {tr.artist} • {formatTime(tr.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlayQuery(tr.url || tr.title, false)}
                          className="flex h-7 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-bold text-white hover:bg-violet-500 transition-all cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          <span>Lire</span>
                        </button>
                        <button
                          onClick={() => handlePlayQuery(tr.url || tr.title, true)}
                          className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          title="Jouer juste après"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Suivant</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: "queue", label: `File d'attente (${musicState?.queueLength || 0})`, icon: ListMusic },
              { id: "playlists", label: `Playlists (${playlists.length})`, icon: Disc },
              { id: "favorites", label: `Favoris (${favorites.length})`, icon: Heart },
              { id: "history", label: `Historique (${history.length})`, icon: Clock },
              { id: "settings", label: "Mode DJ & Réglages", icon: Settings2 },
              { id: "stats", label: "Statistiques", icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                    isActive
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-md shadow-violet-500/5"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: QUEUE (DRAG & DROP) */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">À Suivre (Up Next)</h3>
                  <p className="text-xs text-zinc-400">Glissez-déposez les pistes pour réorganiser l'ordre de lecture.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsNewPlaylistOpen(true)}
                    disabled={!musicState?.queue || musicState.queue.length === 0}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Disc className="h-3.5 w-3.5" />
                    <span>Sauvegarder en Playlist</span>
                  </button>
                  <button
                    onClick={() => setIsClearConfirmOpen(true)}
                    disabled={!musicState?.queue || musicState.queue.length === 0}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Vider la file</span>
                  </button>
                </div>
              </div>

              {musicState?.queue && musicState.queue.length > 0 ? (
                <div className="space-y-2">
                  {musicState.queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/15 hover:bg-white/[0.04] transition-all cursor-move"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
                        <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500">
                          #{idx + 1}
                        </span>
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="h-10 w-10 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{track.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {track.artist} • Demandé par {track.requestedBy.tag}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-zinc-400 mr-2">
                          {formatTime(track.duration)}
                        </span>
                        <button
                          onClick={() => handleRemoveQueueItem(idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Retirer de la file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                  <Music2 className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs font-medium text-zinc-400">La file d'attente est actuellement vide.</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Utilisez la recherche ci-dessus pour ajouter des morceaux.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLAYLISTS */}
          {activeTab === "playlists" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Playlists du Serveur</h3>
                  <p className="text-xs text-zinc-400">Créez et lancez des sélections personnalisées.</p>
                </div>
                <button
                  onClick={() => setIsNewPlaylistOpen(true)}
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white hover:bg-violet-500 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Créer une Playlist</span>
                </button>
              </div>

              {playlists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate">{pl.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400">
                          {pl.tracks.length} titres
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Créée par {pl.createdBy.tag} • {new Date(pl.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <button
                          onClick={() => handlePlayPlaylist(pl.id)}
                          className="flex h-7 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-500 transition-all cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          <span>Lancer</span>
                        </button>
                        <button
                          onClick={() => handleDeletePlaylist(pl.id)}
                          className="text-zinc-500 hover:text-rose-400 text-xs transition-all cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                  <Disc className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs font-medium text-zinc-400">Aucune playlist enregistrée pour ce serveur.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === "favorites" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Vos Morceaux Favoris ({favorites.length})</h3>
                <p className="text-xs text-zinc-400">Accédez instantanément à vos titres préférés.</p>
              </div>

              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {favorites.map((tr) => (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tr.thumbnail}
                          alt={tr.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{tr.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{tr.artist} • {formatTime(tr.duration)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlayQuery(tr.url || tr.title)}
                          className="flex h-7 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-bold text-white hover:bg-violet-500 transition-all cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          <span>Lire</span>
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(tr)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Heart className="h-3.5 w-3.5 fill-rose-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                  <Heart className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs font-medium text-zinc-400">Aucun morceau favori pour le moment.</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Cliquez sur l'icône cœur pour en ajouter un.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Historique Récent ({history.length})</h3>
                <p className="text-xs text-zinc-400">Derniers morceaux diffusés sur le serveur.</p>
              </div>

              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((tr, idx) => (
                    <div
                      key={`${tr.id}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={tr.thumbnail}
                          alt={tr.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{tr.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {tr.artist} • Demandé par {tr.requestedBy.tag}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePlayQuery(tr.url || tr.title)}
                        className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Rejouer</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                  <Clock className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs font-medium text-zinc-400">Historique d'écoute vide.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DJ MODE & SETTINGS */}
          {activeTab === "settings" && settings && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-white">Configuration du Lecteur & Mode DJ</h3>
                <p className="text-xs text-zinc-400">Gérez les permissions et le comportement du bot audio.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
                {/* DJ Mode */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">Mode DJ exclusif</p>
                    <p className="text-[11px] text-zinc-400">Seuls les membres avec le rôle DJ peuvent contrôler la musique.</p>
                  </div>
                  <button
                    onClick={() => handleSaveSettings({ djMode: !settings.djMode })}
                    className={cn(
                      "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                      settings.djMode ? "bg-violet-600" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200",
                        settings.djMode ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* DJ Role ID */}
                {settings.djMode && (
                  <div className="space-y-1.5 pb-3 border-b border-white/5">
                    <label className="text-xs font-medium text-zinc-300">ID du rôle DJ</label>
                    <input
                      type="text"
                      value={settings.djRoleId || ""}
                      onChange={(e) => setSettings({ ...settings, djRoleId: e.target.value })}
                      onBlur={() => handleSaveSettings({ djRoleId: settings.djRoleId })}
                      placeholder="Ex: 112233445566778899"
                      className="h-8 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {/* Autoplay */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">Lecture automatique continue (Autoplay)</p>
                    <p className="text-[11px] text-zinc-400">Joue automatiquement des titres similaires lorsque la file est vide.</p>
                  </div>
                  <button
                    onClick={() => handleSaveSettings({ autoplay: !settings.autoplay })}
                    className={cn(
                      "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                      settings.autoplay ? "bg-violet-600" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200",
                        settings.autoplay ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Max Queue Size */}
                <div className="space-y-2 pb-3 border-b border-white/5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-white">Taille maximale de la file</span>
                    <span className="font-mono text-violet-400 font-bold">{settings.maxQueueSize} titres</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={250}
                    step={10}
                    value={settings.maxQueueSize}
                    onChange={(e) => setSettings({ ...settings, maxQueueSize: Number(e.target.value) })}
                    onMouseUp={() => handleSaveSettings({ maxQueueSize: settings.maxQueueSize })}
                    onTouchEnd={() => handleSaveSettings({ maxQueueSize: settings.maxQueueSize })}
                    className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

                {/* Auto Disconnect */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Déconnexion automatique après inactivité</p>
                    <p className="text-[11px] text-zinc-400">Temps d'attente avant de quitter le vocal une fois la file vide.</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { label: "1 min", sec: 60 },
                      { label: "5 min", sec: 300 },
                      { label: "15 min", sec: 900 },
                      { label: "Off", sec: 0 },
                    ].map((btn) => (
                      <button
                        key={btn.sec}
                        onClick={() => handleSaveSettings({ autoDisconnectSeconds: btn.sec })}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          settings.autoDisconnectSeconds === btn.sec
                            ? "bg-violet-600 text-white"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: STATS */}
          {activeTab === "stats" && stats && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Statistiques Musicales</h3>
                <p className="text-xs text-zinc-400">Données d'écoute et tendances sur ce serveur.</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Titres Écoutés</span>
                  <p className="text-2xl font-black text-white mt-1">{stats.totalTracksPlayed}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Temps d'Écoute</span>
                  <p className="text-2xl font-black text-violet-400 mt-1">
                    {Math.round(stats.totalListeningSeconds / 3600)} h {Math.round((stats.totalListeningSeconds % 3600) / 60)} min
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Top Titre</span>
                  <p className="text-sm font-bold text-white mt-1 truncate">
                    {stats.topTracks[0]?.title || "Aucun"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Membre le plus actif</span>
                  <p className="text-sm font-bold text-white mt-1 truncate">
                    {stats.topRequesters[0]?.userTag || "Aucun"}
                  </p>
                </div>
              </div>

              {/* Top Tracks List */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Top 5 des Morceaux les plus Demandés</h4>
                {stats.topTracks.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topTracks.slice(0, 5).map((tr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-zinc-500 font-bold">#{idx + 1}</span>
                          <span className="font-bold text-white">{tr.title}</span>
                          <span className="text-zinc-500">• {tr.artist}</span>
                        </div>
                        <span className="font-mono font-bold text-violet-400">{tr.count} écoutes</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Pas encore assez de données d'écoute.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* NEW PLAYLIST MODAL */}
      {isNewPlaylistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Créer une nouvelle Playlist</h3>
              <button onClick={() => setIsNewPlaylistOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-medium">Nom de la playlist</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Ex: Soirée Gaming, Chill Vibes..."
                  className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-violet-500"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                La file d'attente actuelle ({musicState?.queueLength || 0} titres) y sera automatiquement copiée.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewPlaylistOpen(false)}
                  className="h-8 rounded-xl border border-white/10 px-4 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="h-8 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 cursor-pointer"
                >
                  Créer la playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR QUEUE CONFIRM MODAL */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0C0D12] p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Vider la file d'attente ?</h3>
            <p className="text-xs text-zinc-400">
              Tous les titres en attente seront supprimés. La musique actuellement en cours continuera de jouer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="h-8 rounded-xl border border-white/10 px-4 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleClearQueue}
                className="h-8 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
