"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  ShieldCheck,
  Plus,
  Search,
  RotateCcw,
  GitCompare,
  Trash2,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Settings,
  X,
  RefreshCw,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors discord-bot/src/modules/backup/types/index.ts (BackupSnapshot minus `data`).
type BackupType = "FULL" | "PARTIAL" | "PRE_CHANGE" | "ROLLBACK";
type BackupStatus = "COMPLETED" | "IN_PROGRESS" | "FAILED" | "CORRUPTED";
type SafetyLevel = "SAFE" | "STANDARD" | "DESTRUCTIVE";
type BackupComponent = "ROLES" | "CATEGORIES" | "CHANNELS" | "PERMISSIONS" | "SERVER_CONFIG" | "EMOJIS" | "ETHONE_CONFIG";

interface BackupItem {
  backupId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: { tag: string; id: string };
  type: BackupType;
  status: BackupStatus;
  isProtected: boolean;
  sizeBytes: number;
  checksum: string;
  includedComponents: BackupComponent[];
  objectCounts: { categories: number; channels: number; roles: number; permissions: number; emojis: number; ethoneModules: number };
}

interface BackupKpis {
  totalBackups: number;
  lastBackupAt: string | null;
  storageUsedBytes: number;
  scheduledEnabled: boolean;
  frequency: string;
  protectedCount: number;
  healthStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  nextScheduledAt: string | null;
  verifiedCount: number;
}

interface RestorePlan {
  counts: { willCreate: number; willModify: number; willDelete: number; willSkip: number };
  actions: { action: string; type: string; name: string; reason?: string }[];
}

interface RestoreJob {
  jobId: string;
  status: string;
  currentStep: string;
  progressPercent: number;
  errors: string[];
}

interface TestResult {
  valid: boolean;
  checksum: string;
  schemaVersion: number;
  readiness: "READY" | "WARNING" | "CORRUPTED";
  notes: string[];
  objectCounts: BackupItem["objectCounts"];
}

const EMPTY_KPIS: BackupKpis = {
  totalBackups: 0, lastBackupAt: null, storageUsedBytes: 0, scheduledEnabled: false, frequency: "daily", protectedCount: 0, healthStatus: "WARNING", nextScheduledAt: null, verifiedCount: 0,
};

const DEMO_BACKUPS: BackupItem[] = [];

const FREQ_LABEL: Record<string, string> = { "6h": "Toutes les 6h", "12h": "Toutes les 12h", daily: "Quotidien", weekly: "Hebdomadaire" };

