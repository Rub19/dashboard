"use client";

import { useState, useMemo } from "react";
import { useTracker, type TrackerGame, type TrackerPlayer } from "@/lib/hooks/useTracker";
import Card3D from "@/components/Card3D";
import LiquidSidebar from "@/components/LiquidSidebar";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";

const tabs = [
  { id: "valorant", label: "Valorant", icon: <Icon name="swords" className="h-4 w-4" /> },
  { id: "lol", label: "League of Legends", icon: <Icon name="shield" className="h-4 w-4" /> },
  { id: "apex", label: "Apex Legends", icon: <Icon name="gamepad-2" className="h-4 w-4" /> },
];

const APEX_PLATFORMS = ["origin", "xbl", "psn"] as const;

function PartyBadge({ partySize }: { partySize?: number }) {
  if (!partySize || partySize <= 1) return null;
  const label = partySize === 2 ? "DUO" : partySize === 3 ? "TRIO" : "TEAM";
  return <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">{label}</span>;
}

function MatchCard({ match, game }: { match: Record<string, string | number | undefined>; game: TrackerGame }) {
  const [open, setOpen] = useState(false);
  const i18n = useI18n();
  const header = match.map || match.agent || match.champion || match.mode || match.legend || "Match";
  const score = match.result || `${match.kills ?? "-"}/${match.deaths ?? "-"}/${match.assists ?? "-"}`;
  const players = game.players || [];
  const hasScoreboard = players.length > 0;
  const teamIds = [...new Set(players.map((p) => p.team || "unknown"))];

  // Minimal party detection: group by consecutive shared partyId in same team.
  const partiesByTeam = teamIds.map((team) => {
    const members = players.filter((p) => (p.team || "unknown") === team);
    const partyGroups: Record<string, TrackerPlayer[]> = {};
    members.forEach((p) => {
      const key = p.partyId || `solo-${p.name}`;
      partyGroups[key] = partyGroups[key] || [];
      partyGroups[key].push(p);
    });
    return { team, groups: Object.values(partyGroups) };
  });

  return (
    <Card3D>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Icon name="trophy" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--foreground)]">{header}</p>
            <p className="truncate text-xs text-[var(--muted)]">{score}</p>
          </div>
          {hasScoreboard && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
              aria-label={i18n("scoreboard")}
            >
              <Icon name={open ? "chevron-up" : "chevron-down"} className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && hasScoreboard && (
          <div className="space-y-3 rounded-xl bg-[var(--surface)] p-2 text-xs">
            {game.roundsWon !== undefined && game.roundsLost !== undefined && (
              <div className="flex items-center justify-between font-semibold">
                <span>{i18n("roundsWon")}: {game.roundsWon}</span>
                <span>{i18n("roundsLost")}: {game.roundsLost}</span>
              </div>
            )}
            {partiesByTeam.map(({ team, groups }) => (
              <div key={team}>
                <p className="mb-1 font-semibold uppercase tracking-wider text-[var(--muted)]">{team}</p>
                <div className="space-y-1">
                  {groups.map((group, gi) => {
                    const partySize = group.length;
                    return (
                      <div
                        key={gi}
                        className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]"
                      >
                        {group.map((p, pi) => (
                          <div key={pi} className="flex items-center gap-2 px-2 py-1.5">
                            <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                            {partySize > 1 && <PartyBadge partySize={partySize} />}
                            {p.agent && <span className="text-[var(--muted)]">{p.agent}</span>}
                            {p.champion && <span className="text-[var(--muted)]">{p.champion}</span>}
                            {p.legend && <span className="text-[var(--muted)]">{p.legend}</span>}
                            {p.rank && <span className="rounded bg-[var(--surface)] px-1.5 text-[var(--muted)]">{p.rank}</span>}
                            <span className="ml-auto shrink-0 font-mono">
                              {p.kills ?? "-"}/{p.deaths ?? "-"}/{p.assists ?? "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [apexPlatform, setApexPlatform] = useState<"origin" | "xbl" | "psn">(settings.liveTrackerApexPlatform || "origin");
  const [apexIdentifier, setApexIdentifier] = useState(settings.liveTrackerApexIdentifier);

  const path = useMemo(() => {
    if (tab === "apex") {
      if (!settings.liveTrackerApexIdentifier) return "";
      return `/api/tracker/apex-matches?platform=${encodeURIComponent(settings.liveTrackerApexPlatform)}&identifier=${encodeURIComponent(settings.liveTrackerApexIdentifier)}&mode=all`;
    }
    if (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) return "";
    return tab === "valorant"
      ? `/api/tracker/valorant-matches?name=${encodeURIComponent(settings.liveTrackerRiotName)}&tag=${encodeURIComponent(settings.liveTrackerRiotTag)}`
      : `/api/tracker/lol-matches?name=${encodeURIComponent(settings.liveTrackerRiotName)}&tag=${encodeURIComponent(settings.liveTrackerRiotTag)}`;
  }, [
    tab,
    settings.liveTrackerRiotName,
    settings.liveTrackerRiotTag,
    settings.liveTrackerApexPlatform,
    settings.liveTrackerApexIdentifier,
  ]);

  const trackerKind = tab === "apex" ? "tracker-apex" : tab === "valorant" ? "tracker-valorant" : "tracker-lol";
  const { items, loading, syncing, sync } = useTracker(path, trackerKind);

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

        {tab === "apex" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="apex-platform" className="mb-1 block text-xs text-[var(--muted)]">{i18n("platform")}</label>
              <select
                id="apex-platform"
                value={apexPlatform}
                onChange={(e) => setApexPlatform(e.target.value as typeof apexPlatform)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              >
                {APEX_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p === "origin" ? "Origin (PC)" : p === "xbl" ? "Xbox Live" : "PlayStation Network"}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="apex-identifier" className="mb-1 block text-xs text-[var(--muted)]">{i18n("liveTrackerApexIdentifier")}</label>
              <input
                id="apex-identifier"
                type="text"
                value={apexIdentifier}
                onChange={(e) => setApexIdentifier(e.target.value)}
                placeholder={i18n("liveTrackerApexIdentifier")}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="button"
              onClick={() => update({ liveTrackerApexPlatform: apexPlatform, liveTrackerApexIdentifier: apexIdentifier })}
              className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {i18n("apply")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
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
            <div className="min-w-0 flex-1">
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
        )}

        {tab === "apex"
          ? !settings.liveTrackerApexIdentifier && (
              <p className="text-sm text-[var(--muted)]">{i18n("trackerMissingApexId")}</p>
            )
          : (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) && (
              <p className="text-sm text-[var(--muted)]">{i18n("trackerMissingRiotId")}</p>
            )}

        {loading && !items ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-[var(--border)]" />
            <div className="h-20 animate-pulse rounded-2xl bg-[var(--border)]" />
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((match, i) => (
              <MatchCard key={match.id || i} match={match as unknown as Record<string, string | number | undefined>} game={match} />
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
