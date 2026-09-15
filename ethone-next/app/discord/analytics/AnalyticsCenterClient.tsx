"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  Hash,
  Crown,
  Sparkles,
  ShieldCheck,
  X,
  Loader2,
  WifiOff,
  User as UserIcon,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors discord-bot/src/modules/analytics/types/analytics.ts's AnalyticsOverview —
// this page reads the real backend shape returned by /api/guilds/:guildId/analytics/overview,
// it does not invent any of its own numbers.
type TimeRangePeriod = "7d" | "30d" | "90d";

interface AnalyticsKPI {
  label: string;
  current: number;
  previous: number;
  percentageChange: number;
  trend: "up" | "down" | "neutral";
  unit?: string;
}

interface ServerHealthScore {
  score: number;
  status: "excellent" | "good" | "average" | "critical";
  factors: Array<{ label: string; impact: number; isPositive: boolean }>;
}

interface AutomaticInsight {
  id: string;
  type: "growth" | "activity" | "peak" | "moderation" | "security" | "support";
  text: string;
  trend: "positive" | "warning" | "neutral";
}

interface TopChannelStat {
  channelId: string;
  channelName: string;
  messageCount: number;
  percentage: number;
}

interface TopMemberStat {
  userId: string;
  username: string;
  avatarUrl: string | null;
  messageCount: number;
}

interface TimeSeriesPoint {
  timestamp: string;
  messages: number;
  activeUsers: number;
  commands: number;
  joins: number;
  leaves: number;
  voiceHours: number;
}

interface AnalyticsOverview {
  period: TimeRangePeriod;
  healthScore: ServerHealthScore;
  kpis: {
    members: AnalyticsKPI;
    activeUsers: AnalyticsKPI;
    messages: AnalyticsKPI;
    commands: AnalyticsKPI;
    voiceHours: AnalyticsKPI;
    moderationActions: AnalyticsKPI;
    tickets: AnalyticsKPI;
    securityIncidents: AnalyticsKPI;
  };
  insights: AutomaticInsight[];
  timeSeries: TimeSeriesPoint[];
  topChannels: TopChannelStat[];
  topMembers: TopMemberStat[];
  messageTypeBreakdown: { textPct: number; mediaPct: number; linkPct: number };
  retentionRate: number | null;
  peakHeatmap: Array<{ day: number; hour: number; value: number }>;
  moderationBreakdown: Record<string, number>;
  topCommands: Array<{ command: string; count: number; percentage: number }>;
  botHealth: {
    uptimeSeconds: number;
    pingMs: number;
    memoryMb: number;
    status: "healthy" | "degraded" | "critical";
  };
}

const DAY_LABELS_BY_JS_INDEX = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DISPLAY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lun..Dim, matching French UI convention

function formatDelta(kpi: AnalyticsKPI) {
  if (kpi.trend === "up") {
    return { text: `+${kpi.percentageChange}%`, colorClass: "text-emerald-400", Icon: ArrowUpRight };
  }
  if (kpi.trend === "down") {
    return { text: `${kpi.percentageChange}%`, colorClass: "text-rose-400", Icon: ArrowDownRight };
  }
  return { text: "Stable", colorClass: "text-neutral-400", Icon: Minus };
}

function healthStatusLabel(status: ServerHealthScore["status"]) {
  switch (status) {
    case "excellent":
      return { text: "Excellente santé", colorClass: "text-emerald-400" };
    case "good":
      return { text: "Bonne santé", colorClass: "text-cyan-400" };
    case "average":
      return { text: "Santé moyenne", colorClass: "text-amber-400" };
    case "critical":
      return { text: "Santé critique", colorClass: "text-rose-400" };
  }
}

