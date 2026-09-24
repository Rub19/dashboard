"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Search, Clock, AlertCircle, User, Gamepad2, BarChart3, Star } from "@/components/icons/ph";
import Select, { type SelectOption } from "@/components/ui/Select";
import {
  TRACKER_GAMES,
  fetchTrackerProfile,
  fetchTrackerMatches,
  overviewStats,
  type TrackerProfile,
  type TrackerMatch,
} from "@/lib/tracker-gg";
import GameBrandIcon from "@/components/GameBrandIcon";
import { cn } from "@/lib/utils";

const CACHE_TTL_MS = 15 * 60 * 1000;
const FAVORITES_KEY = "ethone-trackergg:favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

type CachePayload = { profile: TrackerProfile | null; matches: TrackerMatch[]; timestamp: number };

function fmtStat(k: string): string {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

// tracker.gg doesn't always send a pre-formatted displayValue — when it's
// missing, the raw value can be a long float (e.g. headshot % computed as
// hits/shots*100). Round it so the fallback never shows 15 decimal places.
function fmtStatValue(stat: { value?: number; displayValue?: string }): string {
  if (stat.displayValue) return stat.displayValue;
  if (typeof stat.value === "number" && Number.isFinite(stat.value)) {
    return String(Math.round(stat.value));
  }
  return "—";
}

export default function TrackerGgView() {
  const [gameId, setGameId] = useState(TRACKER_GAMES[0].id);
  const game = useMemo(() => TRACKER_GAMES.find((g) => g.id === gameId) ?? TRACKER_GAMES[0], [gameId]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const orderedGames = useMemo(() => {
    const favSet = new Set(favorites);
    return [...TRACKER_GAMES].sort((a, b) => {
      const aFav = favSet.has(a.id) ? 0 : 1;
      const bFav = favSet.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [favorites]);

  const isFavorite = favorites.includes(gameId);

  const gameOptions: SelectOption[] = useMemo(
    () =>
      orderedGames.map((g) => {
        const fav = favorites.includes(g.id);
        return {
          id: g.id,
          label: (
            <span className="flex min-w-0 items-center gap-2">
              <GameBrandIcon name={g.label} className="h-4 w-4 shrink-0" />
              <span className="truncate">{g.label}</span>
              {fav && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />}
            </span>
          ),
        };
      }),
    [orderedGames, favorites]
  );

  const platformOptions: SelectOption[] = useMemo(
    () => game.platforms.map((p) => ({ id: p.value, label: p.label })),
    [game.platforms]
  );
  const [platform, setPlatform] = useState(game.platforms[0].value);
  const [identifier, setIdentifier] = useState("");
  const [profile, setProfile] = useState<TrackerProfile | null>(null);
  const [matches, setMatches] = useState<TrackerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep platform valid when the game changes.
  useEffect(() => {
    if (!game.platforms.some((p) => p.value === platform)) setPlatform(game.platforms[0].value);
  }, [game, platform]);

  const cacheKey = useMemo(
    () => `ethone-trackergg:${gameId}:${platform}:${identifier.toLowerCase().trim()}`,
    [gameId, platform, identifier]
  );

  const load = useCallback(
    async (force = false) => {
      const id = identifier.trim();
      if (!id) {
        setProfile(null);
        setMatches([]);
        return;
      }

      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw) as CachePayload;
            if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
              setProfile(parsed.profile);
              setMatches(Array.isArray(parsed.matches) ? parsed.matches : []);
              setLastSync(new Date(parsed.timestamp));
              return;
            }
          }
        } catch {}
      }

      if (force) setSyncing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const [prof, ms] = await Promise.all([
          fetchTrackerProfile(gameId, platform, id),
          fetchTrackerMatches(gameId, platform, id),
        ]);
        setProfile(prof);
        setMatches(ms);
        setLastSync(new Date());
        if (!prof || prof.available === false) {
          const reason = prof?.reason;
          setErrorMsg(
            !prof
              ? "Impossible de joindre le service tracker.gg pour le moment."
              : reason === "no_api_key"
              ? "La clé API tracker.gg n'est pas configurée côté serveur."
              : reason === "key_rejected"
              ? `tracker.gg refuse la clé API (403). L'application n'est probablement pas encore validée pour la production par tracker.gg, ou n'a pas accès à ${game.label}.`
              : reason === "not_found"
              ? "Profil introuvable — vérifie la plateforme et l'identifiant."
              : "tracker.gg est indisponible pour le moment, réessaie plus tard."
          );
        } else {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ profile: prof, matches: ms, timestamp: Date.now() } satisfies CachePayload));
          } catch {}
        }
      } catch {
        setErrorMsg("Impossible de charger les statistiques pour le moment.");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [gameId, platform, identifier, cacheKey]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, platform]);

  const tiles = useMemo(() => overviewStats(profile), [profile]);
  const available = profile?.available === true;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(true);
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden space-y-4">
      {/* Controls */}
      <div className="shrink-0 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 backdrop-blur-2xl shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-56">
              <Select
                value={gameId}
                onChange={setGameId}
                options={gameOptions}
                aria-label="Choisir un jeu"
              />
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite(gameId)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-black/40 text-zinc-500 hover:text-amber-400 hover:border-amber-400/40 active:scale-90 transition-all cursor-pointer"
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={isFavorite}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-amber-400 text-amber-400")} />
            </button>
          </div>

          {game.platforms.length > 1 && (
            <div className="w-40 shrink-0">
              <Select
                value={platform}
                onChange={setPlatform}
                options={platformOptions}
                aria-label="Choisir une plateforme"
              />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-black/40 px-3 py-2 flex-1 min-w-[180px]">
            <User className="h-4 w-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={game.idHint}
              aria-label={game.idLabel}
              className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || syncing}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Analyser</span>
          </button>

          <div className="flex items-center gap-3 shrink-0">
            {lastSync && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                <Clock className="h-3 w-3 text-zinc-500" />
                <span>{lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => load(true)}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-400", syncing && "animate-spin")} />
              <span>{syncing ? "Synchro..." : "Actualiser"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Profile header */}
      {available && profile && (
        <div className="shrink-0 flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)]/85 p-3.5 backdrop-blur-xl">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
              <User className="h-5 w-5 text-zinc-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{profile.handle || profile.identifier}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <GameBrandIcon name={game.label} className="h-3.5 w-3.5" />
              {game.label} · {profile.platform}
            </p>
          </div>
        </div>
      )}

      {/* Overview tiles */}
      {tiles.length > 0 && (
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {tiles.map((s) => (
            <div key={s.label} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)]/85 p-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
                {s.label}
              </div>
              <div className="mt-1 text-lg font-bold text-white truncate">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Body: segments + matches */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-4 pr-1 pb-6 [overscroll-behavior:contain] [touch-action:pan-y]">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02]" />
            ))}
          </div>
        ) : errorMsg && !available ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <AlertCircle className="mb-2 h-6 w-6 text-rose-400" />
            <p className="max-w-md text-sm">{errorMsg}</p>
          </div>
        ) : !available ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <Gamepad2 className="mb-2 h-6 w-6 text-zinc-600" />
            <p className="max-w-md text-sm">Choisis un jeu et entre ton identifiant ({game.idLabel}) pour voir tes statistiques tracker.gg.</p>
          </div>
        ) : (
          <>
            {/* Detailed segments */}
            {profile!.segments
              .filter((seg) => Object.keys(seg.stats).length > 0)
              .map((seg, i) => (
                <div key={`${seg.type}-${i}`} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)]/85 p-4 backdrop-blur-xl">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-400">{seg.name || seg.type}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(seg.stats).slice(0, 16).map(([k, stat]) => (
                      <div key={k}>
                        <p className="text-[11px] text-zinc-500">{fmtStat(k)}</p>
                        <p className="text-sm font-bold text-white">{fmtStatValue(stat)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {/* Match history */}
            {matches.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-zinc-400">Historique ({matches.length})</p>
                {matches.map((m, i) => {
                  const win = /win|victory|1st|won/i.test(m.metadata.result || "");
                  return (
                    <div
                      key={m.id || i}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--panel-radius)] border p-3 backdrop-blur-xl",
                        win ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-[var(--panel-border)] bg-white/[0.02]"
                      )}
                    >
                      {m.metadata.agentImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.metadata.agentImageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {m.metadata.mapName || m.metadata.modeName || "Match"}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {[m.metadata.modeName, m.metadata.agentName].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className={cn("text-xs font-bold shrink-0", win ? "text-emerald-400" : "text-zinc-400")}>
                        {m.metadata.result || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {profile!.segments.every((seg) => Object.keys(seg.stats).length === 0) && matches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                <BarChart3 className="mb-2 h-6 w-6 text-zinc-600" />
                <p className="text-sm">Aucune statistique publique disponible pour ce profil.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
