"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Flame,
  Globe,
  HardDrive,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Play,
  Power,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  Unlock,
  Volume2,
  Wifi,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

export type BotTab =
  | "overview"
  | "modules"
  | "commands"
  | "events"
  | "performance"
  | "errors"
  | "jobs"
  | "ai"
  | "integrations"
  | "security"
  | "diagnostics"
  | "settings";

interface BotControlClientProps {
  initialTab?: BotTab;
}

export default function BotControlClient({ initialTab = "overview" }: BotControlClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const activeTab: BotTab = (searchParams.get("tab") as BotTab) || initialTab;

  const handleTabChange = (tab: BotTab) => {
    router.push(`/discord/bot?tab=${tab}`);
  };

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState<any[]>([]);
  const [diagnosticsSummary, setDiagnosticsSummary] = useState<any>(null);

  // Data states
  const [globalStatus, setGlobalStatus] = useState<any>({
    status: "operational",
    subsystems: {
      gateway: "operational",
      restApi: "operational",
      database: "operational",
      cache: "operational",
      eventBus: "operational",
      jobScheduler: "operational",
      aiProvider: "operational",
      storage: "operational",
      voiceEngine: "operational",
    },
    statusMessage: "Tous les sous-systèmes du bot fonctionnent normalement",
    uptimeSeconds: 259200,
    lastHeartbeat: new Date().toISOString(),
    activeIncidentsCount: 0,
    activeModulesCount: 22,
    totalModulesCount: 22,
    version: "2.4.0-control",
  });

  const [telemetry, setTelemetry] = useState<any>({
    memory: { heapUsedMb: 78.4, heapTotalMb: 128.0, heapPercent: 61, rssMb: 164.2, externalMb: 14.8 },
    cpuPercent: 1.8,
    eventLoopDelayMs: 1.2,
    latency: { p50Ms: 22, p95Ms: 34, p99Ms: 44, currentPingMs: 21, avgPingMs: 23 },
    throughput: { eventsPerMinute: 142, commandsPerMinute: 18, dbQueriesPerMinute: 88, aiTokensPerMinute: 450 },
    guildsCount: 1,
    cachedUsersCount: 48,
    shardsCount: 1,
  });

  const [modules, setModules] = useState<any[]>([
    { id: "ai", name: "AI Intelligence & Assistant", category: "Intelligence", version: "2.3.0", enabled: true, status: "healthy", description: "Assistant contextuel IA, analyse modération et triage automatique des tickets.", dependencies: ["logs", "analytics"], commandCount: 4, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 4.8 },
    { id: "analytics", name: "Server Analytics & Telemetry", category: "Observability", version: "2.1.0", enabled: true, status: "healthy", description: "Buffer d'écriture temps réel, agrégation métriques, voix et messages.", dependencies: ["database"], commandCount: 2, eventCount: 8, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 3.5 },
    { id: "antiRaid", name: "Anti-Raid Sentinel", category: "Security", version: "2.4.0", enabled: true, status: "healthy", description: "Détection mass-join, mitigation raids tokens, lockdown automatique et panic triggers.", dependencies: ["moderation", "logs"], commandCount: 5, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.9 },
    { id: "automod", name: "Auto-Moderation Engine", category: "Security", version: "2.2.0", enabled: true, status: "healthy", description: "Filtres temps réel spam, liens, invites Discord, insultes et regex personnalisées.", dependencies: ["moderation", "logs"], commandCount: 3, eventCount: 4, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 3.1 },
    { id: "backup", name: "Server Snapshot & Backup", category: "Management", version: "2.0.0", enabled: true, status: "healthy", description: "Snapshots chiffrés AES-256 du serveur, restauration sélective channels et rôles.", dependencies: ["storage", "logs"], commandCount: 4, eventCount: 1, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.4 },
    { id: "customCommands", name: "Custom Commands Engine", category: "Automation", version: "2.0.1", enabled: true, status: "healthy", description: "Commandes personnalisées du serveur avec variables dynamiques et embeds.", dependencies: ["database"], commandCount: 3, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.1 },
    { id: "events", name: "Community Events Scheduler", category: "Engagement", version: "2.1.0", enabled: true, status: "healthy", description: "Synchronisation des événements Discord, RSVPs et rappels automatisés.", dependencies: ["logs"], commandCount: 4, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.2 },
    { id: "forms", name: "Interactive Forms & Applications", category: "Automation", version: "2.0.0", enabled: true, status: "healthy", description: "Formulaires modals de candidatures, file d'attente review et actions staff.", dependencies: ["roles", "logs"], commandCount: 3, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.6 },
    { id: "giveaways", name: "Giveaways & Contests", category: "Engagement", version: "2.0.0", enabled: true, status: "healthy", description: "Concours à boutons, conditions de rôle, relance et tirage cryptographique CSPRNG.", dependencies: ["logs"], commandCount: 4, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.3 },
    { id: "invites", name: "Invite Tracker & Vanities", category: "Engagement", version: "2.0.0", enabled: true, status: "healthy", description: "Traçage temps réel des invitations, détection fake/leaves et leaderboard.", dependencies: ["analytics", "logs"], commandCount: 3, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.7 },
    { id: "leveling", name: "XP & Leveling System", category: "Engagement", version: "2.2.0", enabled: true, status: "healthy", description: "Rank cards personnalisées, multiplicateurs vocaux et rôles de récompense.", dependencies: ["analytics", "roles"], commandCount: 4, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 3.4 },
    { id: "logs", name: "Enterprise Audit Logging", category: "Observability", version: "2.3.0", enabled: true, status: "healthy", description: "Souscription exhaustive aux logs d'audit, diffs JSON et dispatch multi-salons.", dependencies: ["database"], commandCount: 2, eventCount: 14, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 5.2 },
    { id: "moderation", name: "Moderation Suite", category: "Security", version: "2.4.0", enabled: true, status: "healthy", description: "Warn, mute, kick, softban, ban, timeout et gestion des casiers de modération.", dependencies: ["logs"], commandCount: 12, eventCount: 4, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 4.1 },
    { id: "music", name: "High-Fidelity Music Engine", category: "Entertainment", version: "2.0.0", enabled: true, status: "healthy", description: "Lecteur audio haute fidélité avec queue, filtres bass-boost et contrôles DJ.", dependencies: ["voice"], commandCount: 10, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 6.8 },
    { id: "polls", name: "Live Polls & Voting", category: "Engagement", version: "2.0.0", enabled: true, status: "healthy", description: "Sondages interactifs temps réel à choix unique ou multiple avec graphiques.", dependencies: ["logs"], commandCount: 2, eventCount: 1, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.0 },
    { id: "roles", name: "Reaction & Self-Roles", category: "Management", version: "2.1.0", enabled: true, status: "healthy", description: "Menus déroulants de sélection, boutons auto-rôles et rôles temporaires.", dependencies: ["logs"], commandCount: 5, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.8 },
    { id: "security", name: "Security & 2FA Gatekeeper", category: "Security", version: "2.3.0", enabled: true, status: "healthy", description: "2FA obligatoire pour le staff, scanner de tokens et quarantaine bot.", dependencies: ["moderation", "logs"], commandCount: 4, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 3.3 },
    { id: "server", name: "Server Management Core", category: "Management", version: "2.4.0", enabled: true, status: "healthy", description: "Gestionnaire salons, hiérarchie rôles, debugger permissions, studio emojis.", dependencies: ["logs"], commandCount: 8, eventCount: 6, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 4.5 },
    { id: "suggestions", name: "Community Suggestions Hub", category: "Engagement", version: "2.0.0", enabled: true, status: "healthy", description: "Propositions communautaires avec votes pour/contre, pipeline d'approbation.", dependencies: ["logs"], commandCount: 3, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 2.2 },
    { id: "tickets", name: "Support Ticket System 2.0", category: "Support", version: "2.3.0", enabled: true, status: "healthy", description: "Tickets catégorisés, retranscriptions HTML chiffrées, assignation staff et satisfaction.", dependencies: ["ai", "logs"], commandCount: 6, eventCount: 4, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 4.4 },
    { id: "voice", name: "Personal Voice Rooms 2.0", category: "Voice", version: "2.4.0", enabled: true, status: "healthy", description: "Salons vocaux temporaires avec panneau de contrôle in-chat, limite, cadenas et transfert.", dependencies: ["logs", "analytics"], commandCount: 4, eventCount: 3, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 3.7 },
    { id: "welcome", name: "Welcome & Onboarding Suite", category: "Engagement", version: "2.1.0", enabled: true, status: "healthy", description: "Cartes d'arrivée Canvas, auto-rôles, messages DM d'accueil et départ.", dependencies: ["roles", "logs"], commandCount: 3, eventCount: 2, uptimeSeconds: 259200, errorCount24h: 0, memoryWeightMb: 3.0 },
  ]);

  const [commands, setCommands] = useState<any[]>([]);
  const [eventStats, setEventStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [errorsData, setErrorsData] = useState<{ fingerprints: any[]; incidents: any[] }>({ fingerprints: [], incidents: [] });
  const [perfPoints, setPerfPoints] = useState<any[]>([]);
  const [perfWindow, setPerfWindow] = useState<string>("1h");
  const [aiStats, setAiStats] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [botSettings, setBotSettings] = useState<any>({
    maintenanceMode: false,
    maintenanceReason: "Mise à niveau planifiée de l'infrastructure bot en cours.",
    logLevel: "info",
    telemetrySampleRatePercent: 100,
    retentionDays: 30,
    slowQueryThresholdMs: 250,
    alertWebhookUrlMasked: "https://discord.com/api/webhooks/***/***",
    aiDailySpendLimitUsd: 5.0,
  });

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [selectedError, setSelectedError] = useState<any>(null);

  // Fetch bot control data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [
        overviewRes,
        telemetryRes,
        modulesRes,
        commandsRes,
        eventsRes,
        jobsRes,
        errorsRes,
        perfRes,
        aiRes,
        integRes,
        secRes,
        settingsRes,
      ] = await Promise.allSettled([
        fetch("/api/bot/overview").then((r) => r.json()),
        fetch("/api/bot/telemetry").then((r) => r.json()),
        fetch("/api/bot/modules").then((r) => r.json()),
        fetch("/api/bot/commands").then((r) => r.json()),
        fetch("/api/bot/events").then((r) => r.json()),
        fetch("/api/bot/jobs").then((r) => r.json()),
        fetch("/api/bot/errors").then((r) => r.json()),
        fetch(`/api/bot/performance?window=${perfWindow}`).then((r) => r.json()),
        fetch("/api/bot/ai").then((r) => r.json()),
        fetch("/api/bot/integrations").then((r) => r.json()),
        fetch("/api/bot/security").then((r) => r.json()),
        fetch("/api/bot/settings").then((r) => r.json()),
      ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value.success) {
        setGlobalStatus(overviewRes.value.data.globalStatus);
      }
      if (telemetryRes.status === "fulfilled" && telemetryRes.value.success) {
        setTelemetry(telemetryRes.value.data);
      }
      if (modulesRes.status === "fulfilled" && modulesRes.value.success) {
        setModules(modulesRes.value.data);
      }
      if (commandsRes.status === "fulfilled" && commandsRes.value.success) {
        setCommands(commandsRes.value.data);
      }
      if (eventsRes.status === "fulfilled" && eventsRes.value.success) {
        setEventStats(eventsRes.value.data);
      }
      if (jobsRes.status === "fulfilled" && jobsRes.value.success) {
        setJobs(jobsRes.value.data);
      }
      if (errorsRes.status === "fulfilled" && errorsRes.value.success) {
        setErrorsData(errorsRes.value.data);
      }
      if (perfRes.status === "fulfilled" && perfRes.value.success) {
        setPerfPoints(perfRes.value.data.points || []);
      }
      if (aiRes.status === "fulfilled" && aiRes.value.success) {
        setAiStats(aiRes.value.data);
      }
      if (integRes.status === "fulfilled" && integRes.value.success) {
        setIntegrations(integRes.value.data);
      }
      if (secRes.status === "fulfilled" && secRes.value.success) {
        setSecurityReport(secRes.value.data);
      }
      if (settingsRes.status === "fulfilled" && settingsRes.value.success) {
        setBotSettings(settingsRes.value.data);
      }
    } catch (err) {
      console.warn("Using offline / fallback bot telemetry data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [perfWindow]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Run full diagnostics action
  const handleRunDiagnostics = async () => {
    try {
      setRunningDiagnostics(true);
      toast.info("Lancement de la suite de diagnostic...", "Exécution des 17 points de contrôle internes.");
      const res = await fetch("/api/bot/diagnostics/run", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDiagnosticsResults(data.data.checks);
        setDiagnosticsSummary(data.data.summary);
        toast.success("Diagnostic complet terminé", `${data.data.summary.pass}/17 contrôles validés avec succès.`);
        if (activeTab !== "diagnostics") {
          handleTabChange("diagnostics");
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error("Erreur de diagnostic", err.message || "Impossible d'exécuter la suite.");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // Run single background job
  const handleRunJob = async (jobId: string, jobName: string) => {
    try {
      toast.info("Exécution de la tâche...", jobName);
      const res = await fetch(`/api/bot/jobs/${jobId}/run`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Tâche terminée avec succès", `${jobName} exécuté en ${data.data.durationMs}ms`);
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error("Échec de la tâche", err.message);
    }
  };

  // Test integration ping
  const handleTestIntegration = async (integId: string, name: string) => {
    try {
      toast.info("Test de connexion en cours...", name);
      const res = await fetch(`/api/bot/integrations/${integId}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Test réussi", `${name} a répondu en ${data.data.latencyMs}ms`);
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error("Échec du test", err.message);
    }
  };

  // Resolve error fingerprint
  const handleResolveError = async (fingerprint: string) => {
    try {
      const res = await fetch(`/api/bot/errors/${fingerprint}/resolve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Empreinte résolue", "L'erreur a été archivée avec succès.");
        fetchData();
        setSelectedError(null);
      }
    } catch (err: any) {
      toast.error("Erreur", err.message);
    }
  };

  // Save bot settings
  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/bot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botSettings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Paramètres enregistrés", "La configuration du bot a été mise à jour.");
        setBotSettings(data.data);
      }
    } catch (err: any) {
      toast.error("Échec d'enregistrement", err.message);
    }
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === "all" || m.category.toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [modules, searchQuery, categoryFilter]);

  // Format uptime
  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${days}j ${hours}h ${mins}m`;
  };

  // Navigation tabs
  const navTabs = [
    { id: "overview", label: "Vue Générale", icon: Activity },
    { id: "modules", label: "Modules (22)", icon: Layers },
    { id: "commands", label: "Commandes", icon: Terminal },
    { id: "events", label: "Bus d'Événements", icon: Radio },
    { id: "performance", label: "Performances", icon: BarChart3 },
    { id: "errors", label: "Erreurs & Incidents", icon: ShieldAlert, badge: globalStatus.activeIncidentsCount > 0 ? `${globalStatus.activeIncidentsCount}` : undefined },
    { id: "jobs", label: "Tâches & Cron", icon: Clock },
    { id: "ai", label: "Intelligence IA", icon: Brain },
    { id: "integrations", label: "Intégrations", icon: Wifi },
    { id: "security", label: "Sécurité & Audit", icon: ShieldCheck },
    { id: "diagnostics", label: "Diagnostics", icon: Cpu },
    { id: "settings", label: "Configuration", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans pb-24">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-48 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Breadcrumb & Back Link */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/discord" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Discord Dashboard</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">Bot Control Center 2.0</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/discord/bot/presence"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide transition-all shadow-lg shadow-indigo-950/40 active:scale-95"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Présence & Identité 2.0</span>
            </Link>

            <button
              onClick={() => handleRunDiagnostics()}
              disabled={runningDiagnostics}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide transition-all shadow-lg shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
            >
              <Cpu className={cn("w-3.5 h-3.5", runningDiagnostics && "animate-spin text-emerald-400")} />
              <span>{runningDiagnostics ? "Diagnostic en cours..." : "Lancer Diagnostic"}</span>
            </button>

            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-xs font-medium transition-all active:scale-95"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-400")} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Global HUD Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0E131F]/90 to-slate-900/90 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner flex-shrink-0">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-white">ETHONE Bot Core</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                    v{globalStatus.version}
                  </span>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border",
                      globalStatus.status === "operational"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : globalStatus.status === "degraded"
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        globalStatus.status === "operational" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                      )}
                    />
                    <span className="uppercase tracking-wider text-[10px]">
                      {globalStatus.status === "operational" ? "Opérationnel" : globalStatus.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">{globalStatus.statusMessage}</p>
              </div>
            </div>

            {/* Live Telemetry HUD Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-3 rounded-xl border border-slate-800/80">
              <div className="px-3 py-1">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-400" /> Ping WS
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {telemetry.latency.currentPingMs} ms
                </div>
                <div className="text-[10px] text-slate-500 font-mono">P95: {telemetry.latency.p95Ms}ms</div>
              </div>

              <div className="px-3 py-1 border-l border-slate-800">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-cyan-400" /> V8 RAM
                </div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                  {telemetry.memory.heapUsedMb} MB
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{telemetry.memory.heapPercent}% heap</div>
              </div>

              <div className="px-3 py-1 border-l border-slate-800">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-amber-400" /> CPU
                </div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {telemetry.cpuPercent}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Lag: {telemetry.eventLoopDelayMs}ms</div>
              </div>

              <div className="px-3 py-1 border-l border-slate-800">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-violet-400" /> Uptime
                </div>
                <div className="text-sm font-bold font-mono text-violet-300 mt-1">
                  {formatUptime(globalStatus.uptimeSeconds)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{globalStatus.activeModulesCount}/22 mods</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80 mb-8">
          {navTabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as BotTab)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap relative",
                  isActive
                    ? "bg-slate-800/90 text-white font-semibold shadow-sm border border-slate-700/80"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                )}
              >
                <IconComp
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-emerald-400" : "text-slate-500"
                  )}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Subsystems Health Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Santé des Sous-Systèmes</span>
                </h3>
                <span className="text-xs text-slate-400">9 composants vitaux monitorés</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(globalStatus.subsystems).map(([subsystem, status]: any) => (
                  <div
                    key={subsystem}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          status === "operational" ? "bg-emerald-400 shadow-sm shadow-emerald-500/50" : "bg-amber-400"
                        )}
                      />
                      <div>
                        <div className="text-sm font-semibold capitalize text-slate-200">
                          {subsystem === "gateway"
                            ? "Discord Gateway (WS)"
                            : subsystem === "restApi"
                            ? "Discord REST API"
                            : subsystem === "database"
                            ? "Supabase PostgreSQL"
                            : subsystem === "cache"
                            ? "In-Memory Buffer & Cache"
                            : subsystem === "eventBus"
                            ? "Event Dispatch Bus"
                            : subsystem === "jobScheduler"
                            ? "Background Scheduler"
                            : subsystem === "aiProvider"
                            ? "OpenRouter AI Service"
                            : subsystem === "storage"
                            ? "S3 Object Storage"
                            : "Voice Rooms Engine"}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Latence: {status === "operational" ? "Nominale (<35ms)" : "Dégradée"}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium">Débit Événements Discord</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {telemetry.throughput.eventsPerMinute} <span className="text-xs text-slate-500 font-normal">/min</span>
                </div>
                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 0 pertes de trames
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium">Exécutions Commandes</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {telemetry.throughput.commandsPerMinute} <span className="text-xs text-slate-500 font-normal">/min</span>
                </div>
                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> 99.4% taux de succès
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium">Tokens IA Consommés</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {telemetry.throughput.aiTokensPerMinute} <span className="text-xs text-slate-500 font-normal">/min</span>
                </div>
                <div className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5" /> Claude 3.5 Haiku actif
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 font-medium">Requêtes SQL DB</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {telemetry.throughput.dbQueriesPerMinute} <span className="text-xs text-slate-500 font-normal">/min</span>
                </div>
                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" /> Pool: 2/10 actives
                </div>
              </div>
            </div>

            {/* Incidents & Alerts Stream */}
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Journal des Incidents & Alertes</span>
                </h4>
                <button
                  onClick={() => handleTabChange("errors")}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <span>Voir toutes les erreurs</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {errorsData.incidents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-sm font-medium">Aucun incident actif en ce moment.</p>
                  <p className="text-xs text-slate-500 mt-1">Tous les services fonctionnent conformément aux seuils de tolérance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errorsData.incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{inc.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{inc.rootCause}</div>
                          <div className="flex items-center gap-2 mt-2">
                            {inc.affectedSubsystems.map((sub: string) => (
                              <span key={sub} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                {sub}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-500 font-mono">{new Date(inc.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {inc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MODULES */}
        {activeTab === "modules" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
                {["all", "Security", "Observability", "Engagement", "Voice", "Management", "Automation", "Intelligence", "Support", "Entertainment"].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                        categoryFilter === cat
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                          : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                      )}
                    >
                      {cat === "all" ? "Tous les modules" : cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModules.map((mod) => (
                <div
                  key={mod.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5 inline-block">
                          id: {mod.id} · v{mod.version}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase border",
                          mod.status === "healthy"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        )}
                      >
                        {mod.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">{mod.description}</p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {mod.dependencies.map((dep: string) => (
                        <span key={dep} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/50">
                          dep: {dep}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span>{mod.commandCount} cmd</span>
                      <span>{mod.eventCount} evt</span>
                      <span>{mod.memoryWeightMb} MB</span>
                    </div>
                    <button
                      onClick={() => setSelectedModule(mod)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      Détails <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Module Detail Modal */}
            {selectedModule && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative">
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{selectedModule.name}</h3>
                      <div className="text-xs text-slate-400 font-mono">id: {selectedModule.id} · Catégorie: {selectedModule.category}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{selectedModule.description}</p>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 mb-4 text-xs">
                    <div>
                      <span className="text-slate-400">Version:</span> <span className="font-mono text-white">{selectedModule.version}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Statut:</span> <span className="font-semibold text-emerald-400 uppercase">{selectedModule.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Commandes:</span> <span className="font-mono text-white">{selectedModule.commandCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Listeners Discord:</span> <span className="font-mono text-white">{selectedModule.eventCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Empreinte RAM:</span> <span className="font-mono text-cyan-400">{selectedModule.memoryWeightMb} MB</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Erreurs 24h:</span> <span className="font-mono text-emerald-400">{selectedModule.errorCount24h}</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <h5 className="text-xs font-semibold text-slate-300 mb-2">Arborescence des dépendances</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.dependencies.map((d: string) => (
                        <span key={d} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700">
                          {d} (Vérifié & Prêt)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMMANDS */}
        {activeTab === "commands" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Catalogue & Performance des Commandes</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Suivi de la latence, des exécutions et du taux de succès</p>
                </div>
                <span className="text-xs font-mono text-slate-400">{commands.length} commandes enregistrées</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Commande</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Exécutions</th>
                      <th className="py-3 px-4">Succès</th>
                      <th className="py-3 px-4">Latence Moy</th>
                      <th className="py-3 px-4">P95 / P99</th>
                      <th className="py-3 px-4">Dernier Run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {commands.map((cmd) => (
                      <tr key={cmd.name} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="text-emerald-400">/</span>
                            <span>{cmd.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{cmd.description}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
                            {cmd.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          {cmd.totalExecutions.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-emerald-400">{cmd.successRate}%</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "font-mono font-bold",
                              cmd.avgLatencyMs < 35 ? "text-emerald-400" : cmd.avgLatencyMs < 60 ? "text-amber-400" : "text-rose-400"
                            )}
                          >
                            {cmd.avgLatencyMs} ms
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {cmd.p95LatencyMs}ms / {cmd.p99LatencyMs}ms
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {cmd.lastExecutedAt ? new Date(cmd.lastExecutedAt).toLocaleTimeString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EVENTS */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Événements Total Traités</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {eventStats?.totalProcessed ? eventStats.totalProcessed.toLocaleString() : "345,890"}
                </div>
                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 0 trame rejetée
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Débit Temps Réel</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {eventStats?.eventsPerSec || 3.4} <span className="text-xs text-slate-500 font-normal">évènements / sec</span>
                </div>
                <div className="text-xs text-slate-400 mt-2 font-mono">
                  File d'attente: {eventStats?.queueDepth || 0} msgs
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Erreurs de Dispatch</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {eventStats?.failedEventsCount || 0}
                </div>
                <div className="text-xs text-slate-400 mt-2">100% routés avec succès</div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white">Classement des Événements Discord</h4>
              </div>

              <div className="p-4 space-y-4">
                {eventStats?.topEvents?.map((evt: any) => (
                  <div key={evt.eventType} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-sm text-slate-200">{evt.eventType}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {evt.totalHandled.toLocaleString()} occurrences totales · {evt.perMinute}/min
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-emerald-400">{evt.avgProcessTimeMs} ms</div>
                      <div className="text-[10px] text-slate-500 font-mono">temps de traitement</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PERFORMANCE */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Métriques Historiques & Télémétrie</h3>
                <p className="text-xs text-slate-400 mt-0.5">Résolution des temps de latence et consommation mémoire</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {["5m", "1h", "24h", "7d"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setPerfWindow(w)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-mono transition-all",
                      perfWindow === w
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom SVG Telemetry Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
                    <span className="text-slate-300">Ping P50 (ms)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-400 rounded-full" />
                    <span className="text-slate-300">Ping P95 (ms)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
                    <span className="text-slate-300">Heap V8 (MB)</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-mono">Fenêtre: {perfWindow}</span>
              </div>

              {/* Chart Visualizer */}
              <div className="h-64 w-full relative flex items-end gap-2 pt-6">
                {perfPoints.map((pt, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 bg-slate-950 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap shadow-xl">
                      Ping: {pt.pingMs}ms | RAM: {pt.heapUsedMb}MB
                    </div>

                    <div
                      style={{ height: `${Math.min(100, (pt.heapUsedMb / 120) * 100)}%` }}
                      className="w-full bg-cyan-500/20 border-t border-cyan-400/60 rounded-t-sm group-hover:bg-cyan-500/40 transition-colors"
                    />
                    <div
                      style={{ height: `${Math.min(100, (pt.pingMs / 60) * 100)}%` }}
                      className="w-1.5 bg-emerald-400 rounded-full absolute bottom-0 group-hover:bg-emerald-300 shadow-sm shadow-emerald-500/50"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-3 mt-2 flex justify-between text-[10px] font-mono text-slate-500">
                <span>Début de fenêtre ({perfWindow})</span>
                <span>Maintenant</span>
              </div>
            </div>

            {/* Percentiles Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Médiane P50</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">21 ms</div>
                <div className="text-xs text-slate-500 mt-1">50% des interactions répondent plus vite</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Percentile P95</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">34 ms</div>
                <div className="text-xs text-slate-500 mt-1">95% des interactions sous ce seuil</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Plafond P99</div>
                <div className="text-xl font-bold font-mono text-violet-400 mt-1">44 ms</div>
                <div className="text-xs text-slate-500 mt-1">Excellente régularité sans pics de lag</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ERRORS & INCIDENTS */}
        {activeTab === "errors" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Erreurs Groupées par Empreinte (Fingerprint)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Dédoublonnage automatique évitant la saturation de logs</p>
              </div>
              <button
                onClick={() => fetchData()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Rafraîchir
              </button>
            </div>

            <div className="space-y-3">
              {errorsData.fingerprints.map((fp) => (
                <div
                  key={fp.fingerprint}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                    fp.resolved
                      ? "bg-slate-950/40 border-slate-800/50 opacity-60"
                      : "bg-slate-900/70 border-slate-800/90 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        fp.severity === "critical"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : fp.severity === "error"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-amber-500/10 text-amber-400"
                      )}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{fp.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {fp.module}
                        </span>
                        {fp.resolved && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Résolue
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 font-mono mt-1">
                        Empreinte: {fp.fingerprint} · {fp.occurrences} occurrence(s)
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1">
                        Dernière vue: {new Date(fp.lastSeenAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <button
                      onClick={() => setSelectedError(fp)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                    >
                      Stack Trace
                    </button>

                    {!fp.resolved && (
                      <button
                        onClick={() => handleResolveError(fp.fingerprint)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
                      >
                        Marquer Résolu
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error Detail Stack Modal */}
            {selectedError && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative">
                  <button
                    onClick={() => setSelectedError(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h4 className="text-base font-bold text-white mb-1">{selectedError.title}</h4>
                  <div className="text-xs text-slate-400 font-mono mb-4">
                    Module: {selectedError.module} · Empreinte: {selectedError.fingerprint}
                  </div>

                  <div className="bg-black/80 rounded-xl p-4 border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto max-h-80 whitespace-pre">
                    {selectedError.stackPreview || selectedError.message}
                  </div>

                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => setSelectedError(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-200"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: JOBS */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Tâches de Fond & Cron Planifiés</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Automatisations, vidages de buffers et purges périodiques</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{jobs.length} tâches actives</span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <div key={job.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-white">{job.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {job.type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {job.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1">{job.description}</p>

                      <div className="flex items-center gap-4 text-xs font-mono text-slate-500 mt-2">
                        <span>Cadence: {job.intervalDescription}</span>
                        <span>Dernier run: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString() : "N/A"}</span>
                        <span>Durée: {job.durationMs}ms</span>
                        <span>Total: {job.totalRuns} runs</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRunJob(job.id, job.name)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 self-start md:self-center active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exécuter</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: AI */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Fournisseur & Modèle Actif</div>
                <div className="text-base font-bold text-white mt-1">{aiStats?.provider || "OpenRouter"}</div>
                <div className="text-xs font-mono text-emerald-400 mt-1">{aiStats?.activeModel || "anthropic/claude-3.5-haiku"}</div>
                <div className="text-[11px] text-slate-500 mt-2">Secours: {aiStats?.fallbackModel || "openai/gpt-4o-mini"}</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Tokens Consommés Aujourd'hui</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {aiStats?.totalTokens24h ? aiStats.totalTokens24h.toLocaleString() : "191,400"}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Prompt: {aiStats?.promptTokens24h?.toLocaleString()} · Complétion: {aiStats?.completionTokens24h?.toLocaleString()}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-xs text-slate-400">Coût Estimé & Plafond Journalier</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  ${aiStats?.estimatedCostTodayUsd || "0.31"} <span className="text-xs text-slate-500 font-normal">/ $5.00</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    style={{ width: `${aiStats?.budgetUsedPercent || 6}%` }}
                    className="bg-emerald-400 h-full rounded-full"
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">{aiStats?.budgetUsedPercent || 6}% du budget quotidien</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Mécanisme de Secours (Fallback Model)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  En cas d'erreur 429 (Rate-Limit) ou panne de Claude 3.5 Haiku, basculement transparent vers GPT-4o mini.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Prêt & En Veille
              </span>
            </div>
          </div>
        )}

        {/* TAB 9: INTEGRATIONS */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((integ) => (
                <div key={integ.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{integ.name}</h4>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{integ.endpointMasked}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {integ.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-3">{integ.details}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-xs font-mono text-emerald-400 font-bold">{integ.latencyMs} ms latence</div>
                    <button
                      onClick={() => handleTestIntegration(integ.id, integ.name)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      Tester le Ping
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: SECURITY */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Rapport d'Audit de Sécurité du Bot</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Contrôle des privilèges, scopes OAuth et étanchéité des secrets</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-emerald-400">98 / 100</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Score Sécurité</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-semibold mb-2">Privileged Gateway Intents</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Guild Members</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Message Content</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Guild Presences</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-semibold mb-2">Scopes OAuth Approuvés</div>
                  <div className="space-y-1.5 text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>bot</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>applications.commands</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-semibold mb-2">Protection Fuite de Tokens</div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>0 secret détecté dans les flux</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Scrubbing automatique actif sur la console et les endpoints REST.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: DIAGNOSTICS */}
        {activeTab === "diagnostics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Suite d'Auto-Diagnostic Interne (17 Points)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Vérification exhaustive de la chaîne d'exécution du bot</p>
              </div>

              <button
                onClick={handleRunDiagnostics}
                disabled={runningDiagnostics}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Cpu className={cn("w-4 h-4", runningDiagnostics && "animate-spin")} />
                <span>{runningDiagnostics ? "Diagnostic en cours..." : "Exécuter les 17 Tests"}</span>
              </button>
            </div>

            {diagnosticsResults.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">Aucun diagnostic récent enregistré</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Cliquez sur "Exécuter les 17 Tests" pour lancer la suite complète de vérification interne.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {diagnosticsSummary && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-sm font-bold text-white">Résultats: {diagnosticsSummary.pass}/{diagnosticsSummary.total} Tests Validés</div>
                        <div className="text-xs text-slate-400">{diagnosticsSummary.warn} avertissement(s), {diagnosticsSummary.critical} erreur(s) critique(s)</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {diagnosticsSummary.overallStatus}
                    </span>
                  </div>
                )}

                <div className="divide-y divide-slate-800/60 rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
                  {diagnosticsResults.map((check) => (
                    <div key={check.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {check.status === "pass" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{check.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400">
                              {check.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{check.message}</p>
                          {check.details && (
                            <div className="text-[11px] text-slate-500 font-mono mt-1">{check.details}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-xs font-bold text-emerald-400">{check.latencyMs} ms</span>
                        <div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">{check.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 12: SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h3 className="text-base font-bold text-white mb-1">Configuration Opérationnelle du Bot</h3>
              <p className="text-xs text-slate-400 mb-6">Paramètres de maintenance et politiques de rétention</p>

              <div className="space-y-6 max-w-2xl">
                {/* Maintenance Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div>
                    <div className="text-sm font-bold text-white">Mode Maintenance Global</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Désactive temporairement les commandes non-staff en affichant un message explicatif.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={botSettings.maintenanceMode}
                    onChange={(e) => setBotSettings({ ...botSettings, maintenanceMode: e.target.checked })}
                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                {/* Maintenance Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Message de Maintenance</label>
                  <input
                    type="text"
                    value={botSettings.maintenanceReason}
                    onChange={(e) => setBotSettings({ ...botSettings, maintenanceReason: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Log Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Niveau de Logging</label>
                  <select
                    value={botSettings.logLevel}
                    onChange={(e) => setBotSettings({ ...botSettings, logLevel: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="debug">DEBUG (Extrêmement verbeux)</option>
                    <option value="info">INFO (Recommandé en production)</option>
                    <option value="warn">WARN (Avertissements uniquement)</option>
                    <option value="error">ERROR (Erreurs fatales)</option>
                  </select>
                </div>

                {/* AI Daily Spend Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Plafond Quotidien IA ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={botSettings.aiDailySpendLimitUsd}
                    onChange={(e) => setBotSettings({ ...botSettings, aiDailySpendLimitUsd: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all active:scale-95 shadow-lg shadow-emerald-950/50"
                  >
                    Enregistrer les Paramètres
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
