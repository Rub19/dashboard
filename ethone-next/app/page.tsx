"use client";

import Card3D from "@/components/Card3D";
import { useHomeData } from "@/lib/hooks/useDashboard";
import {
  Zap,
  Mail,
  Activity,
  Brain,
  Folder,
  Heart,
  Share2,
  Cloud,
  Music,
  Disc,
  Swords,
  Shield,
} from "lucide-react";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Home() {
  const { greeting, dashboard, nowPlaying, lanyard, valorant, lol, loading, error } =
    useHomeData();

  const matches = [...(valorant || []), ...(lol || [])].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold">{greeting.label}</h1>
        <p className="text-[var(--muted)]">{greeting.tone}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Zap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : dashboard?.totalFiles ?? 0}</p>
              <p className="text-xs text-[var(--muted)]">Fichiers</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : "-"}</p>
              <p className="text-xs text-[var(--muted)]">Messages non lus</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : formatBytes(dashboard?.totalSize)}</p>
              <p className="text-xs text-[var(--muted)]">Stockage utilisé</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Brain className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{loading ? "-" : "ON"}</p>
              <p className="text-xs text-[var(--muted)]">Brain</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card3D>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Music className="h-4 w-4 text-[var(--muted)]" /> Live Now
          </h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ) : nowPlaying?.title ? (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                <Disc className="h-5 w-5 animate-spin-slow" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{nowPlaying.title}</p>
                <p className="truncate text-xs text-[var(--muted)]">{nowPlaying.artist}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Aucune activité en direct.</p>
          )}
        </Card3D>

        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Cloud</h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ) : dashboard ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.folders} dossiers</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.favorites} favoris</span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.activeShares} partages</span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-[var(--muted)]" />
                <span className="text-sm">{dashboard.activeDrops} drops</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Cloud non disponible.</p>
          )}
        </Card3D>

        <Card3D>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Derniers matchs</h2>
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
                    <Swords className="h-4 w-4 text-violet-400" />
                  ) : (
                    <Shield className="h-4 w-4 text-sky-400" />
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
            <p className="text-sm text-[var(--muted)]">Aucun match récent.</p>
          )}
        </Card3D>
      </div>

      {lanyard?.discord_status && (
        <Card3D>
          <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Discord</h2>
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
    </div>
  );
}
