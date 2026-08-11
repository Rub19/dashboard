"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import LiveWidgets from "@/components/LiveWidgets";
import LiveStats from "@/components/LiveStats";
import { useHomeData } from "@/lib/hooks/useDashboard";
import { useMail } from "@/lib/hooks/useMail";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Home() {
  const i18n = useI18n();
  const { greeting, dashboard, nowPlaying, lanyard, valorant, lol, loading, error } =
    useHomeData();
  const { unread: unreadMail, loading: mailLoading } = useMail();
  const { settings, update: updateSettings } = useSettings();
  const [customizing, setCustomizing] = useState(false);

  const matches = [...(valorant || []), ...(lol || [])].slice(0, 6);

  const STATUSES = [
    { id: "online", label: i18n("statusOnline"), icon: "circle" },
    { id: "busy", label: i18n("statusBusy"), icon: "minus-circle" },
    { id: "focus", label: i18n("statusFocus"), icon: "target" },
    { id: "away", label: i18n("statusAway"), icon: "moon" },
    { id: "invisible", label: i18n("statusInvisible"), icon: "eye-off" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold">{greeting.label}</h1>
        <p className="text-[var(--muted)]">{greeting.tone}</p>
      </div>

      <Card3D>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("sessionMode")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => updateSettings({ status: s.id })}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                settings.status === s.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon name={s.icon} className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </Card3D>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Icon name="zap" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : dashboard?.totalFiles ?? 0}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("totalFiles")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon name="mail" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{mailLoading ? "-" : unreadMail}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("unread")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Icon name="activity" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : formatBytes(dashboard?.totalSize)}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("storageUsed")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Icon name="brain" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{settings.brainEnabled ? "ON" : "OFF"}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("brain")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card3D>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Icon name="music" className="h-4 w-4 text-[var(--muted)]" /> {i18n("live")}
          </h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ) : nowPlaying?.title ? (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                <Icon name="disc" className="h-5 w-5 animate-spin-slow" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{nowPlaying.title}</p>
                <p className="truncate text-xs text-[var(--muted)]">{nowPlaying.artist}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{i18n("noLive")}</p>
          )}
        </Card3D>

        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("cloud")}</h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ) : dashboard ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Icon name="folder" className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.folders} {i18n("folders")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="heart" className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.favorites} {i18n("favorites")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="share-2" className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.activeShares} {i18n("shared")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="cloud" className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.activeDrops} {i18n("drops")}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{i18n("cloudUnavailable")}</p>
          )}
        </Card3D>

        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{i18n("recentMatches")}</h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ) : matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map((m, i) => (
                <div key={m.id || i} className="flex items-center gap-2">
                  {m.agent || m.champion ? (
                    <Icon name="swords" className="h-4 w-4 text-violet-400" />
                  ) : (
                    <Icon name="shield" className="h-4 w-4 text-sky-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {m.map || m.mode || "Match"}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {m.kills ?? "-"}/{m.deaths ?? "-"}/{m.assists ?? "-"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{i18n("noMatches")}</p>
          )}
        </Card3D>
      </div>

      {lanyard?.discord_status && (
        <Card3D>
          <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{i18n("discord")}</h2>
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                lanyard.discord_status === "online"
                  ? "bg-emerald-500"
                  : lanyard.discord_status === "idle"
                  ? "bg-amber-500"
                  : lanyard.discord_status === "dnd"
                  ? "bg-red-500"
                  : "bg-zinc-500"
              }`}
            />
            <span className="text-sm capitalize">{lanyard.discord_status}</span>
            {lanyard.activities?.[0] && (
              <span className="ml-2 text-sm text-[var(--muted)]">
                {lanyard.activities[0].name}
              </span>
            )}
          </div>
        </Card3D>
      )}

      <LiveStats />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{i18n("live")}</h2>
          <button
            type="button"
            onClick={() => setCustomizing((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Icon name={customizing ? "x" : "settings"} className="h-3.5 w-3.5" />
            {customizing ? i18n("done") : i18n("customize")}
          </button>
        </div>
        <LiveWidgets showHeader={false} customizing={customizing} />
      </section>
    </div>
  );
}
