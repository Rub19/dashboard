"use client";

import { useState } from "react";
import Image from "next/image";
import { useLiveData, LASTFM_PERIODS, type LastfmPeriod, type LiveRecord } from "@/lib/hooks/useLiveData";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import Equalizer from "./Equalizer";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import ContextMenu from "@/components/ContextMenu";

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
  const {
    records,
    nowPlaying,
    loading,
    lastfmPeriod,
    setLastfmPeriod,
    lastfmTopArtists,
    lastfmTopTracks,
    steam,
    steamRecentGames,
    steamOwnedGames,
    minecraft,
    minecraftNameHistory,
  } = useLiveData();
  const { settings, update } = useSettings();
  const { error: showError } = useToast();
  const i18n = useI18n();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const hidden = new Set(settings.homeHiddenLiveCards || []);
  const layout = settings.activityLiveLayout || [];
  const baseRecords = (customizing ? records : records.filter((r) => !hidden.has(r.id))).map((r) => ({ ...r }));
  const orderMap = new Map(layout.map((id, i) => [id, i]));
  const visibleRecords = [...baseRecords].sort((a, b) => (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity));

  async function controlSpotify(action: "play" | "pause" | "next" | "previous") {
    if (!settings.liveSpotifyClientId) {
      showError(i18n("configureToEnable"));
      return;
    }
    try {
      await fetchWorker("/api/spotify/control", {
        method: "POST",
        body: JSON.stringify({ action, clientId: settings.liveSpotifyClientId }),
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
          <select
            value={lastfmPeriod}
            onChange={(e) => setLastfmPeriod(e.target.value as LastfmPeriod)}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none"
            aria-label={i18n("period")}
          >
            {LASTFM_PERIODS.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p)}
              </option>
            ))}
          </select>
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
        </div>
      </div>
    );
  }

  function renderMinecraftBack() {
    const profile = (minecraft as Record<string, unknown>) || {};
    const names = minecraftNameHistory || [];
    return (
      <div className="flex h-full flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Minecraft</p>
        <p className="truncate text-sm">{String(profile.username ?? profile.name ?? "—")}</p>
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">
            {i18n("nameHistory")} · {names.length}
          </p>
          {names.length > 0 ? (
            <ul className="space-y-1.5">
              {names.slice(-8).map((n, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{String(n.name ?? "—")}</span>
                  {Boolean(n.changedAt) && (
                    <span className="text-[10px] text-[var(--muted)]">{new Date(String(n.changedAt)).toLocaleDateString()}</span>
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
    return (
      <div className="flex h-full flex-col justify-between">
        <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
        <div className="space-y-2 text-sm text-[var(--foreground)]">
          <p className="text-2xl font-bold">{record.title || "—"}</p>
          {record.subtitle && <p className="text-[var(--muted)]">{record.subtitle}</p>}
          {record.meta && (
            <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Icon name="calendar" className="h-3.5 w-3.5" /> {record.meta}
            </p>
          )}
        </div>
        <p className="text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
      </div>
    );
  }

  function renderWeatherBack(record: LiveRecord) {
    const details = record.subtitle ? record.subtitle.split(" · ") : [];
    return (
      <div className="flex h-full flex-col justify-between">
        <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
        <div className="space-y-2 text-sm text-[var(--foreground)]">
          {record.title && (
            <p className="text-2xl font-bold">{record.title}</p>
          )}
          {details.length > 0 && (
            <ul className="space-y-1 text-xs text-[var(--muted)]">
              {details.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Icon name="cloud" className="h-3.5 w-3.5" /> {d}
                </li>
              ))}
            </ul>
          )}
          {record.meta && (
            <p className="text-xs text-[var(--muted)]">{record.meta}</p>
          )}
        </div>
        <p className="text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
      </div>
    );
  }

  function renderBack(record: LiveRecord) {
    if (record.source === "lastfm") return renderLastfmBack();
    if (record.source === "steam") return renderSteamBack();
    if (record.source === "minecraft") return renderMinecraftBack();
    if (record.source === "bills") return renderBillsBack(record);
    if (record.source === "weather") return renderWeatherBack(record);
    return (
      <div className="flex h-full flex-col justify-between">
        <p className="text-sm font-semibold text-[var(--accent)]">{record.label}</p>
        <div className="space-y-1 text-sm text-[var(--foreground)]">
          <p>
            <span className="text-[var(--muted)]">{i18n("source")}:</span> {record.source}
          </p>
          <p>
            <span className="text-[var(--muted)]">{i18n("status")}:</span> {record.status}
          </p>
          {record.subtitle && (
            <p>
              <span className="text-[var(--muted)]">{i18n("detail")}:</span> {record.subtitle}
            </p>
          )}
          {record.meta && (
            <p>
              <span className="text-[var(--muted)]">{i18n("meta")}:</span> {record.meta}
            </p>
          )}
        </div>
        <p className="text-[10px] text-[var(--muted)]">{i18n("flipCard")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{i18n("live")}</h2>
          {loading && <Icon name="loader" className="h-4 w-4 animate-spin text-[var(--muted)]" />}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleRecords.map((record) => {
          const isFlipped = !!flipped[record.id];
          const gradient = GRADIENTS[record.source] || "from-[var(--surface-raised)]/20 to-transparent border-[var(--border)]";
          const isSpotify = record.source === "nowplaying";
          const isDiscord = record.source === "lanyard";
          const isYoutube = record.source === "youtube";
          const isTracker = record.source === "tracker";
          const isApex = record.source === "apex";
          const hasImageHeader = (isDiscord || isYoutube || isTracker || isApex) && record.image;

          return (
            <ContextMenu key={record.id} items={liveContextItems(record)}>
              <div
                onClick={() => toggleFlip(record.id)}
                className="group relative cursor-pointer"
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
                        <Image
                          src={record.image || ""}
                          alt=""
                          width={56}
                          height={56}
                          unoptimized
                          className="h-14 w-14 rounded-full border-2 border-[var(--border)] object-cover shadow-md"
                        />
                        <div>
                          <p className="font-semibold">{record.title}</p>
                          <p className={`text-xs ${STATUS[record.status]}`}>{record.label}</p>
                        </div>
                      </div>
                    )}

                    {!isSpotify && !hasImageHeader && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`text-sm font-semibold uppercase tracking-wider ${STATUS[record.status]}`}>{record.label}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      {!isSpotify && !hasImageHeader && <p className="truncate font-medium">{record.title}</p>}
                      {isSpotify && <p className="truncate text-lg font-bold">{record.title}</p>}
                      {record.subtitle && <p className="truncate text-sm text-[var(--muted)]">{record.subtitle}</p>}
                      {record.meta && <p className="truncate text-xs text-[var(--muted)]">{record.meta}</p>}
                    </div>

                    {isSpotify && nowPlaying?.isPlaying && (
                      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                        {nowPlaying.progressMs !== undefined && nowPlaying.durationMs && (
                          <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${Math.min(100, (nowPlaying.progressMs / nowPlaying.durationMs) * 100)}%` }}
                              />
                            </div>
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
                          <button className="ml-auto rounded-full p-1.5 text-rose-400 hover:bg-rose-500/10">
                            <Icon name="heart" className="h-4 w-4" />
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
        })}
      </div>
    </div>
  );
}
