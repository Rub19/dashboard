"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  X,
  GripVertical,
  RefreshCw,
  Music2,
  Disc,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/format-error";

import { motion, AnimatePresence } from "framer-motion";
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
  stayChannelId?: string | null;
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
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const FETCH_OPTS: RequestInit = { credentials: "include" };
const jsonOpts = (method: string, body: unknown): RequestInit => ({
  method,
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export default function MusicCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (rawGuildId && appliedQueryGuild.current !== rawGuildId) {
      const match = manageableGuilds.find((g) => g.id === rawGuildId);
      if (match) {
        appliedQueryGuild.current = rawGuildId;
        userSelectedRef.current = true;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && botGuildIds !== null) {
      const picked = pickBotGuild(manageableGuilds, botGuildIds);
      if (picked) setSelectedGuild(picked);
    } else if (!selectedGuild) {
      setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, rawGuildId, selectedGuild, botGuildIds]);

  const guildId = selectedGuild?.id || null;
  const activeGuild = selectedGuild;
  const isReady = Boolean(guildId && BOT_API_URL);

  const [activeTab, setActiveTab] = useState<"queue" | "import" | "playlists" | "favorites" | "history" | "settings" | "stats">("queue");
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importTracks, setImportTracks] = useState<Array<{ title: string; artist: string; album?: string | null; duration: number; thumbnail?: string }>>([]);
  const [importedUrl, setImportedUrl] = useState("");
  const [musicState, setMusicState] = useState<GuildMusicState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Add
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbort = useRef<AbortController | null>(null);

  // Playlists, Favorites, History, Settings, Stats
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [settings, setSettings] = useState<MusicSettings | null>(null);
  const [stats, setStats] = useState<MusicStats | null>(null);
  const [guildRoles, setGuildRoles] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [voiceChannels, setVoiceChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [tabError, setTabError] = useState<string | null>(null);
  const [refreshingMeta, setRefreshingMeta] = useState(false);

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
    if (!isReady) {
      setLoading(false);
      return;
    }
    if (botGuildIds && guildId && !botGuildIds.includes(guildId)) {
      setMusicState(null);
      setStateError(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/state`, FETCH_OPTS);
      if (!res.ok) {
        setStateError(
          res.status === 401 || res.status === 403
            ? `Le bot ne te reconnaît pas (HTTP ${res.status}) : sa connexion Discord est distincte de celle du site.`
            : res.status === 404
              ? "Le bot n'est pas présent sur ce serveur (ou le bot n'a pas été redéployé) — choisis un serveur où il est actif."
              : `Le bot a répondu une erreur (HTTP ${res.status}).`
        );
      } else {
        setStateError(null);
        const data = await res.json();
        setMusicState(data.state);
        if (!isScrubbing) {
          setScrubberPos(data.state.position || 0);
        }
      }
    } catch (err) {
      console.warn("Erreur chargement state musique :", err);
      setStateError("Bot injoignable — le site n'arrive pas à contacter le bot (bot arrêté, redémarrage en cours ou URL de l'API incorrecte).");
    } finally {
      setLoading(false);
    }
  }, [guildId, isReady, botGuildIds, isScrubbing]);

  // Vraies listes pour le rôle DJ et le salon 24h/24
  const fetchRolesAndChannels = useCallback(
    async (notify = false) => {
      if (!guildId || !BOT_API_URL || (botGuildIds && !botGuildIds.includes(guildId))) return;
      setRefreshingMeta(true);
      try {
        await Promise.all([
          fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/roles`, FETCH_OPTS)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              const roles = (d?.roles || []) as Array<{ id: string; name: string; color?: string; managed?: boolean; position?: number }>;
              setGuildRoles(
                roles
                  .filter((role) => !role.managed && role.name !== "@everyone")
                  .sort((x, y) => (y.position ?? 0) - (x.position ?? 0))
                  .map(({ id, name, color }) => ({ id, name, color }))
              );
            }),
          fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/channels`, FETCH_OPTS)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              const all = [...(d?.categories || []).flatMap((c: { channels?: unknown[] }) => c.channels || []), ...(d?.orphanChannels || [])] as Array<{
                id: string;
                name: string;
                type: number;
              }>;
              setVoiceChannels(all.filter((ch) => ch.type === 2 || ch.type === 13).map(({ id, name }) => ({ id, name })));
            }),
        ]);
        if (notify) success("Salons et rôles actualisés avec succès !");
      } catch {
        if (notify) showError("Erreur lors de l'actualisation des salons et rôles.");
      } finally {
        setRefreshingMeta(false);
      }
    },
    [guildId, botGuildIds, success, showError]
  );

  // Polling state every 3 seconds for live sync
  useEffect(() => {
    if (!isReady) {
      setLoading(false);
      return;
    }
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState, isReady]);

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

  // Tab change meta fetcher
  useEffect(() => {
    if (!isReady || (botGuildIds && guildId && !botGuildIds.includes(guildId))) return;

    if (activeTab === "playlists") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists`, FETCH_OPTS)
        .then((r) => r.json())
        .then((d) => setPlaylists(d.playlists || []))
        .catch(() => {});
    } else if (activeTab === "favorites") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/favorites`, FETCH_OPTS)
        .then((r) => r.json())
        .then((d) => setFavorites(d.favorites || []))
        .catch(() => {});
    } else if (activeTab === "history") {
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/history`, FETCH_OPTS)
        .then((r) => r.json())
        .then((d) => setHistory(d.history || []))
        .catch(() => {});
    } else if (activeTab === "settings") {
      setTabError(null);
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/settings`, FETCH_OPTS)
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then((d) => setSettings(d.settings || null))
        .catch(() => setTabError("Impossible de lire les réglages musicaux de ce serveur."));
      fetchRolesAndChannels(false);
    } else if (activeTab === "stats") {
      setTabError(null);
      fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/stats`, FETCH_OPTS)
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then((d) => setStats(d.stats || null))
        .catch(() => setTabError("Impossible de lire les statistiques musicales de ce serveur."));
    }
  }, [guildId, isReady, botGuildIds, activeTab]);

  // Recherche : automatique pendant la frappe (350 ms), les requêtes périmées sont annulées, et
  // chaque cas (erreur, aucun résultat) est signalé — avant, une réponse refusée ou vide ne
  // montrait strictement rien.
  const runSearch = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query || !isReady || (botGuildIds && guildId && !botGuildIds.includes(guildId))) {
        setSearchResults([]);
        setSearchError(null);
        setSearchDone(false);
        return;
      }
      searchAbort.current?.abort();
      const ctrl = new AbortController();
      searchAbort.current = ctrl;
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/search?q=${encodeURIComponent(query)}`, {
          ...FETCH_OPTS,
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setSearchResults([]);
          setSearchError(
            res.status === 401
              ? "Session du bot expirée : reconnecte le bot pour rechercher."
              : res.status === 404
                ? "Le bot n'est pas présent sur ce serveur."
                : `Le bot a répondu une erreur (${res.status}).`
          );
        } else {
          const data = await res.json();
          setSearchResults(Array.isArray(data.results) ? data.results : []);
        }
        setSearchDone(true);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setSearchResults([]);
        setSearchError("Impossible de joindre le bot.");
        setSearchDone(true);
      } finally {
        if (searchAbort.current === ctrl) setIsSearching(false);
      }
    },
    [guildId, isReady, botGuildIds]
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      searchAbort.current?.abort();
      setSearchResults([]);
      setSearchDone(false);
      setSearchError(null);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(() => void runSearch(q), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, runSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(searchQuery);
  };

  // Playback Control Actions
  const handlePlayQuery = async (query: string, playNext = false) => {
    if (!isReady) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/play`, jsonOpts("POST", { query, playNext }));
      const data = await res.json();
      if (res.ok && data.success) {
        success("Musique lancée", data.track ? `Ajouté : ${data.track.title}` : "Titre en cours de lecture.");
        fetchState();
      } else {
        showError("Erreur lecture", formatApiError(data.error, "Impossible de lire ce titre."));
      }
    } catch {
      showError("Erreur réseau", "Impossible d'envoyer la commande de lecture.");
    }
  };

  const handleImportPreview = async () => {
    if (!isReady || !importUrl.trim()) return;
    setImportLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/import?url=${encodeURIComponent(importUrl.trim())}`, FETCH_OPTS);
      const data = await res.json();
      if (res.ok) {
        setImportTracks(data.tracks || []);
        setImportedUrl(data.url || importUrl.trim());
        if (!data.tracks?.length) showError("Playlist vide", "Aucun titre trouvé (playlist privée ou vide ?).");
      } else {
        showError("Import impossible", formatApiError(data.error, "Impossible de lire cette playlist."));
      }
    } catch {
      showError("Erreur réseau", "Impossible de contacter le bot.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportPlayAll = async (shuffle: boolean) => {
    if (!isReady || !importedUrl) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/play`, jsonOpts("POST", { query: importedUrl, shuffle }));
      const data = await res.json();
      if (res.ok && data.success) {
        success(shuffle ? "Playlist mélangée lancée" : "Playlist lancée", `${importTracks.length} titres ajoutés à la file.`);
        fetchState();
      } else {
        showError("Erreur lecture", formatApiError(data.error, "Impossible de lancer la playlist."));
      }
    } catch {
      showError("Erreur réseau", "Impossible d'envoyer la commande de lecture.");
    }
  };

  const handlePlayPause = async () => {
    if (!musicState || !isReady) return;
    const isPlaying = musicState.status === "PLAYING";
    const endpoint = isPlaying ? "pause" : "resume";
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/${endpoint}`, { method: "POST", credentials: "include" });
      fetchState();
    } catch {
      showError("Erreur", "Action impossible.");
    }
  };

  const handleSkip = async () => {
    if (!isReady) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/skip`, { method: "POST", credentials: "include" });
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
    if (!isReady) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/previous`, { method: "POST", credentials: "include" });
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
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/stop`, { method: "POST", credentials: "include" });
      success("Lecteur arrêté", "La musique a été stoppée et la file réinitialisée.");
      fetchState();
    } catch {
      showError("Erreur", "Impossible d'arrêter le lecteur.");
    }
  };

  const handleSeek = async (val: number) => {
    if (!isReady) return;
    setScrubberPos(val);
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/seek`, jsonOpts("POST", { position: val }));
      fetchState();
    } catch {
      showError("Erreur", "Seek indisponible.");
    }
  };

  const handleVolume = async (vol: number) => {
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/volume`, jsonOpts("POST", { volume: vol }));
      fetchState();
    } catch {
      showError("Erreur", "Impossible de changer le volume.");
    }
  };

  const handleMute = async () => {
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/mute`, { method: "POST", credentials: "include" });
      fetchState();
    } catch {
      showError("Erreur", "Action muet impossible.");
    }
  };

  const handleShuffle = async () => {
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/shuffle`, { method: "POST", credentials: "include" });
      success("File mélangée", "L'ordre des pistes a été réorganisée aléatoirement.");
      fetchState();
    } catch {
      showError("Erreur", "Impossible de mélanger la file.");
    }
  };

  const handleCycleRepeat = async () => {
    if (!musicState || !isReady) return;
    const nextMode = musicState.repeatMode === "OFF" ? "SONG" : musicState.repeatMode === "SONG" ? "QUEUE" : "OFF";
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/repeat`, jsonOpts("POST", { mode: nextMode }));
      fetchState();
    } catch {
      showError("Erreur", "Impossible de changer la répétition.");
    }
  };

  const handleToggleFavorite = async (track: Track) => {
    if (!isReady) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/favorites`, jsonOpts("POST", { track, userId: "dashboard" }));
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
    if (!isReady) return;
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIndex) || fromIndex === toIndex) return;

    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/queue/reorder`, jsonOpts("POST", { fromIndex, toIndex }));
      fetchState();
    } catch {
      showError("Erreur", "Impossible de déplacer le titre.");
    }
  };

  const handleRemoveQueueItem = async (index: number) => {
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/queue/${index}`, { method: "DELETE", credentials: "include" });
      fetchState();
    } catch {
      showError("Erreur", "Impossible de retirer le titre.");
    }
  };

  const handleClearQueue = async () => {
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/queue/clear`, { method: "POST", credentials: "include" });
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
    if (!newPlaylistName.trim() || !isReady) return;
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${guildId}/music/playlists`,
        jsonOpts("POST", { name: newPlaylistName.trim(), tracks: musicState?.queue || [] }),
      );
      if (res.ok) {
        const data = await res.json();
        setPlaylists((p) => [...p, data.playlist]);
        setNewPlaylistName("");
        setIsNewPlaylistOpen(false);
        success("Playlist créée", `Playlist "${data.playlist.name}" enregistrée.`);
      } else {
        const errBody = await res.json().catch(() => null);
        showError("Erreur", formatApiError(errBody?.error, "Impossible de créer la playlist."));
      }
    } catch {
      showError("Erreur", "Impossible de créer la playlist.");
    }
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    if (!isReady) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists/${playlistId}/play`, { method: "POST", credentials: "include" });
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
    if (!isReady) return;
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/playlists/${playlistId}`, { method: "DELETE", credentials: "include" });
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      success("Playlist supprimée", "La playlist a été retirée.");
    } catch {
      showError("Erreur", "Impossible de supprimer la playlist.");
    }
  };

  // Save Settings
  const handleSaveSettings = async (patch: Partial<MusicSettings>) => {
    if (!isReady) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/music/settings`, jsonOpts("PUT", patch));
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        success("Configuration enregistrée", "Paramètres musicaux mis à jour.");
      } else {
        const data = await res.json().catch(() => null);
        showError("Réglage refusé", formatApiError(data?.error, `Le bot a répondu une erreur (${res.status}).`));
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
    <div className="w-full text-[var(--text-primary)] font-sans">
      {/* TOP HEADER */}
      <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 sm:px-6 py-3.5 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/discord${guildId ? `?guildId=${guildId}` : ""}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
              title="Retour au hub Discord"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Retour Discord</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Music Center</span>
                  <span className="flex h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                </h1>
                <span
                  className={cn(
                    "text-xs uppercase font-bold px-2 py-0.5 rounded-full border",
                    isPlaying
                      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                      : musicState?.status === "PAUSED"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] border-[var(--panel-border)]"
                  )}
                >
                  {musicState?.status || "IDLE"}
                </span>
                {musicState?.voiceChannel && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                    🔊 {musicState.voiceChannel.name}
                  </span>
                )}
                {activeGuild && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)]/40 text-[var(--text-muted)] border border-[var(--panel-border)] hidden sm:inline">
                    {activeGuild.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Lecteur audio haute performance synchronisé en direct avec Discord
              </p>
              {stateError && (
                <p role="alert" className="mt-1 text-xs text-amber-400">
                  ⚠ {stateError}
                  {stateError.startsWith("Le bot ne te reconnaît pas") && (
                    <a
                      href={`${BOT_API_URL}/api/auth/login?return_to=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                      className="ml-2 font-bold text-[var(--accent-primary)] underline underline-offset-2"
                    >
                      Connecter le bot à mon compte Discord
                    </a>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {manageableGuilds.length > 0 && (
              <GuildSelector
                guilds={manageableGuilds}
                value={selectedGuild?.id || ""}
                onChange={(g) => {
                  userSelectedRef.current = true;
                  setSelectedGuild(g);
                }}
              />
            )}
            <button
              onClick={fetchState}
              disabled={!isReady}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 disabled:opacity-40 transition-all cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {!activeGuild && !loading && (
        <div className="shrink-0 mx-4 sm:mx-6 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
          Connecte ton compte Discord et sélectionne un serveur pour piloter le lecteur en direct.
        </div>
      )}

      {/* SCROLLABLE MAIN CONTENT */}
      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* BANNIÈRE BOT NON INSTALLÉ */}
          {selectedGuild && botGuildIds && !botGuildIds.includes(selectedGuild.id) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    Bot non présent sur ce serveur
                  </p>
                  <p className="text-xs text-amber-300/80">
                    Pour écouter de la musique et contrôler la file d'attente sur <span className="font-semibold">{selectedGuild.name}</span>, invitez le bot.
                  </p>
                </div>
              </div>
              <a
                href={BOT_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shrink-0 transition-colors"
              >
                <Bot className="h-3.5 w-3.5" />
                Inviter le bot
              </a>
            </div>
          )}

          {/* NOW PLAYING HERO BANNER */}
          <div className="relative overflow-hidden rounded-xl border border-[var(--panel-border)] p-6 bg-[var(--surface-raised)]/40">

            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Cover Art */}
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 shrink-0 rounded-2xl overflow-hidden border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 group">
                {currentTrack?.thumbnail ? (
                  <img
                    key={currentTrack.thumbnail}
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="rise-in h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                    <Disc className="h-12 w-12 animate-spin-slow" />
                    <span className="text-xs font-medium">Aucun titre</span>
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-[var(--bg-main)]/70 px-2 py-1 rounded-lg text-xs font-bold text-[var(--success)] border border-[var(--success)]/30 backdrop-blur">
                    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                      {[0, 1, 2].map((b) => (
                        <motion.span
                          key={b}
                          className="w-[3px] rounded-full bg-[var(--success)]"
                          animate={{ height: ["30%", "100%", "45%", "80%", "30%"] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.18, ease: "easeInOut" }}
                        />
                      ))}
                    </span>
                    EN COURS
                  </div>
                )}
              </div>

              {/* Title, Details, Scrubber, Controls */}
              <div className="flex-1 w-full space-y-4">
                {/* Title & Requester */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div key={currentTrack?.title ?? "none"} className="stagger-children">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                      {currentTrack?.source || "AUDIO"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-1 line-clamp-1">
                      {currentTrack ? currentTrack.title : "Aucune musique en cours"}
                    </h2>
                    <p className="text-sm font-medium text-[var(--text-muted)] line-clamp-1">
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
                            : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70"
                        )}
                        title="Ajouter aux favoris"
                      >
                        <motion.span key={String(isFav)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 45 }} className="grid place-items-center"><Heart className={cn("h-4 w-4", isFav && "fill-rose-400")} /></motion.span>
                      </button>
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Demandé par</span>
                        <p className="text-xs font-bold text-[var(--text-muted)]">{currentTrack.requestedBy.tag}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* SEEK SCRUBBER */}
                <div className="space-y-0.5 pt-1">
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
                      aria-label="Position dans le titre"
                      style={{ "--pct": `${duration > 0 ? Math.min(100, (scrubberPos / duration) * 100) : 0}%` } as React.CSSProperties}
                      className="ethone-seek"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono tabular-nums">
                    <span className="font-semibold text-[var(--text-primary)]">{formatTime(scrubberPos)}</span>
                    <span className="text-[var(--text-muted)]">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* MASTER CONTROLS BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  {/* Playback buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      disabled={!musicState?.history || musicState.history.length === 0}
                      className="group flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 active:scale-90 disabled:opacity-30 transition-all cursor-pointer [&_svg]:transition-transform hover:[&_svg]:-translate-x-0.5"
                      title="Précédent"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handlePlayPause}
                      disabled={!currentTrack}
                      className="btn-sheen relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-sm hover:brightness-110 active:scale-90 disabled:opacity-40 transition-[filter,transform] duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-main)]"
                      title={isPlaying ? "Mettre en pause" : "Lire"}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={isPlaying ? "pause" : "play"}
                          initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          exit={{ scale: 0.4, rotate: 90, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 450, damping: 43 }}
                          className="grid place-items-center"
                        >
                          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                        </motion.span>
                      </AnimatePresence>
                    </button>

                    <button
                      onClick={handleSkip}
                      disabled={!currentTrack}
                      className="group flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 active:scale-90 disabled:opacity-30 transition-all cursor-pointer [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
                      title="Suivant"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handleStop}
                      disabled={!currentTrack && (!musicState?.queue || musicState.queue.length === 0)}
                      className="flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-all cursor-pointer"
                      title="Arrêter et vider"
                    >
                      <Square className="h-4 w-4" />
                    </button>

                    <div className="h-6 w-px bg-[var(--surface-raised)]/40 mx-1 hidden sm:block" />

                    <button
                      onClick={handleShuffle}
                      className={cn(
                        "flex h-9 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                        musicState?.shuffle
                          ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70"
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
                          ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70"
                      )}
                      title="Mode de répétition"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      <span className="text-xs font-mono">{musicState?.repeatMode || "OFF"}</span>
                    </button>
                  </div>

                  {/* VOLUME CONTROLLER */}
                  <div className="flex items-center gap-2.5 bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] px-3 py-1.5 rounded-2xl">
                    <button
                      onClick={handleMute}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      title={musicState?.muted ? "Activer le son" : "Couper le son"}
                    >
                      {musicState?.muted || (musicState?.volume || 0) === 0 ? (
                        <VolumeX className="h-4 w-4 text-rose-400" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicState?.muted ? 0 : musicState?.volume || 75}
                      onChange={(e) => handleVolume(Number(e.target.value))}
                      aria-label="Volume"
                      style={{ "--pct": `${musicState?.muted ? 0 : musicState?.volume || 75}%` } as React.CSSProperties}
                      className="ethone-seek ethone-seek--sm w-24"
                    />
                    <span className="w-9 text-right font-mono text-xs font-bold text-[var(--text-muted)]">
                      {musicState?.muted ? "0%" : `${musicState?.volume || 75}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH & ADD MODAL / INPUT */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un titre, artiste ou coller un lien (YouTube, Spotify, SoundCloud)..."
                  className="h-10 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 pl-10 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--input-border-hover)] transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!searchQuery.trim() || !isReady}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                {isSearching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>{isSearching ? "Recherche…" : "Rechercher"}</span>
              </button>
            </form>

            {/* Quick Search Results Dropdown */}
            {(searchResults.length > 0 || searchError || (searchDone && !isSearching)) && (
              <div className="mt-4 border-t border-[var(--panel-border)] pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    {searchError ? "Recherche impossible" : searchResults.length > 0 ? `Résultats de recherche (${searchResults.length})` : "Aucun résultat"}
                  </span>
                  <button
                    onClick={() => setSearchResults([])}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
                {searchError && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{searchError}</p>}
                {!searchError && searchResults.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">Rien trouvé pour « {searchQuery.trim()} ». Essaie un autre titre, ou colle un lien YouTube, Spotify ou SoundCloud.</p>
                )}
                <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
                  {searchResults.map((tr) => (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 hover:border-[var(--input-border-hover)] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tr.thumbnail}
                          alt={tr.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{tr.title}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {tr.artist} • {formatTime(tr.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlayQuery(tr.source === "SPOTIFY" ? `${tr.title} ${tr.artist}` : tr.url || tr.title, false)}
                          className="flex h-7 items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-2.5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          <span>Lire</span>
                        </button>
                        <button
                          onClick={() => handlePlayQuery(tr.source === "SPOTIFY" ? `${tr.title} ${tr.artist}` : tr.url || tr.title, true)}
                          className="flex h-7 items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-all cursor-pointer"
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
          <div className="flex items-center gap-2 border-b border-[var(--panel-border)] pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: "queue", label: `File d'attente (${musicState?.queueLength || 0})`, icon: ListMusic },
              { id: "import", label: "Importer une playlist", icon: Disc },
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
                    "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-200 shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97]",
                    isActive
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70"
                  )}
                >
                  {isActive && <motion.span layoutId="music-tab" transition={{ type: "spring", stiffness: 450, damping: 43 }} className="absolute inset-0 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10" />}
                  <Icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: QUEUE (DRAG & DROP) */}
          {activeTab === "queue" && (
            <div className="stagger-children space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">À Suivre (Up Next)</h3>
                  <p className="text-xs text-[var(--text-muted)]">Glissez-déposez les pistes pour réorganiser l'ordre de lecture.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsNewPlaylistOpen(true)}
                    disabled={!musicState?.queue || musicState.queue.length === 0}
                    className="flex h-8 items-center gap-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 disabled:opacity-40 transition-all cursor-pointer"
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
                <div className="stagger-children space-y-2">
                  {musicState.queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="group flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 hover:border-[var(--input-border-hover)] hover:bg-[var(--surface-raised)]/70 transition-all cursor-move"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-muted)]" />
                        <span className="w-5 text-center text-xs font-mono font-bold text-[var(--text-muted)]">
                          #{idx + 1}
                        </span>
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="h-10 w-10 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{track.title}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {track.artist} • Demandé par {track.requestedBy.tag}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-[var(--text-muted)] mr-2">
                          {formatTime(track.duration)}
                        </span>
                        <button
                          onClick={() => handleRemoveQueueItem(idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Retirer de la file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pop-in flex flex-col items-center justify-center py-12 text-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
                  <Music2 className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-medium text-[var(--text-muted)]">La file d'attente est actuellement vide.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Utilisez la recherche ci-dessus pour ajouter des morceaux.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLAYLISTS */}
          {/* TAB: IMPORT (Spotify / YouTube playlists) */}
          {activeTab === "import" && (
            <div className="stagger-children space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Importer une playlist Spotify ou YouTube</h3>
                <p className="text-xs text-[var(--text-muted)]">Colle le lien : tous les titres s'affichent, clique sur un titre pour le jouer, ou lance toute la playlist (dans l'ordre ou mélangée).</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImportPreview()}
                  placeholder="https://open.spotify.com/playlist/…"
                  className="flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                />
                <button
                  onClick={handleImportPreview}
                  disabled={importLoading || !importUrl.trim()}
                  className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-bold text-[var(--accent-contrast)] disabled:opacity-50 cursor-pointer"
                >
                  {importLoading ? "Chargement…" : "Afficher les titres"}
                </button>
              </div>
              {importTracks.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-muted)]">{importTracks.length} titres</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleImportPlayAll(false)} className="rounded-xl bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 px-3 py-1.5 text-xs font-bold text-[var(--accent-primary)] cursor-pointer">Tout jouer</button>
                      <button onClick={() => handleImportPlayAll(true)} className="rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 px-3 py-1.5 text-xs font-bold text-[var(--accent-primary)] cursor-pointer">Tout mélanger</button>
                    </div>
                  </div>
                  <div className="max-h-[32rem] overflow-y-auto space-y-1.5 pr-1">
                    {importTracks.map((tr, i) => (
                      <button
                        key={`${tr.title}-${i}`}
                        onClick={() => handlePlayQuery(`${tr.title} ${tr.artist}`)}
                        className="flex w-full items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5 text-left hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)]/70 transition-all cursor-pointer"
                      >
                        <span className="w-8 text-right text-xs font-mono text-[var(--text-muted)]">{i + 1}</span>
                        {tr.thumbnail && <img src={tr.thumbnail} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{tr.title}</span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">{tr.artist}</span>
                        </span>
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          {tr.duration > 0 ? `${Math.floor(tr.duration / 60)}:${String(tr.duration % 60).padStart(2, "0")}` : "—"}
                        </span>
                        <Play className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "playlists" && (
            <div className="stagger-children space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Playlists du Serveur</h3>
                  <p className="text-xs text-[var(--text-muted)]">Créez et lancez des sélections personnalisées.</p>
                </div>
                <button
                  onClick={() => setIsNewPlaylistOpen(true)}
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Créer une Playlist</span>
                </button>
              </div>

              {playlists.length > 0 ? (
                <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{pl.name}</h4>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)]/40 text-[var(--text-muted)]">
                          {pl.tracks.length} titres
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Créée par {pl.createdBy.tag} • {new Date(pl.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--panel-border)]">
                        <button
                          onClick={() => handlePlayPlaylist(pl.id)}
                          className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          <span>Lancer</span>
                        </button>
                        <button
                          onClick={() => handleDeletePlaylist(pl.id)}
                          className="text-[var(--text-muted)] hover:text-rose-400 text-xs transition-all cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pop-in flex flex-col items-center justify-center py-12 text-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
                  <Disc className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-medium text-[var(--text-muted)]">Aucune playlist enregistrée pour ce serveur.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === "favorites" && (
            <div className="stagger-children space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Vos Morceaux Favoris ({favorites.length})</h3>
                <p className="text-xs text-[var(--text-muted)]">Accédez instantanément à vos titres préférés.</p>
              </div>

              {favorites.length > 0 ? (
                <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {favorites.map((tr) => (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 hover:border-[var(--input-border-hover)] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tr.thumbnail}
                          alt={tr.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{tr.title}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{tr.artist} • {formatTime(tr.duration)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlayQuery(tr.url || tr.title)}
                          className="flex h-7 items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-2.5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
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
                <div className="pop-in flex flex-col items-center justify-center py-12 text-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
                  <Heart className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-medium text-[var(--text-muted)]">Aucun morceau favori pour le moment.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Cliquez sur l'icône cœur pour en ajouter un.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === "history" && (
            <div className="stagger-children space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Historique Récent ({history.length})</h3>
                <p className="text-xs text-[var(--text-muted)]">Derniers morceaux diffusés sur le serveur.</p>
              </div>

              {history.length > 0 ? (
                <div className="stagger-children space-y-2">
                  {history.map((tr, idx) => (
                    <div
                      key={`${tr.id}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 hover:border-[var(--input-border-hover)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={tr.thumbnail}
                          alt={tr.title}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{tr.title}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {tr.artist} • Demandé par {tr.requestedBy.tag}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePlayQuery(tr.url || tr.title)}
                        className="flex h-7 items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-all cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Rejouer</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pop-in flex flex-col items-center justify-center py-12 text-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
                  <Clock className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-medium text-[var(--text-muted)]">Historique d'écoute vide.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DJ MODE & SETTINGS */}
          {activeTab === "settings" && settings && (
            <div className="stagger-children space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Configuration du Lecteur & Mode DJ</h3>
                  <p className="text-xs text-[var(--text-muted)]">Gérez les permissions et le comportement du bot audio.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchRolesAndChannels(true)}
                  disabled={refreshingMeta}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50 cursor-pointer"
                  title="Rafraîchir les salons vocaux et rôles du serveur"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshingMeta && "animate-spin text-[var(--accent-primary)]")} />
                  <span>Rafraîchir salons & rôles</span>
                </button>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-4">
                {/* DJ Mode */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">Mode DJ exclusif</p>
                    <p className="text-xs text-[var(--text-muted)]">Seuls les membres avec le rôle DJ peuvent contrôler la musique.</p>
                  </div>
                  <button
                    onClick={() => handleSaveSettings({ djMode: !settings.djMode })}
                    className={cn(
                      "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                      settings.djMode ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]/40"
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
                  <div className="space-y-1.5 pb-3 border-b border-[var(--panel-border)]">
                    <RolePicker
                      value={settings.djRoleId}
                      onChange={(id) => handleSaveSettings({ djRoleId: id || null })}
                      roles={guildRoles}
                      guildId={guildId}
                      emptyLabel="— Aucun (mode DJ sans restriction de rôle) —"
                      placeholder="Choisir un rôle DJ ou saisir un ID..."
                      allowClear
                      size="sm"
                    />
                    {!settings.djRoleId && (
                      <p className="text-xs text-amber-300">Sans rôle choisi, personne ne pourra contrôler la musique tant que le mode DJ est actif.</p>
                    )}
                  </div>
                )}

                {/* Autoplay */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">Lecture automatique continue (Autoplay)</p>
                    <p className="text-xs text-[var(--text-muted)]">Joue automatiquement des titres similaires lorsque la file est vide.</p>
                  </div>
                  <button
                    onClick={() => handleSaveSettings({ autoplay: !settings.autoplay })}
                    className={cn(
                      "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                      settings.autoplay ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-raised)]/40"
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
                <div className="space-y-2 pb-3 border-b border-[var(--panel-border)]">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[var(--text-primary)]">Taille maximale de la file</span>
                    <span className="font-mono text-[var(--accent-primary)] font-bold">{settings.maxQueueSize} titres</span>
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
                    className="w-full h-1.5 rounded-full bg-[var(--panel-border)] appearance-none cursor-pointer accent-[var(--accent-primary)]"
                  />
                </div>

                {/* Mode 24h/24 */}
                <div className="space-y-1.5 pb-3 border-b border-[var(--panel-border)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Rester dans un salon vocal 24h/24</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Le bot rejoint ce salon et y revient tout seul s'il en est sorti. Équivalent de la commande <code>/join</code>.
                  </p>
                  <ChannelPicker
                    value={settings.stayChannelId}
                    onChange={(id) => handleSaveSettings({ stayChannelId: id || null })}
                    channels={voiceChannels.map((c) => ({ id: c.id, name: `🔊 ${c.name}` }))}
                    guildId={guildId}
                    emptyLabel="Désactivé (quitte après inactivité)"
                    placeholder="Choisir un salon vocal ou saisir un ID..."
                    allowClear
                    size="sm"
                  />
                </div>

                {/* Auto Disconnect */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">Déconnexion automatique après inactivité</p>
                    <p className="text-xs text-[var(--text-muted)]">Temps d'attente avant de quitter le vocal une fois la file vide.</p>
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
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          settings.autoDisconnectSeconds === btn.sec
                            ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                            : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
          {activeTab === "settings" && !settings && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              {tabError || "Chargement des réglages…"}
            </p>
          )}

          {activeTab === "stats" && !stats && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              {tabError || "Chargement des statistiques…"}
            </p>
          )}

          {activeTab === "stats" && stats && (
            <div className="stagger-children space-y-6">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Statistiques Musicales</h3>
                <p className="text-xs text-[var(--text-muted)]">Données d'écoute et tendances sur ce serveur.</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
                  <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Titres Écoutés</span>
                  <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{stats.totalTracksPlayed}</p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
                  <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Temps d'Écoute</span>
                  <p className="text-2xl font-black text-[var(--accent-primary)] mt-1">
                    {Math.round(stats.totalListeningSeconds / 3600)} h {Math.round((stats.totalListeningSeconds % 3600) / 60)} min
                  </p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
                  <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Top Titre</span>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1 truncate">
                    {stats.topTracks[0]?.title || "Aucun"}
                  </p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
                  <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Membre le plus actif</span>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1 truncate">
                    {stats.topRequesters[0]?.userTag || "Aucun"}
                  </p>
                </div>
              </div>

              {/* Top Tracks List */}
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Top 5 des Morceaux les plus Demandés</h4>
                {stats.topTracks.length > 0 ? (
                  <div className="stagger-children space-y-2">
                    {stats.topTracks.slice(0, 5).map((tr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--panel-border)] last:border-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[var(--text-muted)] font-bold">#{idx + 1}</span>
                          <span className="font-bold text-[var(--text-primary)]">{tr.title}</span>
                          <span className="text-[var(--text-muted)]">• {tr.artist}</span>
                        </div>
                        <span className="font-mono font-bold text-[var(--accent-primary)]">{tr.count} écoutes</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">Pas encore assez de données d'écoute.</p>
                )}
              </div>

              {/* Top membres */}
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Membres les plus actifs</h4>
                {stats.topRequesters.length > 0 ? (
                  <div className="stagger-children space-y-2.5">
                    {stats.topRequesters.slice(0, 5).map((m, idx) => {
                      const max = Math.max(1, stats.topRequesters[0]?.count || 1);
                      return (
                        <div key={m.userId || idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[var(--text-primary)]">
                              <span className="mr-2 font-mono text-[var(--text-muted)]">#{idx + 1}</span>
                              {m.userTag}
                            </span>
                            <span className="font-mono font-bold text-[var(--accent-primary)]">{m.count} demandes</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
                            <div className="h-full rounded-full bg-[var(--surface-raised)]/40" style={{ width: `${(m.count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">Personne n'a encore demandé de titre.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* NEW PLAYLIST MODAL */}
      {isNewPlaylistOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Créer une nouvelle Playlist</h3>
              <button onClick={() => setIsNewPlaylistOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist} className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] font-medium">Nom de la playlist</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Ex: Soirée Gaming, Chill Vibes..."
                  className="mt-1 h-9 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--input-border-hover)]"
                  autoFocus
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                La file d'attente actuelle ({musicState?.queueLength || 0} titres) y sera automatiquement copiée.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                <button
                  type="button"
                  onClick={() => setIsNewPlaylistOpen(false)}
                  className="h-8 rounded-xl border border-[var(--panel-border)] px-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="h-8 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
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
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Vider la file d'attente ?</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Tous les titres en attente seront supprimés. La musique actuellement en cours continuera de jouer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="h-8 rounded-xl border border-[var(--panel-border)] px-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
