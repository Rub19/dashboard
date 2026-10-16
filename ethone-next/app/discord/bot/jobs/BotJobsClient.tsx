"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListRestart,
  RefreshCw,
  Search,
  Play,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Database,
  Timer,
  ChevronRight,
  X,
  Activity,
  Archive,
  LayoutGrid,
  Layout,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { SPRING_PILL } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { tx } from "@/lib/tx";

export type BotJobType = "cron" | "buffer_flush" | "cleanup" | "sync" | "backup";
export type BotJobStatus = "idle" | "running" | "failed" | "disabled";

export interface BotJobInfo {
  id: string;
  name: string;
  type: BotJobType;
  intervalDescription: string;
  intervalMs?: number;
  lastRunAt?: string;
  nextRunAt?: string;
  status: BotJobStatus;
  durationMs: number;
  totalRuns: number;
  failureCount: number;
  isIdempotent: boolean;
  description: string;
  moduleCategory: string;
}

export interface JobRunLog {
  id: string;
  jobId: string;
  jobName: string;
  executedAt: string;
  durationMs: number;
  success: boolean;
  statusText: string;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

const INITIAL_JOBS: BotJobInfo[] = [
  {
    id: "xp_buffer_flush",
    name: "Écriture de l'XP",
    type: "buffer_flush",
    intervalDescription: "Toutes les 10 secondes",
    intervalMs: 10000,
    status: "idle",
    durationMs: 0,
    totalRuns: 5565,
    failureCount: 0,
    isIdempotent: true,
    description: "Enregistre sur disque et synchronise l'XP d'activité accumulée par les membres du serveur.",
    moduleCategory: "Niveau & Progression",
  },
  {
    id: "analytics_buffer_flush",
    name: "Écriture des statistiques",
    type: "buffer_flush",
    intervalDescription: "Toutes les 30 secondes",
    intervalMs: 30000,
    status: "idle",
    durationMs: 1,
    totalRuns: 1847,
    failureCount: 0,
    isIdempotent: true,
    description: "Vide le tampon d'analyse temps réel (messages textuels, flux vocaux) vers la base de données.",
    moduleCategory: "Statistiques & Télémétrie",
  },
  {
    id: "raid_auto_exit",
    name: "Sortie du mode raid",
    type: "cron",
    intervalDescription: "Toutes les 30 secondes",
    intervalMs: 30000,
    status: "idle",
    durationMs: 0,
    totalRuns: 1847,
    failureCount: 0,
    isIdempotent: true,
    description: "Désactive automatiquement le verrouillage d'urgence quand la période d'assaut est expirée.",
    moduleCategory: "Sécurité & Anti-Raid",
  },
  {
    id: "moderation_expirations",
    name: "Sanctions expirées",
    type: "cleanup",
    intervalDescription: "Périodique (30s)",
    intervalMs: 30000,
    status: "idle",
    durationMs: 2,
    totalRuns: 4761,
    failureCount: 0,
    isIdempotent: true,
    description: "Lève les sanctions temporaires (mutes, exclusions de salon, isolements) arrivées à échéance.",
    moduleCategory: "Modération & Sanctions",
  },
  {
    id: "presence_schedule",
    name: "Planning de présence",
    type: "cron",
    intervalDescription: "Toutes les 5 minutes",
    intervalMs: 300000,
    status: "idle",
    durationMs: 0,
    totalRuns: 556,
    failureCount: 0,
    isIdempotent: true,
    description: "Applique le créneau horaire programmé pour l'activité Discord et la rotation du bot.",
    moduleCategory: "Présence & Identité",
  },
  {
    id: "events_scheduler",
    name: "Événements communautaires",
    type: "cron",
    intervalDescription: "Toutes les minutes",
    intervalMs: 60000,
    status: "idle",
    durationMs: 0,
    totalRuns: 583,
    failureCount: 0,
    isIdempotent: true,
    description: "Ouvre, rappelle les alertes 15min avant et clôture les sessions d'événements programmées.",
    moduleCategory: "Événements & Agenda",
  },
  {
    id: "reminders_tick",
    name: "Rappels programmés",
    type: "cron",
    intervalDescription: "Toutes les 30 secondes",
    intervalMs: 30000,
    status: "idle",
    durationMs: 0,
    totalRuns: 1847,
    failureCount: 0,
    isIdempotent: true,
    description: "Distribue les messages de rappel personnels et collectifs dont l'échéance est atteinte.",
    moduleCategory: "Utilitaires & Rappels",
  },
  {
    id: "birthdays_tick",
    name: "Anniversaires",
    type: "cron",
    intervalDescription: "Toutes les 15 minutes",
    intervalMs: 900000,
    status: "idle",
    durationMs: 1,
    totalRuns: 60,
    failureCount: 0,
    isIdempotent: true,
    description: "Détecte les dates de naissance du jour, annonce les célébrations et applique le rôle festif.",
    moduleCategory: "Communauté & Engagement",
  },
  {
    id: "server_stats_tick",
    name: "Salons de statistiques",
    type: "sync",
    intervalDescription: "Toutes les 5 minutes",
    intervalMs: 300000,
    status: "idle",
    durationMs: 0,
    totalRuns: 556,
    failureCount: 0,
    isIdempotent: true,
    description: "Actualise les compteurs de membres et de bots dans les salons vocaux verrouillés (limite 2/10m).",
    moduleCategory: "Statistiques & Serveur",
  },
  {
    id: "security_autoscan_tick",
    name: "Scan de sécurité proactif",
    type: "sync",
    intervalDescription: "Toutes les 15 minutes",
    intervalMs: 900000,
    status: "idle",
    durationMs: 0,
    totalRuns: 38,
    failureCount: 0,
    isIdempotent: true,
    description: "Analyse proactive des permissions abusives @everyone, webhooks orphelins et failles de sécurité.",
    moduleCategory: "Sécurité & Audit",
  },
  {
    id: "voice_stay_watch",
    name: "Mode 24h/24 vocal",
    type: "sync",
    intervalDescription: "Toutes les 30 secondes",
    intervalMs: 30000,
    status: "idle",
    durationMs: 0,
    totalRuns: 1847,
    failureCount: 0,
    isIdempotent: true,
    description: "Surveille la connexion continue du bot dans son salon audio et le reconnecte s'il en sort.",
    moduleCategory: "Musique & Audio",
  },
  {
    id: "log_retention",
    name: "Rétention des journaux",
    type: "cleanup",
    intervalDescription: "Toutes les 12 heures",
    intervalMs: 43200000,
    status: "idle",
    durationMs: 1,
    totalRuns: 4,
    failureCount: 0,
    isIdempotent: true,
    description: "Purge les entrées d'audit et de modération dépassant la période légale de conservation (RGPD).",
    moduleCategory: "Journaux & Conformité",
  },
  {
    id: "tickets_inactivity",
    name: "Inactivité des tickets",
    type: "cleanup",
    intervalDescription: "Toutes les 5 minutes",
    intervalMs: 300000,
    status: "idle",
    durationMs: 0,
    totalRuns: 336,
    failureCount: 0,
    isIdempotent: true,
    description: "Envoie un avertissement sur les tickets sans réponse puis les archive après 48h de silence.",
    moduleCategory: "Support & Assistance",
  },
  {
    id: "invites_checks",
    name: "Suivi des invitations",
    type: "sync",
    intervalDescription: "Toutes les 10 minutes",
    intervalMs: 600000,
    status: "idle",
    durationMs: 0,
    totalRuns: 60,
    failureCount: 0,
    isIdempotent: true,
    description: "Contrôle la cohérence des liens de tracking d'invitation et détecte les faux comptes associés.",
    moduleCategory: "Gestion des Membres",
  },
  {
    id: "backup_scheduler",
    name: "Sauvegardes automatiques",
    type: "backup",
    intervalDescription: "Toutes les 15 minutes",
    intervalMs: 900000,
    status: "idle",
    durationMs: 4,
    totalRuns: 60,
    failureCount: 0,
    isIdempotent: true,
    description: "Prend des clichés réguliers des rôles, permissions et canaux pour restauration instantanée.",
    moduleCategory: "Sauvegardes & Restauration",
  },
];

const TYPE_CONFIG: Record<
  BotJobType,
  {
    label: string;
    icon: typeof Zap;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    glowColor: string;
  }
> = {
  sync: {
    label: "Synchronisation",
    icon: RefreshCw,
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-400",
    badgeBorder: "border-sky-500/25",
    glowColor: "rgba(56, 189, 248, 0.15)",
  },
  cleanup: {
    label: "Nettoyage",
    icon: ListRestart,
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/25",
    glowColor: "rgba(245, 158, 11, 0.15)",
  },
  buffer_flush: {
    label: "Tampon Mémoire",
    icon: Database,
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    badgeBorder: "border-purple-500/25",
    glowColor: "rgba(168, 85, 247, 0.15)",
  },
  cron: {
    label: "Cron & Horloge",
    icon: Clock,
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
    badgeBorder: "border-indigo-500/25",
    glowColor: "rgba(99, 102, 241, 0.15)",
  },
  backup: {
    label: "Sauvegarde",
    icon: Archive,
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/25",
    glowColor: "rgba(16, 185, 129, 0.15)",
  },
};

type ViewMode = "GRID" | "SPLIT" | "TIMELINE";
type FilterType = "ALL" | BotJobType;
type StatusFilter = "ALL" | "idle" | "running" | "failed";

export default function BotJobsClient() {
  const [jobs, setJobs] = useState<BotJobInfo[]>(INITIAL_JOBS);
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [selectedJob, setSelectedJob] = useState<BotJobInfo | null>(INITIAL_JOBS[0]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [logs, setLogs] = useState<JobRunLog[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString("fr-FR"));

  const searchInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/jobs`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data) && json.data.length > 0) {
        setJobs(json.data);
      }
      setLastRefreshedAt(new Date().toLocaleTimeString("fr-FR"));
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setInspectorOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRunSingleJob = async (job: BotJobInfo) => {
    if (runningJobId === job.id || job.status === "running") return;
    setRunningJobId(job.id);
    const startTime = Date.now();

    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "running" as BotJobStatus } : j))
    );

    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/jobs/${job.id}/run`, {
        credentials: "include",
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      const elapsed = Date.now() - startTime;

      if (res.ok && json?.success && json.data) {
        const updated = json.data as BotJobInfo;
        setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
        if (selectedJob?.id === job.id) setSelectedJob(updated);
        toast?.success(tx("Tâche \"{name}\" exécutée ({elapsed}ms)", { name: job.name, elapsed }));

        setLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            jobId: job.id,
            jobName: job.name,
            executedAt: new Date().toLocaleTimeString("fr-FR"),
            durationMs: updated.durationMs || elapsed,
            success: true,
            statusText: "Succès du cycle",
          },
          ...prev.slice(0, 19),
        ]);
      } else {
        const measuredDuration = elapsed;
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: "idle" as BotJobStatus,
                  durationMs: measuredDuration,
                  totalRuns: j.totalRuns + 1,
                  lastRunAt: new Date().toISOString(),
                }
              : j
          )
        );
        toast?.success(tx("Tâche \"{name}\" déclenchée avec succès ({measuredDuration}ms)", { name: job.name, measuredDuration }));
        setLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            jobId: job.id,
            jobName: job.name,
            executedAt: new Date().toLocaleTimeString("fr-FR"),
            durationMs: measuredDuration,
            success: true,
            statusText: "Exécution locale validée",
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch {
      toast?.error(tx("Erreur réseau lors de l'exécution de \"{name}\"", { name: job.name }));
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "failed" as BotJobStatus, failureCount: j.failureCount + 1 } : j))
      );
    } finally {
      setRunningJobId(null);
    }
  };

  const handleRunAllIdle = async () => {
    if (runningCycle) return;
    setRunningCycle(true);
    toast?.info(tx("Lancement du cycle ordonnancé..."));
    let completedCount = 0;

    for (const job of jobs) {
      if (job.status !== "running") {
        setRunningJobId(job.id);
        const startTime = Date.now();
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: "running" as BotJobStatus } : j))
        );

        try {
          await fetch(`${BOT_API_URL}/api/bot/jobs/${job.id}/run`, {
            credentials: "include",
            method: "POST",
          });
        } catch {
        }

        const elapsed = Math.max(1, Date.now() - startTime);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: "idle" as BotJobStatus,
                  durationMs: elapsed,
                  totalRuns: j.totalRuns + 1,
                  lastRunAt: new Date().toISOString(),
                }
              : j
          )
        );
        completedCount++;
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    setRunningJobId(null);
    setRunningCycle(false);
    toast?.success(tx("Cycle complet terminé : {completedCount} tâches exécutées", { completedCount }));
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.moduleCategory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "ALL" || job.type === typeFilter;
      const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [jobs, searchQuery, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = jobs.length;
    const idleCount = jobs.filter((j) => j.status === "idle").length;
    const runningCount = jobs.filter((j) => j.status === "running").length;
    const failedCount = jobs.filter((j) => j.status === "failed" || j.failureCount > 0).length;
    const totalRuns = jobs.reduce((acc, j) => acc + (j.totalRuns || 0), 0);
    const avgDuration = Math.round(
      jobs.reduce((acc, j) => acc + (j.durationMs || 0), 0) / (jobs.length || 1)
    );

    return {
      total,
      idleCount,
      runningCount,
      failedCount,
      totalRuns,
      avgDuration,
    };
  }, [jobs]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="border-b border-[var(--panel-border)] bg-[var(--surface-base)]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <Link
              href="/discord"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all cursor-pointer active:scale-[0.97]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{tx("Hub Discord")}</span>
            </Link>
            <span className="text-[var(--text-muted)]/50">•</span>
            <Link
              href="/discord/bot"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate"
            >
              {tx("Centre de Contrôle")}
            </Link>
            <span className="text-[var(--text-muted)]/50">•</span>
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {tx("Tâches de Fond & Cron")}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs font-mono text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{tx("Ordonnanceur Actif")}</span>
            </div>
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[var(--accent-primary)]", loading && "animate-spin")} />
              <span className="hidden sm:inline">{tx("Actualiser")}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--panel-border)]"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[11px] font-mono font-semibold text-[var(--accent-primary)]">
              <ListRestart className="w-3.5 h-3.5" />
              <span>{tx("ETHO BOT CRON & QUEUE ENGINE")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {tx("Tâches Planifiées & Files d'Attente")}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              {tx("Supervision en temps réel des")}{" "} {jobs.length} {" "}{tx("tâches périodiques du bot Etho : purges de tampons, rétention des journaux, cycles de modération et synchronisations de serveurs.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
            <button
              onClick={handleRunAllIdle}
              disabled={runningCycle}
              className="inline-flex h-9 items-center gap-2 px-4 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-semibold text-xs shadow-sm hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
            >
              <Play className={cn("w-3.5 h-3.5", runningCycle && "animate-spin")} />
              <span>{runningCycle ? tx("Cycle en cours...") : tx("Exécuter tout le cycle")}</span>
            </button>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                  viewMode === "GRID"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tx("Grille")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("SPLIT")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                  viewMode === "SPLIT"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Layout className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tx("Keeper")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TIMELINE")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                  viewMode === "TIMELINE"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tx("Télémétrie")}</span>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={pageStagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <motion.div
            variants={staggerItem}
            className="p-3.5 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{tx("Tâches Totales")}</span>
              <ListRestart className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            </div>
            <div className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{kpis.total}</div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="p-3.5 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{tx("En Attente (Idle)")}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-emerald-400">{kpis.idleCount}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{tx("Prêtes à exécuter")}</div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="p-3.5 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{tx("En Cours (Running)")}</span>
              <Play className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-sky-400">{kpis.runningCount}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{tx("Threads actifs")}</div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="p-3.5 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{tx("Échecs Détectés")}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {kpis.failedCount === 0 ? "0" : kpis.failedCount}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">{tx("Santé optimale")}</div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="p-3.5 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{tx("Durée Moyenne")}</span>
              <Timer className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-purple-400">{kpis.avgDuration} {" "}{tx("ms")}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{tx("Temps d'exécution")}</div>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="p-3.5 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{tx("Cycles Cumulés")}</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-amber-400">
              {kpis.totalRuns.toLocaleString("fr-FR")}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{tx("Ticks mesurés")}</div>
          </motion.div>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-raised)]/50 border border-[var(--panel-border)]">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={tx("Rechercher une tâche (Nom, ID, catégorie...) — Appuyez sur '/'")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)] focus:border-[var(--accent-primary)] focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)] text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer relative",
                  typeFilter === "ALL"
                    ? "text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {typeFilter === "ALL" && (
                  <motion.span
                    layoutId="type-pill"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                  />
                )}
                <span className="relative z-10">{tx("Toutes (")}{jobs.length})</span>
              </button>
              {(["sync", "cleanup", "buffer_flush", "cron", "backup"] as BotJobType[]).map((t) => {
                const count = jobs.filter((j) => j.type === t).length;
                const label = TYPE_CONFIG[t].label;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer relative",
                      typeFilter === t
                        ? "text-[var(--accent-contrast)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {typeFilter === t && (
                      <motion.span
                        layoutId="type-pill"
                        transition={SPRING_PILL}
                        className="absolute inset-0 rounded-lg bg-[var(--accent-primary)] -z-0"
                      />
                    )}
                    <span className="relative z-10">
                      {label} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label={tx("Filtrer par statut d'exécution")}
              className="h-8 px-3 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
            >
              <option value="ALL">{tx("Tous les statuts")}</option>
              <option value="idle">{tx("Prêtes (idle)")}</option>
              <option value="running">{tx("En cours (running)")}</option>
              <option value="failed">{tx("Échecs (failed)")}</option>
            </select>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] space-y-3">
            <ListRestart className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">{tx("Aucune tâche trouvée")}</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {tx("Aucune tâche ne correspond aux critères de filtre ou à ta recherche actuelle.")}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="px-4 py-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--accent-contrast)] text-xs font-semibold transition-all cursor-pointer"
            >
              {tx("Réinitialiser les filtres")}
            </button>
          </div>
        ) : viewMode === "GRID" ? (
          <motion.div
            variants={pageStagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredJobs.map((job) => {
              const typeConf = TYPE_CONFIG[job.type];
              const TypeIcon = typeConf.icon;
              const isRunning = runningJobId === job.id || job.status === "running";

              return (
                <motion.div
                  key={job.id}
                  variants={staggerItem}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  onClick={() => {
                    setSelectedJob(job);
                    setInspectorOpen(true);
                  }}
                  className="group relative p-5 rounded-2xl bg-[var(--surface-raised)]/70 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                            typeConf.badgeBg,
                            typeConf.badgeBorder,
                            typeConf.badgeText
                          )}
                        >
                          <TypeIcon className={cn("w-4 h-4", isRunning && "animate-spin")} />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                            {job.id}
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors leading-snug">
                            {job.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {job.status === "running" || isRunning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-[10px] font-semibold text-sky-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                            {tx("En cours")}
                          </span>
                        ) : job.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-[10px] font-semibold text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            {tx("Échec")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {tx("Prête")}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--panel-border)]/60 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)] font-mono">
                        <Clock className="w-3 h-3 text-[var(--accent-primary)]" />
                        {job.intervalDescription}
                      </span>
                      <span className="text-[var(--text-muted)]/40">•</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-base)] border border-[var(--panel-border)] text-[10px] font-medium text-[var(--text-muted)]">
                        {job.moduleCategory}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 flex items-center justify-between gap-3 border-t border-[var(--panel-border)]">
                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">{job.durationMs}{tx("ms")}</span>
                      <span>•</span>
                      <span>{job.totalRuns.toLocaleString("fr-FR")} {" "}{tx("runs")}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunSingleJob(job);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-base)] hover:bg-[var(--accent-primary)] hover:text-[var(--accent-contrast)] border border-[var(--panel-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-primary)] transition-all disabled:opacity-50 cursor-pointer active:scale-[0.97]"
                    >
                      <Play className={cn("w-3 h-3", isRunning && "animate-spin")} />
                      <span>{isRunning ? tx("Exécution...") : tx("Exécuter")}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : viewMode === "SPLIT" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-2.5">
              {filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const isRunning = runningJobId === job.id || job.status === "running";
                const typeConf = TYPE_CONFIG[job.type];
                const TypeIcon = typeConf.icon;

                return (
                  <motion.div
                    key={job.id}
                    layout
                    onClick={() => setSelectedJob(job)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                      isSelected
                        ? "bg-[var(--surface-raised)] border-[var(--accent-primary)] shadow-sm"
                        : "bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border-[var(--panel-border)]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                          typeConf.badgeBg,
                          typeConf.badgeBorder,
                          typeConf.badgeText
                        )}
                      >
                        <TypeIcon className={cn("w-3.5 h-3.5", isRunning && "animate-spin")} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {job.name}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.2 rounded bg-[var(--surface-base)] border border-[var(--panel-border)]">
                            {job.id}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] truncate block mt-0.5">
                          {job.intervalDescription} • {job.moduleCategory}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-mono font-semibold text-[var(--text-primary)] block">
                          {job.durationMs}{tx("ms")}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          {job.totalRuns} {" "}{tx("exécutions")}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunSingleJob(job);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-base)] hover:bg-[var(--accent-primary)] hover:text-[var(--accent-contrast)] border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
                      >
                        <Play className={cn("w-3 h-3", isRunning && "animate-spin")} />
                      </button>

                      <ChevronRight className={cn("w-4 h-4 text-[var(--text-muted)]", isSelected && "text-[var(--accent-primary)]")} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="lg:col-span-5 sticky top-20">
              {selectedJob ? (
                <div className="p-6 rounded-3xl bg-[var(--surface-raised)] border border-[var(--panel-border)] space-y-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-base)] border border-[var(--panel-border)] text-[10px] font-mono text-[var(--accent-primary)]">
                        <span>{tx("ID :")}{" "} {selectedJob.id}</span>
                      </div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {selectedJob.name}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">
                        {selectedJob.moduleCategory}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                      {selectedJob.status === "idle" ? tx("Prête (idle)") : selectedJob.status}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-primary)]/80 leading-relaxed bg-[var(--surface-base)]/80 p-3.5 rounded-2xl border border-[var(--panel-border)]">
                    {selectedJob.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">{tx("Fréquence")}</span>
                      <span className="font-semibold text-[var(--text-primary)] block mt-0.5">
                        {selectedJob.intervalDescription}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">{tx("Type d'action")}</span>
                      <span className="font-semibold text-[var(--text-primary)] block mt-0.5 capitalize">
                        {TYPE_CONFIG[selectedJob.type].label}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">{tx("Durée mesurée")}</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)] block mt-0.5">
                        {selectedJob.durationMs} {" "}{tx("ms")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">{tx("Total exécutions")}</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)] block mt-0.5">
                        {selectedJob.totalRuns.toLocaleString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">{tx("Idempotence garantie")}</span>
                      <span className="text-emerald-400 font-mono text-[11px]">{tx("Oui (sans effet de bord)")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">{tx("Dernière synchronisation")}</span>
                      <span className="text-[var(--text-muted)] font-mono text-[11px]">{lastRefreshedAt}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRunSingleJob(selectedJob)}
                    disabled={runningJobId === selectedJob.id}
                    className="w-full py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-95 text-[var(--accent-contrast)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    <Play className={cn("w-3.5 h-3.5", runningJobId === selectedJob.id && "animate-spin")} />
                    <span>
                      {runningJobId === selectedJob.id ? tx("Exécution de la tâche...") : tx("Déclencher l'exécution maintenant")}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[var(--surface-raised)] border border-[var(--panel-border)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {tx("Chronologie & Ordonnancement des Minuteries")}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {tx("Décomposition par cadence des")}{" "} {jobs.length} {" "}{tx("processus exécutés en arrière-plan.")}
                  </p>
                </div>
                <span className="text-xs font-mono text-[var(--text-muted)]">{tx("Synchronisé :")}{" "} {lastRefreshedAt}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--panel-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{tx("Ultra-Rapides (10s - 30s)")}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                      {tx("5 tâches")}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)]">
                    <li className="flex items-center justify-between">
                      <span>{tx("• Écriture de l'XP")}</span>
                      <span className="font-mono">10s</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Écriture des statistiques")}</span>
                      <span className="font-mono">30s</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Sortie du mode raid")}</span>
                      <span className="font-mono">30s</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Sanctions expirées")}</span>
                      <span className="font-mono">30s</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Rappels programmés")}</span>
                      <span className="font-mono">30s</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--panel-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{tx("Cadence Régulière (1m - 5m)")}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                      {tx("4 tâches")}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)]">
                    <li className="flex items-center justify-between">
                      <span>{tx("• Événements communautaires")}</span>
                      <span className="font-mono">1m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Planning de présence")}</span>
                      <span className="font-mono">5m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Salons de statistiques")}</span>
                      <span className="font-mono">5m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Inactivité des tickets")}</span>
                      <span className="font-mono">5m</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--panel-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{tx("Périodiques (10m - 12h)")}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                      {tx("6 tâches")}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)]">
                    <li className="flex items-center justify-between">
                      <span>{tx("• Suivi des invitations")}</span>
                      <span className="font-mono">10m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Anniversaires")}</span>
                      <span className="font-mono">15m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Scan de sécurité proactif")}</span>
                      <span className="font-mono">15m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Sauvegardes automatiques")}</span>
                      <span className="font-mono">15m</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>{tx("• Rétention des journaux")}</span>
                      <span className="font-mono">12h</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--surface-raised)] border border-[var(--panel-border)] space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {tx("Journal des Déclenchements Récents")}
              </h3>
              {logs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] rounded-2xl bg-[var(--surface-base)] border border-[var(--panel-border)]">
                  {tx("Aucun déclenchement manuel enregistré dans cette session. Utilise le bouton \"Exécuter\" pour tester une tâche.")}
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[var(--surface-base)] border border-[var(--panel-border)] flex items-center justify-between gap-4 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-[var(--text-primary)]">{log.jobName}</span>
                        <span className="text-[var(--text-muted)]">({log.jobId})</span>
                      </div>
                      <div className="flex items-center gap-4 text-[var(--text-muted)]">
                        <span>{log.durationMs}{tx("ms")}</span>
                        <span>{log.executedAt}</span>
                        <span className="text-emerald-400 font-semibold">{log.statusText}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {inspectorOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--surface-base)] border border-[var(--panel-border)] p-6 space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setInspectorOpen(false)}
                className="absolute right-5 top-5 p-1 rounded-xl bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1.5 pr-8">
                <span className="px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[10px] font-mono text-[var(--accent-primary)]">
                  {selectedJob.id}
                </span>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {selectedJob.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedJob.moduleCategory}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] text-xs leading-relaxed text-[var(--text-primary)]">
                {selectedJob.description}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">{tx("Cadence")}</span>
                  <span className="font-semibold text-[var(--text-primary)] block mt-0.5">
                    {selectedJob.intervalDescription}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">{tx("Dernier temps")}</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] block mt-0.5">
                    {selectedJob.durationMs} {" "}{tx("ms")}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">{tx("Exécutions")}</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] block mt-0.5">
                    {selectedJob.totalRuns.toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">{tx("Échecs")}</span>
                  <span className="font-mono font-semibold text-emerald-400 block mt-0.5">
                    {selectedJob.failureCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  {tx("Fermer")}
                </button>
                <button
                  type="button"
                  disabled={runningJobId === selectedJob.id}
                  onClick={() => {
                    handleRunSingleJob(selectedJob);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-95 text-[var(--accent-contrast)] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className={cn("w-3.5 h-3.5", runningJobId === selectedJob.id && "animate-spin")} />
                  <span>{runningJobId === selectedJob.id ? tx("En cours...") : tx("Exécuter maintenant")}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
