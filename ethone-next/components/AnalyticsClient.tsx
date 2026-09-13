"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart as LineChartIcon, Gamepad2, Receipt, CheckCircle2, Timer, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useTasks } from "@/lib/hooks/useTasks";
import { useGamingAnalytics } from "@/lib/hooks/useGamingAnalytics";
import { listBills, type BillCategory } from "@/lib/bills-manager";
import {
  billsCategoryBreakdown,
  billsMonthSnapshot,
  tasksStats,
  focusHistoryByDay,
  type FocusHistoryEntry,
} from "@/lib/analytics";
import AnalyticsBarChart from "@/components/charts/AnalyticsBarChart";
import AnalyticsLineChart from "@/components/charts/AnalyticsLineChart";
import AnalyticsDonutChart from "@/components/charts/AnalyticsDonutChart";
import { useChartPalette } from "@/components/charts/useChartPalette";

const CATEGORY_LABELS: Record<BillCategory, string> = {
  housing: "Logement",
  utilities: "Factures",
  transport: "Transport",
  health: "Santé",
  insurance: "Assurance",
  subscriptions: "Abonnements",
  food: "Alimentation",
  education: "Éducation",
  taxes: "Impôts",
  other: "Autre",
};

function readFocusHistory(): FocusHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ethone-focus-history") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatRelativeSync(timestamp: number | null): string | null {
  if (!timestamp) return null;
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function SectionCard({ icon, title, caption, action, children }: { icon: React.ReactNode; title: string; caption?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--inset-radius)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            {caption ? <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{caption}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyCta({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex w-full items-center justify-center gap-1.5 rounded-[var(--inset-radius)] border border-dashed border-[var(--panel-border)] py-8 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

export default function AnalyticsClient() {
  const i18n = useI18n();
  const router = useRouter();
  const palette = useChartPalette();
  const gaming = useGamingAnalytics();
  const { items: tasks } = useTasks();
  const [bills, setBills] = useState<ReturnType<typeof listBills>>([]);
  const [focusHistory, setFocusHistory] = useState<FocusHistoryEntry[]>([]);

  useEffect(() => {
    setBills(listBills());
    setFocusHistory(readFocusHistory());
  }, []);

  const taskStats = useMemo(() => tasksStats(tasks), [tasks]);
  const categoryBreakdown = useMemo(() => billsCategoryBreakdown(bills), [bills]);
  const monthSnapshot = useMemo(() => billsMonthSnapshot(bills), [bills]);
  const focusByDay = useMemo(() => focusHistoryByDay(focusHistory), [focusHistory]);

  const focusMinutesThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return focusHistory
      .filter((h) => new Date(h.completedAt) >= weekAgo)
      .reduce((sum, h) => sum + Math.round((h.duration || 0) / 60), 0);
  }, [focusHistory]);

  const gamingConfigured = gaming.configured;
  const bestWinRate = gamingConfigured
    ? gaming.lol.winRate ?? gaming.valorant.winRate ?? (gaming.tft.top4Rate !== null ? gaming.tft.top4Rate : null)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
          <LineChartIcon className="h-5 w-5 text-[var(--accent-primary)]" />
          {i18n("analytics", "Analytics")}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Vue d'ensemble de ta forme récente en jeu, tes finances du mois, tes tâches et ton focus.
        </p>
      </div>

      {/* Overview strip — mirrors DashboardOverview's Priority Layer pattern */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--panel-border)]/50 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 shadow-xs sm:grid-cols-4 sm:divide-y-0">
        <button
          type="button"
          onClick={() => router.push("/matches")}
          className="group flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-[var(--surface-raised)]/70 cursor-pointer"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--inset-radius)] bg-[var(--info)]/15 text-[var(--info)]">
            <Gamepad2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Gaming</p>
            <p className="truncate">
              <span className="font-mono text-lg font-bold leading-none text-[var(--text-primary)]">
                {bestWinRate !== null ? `${bestWinRate}%` : "—"}
              </span>
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">forme récente</span>
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/calendar")}
          className="group flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-[var(--surface-raised)]/70 cursor-pointer"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--inset-radius)] bg-[var(--warning)]/15 text-[var(--warning)]">
            <Receipt className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Finances</p>
            <p className="truncate">
              <span className="font-mono text-lg font-bold leading-none text-[var(--text-primary)]">
                {monthSnapshot.unpaidAmount.toFixed(0)}€
              </span>
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">à payer ce mois</span>
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/tasks")}
          className="group flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-[var(--surface-raised)]/70 cursor-pointer"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--inset-radius)] bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Tâches</p>
            <p className="truncate">
              <span className="font-mono text-lg font-bold leading-none text-[var(--text-primary)]">
                {taskStats.completionRate !== null ? `${taskStats.completionRate}%` : "—"}
              </span>
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">complétées</span>
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/focus")}
          className="group flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-[var(--surface-raised)]/70 cursor-pointer"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--inset-radius)] bg-purple-500/15 text-purple-400">
            <Timer className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Focus</p>
            <p className="truncate">
              <span className="font-mono text-lg font-bold leading-none text-[var(--text-primary)]">
                {focusMinutesThisWeek}
              </span>
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">min cette semaine</span>
            </p>
          </div>
        </button>
      </div>

      {/* Gaming */}
      <SectionCard icon={<Gamepad2 className="h-4 w-4" />} title="Gaming" caption="Forme récente — fenêtre limitée par l'API (~20-40 dernières parties), pas un historique complet.">
        {!gamingConfigured ? (
          <EmptyCta label="Configurer ton compte Riot dans le tracker" href="/matches" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <GameMiniChart title="League of Legends" totalGames={gaming.lol.totalGames} rate={gaming.lol.winRate} rateLabel="victoires" lastSync={gaming.lol.lastSync} data={gaming.lol.days.slice(0, 14).reverse().map((d) => ({ label: d.dateLabel, value: d.count }))} color={palette.info} />
            <GameMiniChart title="Valorant" totalGames={gaming.valorant.totalGames} rate={gaming.valorant.winRate} rateLabel="victoires" lastSync={gaming.valorant.lastSync} data={gaming.valorant.days.slice(0, 14).reverse().map((d) => ({ label: d.dateLabel, value: d.count }))} color={palette.danger} />
            <GameMiniChart title="TFT" totalGames={gaming.tft.totalGames} rate={gaming.tft.top4Rate} rateLabel="top 4" lastSync={gaming.tft.lastSync} data={gaming.tft.days.slice(0, 14).reverse().map((d) => ({ label: d.dateLabel, value: d.count }))} color={palette.warning} />
          </div>
        )}
      </SectionCard>

      {/* Finances */}
      <SectionCard icon={<Receipt className="h-4 w-4" />} title="Finances" caption="Répartition par catégorie et ce mois-ci — pas d'historique de dépenses au fil du temps pour l'instant.">
        {bills.length === 0 ? (
          <EmptyCta label="Ajouter tes factures dans le calendrier" href="/calendar" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Par catégorie (non payé)</p>
              <AnalyticsDonutChart
                data={categoryBreakdown.map((c) => ({ label: CATEGORY_LABELS[c.category] || c.category, value: c.amount }))}
                centerLabel={`${categoryBreakdown.reduce((s, c) => s + c.amount, 0).toFixed(0)}€`}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Ce mois-ci</p>
              <AnalyticsBarChart
                data={[
                  { label: "Payé", value: Math.round(monthSnapshot.paidAmount) },
                  { label: "À payer", value: Math.round(monthSnapshot.unpaidAmount) },
                ]}
                valueSuffix="€"
                color={palette.warning}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Tasks */}
      <SectionCard icon={<CheckCircle2 className="h-4 w-4" />} title="Tâches" caption="Complétion actuelle et créations par jour — pas de suivi des complétions dans le temps pour l'instant (aucune date de complétion enregistrée).">
        {tasks.length === 0 ? (
          <EmptyCta label="Créer tes premières tâches" href="/tasks" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Complétion</p>
              <AnalyticsDonutChart
                data={[
                  { label: "Terminées", value: taskStats.completed, color: palette.success },
                  { label: "En cours", value: taskStats.total - taskStats.completed, color: palette.panelBorder },
                ]}
                centerLabel={taskStats.completionRate !== null ? `${taskStats.completionRate}%` : "—"}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Par priorité</p>
              <AnalyticsBarChart
                data={[
                  { label: "Basse", value: taskStats.byPriority.low },
                  { label: "Moyenne", value: taskStats.byPriority.medium },
                  { label: "Haute", value: taskStats.byPriority.high },
                ]}
                color={palette.info}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Créées / jour</p>
              <AnalyticsLineChart data={taskStats.createdByDay.slice(-14).map((d) => ({ label: d.dateLabel, value: d.count }))} color={palette.accent} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Focus */}
      <SectionCard icon={<Timer className="h-4 w-4" />} title="Focus" caption="Sessions réelles, limitées aux 100 dernières et à cet appareil.">
        {focusHistory.length === 0 ? (
          <EmptyCta label="Démarrer une session focus" href="/focus" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Sessions / jour</p>
              <AnalyticsBarChart data={focusByDay.slice(-14).map((d) => ({ label: d.dateLabel, value: d.sessions }))} color={palette.accent} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Minutes / jour</p>
              <AnalyticsLineChart data={focusByDay.slice(-14).map((d) => ({ label: d.dateLabel, value: d.minutes }))} valueSuffix=" min" color={palette.info} />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function GameMiniChart({
  title,
  totalGames,
  rate,
  rateLabel,
  lastSync,
  data,
  color,
}: {
  title: string;
  totalGames: number;
  rate: number | null;
  rateLabel: string;
  lastSync: number | null;
  data: { label: string; value: number }[];
  color: string;
}) {
  const syncLabel = formatRelativeSync(lastSync);
  return (
    <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
        {rate !== null ? (
          <span className="font-mono text-sm font-bold" style={{ color }}>
            {rate}% <span className="text-[10px] font-normal text-[var(--text-muted)]">{rateLabel}</span>
          </span>
        ) : null}
      </div>
      {totalGames === 0 ? (
        <p className="py-8 text-center text-[11px] text-[var(--text-muted)]">Aucune partie récente</p>
      ) : (
        <>
          <AnalyticsBarChart data={data} color={color} height={100} />
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {totalGames} partie{totalGames > 1 ? "s" : ""}
            {syncLabel ? ` · synchro ${syncLabel}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
