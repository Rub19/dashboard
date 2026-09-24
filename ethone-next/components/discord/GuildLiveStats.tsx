"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Users, MessageSquare, Terminal, Mic, HeartPulse, RefreshCw, ChevronRight, TrendingUp, TrendingDown } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Subset of discord-bot AnalyticsOverview + /overview that the home page renders.
interface Kpi { current: number; previous: number; percentageChange: number; trend: "up" | "down" | "neutral" }
interface Overview {
  period: string;
  healthScore: { score: number; status: "excellent" | "good" | "average" | "critical" };
  kpis: { members: Kpi; activeUsers: Kpi; messages: Kpi; commands: Kpi; voiceHours: Kpi; moderationActions: Kpi };
  timeSeries: { timestamp: string; messages: number; activeUsers: number; commands: number; joins: number; leaves: number }[];
  topChannels: { channelId: string; channelName: string; messageCount: number; percentage: number }[];
  topCommands: { command: string; count: number; percentage: number }[];
  peakHeatmap: { day: number; hour: number; value: number }[];
  insights: { id: string; text: string; trend: "positive" | "warning" | "neutral" }[];
  botHealth: { uptimeSeconds: number; pingMs: number; memoryMb: number; status: "healthy" | "degraded" | "critical" };
}

type Period = "24h" | "7d" | "30d";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Tiny inline SVG sparkline — no chart library on the home page. */
function Sparkline({ points, color, height = 44 }: { points: number[]; color: string; height?: number }) {
  const w = 240;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - (v / max) * (height - 4) - 2).toFixed(1)}`).join(" ");
  const area = `${d} L${w},${height} L0,${height} Z`;
  const id = `sg-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && <path d={area} fill={`url(#${id})`} />}
      {points.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

function Delta({ kpi }: { kpi: Kpi }) {
  if (!kpi || kpi.trend === "neutral" || !Number.isFinite(kpi.percentageChange)) return <span className="text-[10px] text-zinc-500">stable</span>;
  const up = kpi.trend === "up";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold", up ? "text-emerald-400" : "text-rose-400")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{Math.round(kpi.percentageChange)}%
    </span>
  );
}

