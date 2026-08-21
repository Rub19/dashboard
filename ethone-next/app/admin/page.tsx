"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import { ADMIN_EMAIL } from "@/lib/admin";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import { RefreshCw, Lock, Users, Layers, HardDrive, Mail, Activity, BarChart3 } from "lucide-react";

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
    <Card3D className="h-full">
      <div className="flex h-full flex-col justify-between gap-3 p-4">
        <div className="flex items-start justify-between">
          <span className={tone}>{icon}</span>
          <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {value.toLocaleString()}
          </span>
        </div>
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      </div>
    </Card3D>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-3 backdrop-blur-sm">
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

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/admin/stats");
      setStats(res?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n("error", "Erreur"));
    } finally {
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]">
          <Lock className="h-7 w-7 text-[var(--muted)]" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">{i18n("adminRestricted", "Espace réservé")}</h1>
        <p className="max-w-xs text-sm text-[var(--muted)]">{i18n("adminRestrictedHint", "Seul le compte administrateur peut voir ces statistiques.")}</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
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
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--foreground)] transition-colors hover:bg-[var(--text-primary)]/[0.06] disabled:opacity-50"
            aria-label={i18n("refresh", "Actualiser")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <Card3D>
            <div className="flex items-center gap-2 p-4 text-sm text-rose-400">
              <Icon name="alert-triangle" className="h-4 w-4" />
              {error}
            </div>
          </Card3D>
        )}

        {loading && !stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card3D key={i} className="h-28">
                <div className="h-full animate-pulse rounded-xl bg-[var(--panel-bg)]" />
              </Card3D>
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
                tone="text-purple-400"
              />
              <StatCard
                label={i18n("items", "Contenus")}
                value={stats.content.items}
                icon={<Layers className="h-5 w-5" />}
                tone="text-cyan-400"
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
                tone="text-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card3D>
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
              </Card3D>

              <Card3D>
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
              </Card3D>

              <Card3D>
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
              </Card3D>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
