"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Circle,
  Flame,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Calendar,
  List as ListIcon,
  Sparkles,
  Pencil,
  X,
  Trophy,
  Search,
} from "@/components/icons/ph";
import { useHabits, type Habit } from "@/lib/hooks/useHabits";
import { useToast } from "@/components/ToastProvider";
import { dateKey } from "@/components/ActivityHeatmap";
import { cn } from "@/lib/utils";
import { hapticLightImpact } from "@/lib/haptics";

type LayoutMode = "grid" | "week" | "list";
type FilterMode = "all" | "todo" | "completed";

const EMOJI_CHOICES = ["🎯", "💪", "📚", "🧘", "💧", "🏃", "🥗", "😴", "✍️", "💻", "🎸", "🚶"];

const PRESET_HABITS = [
  { name: "Boire 2L d'eau", emoji: "💧", target: 7 },
  { name: "Méditer 10 minutes", emoji: "🧘", target: 5 },
  { name: "Lire 20 pages", emoji: "📚", target: 7 },
  { name: "Séance de sport", emoji: "💪", target: 4 },
  { name: "Dormir avant 23h", emoji: "😴", target: 7 },
  { name: "Session de code", emoji: "💻", target: 5 },
];

function getCurrentWeekDates(): { date: Date; key: string; isToday: boolean; dayName: string; dayNumber: number }[] {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Lundi, 6 = Dimanche
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const todayStr = dateKey(now.toISOString());
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d.toISOString());
    return {
      date: d,
      key,
      isToday: key === todayStr,
      dayName: dayNames[i],
      dayNumber: d.getDate(),
    };
  });
}

function HabitHistoryMiniStrip({ history, daysCount = 14 }: { history: Set<string>; daysCount?: number }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (daysCount - 1 - i));
      return d;
    });
  }, [today, daysCount]);

  return (
    <div className="flex items-center gap-1">
      {days.map((day) => {
        const key = dateKey(day.toISOString());
        const done = history.has(key);
        return (
          <span
            key={key}
            title={day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            className={cn(
              "h-2.5 w-2.5 rounded-sm transition-all duration-200",
              done
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                : "bg-white/[0.06] border border-white/[0.08]"
            )}
          />
        );
      })}
    </div>
  );
}