export default function GuildLiveStats({ guildId }: { guildId: string }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!BOT_API_URL || !guildId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/analytics/overview?period=${period}`, { credentials: "include" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.kpis) {
          setError(res.status === 401 || res.status === 403 ? "Connecte-toi au bot pour voir les stats live." : "Stats indisponibles (bot hors ligne ou pas encore sur ce serveur).");
          setData(null);
          return;
        }
        setError(null);
        setData(json);
      } catch {
        if (!cancelled) setError("Bot injoignable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Live refresh — same cadence as the bot's telemetry sampler.
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [guildId, period]);

  const series = useMemo(() => {
    const ts = data?.timeSeries || [];
    return {
      messages: ts.map((p) => p.messages),
      activeUsers: ts.map((p) => p.activeUsers),
      commands: ts.map((p) => p.commands),
      net: ts.map((p) => p.joins - p.leaves),
    };
  }, [data]);

  // 7×24 heatmap collapsed to the 7 daily totals + the single hottest hour, to
  // stay readable in the home page card.
  const peak = useMemo(() => {
    const hm = data?.peakHeatmap || [];
    if (hm.length === 0) return null;
    const byDay = new Array(7).fill(0);
    let best = hm[0];
    for (const c of hm) {
      byDay[c.day] += c.value;
      if (c.value > best.value) best = c;
    }
    const max = Math.max(1, ...byDay);
    return { byDay, max, best };
  }, [data]);

  if (!BOT_API_URL) {
    return <p className="text-[11px] text-zinc-500">API du bot non configurée — stats live indisponibles.</p>;
  }

  const health = data?.healthScore;
  const bot = data?.botHealth;
  const healthColor = health?.status === "excellent" || health?.status === "good" ? "text-emerald-400" : health?.status === "average" ? "text-amber-400" : "text-rose-400";
  const botColor = bot?.status === "healthy" ? "bg-emerald-400" : bot?.status === "degraded" ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="space-y-3">
      {/* Barre période + santé */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-indigo-400" /> Stats live</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5 border border-[var(--panel-border)]">
            {(["24h", "7d", "30d"] as Period[]).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer", period === p ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-white")}>
                {p}
              </button>
            ))}
          </div>
          {loading && <RefreshCw className="h-3 w-3 text-zinc-500 animate-spin" />}
        </div>
        {bot && (
          <div className="flex items-center gap-3 text-[10px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", botColor)} />Bot {bot.status === "healthy" ? "OK" : bot.status}</span>
            <span>ping {bot.pingMs} ms</span>
            <span>uptime {fmtUptime(bot.uptimeSeconds)}</span>
            <span>{Math.round(bot.memoryMb)} MB</span>
          </div>
        )}
      </div>

      {error && !data && (
        <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3 text-[11px] text-zinc-400">{error}</div>
      )}

      {data && (
        <>
          {/* KPIs + sparklines */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Messages", kpi: data.kpis.messages, icon: MessageSquare, color: "#22d3ee", pts: series.messages },
              { label: "Membres actifs", kpi: data.kpis.activeUsers, icon: Users, color: "#a78bfa", pts: series.activeUsers },
              { label: "Commandes", kpi: data.kpis.commands, icon: Terminal, color: "#34d399", pts: series.commands },
              { label: "Arrivées nettes", kpi: { current: series.net.reduce((a, b) => a + b, 0), previous: 0, percentageChange: 0, trend: "neutral" as const }, icon: Mic, color: "#fbbf24", pts: series.net.map((v) => Math.max(0, v)), members: data.kpis.members },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1"><Icon className="h-3 w-3" style={{ color: c.color }} />{c.label}</p>
                    {"members" in c && c.members ? <Delta kpi={c.members} /> : <Delta kpi={c.kpi} />}
                  </div>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {"members" in c && c.members ? c.members.current.toLocaleString("fr-FR") : c.kpi.current.toLocaleString("fr-FR")}
                    {"members" in c && <span className="text-[10px] font-normal text-zinc-500 ml-1">membres · {c.kpi.current >= 0 ? "+" : ""}{c.kpi.current} net</span>}
                  </p>
                  <div className="-mx-3 -mb-3 mt-1">
                    <Sparkline points={c.pts} color={c.color} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Santé + top salons + créneaux + top commandes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1"><HeartPulse className="h-3 w-3 text-rose-400" /> Santé du serveur</p>
              <div className="flex items-end gap-2">
                <p className={cn("text-2xl font-bold", healthColor)}>{health?.score ?? "—"}<span className="text-xs text-zinc-500">/100</span></p>
                <span className="text-[10px] text-zinc-400 mb-1 capitalize">{health?.status}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                <div className={cn("h-full rounded-full", health?.status === "critical" ? "bg-rose-500" : health?.status === "average" ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${health?.score ?? 0}%` }} />
              </div>
              <ul className="space-y-0.5">
                {data.insights.slice(0, 3).map((i) => (
                  <li key={i.id} className={cn("text-[10px] leading-snug", i.trend === "positive" ? "text-emerald-300" : i.trend === "warning" ? "text-amber-300" : "text-zinc-400")}>• {i.text}</li>
                ))}
                {data.insights.length === 0 && <li className="text-[10px] text-zinc-500">Pas encore assez de données pour des insights.</li>}
              </ul>
            </div>

            <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Top salons</p>
              {data.topChannels.length === 0 && <p className="text-[10px] text-zinc-500">Aucun message sur la période.</p>}
              {data.topChannels.slice(0, 5).map((c) => (
                <div key={c.channelId} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-200 truncate">#{c.channelName}</span>
                    <span className="text-zinc-500 font-mono shrink-0">{c.messageCount.toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/40 overflow-hidden"><div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, c.percentage)}%` }} /></div>
                </div>
              ))}
            </div>

            <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Affluence par jour</p>
              {peak ? (
                <>
                  <div className="flex items-end gap-1 h-14">
                    {peak.byDay.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-sm bg-amber-400/80" style={{ height: `${Math.max(4, (v / peak.max) * 44)}px` }} title={`${DAYS[i]} · ${v} msgs`} />
                        <span className="text-[9px] text-zinc-500">{DAYS[i]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400">Pic : <span className="text-amber-300 font-semibold">{DAYS[peak.best.day]} {String(peak.best.hour).padStart(2, "0")}h</span> — idéal pour les annonces.</p>
                </>
              ) : (
                <p className="text-[10px] text-zinc-500">Pas encore de données horaires.</p>
              )}
              {data.topCommands.length > 0 && (
                <p className="text-[10px] text-zinc-500 pt-1 border-t border-[var(--panel-border)]">
                  Commandes : {data.topCommands.slice(0, 3).map((c) => `/${c.command} (${c.count})`).join(" · ")}
                </p>
              )}
            </div>
          </div>

          <Link href={`/discord/analytics?guildId=${guildId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-white transition-colors">
            Analytics complet <ChevronRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </div>
  );
}
