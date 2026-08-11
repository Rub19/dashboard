"use client";

import { useState, useMemo } from "react";
import { useTracker } from "@/lib/hooks/useTracker";
import Card3D from "@/components/Card3D";
import LiquidSidebar from "@/components/LiquidSidebar";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";

const tabs = [
  { id: "valorant", label: "Valorant", icon: <Icon name="swords" className="h-4 w-4" /> },
  { id: "lol", label: "League of Legends", icon: <Icon name="shield" className="h-4 w-4" /> },
];

function MatchCard({ match }: { match: Record<string, string | number | undefined> }) {
  return (
    <Card3D>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <Icon name="trophy" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--foreground)]">
            {match.map || match.agent || match.champion || match.mode || "Match"}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">
            {match.result || `${match.kills ?? "-"}/${match.deaths ?? "-"}/${match.assists ?? "-"}`}
          </p>
        </div>
      </div>
    </Card3D>
  );
}

export default function MatchesPage() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState("valorant");
  const [name, setName] = useState(settings.liveTrackerRiotName);
  const [tag, setTag] = useState(settings.liveTrackerRiotTag);

  const path = useMemo(() => {
    if (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) return "";
    return tab === "valorant"
      ? `/api/tracker/valorant-matches?name=${encodeURIComponent(settings.liveTrackerRiotName)}&tag=${encodeURIComponent(settings.liveTrackerRiotTag)}`
      : `/api/tracker/lol-matches?name=${encodeURIComponent(settings.liveTrackerRiotName)}&tag=${encodeURIComponent(settings.liveTrackerRiotTag)}`;
  }, [tab, settings.liveTrackerRiotName, settings.liveTrackerRiotTag]);

  const { items, loading, syncing, sync } = useTracker(path, tab === "valorant" ? "tracker-valorant" : "tracker-lol");

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[14rem_1fr]">
      <LiquidSidebar
        items={tabs}
        defaultActive="valorant"
        active={tab}
        onChange={setTab}
      />
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="min-w-0 truncate text-2xl font-bold">{i18n("matchesTitle")}</h1>
          <button
            type="button"
            onClick={async () => {
              try {
                await sync();
                success(i18n("synced"));
              } catch {
                showError(i18n("error"));
              }
            }}
            disabled={syncing}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]/20 disabled:opacity-50"
          >
            <Icon name="refresh-cw" className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {i18n("sync")}
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="riot-name" className="mb-1 block text-xs text-[var(--muted)]">{i18n("liveTrackerRiotName")}</label>
            <input
              id="riot-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={i18n("liveTrackerRiotName")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor="riot-tag" className="mb-1 block text-xs text-[var(--muted)]">{i18n("liveTrackerRiotTag")}</label>
            <input
              id="riot-tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="#1234"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="button"
            onClick={() => update({ liveTrackerRiotName: name, liveTrackerRiotTag: tag })}
            className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("apply")}
          </button>
        </div>
        {!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag ? (
          <p className="text-sm text-[var(--muted)]">{i18n("trackerMissingRiotId")}</p>
        ) : null}
        {loading && !items ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-[var(--border)]" />
            <div className="h-20 animate-pulse rounded-2xl bg-[var(--border)]" />
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((match, i) => (
              <MatchCard key={match.id || i} match={match} />
            ))}
          </div>
        ) : (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">{i18n("noMatches")}</p>
          </Card3D>
        )}
      </div>
    </div>
  );
}
