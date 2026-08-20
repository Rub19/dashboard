"use client";

import { useState, useMemo } from "react";
import { useTracker, type TrackerGame, type TrackerPlayer } from "@/lib/hooks/useTracker";
import Card3D from "@/components/Card3D";
import LiquidSidebar from "@/components/LiquidSidebar";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
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

function Kda({ kills, deaths, assists }: { kills?: number; deaths?: number; assists?: number }) {
  const k = kills ?? 0;
  const d = deaths ?? 0;
  const a = assists ?? 0;
  const kda = d === 0 ? k + a : Number(((k + a) / d).toFixed(2));
  return <span className="font-mono text-[var(--foreground)]">{kda} KDA</span>;
}

function StatBadge({ label, value, color = "text-[var(--muted)]" }: { label: string; value?: number | string; color?: string }) {
  if (value === undefined || value === null || value === "") return null;
  return <span className="rounded bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"><span className={`font-semibold ${color}`}>{value}</span> {label}</span>;
}

function MatchCard({ match, game }: { match: Record<string, string | number | undefined>; game: TrackerGame }) {
  const [open, setOpen] = useState(false);
  const i18n = useI18n();
  const header = match.map || match.agent || match.champion || match.mode || match.legend || "Match";
  const score = match.result || `${match.kills ?? "-"}/${match.deaths ?? "-"}/${match.assists ?? "-"}`;
  const players = game.players || [];
  const hasScoreboard = players.length > 0;
  const teamIds = [...new Set(players.map((p) => p.team || "unknown"))];

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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
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
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel-bg)]"
              aria-label={i18n("scoreboard")}
            >
              <Icon name={open ? "chevron-up" : "chevron-down"} className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && hasScoreboard && (
          <div className="space-y-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2 text-xs">
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
                        className="divide-y divide-[var(--border)] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
                      >
                        {group.map((p, pi) => (
                          <div key={pi} className="space-y-1 px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                              {partySize > 1 && <PartyBadge partySize={partySize} />}
                              {p.rank && <span className="rounded bg-[var(--panel-bg)] px-1.5 text-[var(--muted)]">{p.rank}</span>}
                              <span className="ml-auto shrink-0 font-mono text-[var(--foreground)]">
                                {p.kills ?? "-"}/{p.deaths ?? "-"}/{p.assists ?? "-"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.agent && <StatBadge label="Agent" value={p.agent} />}
                              {p.champion && <StatBadge label="Champion" value={p.champion} />}
                              {p.legend && <StatBadge label="Légende" value={p.legend} />}
                              <Kda kills={p.kills} deaths={p.deaths} assists={p.assists} />
                              {p.hsPercent !== undefined && <StatBadge label="HS" value={`${p.hsPercent}%`} color="text-rose-400" />}
                              {p.cs !== undefined && <StatBadge label="CS" value={p.cs} />}
                              {p.gold !== undefined && <StatBadge label="Or" value={p.gold} color="text-amber-400" />}
                              {p.vision !== undefined && <StatBadge label="Vision" value={p.vision} />}
                              {p.damage !== undefined && <StatBadge label="Dégâts" value={p.damage} color="text-red-400" />}
                              {p.healing !== undefined && <StatBadge label="Soins" value={p.healing} color="text-emerald-400" />}
                              {p.headshots !== undefined && <StatBadge label="Headshots" value={p.headshots} />}
                              {p.placement !== undefined && <StatBadge label="Place" value={`#${p.placement}`} color="text-violet-400" />}
                            </div>
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
    <div className="h-full min-h-0 w-full flex overflow-hidden gap-6">
      <LiquidSidebar
        items={tabs}
        defaultActive="valorant"
        active={tab}
        onChange={setTab}
      />
      <div className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 space-y-4">
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
            className="flex shrink-0 items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]/20 disabled:opacity-50"
          >
            <Icon name="refresh-cw" className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {i18n("sync")}
          </button>
        </div>

        {tab === "apex" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="apex-platform" className="mb-1 block text-xs text-[var(--muted)]">{i18n("platform")}</label>
              <Select
                id="apex-platform"
                value={apexPlatform}
                onChange={(value) => setApexPlatform(value as typeof apexPlatform)}
                options={APEX_PLATFORMS.map((p) => ({
                  id: p,
                  label: p === "origin" ? "Origin (PC)" : p === "xbl" ? "Xbox Live" : "PlayStation Network",
                }))}
                className="w-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="apex-identifier" className="mb-1 block text-xs text-[var(--muted)]">{i18n("liveTrackerApexIdentifier")}</label>
              <input
                id="apex-identifier"
                type="text"
                value={apexIdentifier}
                onChange={(e) => setApexIdentifier(e.target.value)}
                placeholder={i18n("liveTrackerApexIdentifier")}
                className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => update({ liveTrackerApexPlatform: apexPlatform, liveTrackerApexIdentifier: apexIdentifier })}
              className="shrink-0"
            >
              {i18n("apply")}
            </Button>
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
                className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
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
                className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => update({ liveTrackerRiotName: name, liveTrackerRiotTag: tag })}
              className="shrink-0"
            >
              {i18n("apply")}
            </Button>
          </div>
        )}

        {tab === "apex"
          ? !settings.liveTrackerApexIdentifier && (
              <p className="text-sm text-[var(--muted)]">{i18n("trackerMissingApexId")}</p>
            )
          : (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) && (
              <p className="text-sm text-[var(--muted)]">{i18n("trackerMissingRiotId")}</p>
            )}

        </div>
        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-4">
        {loading && !items ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-[var(--panel-radius)] bg-[var(--border)]" />
            <div className="h-20 animate-pulse rounded-[var(--panel-radius)] bg-[var(--border)]" />
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
    </div>
  );
}