function relative(iso: string | null): string {
  if (!iso) return "Jamais";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.round(h / 24)} j`;
}

export default function BackupsCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = useResolvedGuildId(rawGuildId, profile?.guilds);
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/backups`;
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(currentGuildId);
  const guildQuery = activeGuild ? `?guildId=${activeGuild.id}` : "";

  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>(DEMO_BACKUPS);
  const [kpis, setKpis] = useState<BackupKpis>(EMPTY_KPIS);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedBackupForAction, setSelectedBackupForAction] = useState<BackupItem | null>(null);

  // Create wizard
  const [backupName, setBackupName] = useState("");
  const [backupDesc, setBackupDesc] = useState("");
  const [backupProtect, setBackupProtect] = useState(false);
  const [included, setIncluded] = useState<Record<BackupComponent, boolean>>({
    ROLES: true, CATEGORIES: true, CHANNELS: true, PERMISSIONS: true, SERVER_CONFIG: true, EMOJIS: true, ETHONE_CONFIG: true,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Restore wizard
  const [restoreLevel, setRestoreLevel] = useState<SafetyLevel>("SAFE");
  const [confirmServerName, setConfirmServerName] = useState("");
  const [restorePlan, setRestorePlan] = useState<RestorePlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [restoreJob, setRestoreJob] = useState<RestoreJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Test modal
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const computeKpis = useCallback((list: BackupItem[]): BackupKpis => ({
    totalBackups: list.length,
    lastBackupAt: list[0]?.createdAt || null,
    storageUsedBytes: list.reduce((a, b) => a + b.sizeBytes, 0),
    scheduledEnabled: false,
    frequency: "daily",
    protectedCount: list.filter((b) => b.isProtected).length,
    healthStatus: list.length > 0 ? "HEALTHY" : "WARNING",
    nextScheduledAt: null,
    verifiedCount: list.filter((b) => b.status === "COMPLETED").length,
  }), []);

  const load = useCallback(async () => {
    if (!isRealGuild) {
      setIsDemo(true);
      setKpis(computeKpis(DEMO_BACKUPS));
      return;
    }
    setLoading(true);
    try {
      const [listRes, overviewRes] = await Promise.all([
        fetch(base, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
      ]);
      const listData = await listRes.json().catch(() => null);
      const overviewData = await overviewRes.json().catch(() => null);
      if (!listRes.ok || !Array.isArray(listData?.backups)) {
        setIsDemo(true);
        return;
      }
      setIsDemo(false);
      setBackups(listData.backups);
      setKpis(overviewRes.ok && overviewData?.kpis ? overviewData.kpis : computeKpis(listData.backups));
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, isRealGuild, computeKpis]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleToggleProtect = async (bkp: BackupItem) => {
    const next = !bkp.isProtected;
    setBackups((prev) => prev.map((b) => (b.backupId === bkp.backupId ? { ...b, isProtected: next } : b)));
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/${bkp.backupId}/protect`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ isProtected: next }),
      });
      if (!res.ok) throw new Error();
      success(next ? "Snapshot protégé." : "Protection retirée.");
    } catch {
      setBackups((prev) => prev.map((b) => (b.backupId === bkp.backupId ? { ...b, isProtected: !next } : b)));
      toastError("Échec du changement de protection.");
    }
  };

  const handleDelete = async (bkp: BackupItem) => {
    if (bkp.isProtected) {
      toastError("Impossible de supprimer une sauvegarde protégée. Retirez la protection d'abord.");
      return;
    }
    if (!confirm(`Supprimer définitivement le snapshot « ${bkp.name} » ?`)) return;
    if (isDemo) {
      setBackups((prev) => prev.filter((b) => b.backupId !== bkp.backupId));
      return;
    }
    try {
      const res = await fetch(`${base}/${bkp.backupId}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      setBackups((prev) => prev.filter((b) => b.backupId !== bkp.backupId));
      success("Sauvegarde supprimée.");
      load();
    } catch (e: any) {
      toastError(e?.message || "Échec de la suppression.");
    }
  };

  const handleStartCreateWizard = () => {
    setBackupName(`Snapshot manuel — ${new Date().toLocaleDateString("fr-FR")}`);
    setBackupDesc("Sauvegarde manuelle déclenchée depuis le dashboard");
    setBackupProtect(false);
    setIsCreating(false);
    setShowCreateModal(true);
  };

  const handleExecuteCreate = async () => {
    const includedComponents = (Object.keys(included) as BackupComponent[]).filter((k) => included[k]);
    if (includedComponents.length === 0) {
      toastError("Sélectionne au moins un composant.");
      return;
    }
    const type: BackupType = includedComponents.length === 7 ? "FULL" : "PARTIAL";
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch(base, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", "x-idempotency-key": `backup-${Date.now()}` },
        body: JSON.stringify({ name: backupName, description: backupDesc, type, isProtected: backupProtect, includedComponents }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.backupId) throw new Error(data?.error || "create failed");
      setShowCreateModal(false);
      success(`Snapshot « ${data.name} » créé (${(data.sizeBytes / 1024).toFixed(0)} Ko).`);
      load();
    } catch (e: any) {
      toastError(e?.message || "Échec de la création de la sauvegarde.");
    } finally {
      setIsCreating(false);
    }
  };

  const fetchPlan = useCallback(async (bkp: BackupItem, level: SafetyLevel) => {
    if (isDemo) {
      setRestorePlan({ counts: { willCreate: 2, willModify: 4, willDelete: level === "DESTRUCTIVE" ? 1 : 0, willSkip: 2 }, actions: [] });
      return;
    }
    setPlanLoading(true);
    try {
      const res = await fetch(`${base}/${bkp.backupId}/preview-restore`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ safetyLevel: level, mode: "FULL", selectedComponents: bkp.includedComponents }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.counts) throw new Error(data?.error);
      setRestorePlan(data);
    } catch (e: any) {
      setRestorePlan(null);
      toastError(e?.message || "Impossible de prévisualiser la restauration.");
    } finally {
      setPlanLoading(false);
    }
  }, [base, isDemo, toastError]);

  const handleOpenRestore = (bkp: BackupItem) => {
    setSelectedBackupForAction(bkp);
    setRestoreLevel("SAFE");
    setConfirmServerName("");
    setRestoreJob(null);
    setRestorePlan(null);
    setShowRestoreModal(true);
    fetchPlan(bkp, "SAFE");
  };

  const changeRestoreLevel = (level: SafetyLevel) => {
    setRestoreLevel(level);
    if (selectedBackupForAction) fetchPlan(selectedBackupForAction, level);
  };

  const pollJob = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${base}/jobs/${jobId}`, { credentials: "include" });
        const job = await res.json().catch(() => null);
        if (!res.ok || !job?.jobId) return;
        setRestoreJob(job);
        if (["COMPLETED", "PARTIAL", "FAILED", "ROLLED_BACK"].includes(job.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          if (job.status === "COMPLETED") success("Restauration terminée.");
          else toastError(`Restauration : ${job.status} — ${job.errors?.[0] || "voir les logs"}`);
          load();
        }
      } catch { /* retry next tick */ }
    }, 1500);
  };

  const handleExecuteRestore = async () => {
    const bkp = selectedBackupForAction;
    if (!bkp) return;
    if (restoreLevel === "DESTRUCTIVE" && activeGuild && confirmServerName !== activeGuild.name) {
      toastError(`Saisis le nom exact du serveur « ${activeGuild.name} » pour confirmer.`);
      return;
    }
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${base}/${bkp.backupId}/restore`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json", "x-idempotency-key": `restore-${bkp.backupId}-${Date.now()}` },
        body: JSON.stringify({ safetyLevel: restoreLevel, mode: "FULL", selectedComponents: bkp.includedComponents, confirmServerName }),
      });
      const job = await res.json().catch(() => null);
      if (!res.ok || !job?.jobId) throw new Error(job?.error || "restore failed");
      setRestoreJob(job);
      pollJob(job.jobId);
    } catch (e: any) {
      toastError(e?.message || "Échec du lancement de la restauration.");
    }
  };

  const openTest = async (bkp: BackupItem) => {
    setSelectedBackupForAction(bkp);
    setTestResult(null);
    setShowTestModal(true);
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setTestLoading(true);
    try {
      const res = await fetch(`${base}/${bkp.backupId}/test`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.valid !== "boolean") throw new Error(data?.error);
      setTestResult(data);
    } catch (e: any) {
      toastError(e?.message || "Échec du test d'intégrité.");
      setShowTestModal(false);
    } finally {
      setTestLoading(false);
    }
  };

  const filteredBackups = backups.filter((b) => {
    if (selectedType === "PROTECTED" && !b.isProtected) return false;
    if (selectedType !== "ALL" && selectedType !== "PROTECTED" && b.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.backupId.toLowerCase().includes(q) || b.createdBy.tag.toLowerCase().includes(q);
    }
    return true;
  });

  const totalObjects = (b: BackupItem) => b.objectCounts.channels + b.objectCounts.roles + b.objectCounts.categories;
  const healthy = kpis.healthStatus === "HEALTHY";

  const TYPE_BADGE: Record<BackupType, string> = {
    FULL: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    PARTIAL: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    PRE_CHANGE: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    ROLLBACK: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8 pb-44 md:pb-44">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${guildQuery}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Sauvegardes & Disaster Recovery</h1>
                <p className="text-xs text-neutral-400">
                  Snapshots signés SHA-256 de la structure Discord et des modules ETHONE.
                  {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={load} disabled={loading} className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4 text-indigo-400", loading && "animate-spin")} />
              Actualiser
            </button>
            <Link href={`/discord/backups/compare${guildQuery}`} className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors">
              <GitCompare className="w-4 h-4 text-indigo-400" />
              Comparer
            </Link>
            <Link href={`/discord/backups/settings${guildQuery}`} className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors">
              <Settings className="w-4 h-4 text-neutral-400" />
              Paramètres
            </Link>
            <button onClick={handleStartCreateWizard} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              Créer une Sauvegarde
            </button>
          </div>
        </div>

        {/* KPI réels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total sauvegardes", value: String(kpis.totalBackups), cls: "text-white", sub: `${kpis.verifiedCount} vérifiée(s)` },
            { label: "Dernière sauvegarde", value: relative(kpis.lastBackupAt), cls: "text-emerald-400", sub: kpis.lastBackupAt ? new Date(kpis.lastBackupAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Aucune" },
            { label: "Stockage utilisé", value: `${(kpis.storageUsedBytes / 1024 / 1024).toFixed(2)} MB`, cls: "text-indigo-400", sub: "Fichiers JSON signés" },
            { label: "Planification", value: kpis.scheduledEnabled ? FREQ_LABEL[kpis.frequency] || kpis.frequency : "Désactivée", cls: "text-amber-400", sub: kpis.nextScheduledAt ? `Prochaine : ${new Date(kpis.nextScheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : "Aucune auto-sauvegarde" },
            { label: "Snapshots protégés", value: String(kpis.protectedCount), cls: "text-rose-400", sub: "Exclus de la rétention" },
            { label: "Santé DR", value: healthy ? "Protégé" : kpis.healthStatus === "WARNING" ? "À surveiller" : "Critique", cls: healthy ? "text-emerald-400" : kpis.healthStatus === "WARNING" ? "text-amber-400" : "text-rose-400", sub: healthy ? "Snapshot récent valide" : "Crée une sauvegarde" },
          ].map((k) => (
            <div key={k.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-neutral-500 font-medium">{k.label}</span>
              <p className={cn("text-xl font-bold truncate", k.cls)}>{k.value}</p>
              <span className="text-[11px] text-neutral-400 block truncate">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* Bandeau santé */}
        <div className={cn("border border-neutral-800 rounded-2xl p-6 relative overflow-hidden bg-gradient-to-r via-neutral-900", healthy ? "from-indigo-950/40 to-emerald-950/40" : "from-amber-950/40 to-rose-950/30")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0", healthy ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400")}>
                {healthy ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{healthy ? "Ton serveur Discord est protégé" : "Aucune sauvegarde récente"}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {healthy
                    ? `Dernier snapshot ${relative(kpis.lastBackupAt).toLowerCase()}, signé SHA-256.${kpis.scheduledEnabled ? " Auto-sauvegarde active." : " Active la planification dans les paramètres."}`
                    : "Crée un snapshot maintenant pour pouvoir restaurer salons, rôles et configuration ETHONE en cas d'incident."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {backups[0] && (
                <button onClick={() => openTest(backups[0])} className="px-3.5 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer">
                  Tester intégrité
                </button>
              )}
              <button onClick={handleStartCreateWizard} className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer">
                Sauvegarder maintenant
              </button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Rechercher par nom, ID ou créateur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Toutes" }, { id: "FULL", label: "Complètes" }, { id: "PARTIAL", label: "Partielles" },
              { id: "PRE_CHANGE", label: "Pre-Change" }, { id: "ROLLBACK", label: "Rollback" }, { id: "PROTECTED", label: "🔒 Protégées" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setSelectedType(tab.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer", selectedType === tab.id ? "bg-indigo-600 text-white" : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white")}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Sauvegarde</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Objets</th>
                  <th className="px-4 py-3.5">Taille</th>
                  <th className="px-4 py-3.5">Créateur & Date</th>
                  <th className="px-4 py-3.5">Statut</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredBackups.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-neutral-500">Aucune sauvegarde pour ce filtre.</td></tr>
                )}
                {filteredBackups.map((bkp) => (
                  <tr key={bkp.backupId} className="hover:bg-neutral-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Link href={`/discord/backups/${bkp.backupId}${guildQuery}`} className="font-semibold text-white hover:text-indigo-400 transition-colors text-sm">{bkp.name}</Link>
                          {bkp.isProtected && <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Protégé"><Lock className="w-3 h-3" /></span>}
                        </div>
                        <p className="font-mono text-[11px] text-neutral-500">{bkp.backupId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", TYPE_BADGE[bkp.type])}>{bkp.type.replace("_", "-")}</span>
                    </td>
                    <td className="px-4 py-4 text-neutral-300">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">{bkp.objectCounts.channels} salons</span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">{bkp.objectCounts.roles} rôles</span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">{bkp.objectCounts.ethoneModules} modules</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-neutral-400">{(bkp.sizeBytes / 1024).toFixed(0)} Ko</td>
                    <td className="px-4 py-4">
                      <span className="text-neutral-300 font-medium block">{bkp.createdBy.tag}</span>
                      <span className="text-neutral-500 text-[11px]">{new Date(bkp.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </td>
                    <td className="px-4 py-4">
                      {bkp.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Vérifié</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertTriangle className="w-3 h-3" /> {bkp.status}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/discord/backups/${bkp.backupId}${guildQuery}`} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors" title="Inspecter"><Eye className="w-3.5 h-3.5" /></Link>
                        {!isDemo && (
                          <a href={`${base}/${bkp.backupId}/download`} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors" title="Télécharger (.ethone-backup.json)"><Download className="w-3.5 h-3.5" /></a>
                        )}
                        <button onClick={() => handleOpenRestore(bkp)} className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer" title="Restaurer"><RotateCcw className="w-3.5 h-3.5" /></button>
                        <Link href={`/discord/backups/compare?backupA=${bkp.backupId}&backupB=LIVE${activeGuild ? `&guildId=${activeGuild.id}` : ""}`} className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 transition-colors" title="Comparer avec le direct"><GitCompare className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => handleToggleProtect(bkp)} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer" title={bkp.isProtected ? "Retirer protection" : "Protéger"}>
                          {bkp.isProtected ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(bkp)} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: création */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-6 relative">
              <button onClick={() => !isCreating && setShowCreateModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><Archive className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Créer une Sauvegarde</h3>
                  <p className="text-xs text-neutral-400">Le bot capture la structure Discord et les modules ETHONE en temps réel.</p>
                </div>
              </div>
              {!isCreating ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Nom du snapshot</label>
                    <input type="text" value={backupName} onChange={(e) => setBackupName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Description</label>
                    <input type="text" value={backupDesc} onChange={(e) => setBackupDesc(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <label className="text-xs font-semibold text-neutral-300 block">Composants inclus :</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {([
                        ["ROLES", "Rôles & hiérarchie"], ["CATEGORIES", "Catégories"], ["CHANNELS", "Salons texte & vocaux"], ["PERMISSIONS", "Permissions"],
                        ["SERVER_CONFIG", "Configuration serveur"], ["EMOJIS", "Emojis"], ["ETHONE_CONFIG", "Modules ETHONE"],
                      ] as [BackupComponent, string][]).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 cursor-pointer">
                          <input type="checkbox" checked={included[key]} onChange={(e) => setIncluded((prev) => ({ ...prev, [key]: e.target.checked }))} className="rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
                          <span className="text-neutral-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                    <div>
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-amber-400" /> Protéger ce snapshot</span>
                      <p className="text-[11px] text-neutral-400">Exclu de la suppression manuelle et de la rétention automatique.</p>
                    </div>
                    <input type="checkbox" checked={backupProtect} onChange={(e) => setBackupProtect(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-700" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer">Annuler</button>
                    <button onClick={handleExecuteCreate} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer">Lancer la sauvegarde</button>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-4 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse"><Archive className="w-7 h-7" /></div>
                  <p className="text-sm font-bold text-white">Le bot scanne le serveur et signe le snapshot...</p>
                  <p className="text-xs text-neutral-400">Quelques secondes selon la taille du serveur.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: restauration */}
        {showRestoreModal && selectedBackupForAction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-6 relative">
              <button onClick={() => setShowRestoreModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><RotateCcw className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Restaurer le serveur</h3>
                  <p className="text-xs text-neutral-400">Cible : <strong>{selectedBackupForAction.name}</strong></p>
                </div>
              </div>

              {!restoreJob ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-amber-300">Avertissement</p>
                      <p className="text-amber-400/90">La restauration modifie salons, rôles et permissions. Un snapshot ROLLBACK est créé automatiquement avant application.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-300">Niveau de sécurité :</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([
                        ["SAFE", "🛡️ Safe", "Re-crée ce qui manque, ne supprime rien.", "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"],
                        ["STANDARD", "⚖️ Standard", "Synchronise salons et propriétés.", "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"],
                        ["DESTRUCTIVE", "⚠️ Destructif", "Supprime ce qui n'est pas dans le snapshot.", "bg-rose-500/10 border-rose-500/30 text-rose-300"],
                      ] as [SafetyLevel, string, string, string][]).map(([lvl, label, desc, activeCls]) => (
                        <button key={lvl} onClick={() => changeRestoreLevel(lvl)} className={cn("p-3 rounded-xl border text-left transition-colors cursor-pointer", restoreLevel === lvl ? activeCls : "bg-neutral-950 border-neutral-800 text-neutral-400")}>
                          <span className="font-bold text-xs block">{label}</span>
                          <span className="text-[10px] text-neutral-400">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2 text-xs">
                    <span className="font-semibold text-neutral-300 block">Plan calculé par le bot {planLoading && <span className="text-neutral-500">(calcul...)</span>} :</span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        ["Créés", restorePlan?.counts.willCreate, "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"],
                        ["Modifiés", restorePlan?.counts.willModify, "bg-amber-500/10 text-amber-400 border-amber-500/20"],
                        ["Supprimés", restorePlan?.counts.willDelete, "bg-rose-500/10 text-rose-400 border-rose-500/20"],
                        ["Ignorés", restorePlan?.counts.willSkip, "bg-neutral-800 text-neutral-400 border-neutral-800"],
                      ].map(([label, val, cls]) => (
                        <div key={String(label)} className={cn("p-2 rounded border", String(cls))}>
                          <span className="block font-bold">{val ?? "—"}</span>
                          <span className="text-[10px]">{label}</span>
                        </div>
                      ))}
                    </div>
                    {restorePlan && restorePlan.actions.length > 0 && (
                      <div className="max-h-28 overflow-y-auto space-y-0.5 pt-1 border-t border-neutral-800 font-mono text-[10px] text-neutral-400">
                        {restorePlan.actions.slice(0, 40).map((a, i) => (
                          <div key={i}><span className={cn("font-bold", a.action === "DELETE" ? "text-rose-400" : a.action === "CREATE" ? "text-emerald-400" : a.action === "MODIFY" ? "text-amber-400" : "text-neutral-500")}>{a.action}</span> {a.type.toLowerCase()} · {a.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {restoreLevel === "DESTRUCTIVE" && (
                    <div className="space-y-1.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs">
                      <label className="font-bold text-rose-300 block">Confirmation : saisis « {activeGuild?.name || "le nom du serveur"} »</label>
                      <input type="text" value={confirmServerName} onChange={(e) => setConfirmServerName(e.target.value)} placeholder={activeGuild?.name || ""} className="w-full bg-neutral-950 border border-rose-500/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500" />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowRestoreModal(false)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer">Annuler</button>
                    <button onClick={handleExecuteRestore} disabled={planLoading} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50">Confirmer & restaurer</button>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-5 text-center">
                  <div className={cn("w-14 h-14 mx-auto rounded-full border flex items-center justify-center", restoreJob.status === "COMPLETED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : ["FAILED", "ROLLED_BACK"].includes(restoreJob.status) ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-spin")}>
                    {restoreJob.status === "COMPLETED" ? <CheckCircle2 className="w-7 h-7" /> : <RotateCcw className="w-7 h-7" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{restoreJob.currentStep}</p>
                    <p className="text-xs text-neutral-400 font-mono">{restoreJob.status} · {restoreJob.progressPercent}%</p>
                  </div>
                  <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 max-w-md mx-auto">
                    <div className="bg-emerald-600 h-full transition-all duration-300 rounded-full" style={{ width: `${restoreJob.progressPercent}%` }} />
                  </div>
                  {restoreJob.errors?.length > 0 && <p className="text-[11px] text-rose-300 text-left max-h-24 overflow-y-auto">{restoreJob.errors.join("\n")}</p>}
                  {["COMPLETED", "PARTIAL", "FAILED", "ROLLED_BACK"].includes(restoreJob.status) && (
                    <button onClick={() => setShowRestoreModal(false)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer">Fermer</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: test intégrité */}
        {showTestModal && selectedBackupForAction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 relative">
              <button onClick={() => setShowTestModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><ShieldCheck className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-base font-bold text-white">Test d'intégrité</h3>
                  <p className="text-xs text-neutral-400">Dry-run sans impact sur le serveur</p>
                </div>
              </div>
              {testLoading && <p className="text-xs text-neutral-400">Vérification de la signature...</p>}
              {testResult && (
                <div className="space-y-3 text-xs">
                  <div className={cn("p-3 border rounded-xl space-y-1", testResult.valid ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20")}>
                    <span className={cn("font-bold flex items-center gap-1.5", testResult.valid ? "text-emerald-400" : "text-rose-400")}>
                      {testResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {testResult.readiness}
                    </span>
                    {testResult.notes.map((n, i) => <p key={i} className="text-neutral-300">{n}</p>)}
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-400 space-y-1">
                    <p>ID : {selectedBackupForAction.backupId}</p>
                    <p className="truncate">SHA-256 : {testResult.checksum}</p>
                    <p>Schéma v{testResult.schemaVersion} · {testResult.objectCounts.channels} salons, {testResult.objectCounts.roles} rôles, {testResult.objectCounts.ethoneModules} modules</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
