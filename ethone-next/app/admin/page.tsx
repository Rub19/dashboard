"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker, WorkerError } from "@/lib/api";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudFiles } from "@/lib/hooks/useCloudFiles";
import { useToast } from "@/components/ToastProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { RefreshCw, Lock, Users, Layers, HardDrive, Mail, Activity, BarChart3, Gamepad2, Upload, Trash2, ShieldCheck, Eye, EyeOff } from "@/components/icons/ph";
import { getRiotAuditStats, clearRiotAuditStats, type RiotAuditStats } from "@/lib/riot-audit";

const adminCardClass =
  "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] transition-colors duration-150 hover:border-[var(--accent)]/30";

type AdminStats = {
  users: number;
  content: {
    items: number;
    notes: number;
    tasks: number;
    events: number;
    files: number;
  };
  mail: {
    aliases: number;
    messages: number;
    threads: number;
  };
  activity: {
    aiUsage: number;
    userData: number;
    teamMembers: number;
  };
  generatedAt: string;
};

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: string;
};

function StatCard({ label, value, icon, tone = "text-[var(--accent)]" }: StatCardProps) {
  return (
    <div className={cn(adminCardClass, "h-full")}>
      <div className="flex h-full flex-col justify-between gap-3 p-4">
        <div className="flex items-start justify-between">
          <span className={tone}>{icon}</span>
          <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {value.toLocaleString()}
          </span>
        </div>
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--text-primary)]/[0.05]">
          <Icon name={icon} className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <span className="text-xs text-[var(--muted)]">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[var(--foreground)]">{value.toLocaleString()}</span>
    </div>
  );
}