function insightTrendClass(trend: AutomaticInsight["trend"]) {
  if (trend === "positive") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (trend === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return "border-neutral-800 bg-neutral-950 text-neutral-300";
}

const INSIGHT_ICON: Record<AutomaticInsight["type"], typeof TrendingUp> = {
  growth: TrendingUp,
  activity: MessageSquare,
  peak: Clock,
  moderation: ShieldCheck,
  security: ShieldCheck,
  support: Sparkles,
};

export default function AnalyticsCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        setSelectedGuild(match);
        return;
      }
    }
    if (!selectedGuild) setSelectedGuild(manageableGuilds[0]);
  }, [manageableGuilds, queryGuildId, selectedGuild]);

  const [activeTab, setActiveTab] = useState<
    "messages" | "growth" | "heatmap" | "channels" | "insights"
  >("messages");
  const [period, setPeriod] = useState<TimeRangePeriod>("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/analytics/overview?period=${period}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("overview");
      setOverview(await res.json());
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, period]);

  useEffect(() => {
    setOverview(null);
    load();
  }, [load]);

  const handleExport = useCallback(async () => {
    if (!selectedGuild || !BOT_API_URL) return;
    setExporting(true);
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/analytics/export?period=${period}&format=csv`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${selectedGuild.id}-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Export CSV téléchargé.");
    } catch {
      showToast("Échec de l'export CSV — le bot est peut-être hors ligne.");
    } finally {
      setExporting(false);
    }
  }, [selectedGuild, period]);

  if (!BOT_API_URL || offline) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[var(--bg-main)]">
        <div className="max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center">
          <WifiOff className="mx-auto mb-3 h-8 w-8 text-neutral-500" />
          <p className="text-sm text-neutral-400">
            {!BOT_API_URL
              ? "Le serveur du bot n'est pas configuré ici."
              : "Impossible de joindre le bot Discord pour le moment."}
          </p>
        </div>
      </div>
    );
  }

  if (!selectedGuild || (loading && !overview)) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[var(--bg-main)]">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {selectedGuild ? "Chargement des statistiques..." : "Sélection du serveur..."}
        </div>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const maxTimeSeries = Math.max(1, ...overview.timeSeries.map((d) => d.messages));
  const avgMessages =
    overview.timeSeries.length > 0
      ? Math.round(
          overview.timeSeries.reduce((s, d) => s + d.messages, 0) / overview.timeSeries.length
        )
      : 0;

  const joinsTotal = overview.timeSeries.reduce((s, d) => s + d.joins, 0);
  const leavesTotal = overview.timeSeries.reduce((s, d) => s + d.leaves, 0);
  const netGrowth = joinsTotal - leavesTotal;

  const maxHeatmapValue = Math.max(0, ...overview.peakHeatmap.map((c) => c.value));
  let peakCell: { day: number; hour: number; value: number } | null = null;
  for (const cell of overview.peakHeatmap) {
    if (!peakCell || cell.value > peakCell.value) peakCell = cell;
  }

  const health = healthStatusLabel(overview.healthScore.status);

  const kpiCards: Array<{ label: string; kpi: AnalyticsKPI; colorClass: string }> = [
    { label: `Messages (${period})`, kpi: overview.kpis.messages, colorClass: "text-white" },
    { label: "Membres Totaux", kpi: overview.kpis.members, colorClass: "text-cyan-400" },
    { label: "Membres Actifs", kpi: overview.kpis.activeUsers, colorClass: "text-indigo-400" },
    { label: "Commandes Exécutées", kpi: overview.kpis.commands, colorClass: "text-amber-400" },
    { label: "Heures en Vocal", kpi: overview.kpis.voiceHours, colorClass: "text-purple-400" },
    { label: "Sanctions Modération", kpi: overview.kpis.moderationActions, colorClass: "text-rose-400" },
    { label: "Tickets Support", kpi: overview.kpis.tickets, colorClass: "text-emerald-400" },
  ];

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/15 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-sm">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  ETHONE Analytics &amp; Server Insights
                </h1>
                <p className="text-xs text-neutral-400">
                  Métriques d'activité réelles pour {selectedGuild.name} : messages, croissance des
                  membres, heatmap horaire et top salons/membres.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs font-semibold">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    period === p
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {p === "7d" ? "7 Jours" : p === "30d" ? "30 Jours" : "3 Mois"}
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-cyan-400" />
              )}
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {toastMsg}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCards.map(({ label, kpi, colorClass }) => {
            const delta = formatDelta(kpi);
            return (
              <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-neutral-500 font-medium">{label}</span>
                <p className={`text-2xl font-bold ${colorClass}`}>
                  {kpi.current.toLocaleString("fr-FR")}
                  {kpi.unit ? ` ${kpi.unit}` : ""}
                </p>
                <span className={`text-[11px] flex items-center gap-0.5 ${delta.colorClass}`}>
                  <delta.Icon className="w-3 h-3" /> {delta.text}
                </span>
              </div>
            );
          })}

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Score de Santé</span>
            <p className={`text-2xl font-bold ${health.colorClass}`}>{overview.healthScore.score} / 100</p>
            <span className={`text-[11px] ${health.colorClass}`}>{health.text}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "messages", label: "Activité des Messages", icon: MessageSquare },
            { id: "growth", label: "Croissance & Rétention", icon: TrendingUp },
            { id: "heatmap", label: "Heatmap Horaire", icon: Clock },
            { id: "channels", label: "Top Salons & Membres", icon: Users },
            { id: "insights", label: "Informations Automatiques", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-cyan-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Messages Chart */}
        {activeTab === "messages" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Volume de Messages
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Distribution réelle sur la période sélectionnée ({period})
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  Moyenne : {avgMessages.toLocaleString("fr-FR")} msg / point
                </span>
              </div>

              {overview.timeSeries.length === 0 ? (
                <p className="text-xs text-neutral-500 py-10 text-center">
                  Pas encore de données de messages pour cette période.
                </p>
              ) : (
                <div className="pt-6 pb-2">
                  <div className="h-56 flex items-end gap-2 md:gap-3 w-full">
                    {overview.timeSeries.map((item, idx) => {
                      const heightPct = Math.round((item.messages / maxTimeSeries) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-cyan-300 font-bold">
                            {item.messages}
                          </div>
                          <div className="w-full bg-neutral-950 rounded-t-lg overflow-hidden h-44 flex items-end">
                            <div
                              className="w-full bg-gradient-to-t from-cyan-600 to-indigo-500 rounded-t-lg group-hover:from-cyan-400 group-hover:to-indigo-400 transition-all duration-300 shadow-sm"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">{item.timestamp}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Message Type Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-neutral-400 font-medium">Messages Textuels</span>
                <p className="text-2xl font-bold text-white">{overview.messageTypeBreakdown.textPct}%</p>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${overview.messageTypeBreakdown.textPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-neutral-400 font-medium">Images & Vidéos (Médias)</span>
                <p className="text-2xl font-bold text-cyan-400">{overview.messageTypeBreakdown.mediaPct}%</p>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${overview.messageTypeBreakdown.mediaPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-neutral-400 font-medium">Liens & Intégrations</span>
                <p className="text-2xl font-bold text-purple-400">{overview.messageTypeBreakdown.linkPct}%</p>
                <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${overview.messageTypeBreakdown.linkPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Growth & Retention */}
        {activeTab === "growth" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Flux des Membres ({period})
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-neutral-400">Nouveaux arrivants</span>
                    <p className="text-xl font-bold text-emerald-400">+{joinsTotal} membres</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-neutral-400">Départs constatés</span>
                    <p className="text-xl font-bold text-rose-400">-{leavesTotal} départs</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-neutral-400">Croissance nette</span>
                    <p className="text-xl font-bold text-white">
                      {netGrowth >= 0 ? "+" : ""}
                      {netGrowth} membres
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                      netGrowth >= 0
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {netGrowth >= 0 ? "Solde positif" : "Solde négatif"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Rétention des Membres Actifs
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Part des membres actifs de la période précédente encore actifs cette période :
              </p>

              {overview.retentionRate === null ? (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Pas assez de données sur la période précédente pour calculer une rétention.
                </p>
              ) : (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300 font-semibold">Rétention ({period})</span>
                    <span className="text-emerald-400 font-bold font-mono">{overview.retentionRate}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, overview.retentionRate)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Heatmap */}
        {activeTab === "heatmap" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Heatmap d'Affluence Horaire
                </h3>
                <p className="text-xs text-neutral-400">
                  Messages + commandes réels, par jour et par heure, sur la période sélectionnée.
                </p>
              </div>
              {peakCell && maxHeatmapValue > 0 && (
                <span className="text-xs text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  Pic : {DAY_LABELS_BY_JS_INDEX[peakCell.day]} {peakCell.hour}h-{peakCell.hour + 1}h
                </span>
              )}
            </div>

            {maxHeatmapValue === 0 ? (
              <p className="text-xs text-neutral-500 py-10 text-center">
                Pas encore assez d'activité enregistrée pour afficher une heatmap.
              </p>
            ) : (
              <div className="overflow-x-auto pt-2">
                <div className="min-w-[820px] space-y-1.5">
                  {DISPLAY_DAY_ORDER.map((dayIdx) => {
                    const dayCells = overview.peakHeatmap
                      .filter((c) => c.day === dayIdx)
                      .sort((a, b) => a.hour - b.hour);
                    return (
                      <div key={dayIdx} className="flex items-center gap-2 text-xs">
                        <span className="w-10 font-bold text-neutral-400">
                          {DAY_LABELS_BY_JS_INDEX[dayIdx]}
                        </span>
                        <div
                          className="flex-1 grid gap-1"
                          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                        >
                          {dayCells.map((cell) => {
                            const ratio = maxHeatmapValue > 0 ? cell.value / maxHeatmapValue : 0;
                            let opacityClass = "bg-neutral-950 border border-neutral-800";
                            if (ratio > 0.75) opacityClass = "bg-cyan-400 shadow-sm";
                            else if (ratio > 0.5) opacityClass = "bg-cyan-600";
                            else if (ratio > 0.25) opacityClass = "bg-cyan-800/70";
                            else if (ratio > 0) opacityClass = "bg-cyan-950/60";

                            return (
                              <div
                                key={cell.hour}
                                className={`h-6 rounded transition-transform hover:scale-110 ${opacityClass}`}
                                title={`${DAY_LABELS_BY_JS_INDEX[dayIdx]} ${cell.hour}h-${cell.hour + 1}h : ${cell.value} activité(s)`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-2 pl-12">
                    <span>00h</span>
                    <span>04h</span>
                    <span>08h</span>
                    <span>12h</span>
                    <span>16h</span>
                    <span>20h</span>
                    <span>24h</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Top Channels & Members */}
        {activeTab === "channels" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Channels Share */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-400" />
                Part de Voix des Salons Textuels
              </h3>

              {overview.topChannels.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Pas encore de messages enregistrés sur cette période.
                </p>
              ) : (
                <div className="space-y-3">
                  {overview.topChannels.map((ch) => (
                    <div key={ch.channelId} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-white font-medium">#{ch.channelName}</span>
                        <span className="text-neutral-400 font-mono">
                          {ch.messageCount.toLocaleString("fr-FR")} msg ({ch.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${ch.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Chatters */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Membres les Plus Actifs ({period})
              </h3>

              {overview.topMembers.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Pas encore de messages enregistrés sur cette période.
                </p>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {overview.topMembers.map((m, idx) => (
                    <div key={m.userId} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-5 font-mono font-bold text-neutral-400">#{idx + 1}</span>
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.username}
                            className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full border border-neutral-700 bg-neutral-800 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-neutral-500" />
                          </div>
                        )}
                        <span className="font-bold text-white">{m.username}</span>
                      </div>

                      <span className="text-cyan-400 font-semibold font-mono text-[11px]">
                        {m.messageCount.toLocaleString("fr-FR")} msg
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Automatic Insights */}
        {activeTab === "insights" && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Informations Générées Automatiquement
              </h3>
              <p className="text-xs text-neutral-400">
                Calculées à partir des données réelles de la période sélectionnée — aucune valeur
                inventée.
              </p>

              {overview.insights.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Pas assez de données pour générer des informations sur cette période.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overview.insights.map((insight) => {
                    const Icon = INSIGHT_ICON[insight.type] || Sparkles;
                    return (
                      <div
                        key={insight.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${insightTrendClass(
                          insight.trend
                        )}`}
                      >
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{insight.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white">État du Bot</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Ping</span>
                  <span className="text-white font-mono">{overview.botHealth.pingMs} ms</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Mémoire</span>
                  <span className="text-white font-mono">{overview.botHealth.memoryMb} Mo</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Statut</span>
                  <span
                    className={`font-mono ${
                      overview.botHealth.status === "healthy" ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {overview.botHealth.status === "healthy" ? "Opérationnel" : "Dégradé"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
