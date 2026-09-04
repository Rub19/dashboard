"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  ExternalLink,
  Clock,
  User,
  Hash,
  Layers,
  ArrowLeft,
  X,
  CheckCircle2,
  Calendar,
  Zap,
  Sliders,
  Bell,
  Trash2,
  ArrowUpRight,
  Eye,
  Activity,
  Server,
  Play,
  Pause,
  AlertOctagon,
  Scale,
  Sparkles,
} from "lucide-react";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:3001";

export type AuditSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AuditModule =
  | "MEMBERS"
  | "MESSAGES"
  | "ROLES"
  | "CHANNELS"
  | "SERVER"
  | "VOICE"
  | "WEBHOOKS"
  | "BOTS"
  | "MODERATION"
  | "AUTOMOD"
  | "SECURITY"
  | "SYSTEM";

export interface AuditActor {
  id: string;
  tag: string;
  username?: string;
  avatar?: string | null;
  isBot?: boolean;
}

export interface AuditTarget {
  id: string;
  type: string;
  name: string;
  tag?: string;
  avatar?: string | null;
}

export interface AuditChannel {
  id: string;
  name: string;
  type?: string;
}

export interface AuditEvent {
  id: string;
  guildId: string;
  module: AuditModule;
  type: string;
  severity: AuditSeverity;
  actor: AuditActor;
  target?: AuditTarget;
  channel?: AuditChannel;
  reason?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: { field: string; before: any; after: any }[];
  metadata?: Record<string, any>;
  caseId?: number | string;
  incidentId?: string;
  correlationId?: string;
  timestamp: string;
}

export interface AuditOverview {
  eventsToday: number;
  securityToday: number;
  moderationToday: number;
  automodToday: number;
  criticalToday: number;
  totalEvents: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalEvents: AuditEvent[];
}

export interface InvestigationResult {
  targetEvent: AuditEvent;
  timeWindowStart: string;
  timeWindowEnd: string;
  relatedEvents: AuditEvent[];
  causalityChain: {
    step: number;
    eventId: string;
    timestamp: string;
    module: AuditModule;
    severity: AuditSeverity;
    summary: string;
    relation: "PARENT" | "TRIGGER" | "SANCTION" | "SAME_ACTOR" | "SAME_TARGET" | "BURST";
  }[];
  diffInspection?: {
    field: string;
    beforeDisplay: string;
    afterDisplay: string;
  }[];
}

