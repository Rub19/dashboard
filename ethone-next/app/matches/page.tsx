"use client";

import { useState } from "react";
import { useTracker } from "@/lib/hooks/useTracker";
import Card3D from "@/components/Card3D";
import LiquidSidebar from "@/components/LiquidSidebar";
import { RefreshCw, Trophy, Swords, Shield } from "lucide-react";

const tabs = [
  { id: "valorant", label: "Valorant", icon: <Swords className="h-4 w-4" /> },
  { id: "lol", label: "League of Legends", icon: <Shield className="h-4 w-4" /> },
];

function MatchCard({ match }: { match: any }) {
  return (
    <Card3D>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <Trophy className="h-5 w-5" />
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
  const [tab, setTab] = useState("valorant");
  const { items, loading, syncing, sync } = useTracker(
    tab === "valorant" ? "/api/tracker/valorant/matches" : "/api/tracker/lol/matches",
    tab === "valorant" ? "tracker-valorant" : "tracker-lol"
  );

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
          <h1 className="min-w-0 truncate text-2xl font-bold">Trackers</h1>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
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
            <p className="text-sm text-[var(--muted)]">Aucun match récent.</p>
          </Card3D>
        )}
      </div>
    </div>
  );
}