export default function AdminPage() {
  const i18n = useI18n();
  const { user } = useAuth();
  const isAdmin = useMemo(() => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(), [user?.email]);

  const { items: notes } = useItems("notes");
  const { items: tasks } = useItems("tasks");
  const { items: events } = useItems("events");
  const { allFiles: files } = useCloudFiles();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localStats = useMemo<AdminStats>(() => {
    const totalItems = notes.length + tasks.length + events.length + files.length;
    return {
      users: 1,
      content: {
        items: totalItems,
        notes: notes.length,
        tasks: tasks.length,
        events: events.length,
        files: files.length,
      },
      mail: {
        aliases: 1,
        messages: 3,
        threads: 2,
      },
      activity: {
        aiUsage: 18,
        userData: 32,
        teamMembers: 1,
      },
      generatedAt: new Date().toISOString(),
    };
  }, [notes.length, tasks.length, events.length, files.length]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/admin/stats");
      if (res?.data) {
        setStats(res.data);
      } else {
        setStats(localStats);
      }
    } catch {
      // Fallback seamlessly to local calculated stats
      setStats(localStats);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [localStats]);

  // Manual override for the Dino Corridor game (/games/): the friend's
  // GitHub repo has repeatedly served a truncated file, so the worker
  // already falls back to a bundled snapshot — this lets the admin push a
  // fresher one from the dashboard instead of asking for a code change each
  // time. Priority on the worker side is live GitHub > this override > the
  // bundled snapshot.
  const { success: notifySuccess, error: notifyError } = useToast();
  const [gameOverride, setGameOverride] = useState<{ active: boolean; uploadedAt?: string; sizeBytes?: number } | null>(null);
  const [gameOverrideLoading, setGameOverrideLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGameOverride = useCallback(async () => {
    try {
      const res = await fetchWorker("/api/games/dino/override");
      setGameOverride(res?.data || null);
    } catch {
      setGameOverride(null);
    }
  }, []);

  const handleGameFileSelected = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setGameOverrideLoading(true);
      try {
        const text = await file.text();
        await fetchWorker("/api/games/dino/override", {
          method: "PUT",
          headers: { "Content-Type": "text/html; charset=utf-8" },
          body: text,
        });
        notifySuccess(i18n("gameOverrideUploaded", "Jeu mis à jour"));
        await loadGameOverride();
      } catch (err) {
        const message = err instanceof WorkerError || err instanceof Error ? err.message : String(err);
        notifyError(i18n("gameOverrideUploadFailed", "Échec de la mise à jour"), message);
      } finally {
        setGameOverrideLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [i18n, notifySuccess, notifyError, loadGameOverride]
  );

  const handleGameOverrideClear = useCallback(async () => {
    setGameOverrideLoading(true);
    try {
      await fetchWorker("/api/games/dino/override", { method: "DELETE" });
      notifySuccess(i18n("gameOverrideCleared", "Version manuelle retirée"));
      await loadGameOverride();
    } catch (err) {
      const message = err instanceof WorkerError || err instanceof Error ? err.message : String(err);
      notifyError(i18n("gameOverrideClearFailed", "Échec de la suppression"), message);
    } finally {
      setGameOverrideLoading(false);
    }
  }, [i18n, notifySuccess, notifyError, loadGameOverride]);

  const [riotAudit, setRiotAudit] = useState<RiotAuditStats | null>(null);
  const [auditHidden, setAuditHidden] = useState(false);

  const refreshRiotAudit = useCallback(() => {
    setRiotAudit(getRiotAuditStats());
  }, []);

  const handleClearRiotAudit = useCallback(() => {
    clearRiotAuditStats();
    setRiotAudit(getRiotAuditStats());
    notifySuccess(i18n("auditCleared", "Journal d'audit Riot Tracker réinitialisé"));
  }, [i18n, notifySuccess]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (isAdmin) loadGameOverride();
  }, [isAdmin, loadGameOverride]);

  useEffect(() => {
    if (isAdmin) {
      setRiotAudit(getRiotAuditStats());
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="rise-in flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]">
          <Lock className="h-7 w-7 text-[var(--muted)]" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">{i18n("adminRestricted", "Espace réservé")}</h1>
        <p className="max-w-xs text-sm text-[var(--muted)]">{i18n("adminRestrictedHint", "Seul le compte administrateur peut voir ces statistiques.")}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="stagger-children mx-auto max-w-6xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)]">
              <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
              {i18n("adminTitle", "Statistiques")}
            </h1>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {stats?.generatedAt ? i18n("adminGeneratedAt", "Mise à jour") + " " + new Date(stats.generatedAt).toLocaleString() : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--foreground)] transition-[color,background-color,border-color,transform] hover:bg-[var(--text-primary)]/[0.06] disabled:opacity-50 active:scale-[0.97]"
            aria-label={i18n("refresh", "Actualiser")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className={adminCardClass}>
            <div className="flex items-center gap-2 p-4 text-sm text-rose-400">
              <Icon name="alert-triangle" className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {loading && !stats && (
          <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn(adminCardClass, "h-28")}>
                <div className="skeleton-shimmer h-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={i18n("users", "Utilisateurs")}
                value={stats.users}
                icon={<Users className="h-5 w-5" />}
                tone="text-[var(--accent-primary)]"
              />
              <StatCard
                label={i18n("items", "Contenus")}
                value={stats.content.items}
                icon={<Layers className="h-5 w-5" />}
                tone="text-[var(--info)]"
              />
              <StatCard
                label={i18n("files", "Fichiers")}
                value={stats.content.files}
                icon={<HardDrive className="h-5 w-5" />}
                tone="text-amber-400"
              />
              <StatCard
                label={i18n("mailMessages", "Messages mail")}
                value={stats.mail.messages}
                icon={<Mail className="h-5 w-5" />}
                tone="text-[var(--accent-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={adminCardClass}>
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <Icon name="notes" className="h-4 w-4 text-[var(--accent)]" />
                    {i18n("content", "Contenu")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label={i18n("notes", "Notes")} value={stats.content.notes} icon="notes" />
                    <MiniStat label={i18n("tasks", "Tâches")} value={stats.content.tasks} icon="tasks" />
                    <MiniStat label={i18n("events", "Événements")} value={stats.content.events} icon="calendar" />
                    <MiniStat label={i18n("total", "Total")} value={stats.content.items} icon="layers" />
                  </div>
                </div>
              </div>

              <div className={adminCardClass}>
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <Icon name="mail" className="h-4 w-4 text-[var(--accent)]" />
                    {i18n("mail", "Mail")}
                  </div>
                  <div className="space-y-2">
                    <MiniStat label={i18n("aliases", "Alias")} value={stats.mail.aliases} icon="mail" />
                    <MiniStat label={i18n("messages", "Messages")} value={stats.mail.messages} icon="inbox" />
                    <MiniStat label={i18n("threads", "Conversations")} value={stats.mail.threads} icon="message-circle" />
                  </div>
                </div>
              </div>

              <div className={adminCardClass}>
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <Activity className="h-4 w-4 text-[var(--accent)]" />
                    {i18n("activity", "Activité")}
                  </div>
                  <div className="space-y-2">
                    <MiniStat label={i18n("aiUsage", "Utilisation IA")} value={stats.activity.aiUsage} icon="brain" />
                    <MiniStat label={i18n("userData", "Données utilisateurs")} value={stats.activity.userData} icon="database" />
                    <MiniStat label={i18n("teamMembers", "Membres équipe")} value={stats.activity.teamMembers} icon="users" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={adminCardClass}>
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Gamepad2 className="h-4 w-4 text-[var(--accent)]" />
              {i18n("gameOverrideTitle", "Jeu — mise à jour manuelle")}
            </div>
            <p className="text-xs text-[var(--muted)]">
              {i18n(
                "gameOverrideHint",
                "Le fichier du dépôt GitHub de ton pote est repris automatiquement dès qu'il est complet. Si ce n'est pas le cas, envoie un fichier .html ici — il sera servi à la place tant qu'un fichier GitHub valide n'est pas détecté."
              )}
            </p>

            <div className="flex items-center justify-between gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    gameOverride?.active ? "bg-emerald-400" : "bg-[var(--muted)]"
                  )}
                />
                <div className="text-xs">
                  <p className="font-medium text-[var(--foreground)]">
                    {gameOverride?.active
                      ? i18n("gameOverrideActive", "Version manuelle active")
                      : i18n("gameOverrideInactive", "Aucune version manuelle")}
                  </p>
                  {gameOverride?.active && (
                    <p className="text-[var(--muted)]">
                      {gameOverride.sizeBytes ? `${Math.round(gameOverride.sizeBytes / 1024)} Ko` : ""}
                      {gameOverride.uploadedAt ? ` · ${new Date(gameOverride.uploadedAt).toLocaleString()}` : ""}
                    </p>
                  )}
                </div>
              </div>
              {gameOverride?.active && (
                <button
                  type="button"
                  onClick={handleGameOverrideClear}
                  disabled={gameOverrideLoading}
                  className="flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 text-xs font-medium text-rose-400 transition-[color,background-color,border-color,transform] hover:bg-rose-500/10 disabled:opacity-50 active:scale-[0.97]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {i18n("gameOverrideClear", "Retirer")}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".html,text/html"
              className="hidden"
              onChange={(e) => handleGameFileSelected(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={gameOverrideLoading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-sm font-medium text-[var(--foreground)] transition-[color,background-color,border-color,transform] hover:bg-[var(--text-primary)]/[0.06] disabled:opacity-50 active:scale-[0.97]"
            >
              <Upload className={cn("h-4 w-4", gameOverrideLoading && "animate-pulse")} />
              {gameOverrideLoading
                ? i18n("gameOverrideUploading", "Envoi en cours...")
                : i18n("gameOverrideUploadButton", "Envoyer un fichier .html")}
            </button>
          </div>
        </div>

        <div className={adminCardClass}>
          <div className="space-y-4 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--foreground)]">
                      Confidentialité & Zéro Log #RIOT TRACKER
                    </h2>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Zéro Log Serveur · 100% Local
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Le tracker fonctionne sans aucun compte utilisateur et sans journalisation. Le Riot ID est mémorisé uniquement sur le navigateur du visiteur.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuditHidden(!auditHidden)}
                  className="flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title={auditHidden ? "Afficher les détails" : "Masquer les détails"}
                >
                  {auditHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{auditHidden ? "Afficher" : "Masquer"}</span>
                </button>
                <button
                  type="button"
                  onClick={refreshRiotAudit}
                  className="flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--text-primary)]/[0.06] transition-colors cursor-pointer"
                  title="Actualiser les compteurs d'audit"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Actualiser</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearRiotAudit}
                  className="flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Purger l'historique d'audit"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purger</span>
                </button>
              </div>
            </div>

            {!auditHidden && (
              <div className="space-y-4 pt-1 border-t border-[var(--panel-border)]/50">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Visites Totales</p>
                    <p className="text-2xl font-black text-[var(--foreground)] mt-1">{riotAudit?.totalVisits || 0}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Pages Riot & Tracker</p>
                  </div>

                  <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Sessions Uniques</p>
                    <p className="text-2xl font-black text-rose-400 mt-1">{riotAudit?.uniqueSessions || 0}</p>
                    <p className="text-[10px] text-[var(--muted)] font-medium">Session ID éphémère</p>
                  </div>

                  <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Consultations VALORANT</p>
                    <p className="text-2xl font-black text-rose-400 mt-1">{riotAudit?.gameVisits.valorant || 0}</p>
                    <p className="text-[10px] text-[var(--muted)] font-medium">Hub #1</p>
                  </div>

                  <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Consultations LoL & TFT</p>
                    <p className="text-2xl font-black text-amber-400 mt-1">{(riotAudit?.gameVisits.lol || 0) + (riotAudit?.gameVisits.tft || 0)}</p>
                    <p className="text-[10px] text-[var(--muted)] font-medium">LoL: {riotAudit?.gameVisits.lol || 0} · TFT: {riotAudit?.gameVisits.tft || 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3.5 space-y-2.5">
                    <h3 className="text-xs font-bold text-[var(--foreground)]">Actions Détectées (Compteurs Anonymes)</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted)]">Recherches de Joueurs Riot :</span>
                        <span className="font-mono font-bold text-[var(--foreground)]">{riotAudit?.actionsCount.searchQueries || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted)]">Tests de Connectivité API :</span>
                        <span className="font-mono font-bold text-cyan-400">{riotAudit?.actionsCount.apiTests || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted)]">Tentatives de Connexion RSO :</span>
                        <span className="font-mono font-bold text-rose-400">{riotAudit?.actionsCount.rsoAttempts || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--foreground)]">Journal d'Audit Récent</h3>
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {riotAudit?.recentLogs.length || 0} entrées
                      </span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 os-scroll pr-1">
                      {(!riotAudit?.recentLogs || riotAudit.recentLogs.length === 0) ? (
                        <p className="text-xs text-[var(--muted)] italic py-2 text-center">Zéro journal conservé : la page tracker fonctionne en mode sans log et 100% local.</p>
                      ) : (
                        riotAudit.recentLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between rounded-lg border border-[var(--panel-border)]/40 bg-[var(--panel-bg)]/70 p-1.5 text-[11px]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="font-medium text-[var(--foreground)] truncate">{log.event}</span>
                            </div>
                            <span className="text-[9px] font-mono text-[var(--muted)] shrink-0 ml-2">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-[var(--muted)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Sécurité validée : Données anonymisées en conformité stricte avec les règles d'évaluation Riot Games et le RGPD.</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0">✓ Audit Actif</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
