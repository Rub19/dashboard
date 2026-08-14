"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLiveData, LASTFM_PERIODS, type LastfmPeriod, type LiveRecord } from "@/lib/hooks/useLiveData";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import Equalizer from "./Equalizer";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import ContextMenu from "@/components/ContextMenu";
import Select from "@/components/ui/Select";

const STATUS = {
  connected: "text-emerald-400",
  loading: "text-[var(--muted)]",
  empty: "text-[var(--muted)]",
  error: "text-red-400",
};

const STATUS_DOT = {
  connected: "bg-emerald-500",
  loading: "bg-zinc-500",
  empty: "bg-zinc-500",
  error: "bg-red-500",
};

const SOURCE_ICON: Record<string, string> = {
  nowplaying: "disc",
  lanyard: "message-circle",
  weather: "cloud-sun",
  github: "github",
  todoist: "check-square",
  youtube: "youtube",
  reddit: "globe",
  lastfm: "music",
  twitch: "twitch",
  minecraft: "box",
  steam: "gamepad-2",
  "steam-achievements": "trophy",
  rss: "rss",
  bluesky: "cloud",
  bills: "receipt",
  valorant: "crosshair",
  lol: "swords",
  "google-calendar": "calendar",
  "google-drive": "hard-drive",
  notion: "file-text",
  tracker: "target",
  apex: "target",
};