export function AuditCenterClient() {
  const searchParams = useSearchParams();
  const guildParam = searchParams.get("guildId");
  const { profile, loading: discordLoading } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "critical" | "analytics" | "routing">("stream");

  // Données
  const [overview, setOverview] = useState<AuditOverview | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("24h");
  const [liveStreaming, setLiveStreaming] = useState(true);

  // Investigation Modal
  const [investigatingEventId, setInvestigatingEventId] = useState<string | null>(null);
  const [investigationData, setInvestigationData] = useState<InvestigationResult | null>(null);
  const [loadingInvestigation, setLoadingInvestigation] = useState(false);

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Configuration Routing
  const [configRouting, setConfigRouting] = useState({
    generalChannelId: "",
    generalThreshold: "ALL",
    moderationChannelId: "",
    moderationThreshold: "IMPORTANT",
    securityChannelId: "",
    securityThreshold: "IMPORTANT",
    automodChannelId: "",
    automodThreshold: "IMPORTANT",
    raidChannelId: "",
    raidThreshold: "CRITICAL_ONLY",
    retentionDays: 90,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Résolution du serveur
  useEffect(() => {
    if (!profile?.guilds) return;
    if (guildParam) {
      const found = profile.guilds.find((g) => g.id === guildParam);
      if (found) {
        setSelectedGuild(found);
        return;
      }
    }
    if (profile.guilds.length > 0 && !selectedGuild) {
      setSelectedGuild(profile.guilds[0]);
    }
  }, [profile?.guilds, guildParam, selectedGuild]);

  // Charger les métriques d'aperçu
  const fetchOverview = useCallback(async () => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/overview`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch {
      // Ignorer silencieusement en mode déconnecté
    }
  }, [selectedGuild]);

  // Charger les événements filtrés
  const fetchEvents = useCallback(async () => {
    if (!selectedGuild) return;
    setLoadingEvents(true);
    try {
      const query = new URLSearchParams();
      if (selectedModule !== "ALL") query.set("module", selectedModule);
      if (selectedSeverity !== "ALL") query.set("severity", selectedSeverity);
      if (selectedPeriod !== "all") query.set("period", selectedPeriod);
      if (searchQuery.trim()) query.set("search", searchQuery.trim());
      query.set("limit", "100");

      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/events?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalCount(data.total || 0);
      }
    } catch {
      // Ignorer
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedGuild, selectedModule, selectedSeverity, selectedPeriod, searchQuery]);

  // Charger la configuration de routage
  const fetchConfig = useCallback(async () => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfigRouting({
            generalChannelId: data.config.routing?.generalChannelId || "",
            generalThreshold: data.config.routing?.generalThreshold || "ALL",
            moderationChannelId: data.config.routing?.moderationChannelId || "",
            moderationThreshold: data.config.routing?.moderationThreshold || "IMPORTANT",
            securityChannelId: data.config.routing?.securityChannelId || "",
            securityThreshold: data.config.routing?.securityThreshold || "IMPORTANT",
            automodChannelId: data.config.routing?.automodChannelId || "",
            automodThreshold: data.config.routing?.automodThreshold || "IMPORTANT",
            raidChannelId: data.config.routing?.raidChannelId || "",
            raidThreshold: data.config.routing?.raidThreshold || "CRITICAL_ONLY",
            retentionDays: data.config.retentionDays ?? 90,
          });
        }
      }
    } catch {}
  }, [selectedGuild]);

  // Chargement initial
  useEffect(() => {
    if (selectedGuild) {
      fetchOverview();
      fetchEvents();
      fetchConfig();
    }
  }, [selectedGuild, fetchOverview, fetchEvents, fetchConfig]);

  // Auto-refresh en direct (toutes les 4 secondes si activé)
  useEffect(() => {
    if (!liveStreaming || !selectedGuild) return;
    const interval = setInterval(() => {
      fetchOverview();
      fetchEvents();
    }, 4000);
    return () => clearInterval(interval);
  }, [liveStreaming, selectedGuild, fetchOverview, fetchEvents]);

  // Déclencher une enquête sur un événement
  const handleInvestigate = async (eventId: string) => {
    if (!selectedGuild) return;
    setInvestigatingEventId(eventId);
    setLoadingInvestigation(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/events/${eventId}/investigate`);
      if (res.ok) {
        const data = await res.json();
        setInvestigationData(data);
      } else {
        showError("Impossible de charger les données d'investigation.");
      }
    } catch {
      showError("Erreur lors de la connexion au serveur d'audit.");
    } finally {
      setLoadingInvestigation(false);
    }
  };

  // Sauvegarder la configuration de routage
  const handleSaveConfig = async () => {
    if (!selectedGuild) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${selectedGuild.id}/logs/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing: {
            generalChannelId: configRouting.generalChannelId || null,
            generalThreshold: configRouting.generalThreshold,
            moderationChannelId: configRouting.moderationChannelId || null,
            moderationThreshold: configRouting.moderationThreshold,
            securityChannelId: configRouting.securityChannelId || null,
            securityThreshold: configRouting.securityThreshold,
            automodChannelId: configRouting.automodChannelId || null,
            automodThreshold: configRouting.automodThreshold,
            raidChannelId: configRouting.raidChannelId || null,
            raidThreshold: configRouting.raidThreshold,
          },
          retentionDays: configRouting.retentionDays,
        }),
      });
      if (res.ok) {
        success("Configuration des logs et routage Discord mise à jour !");
        fetchOverview();
      } else {
        showError("Échec de la sauvegarde.");
      }
    } catch {
      showError("Erreur réseau.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Télécharger l'export CSV / JSON
  const handleDownloadExport = () => {
    if (!selectedGuild) return;
    const query = new URLSearchParams();
    query.set("format", exportFormat);
    if (selectedModule !== "ALL") query.set("module", selectedModule);
    if (selectedSeverity !== "ALL") query.set("severity", selectedSeverity);
    if (selectedPeriod !== "all") query.set("period", selectedPeriod);
    if (searchQuery.trim()) query.set("search", searchQuery.trim());

    const url = `${API_BASE}/api/guilds/${selectedGuild.id}/logs/export?${query.toString()}`;
    window.open(url, "_blank");
    setExportModalOpen(false);
    success(`Export ${exportFormat.toUpperCase()} généré.`);
  };

  // Couleurs et badges
  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20 shadow-sm animate-pulse";
      case "HIGH":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "LOW":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "INFO":
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
  };

  const getModuleIcon = (module: AuditModule) => {
    switch (module) {
      case "SECURITY":
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
      case "AUTOMOD":
        return <Zap className="h-3.5 w-3.5 text-amber-400" />;
      case "MODERATION":
        return <Scale className="h-3.5 w-3.5 text-orange-400" />;
      case "MEMBERS":
        return <User className="h-3.5 w-3.5 text-blue-400" />;
      case "MESSAGES":
        return <FileText className="h-3.5 w-3.5 text-indigo-400" />;
      case "ROLES":
        return <Sliders className="h-3.5 w-3.5 text-purple-400" />;
      case "CHANNELS":
        return <Hash className="h-3.5 w-3.5 text-cyan-400" />;
      case "VOICE":
        return <Activity className="h-3.5 w-3.5 text-emerald-400" />;
      case "SERVER":
      case "SYSTEM":
      default:
        return <Server className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500 selection:text-white pb-36">
      {/* HEADER TOP BAR */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={selectedGuild ? `/discord?guildId=${selectedGuild.id}` : "/discord"}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                    Audit Center 2.0
                  </h1>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                    Traçabilité Absolue
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {selectedGuild ? selectedGuild.name : "Sélectionnez un serveur"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Live Pause / Play */}
            <button
              type="button"
              onClick={() => setLiveStreaming(!liveStreaming)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                liveStreaming
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-sm shadow-emerald-500/20"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              )}
            >
              {liveStreaming ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>Flux Live</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  <span>En pause</span>
                </>
              )}
            </button>

            {/* Bouton Export */}
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
        {/* KPI METRICS OVERVIEW BANNER */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Événements (Auj.)</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-white font-mono">
              {overview?.eventsToday ?? 0}
            </p>
            <span className="text-[10px] text-zinc-500">
              Total indexé : {overview?.totalEvents ?? 0}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Sécurité & Raids</span>
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-rose-400 font-mono">
              {overview?.securityToday ?? 0}
            </p>
            <span className="text-[10px] text-zinc-500">Menaces & verrouillages</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Modération</span>
              <Scale className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-orange-400 font-mono">
              {overview?.moderationToday ?? 0}
            </p>
            <span className="text-[10px] text-zinc-500">Cases générées</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">AutoMod 2.0</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-amber-400 font-mono">
              {overview?.automodToday ?? 0}
            </p>
            <span className="text-[10px] text-zinc-500">Détections intelligentes</span>
          </div>

          <div
            className={cn(
              "col-span-2 sm:col-span-1 rounded-2xl border p-4 backdrop-blur-xl transition-all",
              (overview?.criticalToday ?? 0) > 0
                ? "border-rose-500/40 bg-gradient-to-br from-rose-950/40 to-red-900/20 shadow-lg shadow-rose-950/30"
                : "border-white/10 bg-zinc-900/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Alertes Critiques</span>
              <AlertOctagon
                className={cn(
                  "h-4 w-4",
                  (overview?.criticalToday ?? 0) > 0 ? "text-rose-400 animate-pulse" : "text-zinc-500"
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-2xl font-extrabold tracking-tight font-mono",
                (overview?.criticalToday ?? 0) > 0 ? "text-rose-400" : "text-zinc-300"
              )}
            >
              {overview?.criticalToday ?? 0}
            </p>
            <span className="text-[10px] text-zinc-500">Gravité CRITICAL</span>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("stream")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "stream"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Layers className="h-4 w-4" />
            <span>Flux d&apos;Événements & Filtres ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("critical")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "critical"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <AlertOctagon className="h-4 w-4 text-rose-300" />
            <span>Zone Événements Critiques ({overview?.criticalEvents?.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Activity className="h-4 w-4" />
            <span>Analytique & Répartition</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("routing")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 transition-all cursor-pointer shrink-0",
              activeTab === "routing"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Sliders className="h-4 w-4" />
            <span>Routage Salons Discord & Rétention</span>
          </button>
        </div>

        {/* TAB 1: FLUX D'ÉVÉNEMENTS & RECHERCHE */}
        {activeTab === "stream" && (
          <div className="space-y-4">
            {/* BARRE DE FILTRES MULTI-CRITÈRES */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 backdrop-blur-xl">
              <div className="flex flex-1 items-center gap-2 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Recherche (acteur, cible, ID, Case #, salon, raison...)"
                    className="h-9 w-full rounded-xl border border-white/10 bg-zinc-950/80 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filtre Module */}
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="h-9 rounded-xl border border-white/10 bg-zinc-950/80 px-3 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Tous les modules</option>
                  <option value="SECURITY">Sécurité & Raids</option>
                  <option value="AUTOMOD">AutoMod 2.0</option>
                  <option value="MODERATION">Modération (Cases)</option>
                  <option value="MEMBERS">Membres</option>
                  <option value="MESSAGES">Messages</option>
                  <option value="ROLES">Rôles</option>
                  <option value="CHANNELS">Salons</option>
                  <option value="VOICE">Vocal</option>
                  <option value="SERVER">Serveur</option>
                  <option value="SYSTEM">Système</option>
                </select>

                {/* Filtre Sévérité */}
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="h-9 rounded-xl border border-white/10 bg-zinc-950/80 px-3 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Toutes sévérités</option>
                  <option value="CRITICAL">🔥 CRITICAL</option>
                  <option value="HIGH">🔴 HIGH</option>
                  <option value="MEDIUM">🟡 MEDIUM</option>
                  <option value="LOW">🔵 LOW</option>
                  <option value="INFO">🟢 INFO</option>
                </select>

                {/* Filtre Période */}
                <div className="flex items-center rounded-xl bg-zinc-950/80 p-0.5 border border-white/10">
                  {["1h", "24h", "7d", "30d", "all"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriod(p)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                        selectedPeriod === p
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={fetchEvents}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Rafraîchir les logs"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loadingEvents && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* TABLEAU DES LOGS */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                  <FileText className="h-10 w-10 text-zinc-600 mb-2" />
                  <p className="text-sm font-semibold text-zinc-400">Aucun événement ne correspond aux filtres</p>
                  <p className="text-xs text-zinc-600 max-w-sm mt-1">
                    Les actions Discord, AutoMod, modérations et alertes de sécurité apparaîtront ici en temps réel.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase text-zinc-400">
                      <tr>
                        <th className="px-4 py-3">Gravité</th>
                        <th className="px-4 py-3">Module & Type</th>
                        <th className="px-4 py-3">Acteur</th>
                        <th className="px-4 py-3">Cible / Salon</th>
                        <th className="px-4 py-3">Détails & Causalité</th>
                        <th className="px-4 py-3 text-right">Date / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {events.map((evt) => (
                        <tr
                          key={evt.id}
                          className="group hover:bg-white/[0.03] transition-colors"
                        >
                          {/* GRAVITÉ */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase font-mono tracking-wide",
                                getSeverityBadge(evt.severity)
                              )}
                            >
                              {evt.severity}
                            </span>
                          </td>

                          {/* MODULE & TYPE */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-lg bg-white/5">{getModuleIcon(evt.module)}</span>
                              <div>
                                <p className="font-bold text-white tracking-tight text-xs">
                                  {evt.type.replace(/_/g, " ")}
                                </p>
                                <span className="text-[10px] text-zinc-500 font-mono">{evt.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* ACTEUR */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-200">
                                {evt.actor.tag || evt.actor.id}
                              </span>
                              {evt.actor.isBot && (
                                <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[9px] font-bold text-indigo-300">
                                  BOT
                                </span>
                              )}
                            </div>
                          </td>

                          {/* CIBLE / SALON */}
                          <td className="px-4 py-3">
                            {evt.target && (
                              <div className="text-zinc-300">
                                <span className="font-medium text-white">{evt.target.name || evt.target.id}</span>
                                <span className="text-[10px] text-zinc-500 block">Type: {evt.target.type}</span>
                              </div>
                            )}
                            {evt.channel && (
                              <span className="text-cyan-400 text-[11px] block">
                                #{evt.channel.name}
                              </span>
                            )}
                            {!evt.target && !evt.channel && (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          {/* RAISON & LIENS (CASE / INCIDENT) */}
                          <td className="px-4 py-3 max-w-xs truncate">
                            <p className="text-zinc-300 truncate" title={evt.reason}>
                              {evt.reason || "Aucune raison spécifiée"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {evt.caseId && (
                                <Link
                                  href={`/discord/moderation?guildId=${selectedGuild?.id}&caseNumber=${evt.caseId}`}
                                  className="text-[10px] font-bold text-orange-400 hover:underline"
                                >
                                  Case #{evt.caseId}
                                </Link>
                              )}
                              {evt.incidentId && (
                                <span className="text-[10px] font-mono font-bold text-rose-400">
                                  {evt.incidentId}
                                </span>
                              )}
                              {evt.diff && evt.diff.length > 0 && (
                                <span className="rounded bg-white/5 px-1 text-[9px] text-zinc-400">
                                  {evt.diff.length} modif(s)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* DATE & BOUTON ENQUÊTER */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="text-[11px] text-zinc-400">
                              {new Date(evt.timestamp).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleInvestigate(evt.id)}
                              className="mt-1 inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-300 transition-all hover:bg-indigo-500 hover:text-white cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Enquêter</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ZONE ÉVÉNEMENTS CRITIQUES */}
        {activeTab === "critical" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-red-900/10 to-rose-950/30 p-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-rose-400 animate-pulse" />
                <h3 className="font-bold text-white text-sm">Centre de Commandement des Menaces Critiques</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Cette vue isole strictement les raids, tentatives de nuke, vagues d&apos;expulsions massives et élévations de privilèges non autorisées.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(overview?.criticalEvents || []).map((crit) => (
                <div
                  key={crit.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-zinc-900/80 p-4 backdrop-blur-xl shadow-lg shadow-rose-950/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 font-mono">
                        {crit.severity}
                      </span>
                      <span className="font-bold text-white text-xs">{crit.type}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{crit.id}</span>
                    </div>
                    <p className="text-xs text-zinc-300">{crit.reason || "Alerte de sécurité critique déclenchée."}</p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                      <span>👤 Par: <strong className="text-white">{crit.actor.tag}</strong></span>
                      {crit.target && <span>🎯 Cible: <strong className="text-white">{crit.target.name}</strong></span>}
                      {crit.incidentId && <span className="font-mono text-rose-400">Incident: {crit.incidentId}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInvestigate(crit.id)}
                      className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition-all hover:from-rose-500 hover:to-red-500 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Mode Enquête Approfondie</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTIQUE & RÉPARTITION */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RÉPARTITION PAR MODULE */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Répartition des Événements par Module
              </h3>
              <div className="space-y-2.5">
                {Object.entries(overview?.byModule || {}).map(([mod, count]) => {
                  const pct = Math.round((count / (overview?.totalEvents || 1)) * 100);
                  return (
                    <div key={mod} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{mod}</span>
                        <span className="text-zinc-400 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RÉPARTITION PAR SÉVÉRITÉ */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Distribution par Niveau de Sévérité
              </h3>
              <div className="space-y-2.5">
                {Object.entries(overview?.bySeverity || {}).map(([sev, count]) => {
                  const pct = Math.round((count / (overview?.totalEvents || 1)) * 100);
                  let barColor = "from-emerald-500 to-teal-500";
                  if (sev === "CRITICAL") barColor = "from-rose-500 to-red-600";
                  if (sev === "HIGH") barColor = "from-orange-500 to-amber-500";
                  if (sev === "MEDIUM") barColor = "from-amber-400 to-yellow-500";
                  if (sev === "LOW") barColor = "from-blue-500 to-cyan-500";

                  return (
                    <div key={sev} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{sev}</span>
                        <span className="text-zinc-400 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={cn("h-full bg-gradient-to-r rounded-full", barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ROUTAGE SALONS & RÉTENTION */}
        {activeTab === "routing" && (
          <div className="max-w-4xl space-y-6">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Routage vers Salons Discord</h3>
                  <p className="text-xs text-zinc-400">
                    Définissez les salons de destination et le seuil de sévérité requis pour l&apos;envoi des embeds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{savingConfig ? "Sauvegarde..." : "Enregistrer"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Salon Général */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
                  <span className="font-bold text-white">Logs Généraux & Serveur</span>
                  <input
                    type="text"
                    value={configRouting.generalChannelId}
                    onChange={(e) => setConfigRouting({ ...configRouting, generalChannelId: e.target.value })}
                    placeholder="ID du salon (ex: 123456789...)"
                    className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-white outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Seuil de déclenchement :</span>
                    <select
                      value={configRouting.generalThreshold}
                      onChange={(e) => setConfigRouting({ ...configRouting, generalThreshold: e.target.value })}
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                    >
                      <option value="OFF">OFF</option>
                      <option value="ALL">ALL (Tous)</option>
                      <option value="IMPORTANT">IMPORTANT (Med+)</option>
                      <option value="CRITICAL_ONLY">CRITICAL ONLY</option>
                    </select>
                  </div>
                </div>

                {/* Salon Modération */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
                  <span className="font-bold text-orange-400">Logs de Modération (Cases)</span>
                  <input
                    type="text"
                    value={configRouting.moderationChannelId}
                    onChange={(e) => setConfigRouting({ ...configRouting, moderationChannelId: e.target.value })}
                    placeholder="ID du salon mod-logs"
                    className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-white outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Seuil de déclenchement :</span>
                    <select
                      value={configRouting.moderationThreshold}
                      onChange={(e) => setConfigRouting({ ...configRouting, moderationThreshold: e.target.value })}
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                    >
                      <option value="OFF">OFF</option>
                      <option value="ALL">ALL (Tous)</option>
                      <option value="IMPORTANT">IMPORTANT (Med+)</option>
                      <option value="CRITICAL_ONLY">CRITICAL ONLY</option>
                    </select>
                  </div>
                </div>

                {/* Salon Sécurité */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
                  <span className="font-bold text-rose-400">Logs Sécurité & Anti-Raid</span>
                  <input
                    type="text"
                    value={configRouting.securityChannelId}
                    onChange={(e) => setConfigRouting({ ...configRouting, securityChannelId: e.target.value })}
                    placeholder="ID du salon security-alerts"
                    className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-white outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Seuil de déclenchement :</span>
                    <select
                      value={configRouting.securityThreshold}
                      onChange={(e) => setConfigRouting({ ...configRouting, securityThreshold: e.target.value })}
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                    >
                      <option value="OFF">OFF</option>
                      <option value="ALL">ALL (Tous)</option>
                      <option value="IMPORTANT">IMPORTANT (Med+)</option>
                      <option value="CRITICAL_ONLY">CRITICAL ONLY</option>
                    </select>
                  </div>
                </div>

                {/* Salon AutoMod */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
                  <span className="font-bold text-amber-400">Logs Détections AutoMod 2.0</span>
                  <input
                    type="text"
                    value={configRouting.automodChannelId}
                    onChange={(e) => setConfigRouting({ ...configRouting, automodChannelId: e.target.value })}
                    placeholder="ID du salon automod-logs"
                    className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-white outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Seuil de déclenchement :</span>
                    <select
                      value={configRouting.automodThreshold}
                      onChange={(e) => setConfigRouting({ ...configRouting, automodThreshold: e.target.value })}
                      className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                    >
                      <option value="OFF">OFF</option>
                      <option value="ALL">ALL (Tous)</option>
                      <option value="IMPORTANT">IMPORTANT (Med+)</option>
                      <option value="CRITICAL_ONLY">CRITICAL ONLY</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RÉTENTION DES LOGS */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-3">
              <h3 className="text-sm font-bold text-white">Politique de Conservation & Purge (Rétention)</h3>
              <p className="text-xs text-zinc-400">
                Détermine combien de temps les logs sont conservés avant d&apos;être purgés automatiquement pour préserver l&apos;espace disque et le respect de la vie privée.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {[
                  { label: "7 jours", val: 7 },
                  { label: "30 jours", val: 30 },
                  { label: "90 jours (Standard)", val: 90 },
                  { label: "180 jours", val: 180 },
                  { label: "1 an", val: 365 },
                  { label: "Toujours (Illimité)", val: 0 },
                ].map((r) => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => setConfigRouting({ ...configRouting, retentionDays: r.val })}
                    className={cn(
                      "rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
                      configRouting.retentionDays === r.val
                        ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                        : "border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-white"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL INVESTIGATION (MODE ENQUÊTE APPROFONDIE) */}
      {investigatingEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl border border-white/15 bg-zinc-900 p-6 shadow-2xl space-y-5 my-8">
            <button
              type="button"
              onClick={() => {
                setInvestigatingEventId(null);
                setInvestigationData(null);
              }}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Mode Enquête & Causalité — Événement {investigatingEventId}
                </h2>
                <p className="text-xs text-zinc-400">
                  Analyse contextuelle approfondie (Fenêtre temporelle de ±15 minutes)
                </p>
              </div>
            </div>

            {loadingInvestigation ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <p className="text-xs text-zinc-400">Reconstitution de la chaîne de causalité...</p>
              </div>
            ) : investigationData ? (
              <div className="space-y-5 text-xs">
                {/* SYNTHÈSE "QUI, QUOI, QUAND, OÙ, POURQUOI" */}
                <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 space-y-3">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400">
                    Fiche d&apos;Investigation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">QUI ? (Acteur)</span>
                      <p className="font-bold text-white text-xs mt-0.5">
                        {investigationData.targetEvent.actor.tag}
                      </p>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {investigationData.targetEvent.actor.id}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">QUOI ? (Type d&apos;action)</span>
                      <p className="font-bold text-white text-xs mt-0.5">
                        {investigationData.targetEvent.type}
                      </p>
                      <span
                        className={cn(
                          "inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5",
                          getSeverityBadge(investigationData.targetEvent.severity)
                        )}
                      >
                        {investigationData.targetEvent.severity}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">QUAND ?</span>
                      <p className="font-mono text-zinc-300 text-xs mt-0.5">
                        {new Date(investigationData.targetEvent.timestamp).toLocaleString("fr-FR")}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">OÙ ? (Salon / Serveur)</span>
                      <p className="font-bold text-cyan-400 text-xs mt-0.5">
                        {investigationData.targetEvent.channel
                          ? `#${investigationData.targetEvent.channel.name}`
                          : "Serveur Global"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">CIBLE</span>
                      <p className="font-bold text-white text-xs mt-0.5">
                        {investigationData.targetEvent.target?.name || "Aucune"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">DOSSIER ASSOCIÉ</span>
                      <div className="mt-0.5">
                        {investigationData.targetEvent.caseId ? (
                          <span className="font-bold text-orange-400">Case #{investigationData.targetEvent.caseId}</span>
                        ) : investigationData.targetEvent.incidentId ? (
                          <span className="font-mono font-bold text-rose-400">
                            {investigationData.targetEvent.incidentId}
                          </span>
                        ) : (
                          <span className="text-zinc-600">Aucun</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {investigationData.targetEvent.reason && (
                    <div className="border-t border-white/5 pt-2">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">POURQUOI ? (Motif)</span>
                      <p className="text-xs text-zinc-300 mt-0.5 bg-white/5 p-2 rounded-xl">
                        {investigationData.targetEvent.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* CHAÎNE DE CAUSALITÉ INTERACTIVE */}
                <div className="space-y-2">
                  <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    Chronologie des Événements Connexes (Chaîne de Causalité)
                  </h3>
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3 space-y-2 max-h-60 overflow-y-auto">
                    {investigationData.causalityChain.map((step) => (
                      <div
                        key={step.eventId}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-2.5 transition-all text-xs",
                          step.eventId === investigatingEventId
                            ? "border border-indigo-500/40 bg-indigo-950/30"
                            : "bg-white/[0.02]"
                        )}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] font-bold text-zinc-300">
                          {step.step}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{step.summary}</span>
                            <span className="text-[9px] font-mono uppercase px-1 rounded bg-white/5 text-zinc-400">
                              {step.relation}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DIFF INSPECTION (AVANT / APRÈS) */}
                {investigationData.diffInspection && investigationData.diffInspection.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-amber-400" />
                      Différence d&apos;État Détectée (Avant / Après)
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase font-bold text-zinc-400">
                          <tr>
                            <th className="px-3 py-2">Champ Modifié</th>
                            <th className="px-3 py-2 text-rose-400">État Avant (Previous)</th>
                            <th className="px-3 py-2 text-emerald-400">État Après (Current)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                          {investigationData.diffInspection.map((d, i) => (
                            <tr key={i} className="hover:bg-white/[0.02]">
                              <td className="px-3 py-2 font-bold text-zinc-300">{d.field}</td>
                              <td className="px-3 py-2 text-rose-300 bg-rose-500/5">{d.beforeDisplay}</td>
                              <td className="px-3 py-2 text-emerald-300 bg-emerald-500/5">{d.afterDisplay}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL EXPORT (CSV / JSON) */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setExportModalOpen(false)}
              className="absolute right-5 top-5 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Exporter le Journal d&apos;Audit</h3>
            </div>

            <p className="text-xs text-zinc-400">
              Exportez l&apos;ensemble des événements actuellement filtrés pour archivage ou audit externe.
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-zinc-300">Format d&apos;export :</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer",
                    exportFormat === "csv"
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  <span className="text-base">📊</span>
                  <span className="mt-1">CSV (Excel / Tableur)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("json")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer",
                    exportFormat === "json"
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  <span className="text-base">📦</span>
                  <span className="mt-1">JSON (Données brutes)</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadExport}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger l&apos;export {exportFormat.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