export default function HabitsPage() {
  const {
    items,
    loading,
    error,
    create,
    update,
    remove,
    toggleToday,
    toggleDate,
    isDoneToday,
    isDoneOnDate,
    getStreak,
    getHistory,
    reload,
  } = useHabits();

  const { success, error: showError } = useToast();

  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState(EMOJI_CHOICES[0]);
  const [formTarget, setFormTarget] = useState(7);
  const [formDesc, setFormDesc] = useState("");

  // Load layout from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ethone:habits:layout") as LayoutMode | null;
      if (saved && (saved === "grid" || saved === "week" || saved === "list")) {
        setLayout(saved);
      }
    } catch {}
  }, []);

  const changeLayout = (mode: LayoutMode) => {
    hapticLightImpact();
    setLayout(mode);
    try {
      localStorage.setItem("ethone:habits:layout", mode);
    } catch {}
  };

  const activeHabits = useMemo(() => items.filter((h) => !h.archived), [items]);

  const weekDays = useMemo(() => getCurrentWeekDates(), []);

  // Compute completions this week for each habit
  const getCompletionsThisWeek = useCallback(
    (habitId: string) => {
      const history = getHistory(habitId);
      return weekDays.filter((d) => history.has(d.key)).length;
    },
    [getHistory, weekDays]
  );

  // Global statistics
  const stats = useMemo(() => {
    const total = activeHabits.length;
    const doneToday = activeHabits.filter((h) => isDoneToday(h.id)).length;
    const bestStreak = activeHabits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);

    // Weekly consistency rate
    let totalTarget = 0;
    let totalDoneThisWeek = 0;
    activeHabits.forEach((h) => {
      totalTarget += Math.min(7, h.target_per_week || 7);
      totalDoneThisWeek += getCompletionsThisWeek(h.id);
    });
    const weeklyRate = totalTarget > 0 ? Math.min(100, Math.round((totalDoneThisWeek / totalTarget) * 100)) : 0;
    const todayPercent = total > 0 ? Math.round((doneToday / total) * 100) : 0;

    return { total, doneToday, bestStreak, weeklyRate, todayPercent };
  }, [activeHabits, isDoneToday, getStreak, getCompletionsThisWeek]);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return activeHabits.filter((habit) => {
      const matchesSearch =
        search.trim() === "" ||
        habit.name.toLowerCase().includes(search.toLowerCase()) ||
        (habit.description && habit.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      const isDone = isDoneToday(habit.id);
      if (filter === "todo") return !isDone;
      if (filter === "completed") return isDone;
      return true;
    });
  }, [activeHabits, search, filter, isDoneToday]);

  const handleOpenCreate = () => {
    hapticLightImpact();
    setEditingHabit(null);
    setFormName("");
    setFormEmoji(EMOJI_CHOICES[0]);
    setFormTarget(7);
    setFormDesc("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    hapticLightImpact();
    setEditingHabit(habit);
    setFormName(habit.name);
    setFormEmoji(habit.emoji || EMOJI_CHOICES[0]);
    setFormTarget(habit.target_per_week || 7);
    setFormDesc(habit.description || "");
    setIsModalOpen(true);
  };

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      if (editingHabit) {
        await update(editingHabit.id, {
          name: formName.trim(),
          emoji: formEmoji,
          target_per_week: formTarget,
          description: formDesc.trim() || null,
        });
        success("Habitude mise à jour", formName.trim());
      } else {
        await create({
          name: formName.trim(),
          emoji: formEmoji,
          description: formDesc.trim() || null,
          color: null,
          target_per_week: formTarget,
        });
        success("Habitude créée", formName.trim());
      }
      setIsModalOpen(false);
    } catch (err) {
      showError("Erreur d'enregistrement", err instanceof Error ? err.message : undefined);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    hapticLightImpact();
    if (!window.confirm(`Voulez-vous vraiment supprimer l'habitude « ${name} » ?`)) return;
    try {
      await remove(id);
      success("Habitude supprimée", name);
    } catch (err) {
      showError("Erreur de suppression", err instanceof Error ? err.message : undefined);
    }
  };

  const handleToggle = async (habitId: string, dateStr?: string) => {
    hapticLightImpact();
    try {
      if (dateStr) {
        await toggleDate(habitId, dateStr);
      } else {
        await toggleToday(habitId);
      }
    } catch (err) {
      showError("Erreur", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto os-scroll p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Habitudes</h1>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
              {stats.total} {stats.total > 1 ? "actives" : "active"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Construisez votre routine quotidienne et visualisez vos séries au fil du temps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Layout switcher buttons */}
          <div className="flex items-center rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 p-1 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => changeLayout("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer",
                layout === "grid"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Vue Grille Bento"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grille</span>
            </button>
            <button
              type="button"
              onClick={() => changeLayout("week")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer",
                layout === "week"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Vue Semaine"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Semaine</span>
            </button>
            <button
              type="button"
              onClick={() => changeLayout("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer",
                layout === "list"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Vue Liste Compacte"
            >
              <ListIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Liste</span>
            </button>
          </div>

          {/* New Habit Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="group flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-md transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>Nouvelle habitude</span>
          </button>
        </div>
      </div>

      {/* Hero Analytics Card with Radial Progress */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/90 dark:bg-[#090d16]/90 p-5 shadow-xl backdrop-blur-2xl shrink-0">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-gradient-to-br from-emerald-500/20 via-[var(--accent-primary)]/15 to-transparent blur-3xl opacity-70"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Radial progress ring */}
          <div className="md:col-span-4 flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-white/10"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - stats.todayPercent / 100)}
                  strokeLinecap="round"
                  className="text-emerald-400 transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                  {stats.todayPercent}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Progression du jour
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {stats.doneToday} / {stats.total}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {stats.doneToday === stats.total && stats.total > 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                    <Sparkles className="h-3 w-3" /> Objectif atteint !
                  </span>
                ) : (
                  `${stats.total - stats.doneToday} restante${stats.total - stats.doneToday > 1 ? "s" : ""}`
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                <Flame className="h-3.5 w-3.5" />
                <span>Meilleure série</span>
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {stats.bestStreak} <span className="text-xs font-normal text-[var(--text-muted)]">jours</span>
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                <Trophy className="h-3.5 w-3.5" />
                <span>Régularité 7j</span>
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)]">
                {stats.weeklyRate}%
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                <Target className="h-3.5 w-3.5" />
                <span>Semaine active</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {weekDays.map((d) => {
                  const doneCount = activeHabits.filter((h) => isDoneOnDate(h.id, d.key)).length;
                  const ratio = stats.total > 0 ? doneCount / stats.total : 0;
                  return (
                    <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        title={`${d.dayName} : ${doneCount}/${stats.total}`}
                        className={cn(
                          "h-5 w-full rounded-sm transition-all",
                          ratio >= 0.8
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                            : ratio > 0
                            ? "bg-emerald-500/50"
                            : "bg-white/[0.08]"
                        )}
                      />
                      <span className={cn("text-[9px] font-medium", d.isToday ? "text-emerald-400 font-bold" : "text-white/40")}>
                        {d.dayName.slice(0, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 p-1 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              filter === "all"
                ? "bg-white/10 text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Toutes ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("todo")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              filter === "todo"
                ? "bg-white/10 text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            À faire ({stats.total - stats.doneToday})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              filter === "completed"
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Faites ({stats.doneToday})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une habitude…"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none backdrop-blur-md focus:border-[var(--accent-primary)] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area based on Layout Mode */}
      <div className="flex-1 min-h-0">
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 backdrop-blur-xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Impossible de charger vos habitudes</h3>
            <button
              type="button"
              onClick={() => reload()}
              className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.08] active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        ) : activeHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 backdrop-blur-xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Commencez votre première habitude</h3>
            <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
              Sélectionnez une habitude recommandée ci-dessous ou créez la vôtre sur mesure.
            </p>

            {/* Quick preset chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-xl">
              {PRESET_HABITS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={async () => {
                    try {
                      await create({
                        name: preset.name,
                        emoji: preset.emoji,
                        target_per_week: preset.target,
                        description: null,
                        color: null,
                      });
                      success("Habitude ajoutée !", preset.name);
                    } catch (err) {
                      showError("Erreur", err instanceof Error ? err.message : undefined);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] hover:bg-white/[0.08] hover:border-[var(--accent-primary)]/40 px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-base">{preset.emoji}</span>
                  <span>{preset.name}</span>
                  <Plus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        ) : filteredHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 backdrop-blur-xl">
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Aucune habitude ne correspond aux filtres actuels.
            </p>
          </div>
        ) : layout === "grid" ? (
          /* ======================================================== */
          /* LAYOUT 1: BENTO CARDS GRID                               */
          /* ======================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredHabits.map((habit) => {
                const doneToday = isDoneToday(habit.id);
                const streak = getStreak(habit.id);
                const completionsThisWeek = getCompletionsThisWeek(habit.id);
                const target = habit.target_per_week || 7;
                const weekProgressPercent = Math.min(100, Math.round((completionsThisWeek / target) * 100));

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border bg-[var(--bg-surface)]/90 dark:bg-[#090d16]/90 p-4.5 shadow-lg backdrop-blur-xl transition-all duration-200",
                      doneToday
                        ? "border-emerald-500/30 shadow-[0_4px_24px_rgba(16,185,129,0.1)]"
                        : "border-[var(--panel-border)] hover:border-white/20"
                    )}
                  >
                    <div>
                      {/* Top Row: Emoji, Title, Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl shadow-inner">
                            <span>{habit.emoji || "🎯"}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                              {habit.name}
                            </h3>
                            {habit.description && (
                              <p className="truncate text-xs text-[var(--text-muted)] mt-0.5">
                                {habit.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                                Cible : {target}x/sem.
                              </span>
                              {streak > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                                  <Flame className="h-3 w-3" />
                                  {streak}j
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(habit)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(habit.id, habit.name)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive 7-Day Week Pill Row */}
                      <div className="mt-4 pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Cette semaine ({completionsThisWeek}/{target})
                          </span>
                          <span className="text-[10px] font-semibold tabular-nums text-emerald-400">
                            {weekProgressPercent}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 mb-3">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300"
                            style={{ width: `${weekProgressPercent}%` }}
                          />
                        </div>

                        {/* 7 Days Toggle Cells */}
                        <div className="grid grid-cols-7 gap-1">
                          {weekDays.map((d) => {
                            const done = isDoneOnDate(habit.id, d.key);
                            return (
                              <button
                                key={d.key}
                                type="button"
                                onClick={() => handleToggle(habit.id, d.key)}
                                className={cn(
                                  "group/day flex flex-col items-center justify-center py-1.5 rounded-lg border transition-all cursor-pointer active:scale-90",
                                  done
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                    : "bg-white/[0.02] border-white/[0.06] text-[var(--text-muted)] hover:bg-white/[0.06]",
                                  d.isToday && "ring-1 ring-white/40"
                                )}
                                title={`${d.dayName} ${d.dayNumber} : ${done ? "Fait (cliquer pour annuler)" : "Non fait (cliquer pour valider)"}`}
                              >
                                <span className="text-[9px] font-medium leading-none mb-1">
                                  {d.dayName}
                                </span>
                                <div
                                  className={cn(
                                    "h-3.5 w-3.5 rounded-full flex items-center justify-center transition-transform",
                                    done ? "bg-emerald-400 text-black" : "border border-white/20"
                                  )}
                                >
                                  {done && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Primary Action Button: Toggle Today */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleToggle(habit.id)}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer shadow-sm",
                          doneToday
                            ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-white/[0.06] border border-white/10 text-[var(--text-primary)] hover:bg-white/[0.12] hover:border-white/20"
                        )}
                      >
                        {doneToday ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Accomplie aujourd'hui !</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4 text-[var(--text-muted)]" />
                            <span>Valider aujourd'hui</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : layout === "week" ? (
          /* ======================================================== */
          /* LAYOUT 2: WEEKLY CALENDAR MATRIX                         */
          /* ======================================================== */
          <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/90 dark:bg-[#090d16]/90 p-4 shadow-xl backdrop-blur-2xl pb-8">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-3 px-3">Habitude</th>
                  <th className="py-3 px-2 text-center">Cible</th>
                  {weekDays.map((d) => (
                    <th
                      key={d.key}
                      className={cn(
                        "py-3 px-2 text-center",
                        d.isToday && "text-emerald-400 font-extrabold bg-emerald-500/[0.05] rounded-t-lg"
                      )}
                    >
                      <div>{d.dayName}</div>
                      <div className="text-[11px] font-normal text-white/50">{d.dayNumber}</div>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center">Série</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredHabits.map((habit) => {
                  const streak = getStreak(habit.id);
                  const completionsThisWeek = getCompletionsThisWeek(habit.id);
                  const target = habit.target_per_week || 7;

                  return (
                    <tr key={habit.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{habit.emoji || "🎯"}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                              {habit.name}
                            </p>
                            {habit.description && (
                              <p className="truncate text-[10px] text-[var(--text-muted)]">
                                {habit.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                          {completionsThisWeek}/{target}
                        </span>
                      </td>

                      {/* 7 Days Matrix Columns */}
                      {weekDays.map((d) => {
                        const done = isDoneOnDate(habit.id, d.key);
                        return (
                          <td
                            key={d.key}
                            className={cn(
                              "py-2.5 px-2 text-center",
                              d.isToday && "bg-emerald-500/[0.04]"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggle(habit.id, d.key)}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-85 cursor-pointer",
                                done
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                  : "border-white/10 text-white/20 hover:border-white/30 hover:text-white/40"
                              )}
                              title={`${d.dayName} ${d.dayNumber}`}
                            >
                              {done ? <Check className="h-4 w-4 stroke-[3]" /> : <Circle className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        );
                      })}

                      <td className="py-3 px-2 text-center">
                        {streak > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                            <Flame className="h-3 w-3" />
                            {streak}j
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(habit)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(habit.id, habit.name)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ======================================================== */
          /* LAYOUT 3: COMPACT LIST                                   */
          /* ======================================================== */
          <div className="space-y-2 pb-8">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredHabits.map((habit) => {
                const doneToday = isDoneToday(habit.id);
                const streak = getStreak(habit.id);
                const history = getHistory(habit.id);
                const completionsThisWeek = getCompletionsThisWeek(habit.id);
                const target = habit.target_per_week || 7;

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border bg-[var(--bg-surface)]/90 dark:bg-[#090d16]/90 p-3.5 shadow-md backdrop-blur-xl transition-all duration-150",
                      doneToday
                        ? "border-emerald-500/30"
                        : "border-[var(--panel-border)] hover:border-white/20"
                    )}
                  >
                    {/* Check Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(habit.id)}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-85 cursor-pointer",
                        doneToday
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "border-white/15 text-[var(--text-muted)] hover:border-white/30 hover:text-white"
                      )}
                      title={doneToday ? "Marquer non fait" : "Marquer fait"}
                    >
                      {doneToday ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>

                    {/* Emoji + Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-xl shrink-0">{habit.emoji || "🎯"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                            {habit.name}
                          </span>
                          {streak > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.2 text-[9px] font-bold text-orange-400">
                              <Flame className="h-2.5 w-2.5" />
                              {streak}j
                            </span>
                          )}
                        </div>
                        {habit.description && (
                          <p className="truncate text-[10px] text-[var(--text-muted)]">
                            {habit.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mini 14-Day History Strip */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <HabitHistoryMiniStrip history={history} daysCount={14} />
                      <span className="text-[10px] font-medium text-[var(--text-muted)] ml-1">
                        {completionsThisWeek}/{target} sem.
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(habit)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(habit.id, habit.name)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal for Creating / Editing a Habit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/95 dark:bg-[#0c101b]/95 p-6 text-[var(--text-primary)] shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                    <Target className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {editingHabit ? "Modifier l'habitude" : "Nouvelle habitude"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preset Shortcuts (only when creating) */}
              {!editingHabit && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Suggestions rapides
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_HABITS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setFormName(p.name);
                          setFormEmoji(p.emoji);
                          setFormTarget(p.target);
                        }}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.08] transition-all cursor-pointer"
                      >
                        {p.emoji} {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveHabit} className="mt-5 space-y-4">
                {/* Emoji Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Icône / Émoji
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_CHOICES.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormEmoji(emoji)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all cursor-pointer",
                          formEmoji === emoji
                            ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] shadow-sm scale-105"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Nom de l'habitude *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex. Méditer 10 minutes, Boire de l'eau…"
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-white/[0.04] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                    required
                  />
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Description / Note (facultatif)
                  </label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Ex. Tous les matins au réveil"
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-white/[0.04] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                  />
                </div>

                {/* Frequency Target */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    <span>Objectif hebdomadaire</span>
                    <span className="text-[var(--text-primary)] font-bold">
                      {formTarget === 7 ? "Tous les jours (7j/sem.)" : `${formTarget} jours par semaine`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={formTarget}
                    onChange={(e) => setFormTarget(Number(e.target.value))}
                    className="w-full accent-[var(--accent-primary)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                    <span>1 jour</span>
                    <span>3 jours</span>
                    <span>5 jours</span>
                    <span>7 jours</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!formName.trim()}
                    className="rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {editingHabit ? "Mettre à jour" : "Créer l'habitude"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