function formatLocalDate(value: string | number | Date, mounted: boolean) {
  if (!mounted) return "";
  const d = typeof value === "object" ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function formatLocalShortDate(value: string | number | Date, mounted: boolean) {
  if (!mounted) return "";
  const d = typeof value === "object" ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

const CATEGORIES: Record<string, "gaming" | "social" | "productivity"> = {
  nowplaying: "social",
  lanyard: "social",
  spotify: "social",
  discord: "social",
  lastfm: "social",
  youtube: "social",
  reddit: "social",
  twitch: "gaming",
  steam: "gaming",
  minecraft: "gaming",
  rss: "productivity",
  weather: "productivity",
  github: "productivity",
  todoist: "productivity",
  bills: "productivity",
  valorant: "gaming",
  lol: "gaming",
  apex: "gaming",
  tracker: "gaming",
  "google-calendar": "productivity",
  "google-drive": "productivity",
  notion: "productivity",
  bluesky: "social",
};

const GRADIENTS: Record<string, string> = {
  nowplaying: "from-violet-900/30 via-fuchsia-900/10 to-black/20 border-violet-500/20",
  lanyard: "from-indigo-900/30 via-emerald-900/10 to-black/20 border-indigo-500/20",
  github: "from-zinc-800/40 to-black/20 border-zinc-500/20",
  todoist: "from-rose-900/30 to-black/20 border-rose-500/20",
  reddit: "from-orange-900/30 to-black/20 border-orange-500/20",
  youtube: "from-red-900/30 to-black/20 border-red-500/20",
  weather: "from-sky-900/30 via-amber-900/10 to-black/20 border-sky-500/20",
  lastfm: "from-red-950/30 via-rose-900/10 to-black/20 border-red-600/20",
  twitch: "from-violet-950/30 via-fuchsia-900/10 to-black/20 border-violet-600/20",
  minecraft: "from-emerald-950/30 via-green-900/10 to-black/20 border-emerald-600/20",
  steam: "from-sky-950/30 via-blue-900/10 to-black/20 border-sky-600/20",
  rss: "from-amber-950/30 via-orange-900/10 to-black/20 border-amber-600/20",
  bluesky: "from-sky-950/30 via-cyan-900/10 to-black/20 border-sky-600/20",
  bills: "from-lime-950/30 via-yellow-900/10 to-black/20 border-lime-600/20",
  valorant: "from-rose-950/30 via-red-900/10 to-black/20 border-rose-600/20",
  lol: "from-yellow-950/30 via-amber-900/10 to-black/20 border-yellow-600/20",
  "google-calendar": "from-red-900/30 via-rose-900/10 to-black/20 border-red-500/20",
  "google-drive": "from-emerald-900/30 via-lime-900/10 to-black/20 border-emerald-500/20",
  notion: "from-zinc-800/40 to-black/20 border-zinc-500/20",
  tracker: "from-orange-950/30 via-amber-900/10 to-black/20 border-orange-600/20",
  apex: "from-orange-950/30 via-red-900/10 to-black/20 border-orange-600/20",
};

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatMinutes(minutes = 0) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function toStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function ImageFallback({
  src,
  alt,
  size = 48,
  fallback,
  className,
}: {
  src?: string;
  alt?: string;
  size?: number;
  fallback?: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const initial = (fallback || alt?.slice(0, 2) || "?").toUpperCase();
  if (!src || error) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--surface)] text-[10px] font-medium text-[var(--foreground)] ${className}`}>
        {initial}
      </span>
    );
  }
  return <Image src={src} alt={alt || ""} width={size} height={size} unoptimized className={`${className} object-cover`} onError={() => setError(true)} />;
}

function weatherIconFromCondition(condition?: string): string | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "cloud-lightning";
  if (c.includes("rain") || c.includes("drizzle")) return "cloud-rain";
  if (c.includes("snow")) return "snowflake";
  if (c.includes("fog") || c.includes("mist")) return "cloud";
  if (c.includes("cloud")) return "cloud-sun";
  if (c.includes("clear") || c.includes("sun")) return "sun";
  return null;
}

function weatherIconFromCode(code?: number, condition?: string): string {
  if (typeof code === "number") {
    if (code === 0) return "sun";
    if (code >= 1 && code <= 3) return "cloud-sun";
    if (code === 45 || code === 48) return "cloud";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "cloud-rain";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snowflake";
    if (code >= 95) return "cloud-lightning";
  }
  return weatherIconFromCondition(condition || "") || "cloud-sun";
}

function discordStatusTone(status?: string) {
  switch (status) {
    case "online":
      return { dot: "bg-emerald-400", shadow: "shadow-[0_0_6px_#34d399]", label: "statusOnline" };
    case "idle":
      return { dot: "bg-amber-400", shadow: "shadow-[0_0_6px_#fbbf24]", label: "statusAway" };
    case "dnd":
      return { dot: "bg-rose-400", shadow: "shadow-[0_0_6px_#fb7185]", label: "statusBusy" };
    default:
      return { dot: "bg-zinc-500", shadow: "", label: "statusInvisible" };
  }
}

function formatDateShort(iso?: string, mounted = true): string {
  if (!iso || !mounted) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function toNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function periodLabel(period: LastfmPeriod) {
  const labels: Record<LastfmPeriod, string> = {
    "7day": "7 jours",
    "1month": "1 mois",
    "3month": "3 mois",
    "6month": "6 mois",
    "12month": "12 mois",
    overall: "Tout",
  };
  return labels[period] ?? period;
}

export default function LiveWidgets({
  showHeader = true,
  customizing = false,
}: {
  showHeader?: boolean;
  customizing?: boolean;
}) {
  const CategoryTag = showHeader ? "h3" : "h2";
  const {
    records,
    nowPlaying,
    lanyard,
    weather,
    bills,
    loading,
    lastfmPeriod,
    setLastfmPeriod,
    lastfmTopArtists,
    lastfmTopTracks,
    steam,
    steamRecentGames,
    steamOwnedGames,
    steamAchievements,
    minecraft,
    minecraftNameHistory,
  } = useLiveData();
  const { settings, update } = useSettings();
  const { error: showError } = useToast();
  const i18n = useI18n();
  const [mounted, setMounted] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | (typeof CATEGORY_ORDER)[number]>("all");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!nowPlaying?.id || !settings.liveSpotifyClientId) {
      setSaved(nowPlaying?.isSaved ?? false);
      return;
    }
    fetchWorker(`/api/spotify/track-saved?clientId=${encodeURIComponent(settings.liveSpotifyClientId)}&trackId=${encodeURIComponent(nowPlaying.id)}`)
      .then((res) => setSaved(Boolean(res?.data?.saved)))
      .catch(() => setSaved(nowPlaying?.isSaved ?? false));
  }, [nowPlaying?.id, nowPlaying?.isSaved, settings.liveSpotifyClientId]);

  const today = useMemo(() => {
    const d = mounted ? new Date() : new Date(0);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [mounted]);

  const billsSummary = useMemo(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayIso = fmt(today);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    const in30Iso = fmt(in30);
    const thisMonth = todayIso.slice(0, 7);
    const all = bills || [];
    const upcoming = all
      .filter((b) => b.paid !== true)
      .filter((b) => {
        const due = toStr(b.dueAt) || toStr(b.due) || toStr(b.date);
        return due ? due >= todayIso && due <= in30Iso : false;
      })
      .sort((a, b) => {
        const aDue = toStr(a.dueAt) || toStr(a.due) || toStr(a.date) || "";
        const bDue = toStr(b.dueAt) || toStr(b.due) || toStr(b.date) || "";
        return aDue.localeCompare(bDue);
      })
      .slice(0, 5);
    const totalThisMonth = all
      .filter((b) => b.paid !== true)
      .reduce((sum, b) => {
        const due = toStr(b.dueAt) || toStr(b.due) || toStr(b.date);
        if (due && due.slice(0, 7) === thisMonth) return sum + (toNum(b.amount) || 0);
        return sum;
      }, 0);
    const currency = upcoming[0]
      ? (toStr(upcoming[0].currency) || toStr(all[0]?.currency) || "")
      : (toStr(all[0]?.currency) || "");
    return { upcoming, totalThisMonth, currency, thisMonth };
  }, [bills, today]);

  const hidden = new Set(settings.homeHiddenLiveCards || []);
  const layout = settings.activityLiveLayout || [];
  const baseRecords = (customizing
    ? records
    : records.filter((r) => !hidden.has(r.id) && r.status === "connected")
  ).map((r) => ({ ...r }));
  const orderMap = new Map(layout.map((id, i) => [id, i]));
  const visibleRecords = [...baseRecords].sort((a, b) => (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity));

  const CATEGORY_ORDER = ["gaming", "social", "productivity"] as const;
  const groups: Record<string, LiveRecord[]> = { gaming: [], social: [], productivity: [] };
  const categoryLabels: Record<typeof CATEGORY_ORDER[number], string> = {
    gaming: "categoryGaming",
    social: "categorySocial",
    productivity: "categoryProductivity",
  };
  for (const record of visibleRecords) {
    const cat = CATEGORIES[record.source] ?? "productivity";
    const list = groups[cat] ?? [];
    list.push(record);
    groups[cat] = list;
  }

  async function controlSpotify(
    action: "play" | "pause" | "next" | "previous" | "save" | "unsave" | "seek",
    trackId?: string,
    positionMs?: number
  ) {
    if (!settings.liveSpotifyClientId) {
      showError(i18n("configureToEnable"));
      return;
    }
    try {
      const body: Record<string, string | number> = { action, clientId: settings.liveSpotifyClientId };
      if (trackId) body.trackId = trackId;
      if (action === "seek" && positionMs !== undefined) body.positionMs = Math.round(positionMs);
      await fetchWorker("/api/spotify/control", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {}
  }

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleHidden(id: string) {
    const next = hidden.has(id)
      ? (settings.homeHiddenLiveCards || []).filter((x) => x !== id)
      : [...(settings.homeHiddenLiveCards || []), id];
    update({ homeHiddenLiveCards: next });
  }

  function moveRecord(id: string, direction: "up" | "down") {
    const ids = visibleRecords.map((r) => r.id);
    const idx = ids.indexOf(id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= ids.length) return;
    const nextIds = [...ids];
    [nextIds[idx], nextIds[newIdx]] = [nextIds[newIdx], nextIds[idx]];
    update({ activityLiveLayout: nextIds });
  }

  function moveRecordTo(draggedId: string, targetId: string) {
    const ids = visibleRecords.map((r) => r.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const nextIds = ids.filter((id) => id !== draggedId);
    const insertAt = from < to ? to : to;
    nextIds.splice(insertAt, 0, draggedId);
    update({ activityLiveLayout: nextIds });
  }

  function liveContextItems(record: LiveRecord) {
    const copyText = record.subtitle ? `${record.title} — ${record.subtitle}` : record.title;
    return [
      {
        id: "copy",
        label: i18n("copyTitle"),
        icon: "copy",
        onClick: () => navigator.clipboard.writeText(copyText).catch(() => {}),
      },
      {
        id: "hide",
        label: hidden.has(record.id) ? i18n("show") : i18n("hide"),
        icon: hidden.has(record.id) ? "eye" : "eye-off",
        onClick: () => toggleHidden(record.id),
      },
      {
        id: "flip",
        label: i18n("details"),
        icon: "flip-horizontal",
        onClick: () => toggleFlip(record.id),
      },
    ];
  }

  function renderLastfmBack() {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--accent)]">Last.fm</p>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <Select
              value={lastfmPeriod}
              onChange={(v) => setLastfmPeriod(v as LastfmPeriod)}
              options={LASTFM_PERIODS.map((p) => ({ id: p, label: periodLabel(p) }))}
              aria-label={i18n("period")}
              className="min-w-0"
            />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">{i18n("topArtists")}</p>
            {lastfmTopArtists && lastfmTopArtists.length > 0 ? (
              <ul className="space-y-1.5">
                {lastfmTopArtists.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {a.artworkUrl ? (
                      <Image src={String(a.artworkUrl)} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface)] text-[10px]">#</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{String(a.name ?? "—")}</span>
                    <span className="text-[10px] text-[var(--muted)]">{Number(a.playCount ?? 0)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">{i18n("topTracks")}</p>
            {lastfmTopTracks && lastfmTopTracks.length > 0 ? (
              <ul className="space-y-1.5">
                {lastfmTopTracks.slice(0, 5).map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {t.artworkUrl ? (
                      <Image src={String(t.artworkUrl)} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface)] text-[10px]">#</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {String(t.name ?? "—")} <span className="text-[var(--muted)]">— {String(t.artist ?? "—")}</span>
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{Number(t.playCount ?? 0)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSteamBack() {
    const personaName = String((steam as Record<string, unknown>)?.personaName ?? (steam as Record<string, unknown>)?.name ?? "");
    return (
      <div className="flex h-full flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Steam</p>
        {personaName && <p className="truncate text-sm">{personaName}</p>}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">
              {i18n("recentGames")} · {steamRecentGames?.length ?? 0}
            </p>
            {steamRecentGames && steamRecentGames.length > 0 ? (
              <ul className="space-y-1.5">
                {steamRecentGames.slice(0, 5).map((g, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {g.iconUrl ? (
                      <Image src={String(g.iconUrl)} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface)] text-[10px]">#</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{String(g.name ?? "—")}</span>
                    <span className="text-[10px] text-[var(--muted)]">{formatMinutes(Number(g.recentPlaytimeMinutes ?? g.playtimeMinutes ?? 0))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">
              {i18n("ownedGames")} · {steamOwnedGames?.length ?? 0}
            </p>
            {steamOwnedGames && steamOwnedGames.length > 0 ? (
              <ul className="space-y-1.5">
                {steamOwnedGames.slice(0, 5).map((g, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {g.iconUrl ? (
                      <Image src={String(g.iconUrl)} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface)] text-[10px]">#</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{String(g.name ?? "—")}</span>
                    <span className="text-[10px] text-[var(--muted)]">{formatMinutes(Number(g.playtimeMinutes ?? 0))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">
              {i18n("achievements")} · {steamAchievements?.length ?? 0}
            </p>
            {steamAchievements && steamAchievements.length > 0 ? (
              <ul className="space-y-1.5">
                {steamAchievements.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {a.iconUrl ? (
                      <Image src={String(a.iconUrl)} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface)] text-[10px]">#</span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{String(a.name ?? "—")}</span>
                    <span className="text-[10px] text-[var(--muted)]">{a.achieved ? "✓" : "·"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderNowPlayingBack(record: LiveRecord) {
    const track = nowPlaying;
    if (!track || !track.isPlaying) {
      return (
        <div className="flex h-full flex-col justify-between">
          <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          <p className="text-sm text-[var(--foreground)]">{i18n("noLive")}</p>
          <p className="text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
            <p className="truncate text-base font-bold text-[var(--foreground)]" title={track.title || ""}>
              {track.title || "—"}
            </p>
          </div>
          {record.image && (
            <Image src={record.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover shadow-md" />
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-hidden">
          {track.artist && (
            <p className="flex items-center gap-2 truncate text-sm">
              <Icon name="user" className="h-3.5 w-3.5 text-[var(--muted)]" />
              <span className="shrink-0 text-[var(--muted)]">{i18n("artist")}</span>
              <span className="min-w-0 truncate" title={track.artist}>{track.artist}</span>
            </p>
          )}
          {track.album && (
            <p className="flex items-center gap-2 truncate text-sm">
              <Icon name="disc" className="h-3.5 w-3.5 text-[var(--muted)]" />
              <span className="shrink-0 text-[var(--muted)]">{i18n("album")}</span>
              <span className="min-w-0 truncate" title={track.album}>{track.album}</span>
            </p>
          )}

          {track.progressMs !== undefined && track.durationMs ? (
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min={0}
                max={track.durationMs}
                value={track.progressMs}
                onChange={(e) => controlSpotify("seek", undefined, Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                aria-label={i18n("seek")}
                className="w-full accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-[var(--muted)]">
                <span>{formatTime(track.progressMs)}</span>
                <span>{formatTime(track.durationMs)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => controlSpotify("previous")}
            className="rounded-full p-1.5 text-[var(--foreground)] hover:bg-white/10"
            aria-label={i18n("previous")}
          >
            <Icon name="skipBack" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => controlSpotify(track.isPlaying ? "pause" : "play")}
            className="rounded-full bg-emerald-500 p-2 text-white hover:bg-emerald-400"
            aria-label={track.isPlaying ? i18n("pause") : i18n("play")}
          >
            {track.isPlaying ? <Icon name="pause" className="h-4 w-4" /> : <Icon name="play" className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => controlSpotify("next")}
            className="rounded-full p-1.5 text-[var(--foreground)] hover:bg-white/10"
            aria-label={i18n("next")}
          >
            <Icon name="skipForward" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={async () => {
              const next = !saved;
              setSaved(next);
              if (track.id) await controlSpotify(next ? "save" : "unsave", track.id);
            }}
            className={`ml-auto rounded-full p-1.5 ${saved ? "text-emerald-400" : "text-rose-400"} hover:bg-rose-500/10`}
            aria-label={saved ? i18n("unlike") : i18n("like")}
          >
            <Icon name={saved ? "heart-off" : "heart"} className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderDiscordBack(record: LiveRecord) {
    if (!lanyard) {
      return (
        <div className="flex h-full flex-col justify-between">
          <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          <p className="text-sm text-[var(--foreground)]">{i18n("notConnected")}</p>
          <p className="text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
        </div>
      );
    }

    const status = lanyard.discord_status || "offline";
    const statusColor: Record<string, string> = {
      online: "bg-emerald-500",
      idle: "bg-amber-500",
      dnd: "bg-rose-500",
      offline: "bg-zinc-500",
    };
    const statusLabels: Record<string, string> = {
      online: "statusOnline",
      idle: "statusAway",
      dnd: "statusDnd",
      offline: "statusOffline",
    };
    const activities = lanyard.activities || [];

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2 py-1">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor[status] || statusColor.offline}`} />
            <span className="text-xs font-medium capitalize text-[var(--foreground)]">
              {i18n(statusLabels[status] || "statusOffline")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ImageFallback
            src={lanyard.avatarUrl}
            alt={lanyard.displayName || "Discord"}
            size={48}
            fallback="DC"
            className="h-12 w-12 rounded-full border border-[var(--border)] object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--foreground)]">{lanyard.displayName || record.title}</p>
            <p className="truncate text-[10px] text-[var(--muted)]">{lanyard.userId ? `ID: ${lanyard.userId.slice(0, 8)}…` : "—"}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">
            {i18n("activities")} · {activities.length}
          </p>
          {activities.length > 0 ? (
            <ul className="space-y-1.5">
              {activities.slice(0, 6).map((a, i) => (
                <li key={i} className="rounded-lg bg-[var(--surface)]/50 p-1.5 text-sm">
                  <p className="truncate font-medium text-[var(--foreground)]">{a.name}</p>
                  {a.details && <p className="truncate text-[10px] text-[var(--muted)]">{a.details}</p>}
                  {a.state && <p className="truncate text-[10px] text-[var(--muted)]">{a.state}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
          )}
        </div>

        {lanyard.spotify?.playing && lanyard.spotify.title && (
          <div className="rounded-lg bg-[var(--surface)]/70 p-2">
            <p className="mb-1 text-[10px] font-medium text-emerald-400">Spotify</p>
            <p className="truncate text-xs font-medium text-[var(--foreground)]">{lanyard.spotify.title}</p>
            <p className="truncate text-[10px] text-[var(--muted)]">
              {lanyard.spotify.artist}
              {lanyard.spotify.album ? ` — ${lanyard.spotify.album}` : ""}
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderMinecraftBack(record: LiveRecord) {
    const profile = (minecraft as Record<string, unknown>) || {};
    const names = minecraftNameHistory || [];
    const username = toStr(profile.username) || toStr(profile.name) || record.title;
    const uuid = toStr(profile.uuid);
    const model = toStr(profile.model);
    const skin = toStr(profile.skinUrl);
    const cape = toStr(profile.capeUrl);

    return (
      <div className="flex h-full flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
        <div className="flex items-center gap-3">
          {skin ? (
            <Image src={skin} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded bg-[var(--surface)] text-[10px]">MC</span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--foreground)]">{username || "—"}</p>
            {uuid && <p className="text-[10px] text-[var(--muted)]">ID: {uuid.slice(0, 8)}…</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {model && (
            <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
              {i18n("model")}: {model}
            </span>
          )}
          {cape && (
            <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
              Cape
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">
            {i18n("nameHistory")} · {names.length}
          </p>
          {names.length > 0 ? (
            <ul className="space-y-1.5">
              {names.slice(-8).map((n, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[var(--foreground)]">{toStr(n.name) || "—"}</span>
                  {Boolean(n.changedAt) && (
                    <span className="text-[10px] text-[var(--muted)]">
                      {formatLocalDate(String(n.changedAt), mounted)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">{i18n("noResults")}</p>
          )}
        </div>
      </div>
    );
  }

  function renderBillsBack(record: LiveRecord) {
    const { upcoming, totalThisMonth, currency } = billsSummary;
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
            {i18n("billsTotalThisMonth")}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[var(--foreground)]">{totalThisMonth > 0 ? totalThisMonth : "—"}</span>
          {totalThisMonth > 0 && currency && <span className="text-sm text-[var(--muted)]">{currency}</span>}
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">
            {i18n("billsUpcoming")} · {upcoming.length}
          </p>
          {upcoming.length > 0 ? (
            <ul className="space-y-1.5">
              {upcoming.map((b, i) => {
                const label = toStr(b.label) || toStr(b.title) || "—";
                const amount = toNum(b.amount);
                const due = toStr(b.dueAt) || toStr(b.due) || toStr(b.date);
                const category = toStr(b.category) || "other";
                const catKey = `billCategory${category.charAt(0).toUpperCase() + category.slice(1)}`;
                return (
                  <li key={i} className="rounded-lg bg-[var(--surface)]/50 p-1.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)]" title={label}>{label}</span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--accent)]">
                        {amount !== undefined ? `${amount} ${toStr(b.currency) || currency || ""}`.trim() : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                      <span>{i18n(catKey) || category}</span>
                      {due && <span className="flex items-center gap-1"><Icon name="calendar" className="h-3 w-3" /> {formatLocalDate(due, mounted)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">{i18n("noBills")}</p>
          )}
        </div>
      </div>
    );
  }

  function renderWeatherBack(record: LiveRecord) {
    if (!weather) {
      return (
        <div className="flex h-full flex-col justify-between">
          <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          <p className="text-sm text-[var(--foreground)]">{i18n("noForecast")}</p>
          <p className="text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
        </div>
      );
    }
    const w = weather as Record<string, unknown>;
    const temp = toNum(w.temperature) ?? toNum(w.temperatureC);
    const condition = toStr(w.description) || toStr(w.condition);
    const humidity = toNum(w.humidityPercent);
    const wind = toNum(w.windSpeedKmh);
    const city = toStr(w.city) || toStr(w.location);
    const forecast = (w.forecast as Array<Record<string, unknown>> | undefined) || [];

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          {city && (
            <p className="truncate text-xs text-[var(--muted)]">
              <Icon name="mapPin" className="mr-1 inline h-3 w-3" />
              {city}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {toStr(w.iconUrl) ? (
            <Image src={toStr(w.iconUrl) || ""} alt="" width={56} height={56} unoptimized className="h-14 w-14 object-contain" />
          ) : (
            <Icon name="cloudSun" className="h-14 w-14 text-amber-400" />
          )}
          <div className="min-w-0">
            {temp !== undefined && <p className="text-3xl font-bold text-[var(--foreground)]">{temp}°C</p>}
            {condition && <p className="truncate text-sm font-medium text-[var(--foreground)]">{condition}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
          {humidity !== undefined && (
            <span className="rounded-lg bg-[var(--surface)] px-2 py-1">{humidity}% {i18n("humidity")}</span>
          )}
          {wind !== undefined && (
            <span className="rounded-lg bg-[var(--surface)] px-2 py-1">{wind} km/h {i18n("wind")}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">{i18n("forecast")}</p>
          {forecast.length > 0 ? (
            <ul className="space-y-1.5">
              {forecast.slice(0, 5).map((day, i) => {
                const date = toStr(day.date);
                const min = toNum(day.min);
                const max = toNum(day.max);
                return (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-[var(--surface)]/50 px-2 py-1 text-sm">
                    <span className="text-[var(--muted)]">
                      {date ? formatLocalShortDate(date, mounted) : "—"}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {min !== undefined ? `${min}°` : "—"} / {max !== undefined ? `${max}°` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">{i18n("noForecast")}</p>
          )}
        </div>
      </div>
    );
  }

  function renderBack(record: LiveRecord) {
    if (record.source === "nowplaying") return renderNowPlayingBack(record);
    if (record.source === "lanyard") return renderDiscordBack(record);
    if (record.source === "lastfm") return renderLastfmBack();
    if (record.source === "steam") return renderSteamBack();
    if (record.source === "minecraft") return renderMinecraftBack(record);
    if (record.source === "bills") return renderBillsBack(record);
    if (record.source === "weather") return renderWeatherBack(record);
    return renderGenericBack(record);
  }

  function renderGenericBack(record: LiveRecord) {
    const isConnected = record.status === "connected";
    const statusDot = `inline-block h-2 w-2 rounded-full ${STATUS_DOT[record.status]}`;
    const iconName = SOURCE_ICON[record.source] || "activity";

    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name={iconName} className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
          </div>
          <span className={statusDot} aria-hidden="true" />
        </div>

        {!isConnected && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Icon name={iconName} className="h-10 w-10 text-[var(--muted)]" />
            <p className="text-sm text-[var(--foreground)]">
              {record.status === "loading" ? i18n("loading") : record.status === "error" ? i18n("liveError") : i18n("notConnected")}
            </p>
            {record.subtitle && <p className="text-xs text-[var(--muted)]">{record.subtitle}</p>}
          </div>
        )}

        {isConnected && (
          <>
            {record.image && (
              <div className="relative h-24 w-full shrink-0">
                <Image
                  src={record.image}
                  alt=""
                  fill
                  unoptimized
                  className="rounded-xl object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              {record.title && <p className="truncate text-sm font-semibold text-[var(--foreground)]">{record.title}</p>}
              {record.subtitle && <p className="truncate text-xs text-[var(--muted)]">{record.subtitle}</p>}
              {record.meta && <p className="mt-1 truncate text-xs text-[var(--muted)]">{record.meta}</p>}
            </div>
          </>
        )}

        <p className="mt-auto text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
      </div>
    );
  }

  function renderDiscordFront(record: LiveRecord) {
    const status = lanyard?.discord_status || "offline";
    const tone = discordStatusTone(status);
    const activity = lanyard?.activities?.[0];
    const spotify = lanyard?.spotify;

    return (
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-3">
          <ImageFallback
            src={record.image}
            alt={record.title}
            size={56}
            fallback={record.title?.slice(0, 2).toUpperCase()}
            className="h-14 w-14 rounded-full border-2 border-[var(--border)] object-cover shadow-md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--foreground)]">{record.title}</p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className={`h-2 w-2 rounded-full ${tone.dot} ${tone.shadow}`} />
              <span>{i18n(tone.label)}</span>
            </div>
          </div>
        </div>

        {activity && (
          <div className="mb-2 rounded-xl bg-[var(--surface)]/60 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{i18n("activity")}</p>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{activity.name}</p>
            {activity.details && <p className="truncate text-xs text-[var(--muted)]">{activity.details}</p>}
            {activity.state && <p className="truncate text-xs text-[var(--muted)]">{activity.state}</p>}
          </div>
        )}

        {spotify?.playing && spotify.title && (
          <div className="mt-auto rounded-xl bg-emerald-500/10 p-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Spotify</p>
            <div className="flex items-center gap-2">
              {spotify.artwork ? (
                <Image src={spotify.artwork} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <Icon name="music" className="h-10 w-10 text-emerald-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{spotify.title}</p>
                <p className="truncate text-xs text-[var(--muted)]">{spotify.artist}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderWeatherFront(record: LiveRecord) {
    const w = weather as Record<string, unknown> | null;
    const condition = toStr(w?.description) || toStr(w?.condition) || record.subtitle || "—";
    const code = toNum(w?.weatherCode);
    const icon = weatherIconFromCode(code, condition);
    const city = toStr(w?.location) || toStr(w?.city) || "—";
    const humidity = toNum(w?.humidityPercent);
    const wind = toNum(w?.windSpeedKmh);
    const forecast = (Array.isArray(w?.forecast) ? (w.forecast as Record<string, unknown>[]) : []).slice(0, 3);

    return (
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon name={icon} className="h-12 w-12 shrink-0 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{record.title}</p>
              <p className="text-xs text-[var(--muted)] capitalize">{condition}</p>
              <p className="text-[10px] text-[var(--muted)]">{city}</p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {humidity !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-[10px] text-sky-400">
              <Icon name="droplets" className="h-3 w-3" />
              {humidity}% {i18n("humidity")}
            </span>
          )}
          {wind !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400">
              <Icon name="wind" className="h-3 w-3" />
              {wind} km/h
            </span>
          )}
        </div>

        {forecast.length > 0 && (
          <div className="mt-auto grid grid-cols-3 gap-2">
            {forecast.map((day, i) => {
              const min = toNum(day.min);
              const max = toNum(day.max);
              const date = toStr(day.date);
              const dayIcon = weatherIconFromCode(toNum(day.weatherCode), toStr(day.condition));
              return (
                <div key={i} className="flex flex-col items-center gap-1 rounded-xl bg-[var(--surface)]/60 p-2">
                  <span className="text-[10px] text-[var(--muted)]">{formatDateShort(date, mounted)}</span>
                  <Icon name={dayIcon} className="h-5 w-5 text-amber-400" />
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {min ?? "—"}° / {max ?? "—"}°
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderCard(record: LiveRecord) {
    const isFlipped = !!flipped[record.id];
    const gradient = GRADIENTS[record.source] || "from-[var(--surface-raised)]/20 to-transparent border-[var(--border)]";
    const isSpotify = record.source === "nowplaying";
    const isDiscord = record.source === "lanyard";
    const isYoutube = record.source === "youtube";
    const isTracker = record.source === "tracker";
    const isApex = record.source === "apex";
    const isWeather = record.source === "weather";
    const hasImageHeader = (isYoutube || isTracker || isApex) && record.image;

    return (
      <ContextMenu key={record.id} items={liveContextItems(record)}>
        <div
          onClick={customizing ? undefined : () => toggleFlip(record.id)}
          draggable={customizing}
          onDragStart={(e) => {
            setDraggingId(record.id);
            e.dataTransfer.setData("text/plain", record.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggingId && draggingId !== record.id) {
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData("text/plain");
            if (draggedId && draggedId !== record.id) {
              moveRecordTo(draggedId, record.id);
            }
            setDraggingId(null);
          }}
          onDragEnd={() => setDraggingId(null)}
          className={`group relative ${customizing ? "cursor-grab" : "cursor-pointer"}`}
          style={{ perspective: 1000 }}
        >
        <div
          className="relative h-64 transition-transform duration-500"
          style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className="absolute inset-0 h-full" style={{ backfaceVisibility: "hidden" }}>
            <div
              className={`h-full min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${gradient}`}
            >
              <div className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${STATUS_DOT[record.status]}`} />

              {customizing && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(record.id);
                    }}
                    className="absolute left-3 top-3 rounded-full bg-[var(--surface-raised)] p-1.5 text-[var(--foreground)] hover:bg-[var(--surface)]"
                  >
                    <Icon name={hidden.has(record.id) ? "eye-off" : "eye"} className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute right-3 bottom-3 flex gap-1.5 rounded-full bg-[var(--surface-raised)] p-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveRecord(record.id, "up"); }}
                      className="rounded-full p-1 hover:bg-[var(--surface)]"
                      aria-label={i18n("moveUp")}
                    >
                      <Icon name="arrow-up" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveRecord(record.id, "down"); }}
                      className="rounded-full p-1 hover:bg-[var(--surface)]"
                      aria-label={i18n("moveDown")}
                    >
                      <Icon name="arrow-down" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {isSpotify && record.image && (
                <div className="mb-3 flex items-end gap-4">
                  <Image src={record.image} alt="" width={96} height={96} unoptimized className="h-24 w-24 rounded-xl object-cover shadow-lg" />
                  <div className="flex flex-col gap-1 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">LIVE</span>
                    <Equalizer bars={6} className="h-5" />
                  </div>
                </div>
              )}

              {hasImageHeader && (
                <div className="mb-3 flex items-center gap-3">
                  <ImageFallback
                    src={record.image}
                    alt={record.title}
                    size={56}
                    fallback={record.title?.slice(0, 2).toUpperCase()}
                    className="h-14 w-14 rounded-full border-2 border-[var(--border)] object-cover shadow-md"
                  />
                  <div>
                    <p className="font-semibold">{record.title}</p>
                    <p className={`text-xs ${STATUS[record.status]}`}>{record.label}</p>
                  </div>
                </div>
              )}

              {isDiscord && renderDiscordFront(record)}

              {isWeather && renderWeatherFront(record)}

              {!isSpotify && !isDiscord && !isWeather && !hasImageHeader && (
                <div className="mb-2 flex items-center gap-2">
                  <span className={`text-sm font-semibold uppercase tracking-wider ${STATUS[record.status]}`}>{record.label}</span>
                </div>
              )}

              <div className="space-y-1">
                {!isSpotify && !isDiscord && !isWeather && !hasImageHeader && <p className="truncate font-medium">{record.title}</p>}
                {isSpotify && <p className="truncate text-lg font-bold">{record.title}</p>}
                {!isDiscord && !isWeather && record.subtitle && <p className="truncate text-sm text-[var(--muted)]">{record.subtitle}</p>}
                {!isDiscord && !isWeather && record.meta && <p className="truncate text-xs text-[var(--muted)]">{record.meta}</p>}
              </div>

              {isSpotify && nowPlaying?.isPlaying && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {nowPlaying.progressMs !== undefined && nowPlaying.durationMs && (
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={nowPlaying.durationMs}
                        value={nowPlaying.progressMs}
                        onChange={(e) => controlSpotify("seek", undefined, Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={i18n("seek")}
                        className="w-full accent-emerald-400"
                      />
                      <div className="flex justify-between text-[10px] text-[var(--muted)]">
                        <span>{formatTime(nowPlaying.progressMs)}</span>
                        <span>{formatTime(nowPlaying.durationMs)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => controlSpotify("previous")} className="rounded-full p-1.5 text-[var(--foreground)] hover:bg-white/10">
                      <Icon name="skipBack" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => controlSpotify(nowPlaying.isPlaying ? "pause" : "play")}
                      className="rounded-full bg-emerald-500 p-2 text-white hover:bg-emerald-400"
                    >
                      {nowPlaying.isPlaying ? <Icon name="pause" className="h-4 w-4" /> : <Icon name="play" className="h-4 w-4" />}
                    </button>
                    <button onClick={() => controlSpotify("next")} className="rounded-full p-1.5 text-[var(--foreground)] hover:bg-white/10">
                      <Icon name="skipForward" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const next = !saved;
                        setSaved(next);
                        await controlSpotify(next ? "save" : "unsave", nowPlaying?.id);
                      }}
                      className={`ml-auto rounded-full p-1.5 ${saved ? "text-emerald-400" : "text-rose-400"} hover:bg-rose-500/10`}
                      aria-label={saved ? i18n("unlike") : i18n("like")}
                    >
                      <Icon name={saved ? "heart-off" : "heart"} className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {isYoutube && record.image && (
                <div className="relative mt-3 h-32 w-full">
                  <Image src={record.image} alt="" fill unoptimized className="rounded-xl object-cover" />
                </div>
              )}
            </div>
          </div>

          <div
            className="absolute inset-0 h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {renderBack(record)}
          </div>
        </div>
      </div>
    </ContextMenu>
    );

  }

  return (
    <div className="space-y-6" data-testid="live-cards">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{i18n("live")}</h2>
            {loading && <Icon name="loader" className="h-4 w-4 animate-spin text-[var(--muted)]" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === "all" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n("all")}
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const count = groups[cat].length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {i18n(categoryLabels[cat])} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {CATEGORY_ORDER.filter((category) => activeCategory === "all" || activeCategory === category).map((category) => {
        const items = groups[category];
        if (items.length === 0) return null;
        return (
          <div key={category} className="space-y-2">
            <CategoryTag className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {i18n(categoryLabels[category])}
            </CategoryTag>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((record) => renderCard(record))}
            </div>
          </div>
        );
      })}
    </div>
  );
}