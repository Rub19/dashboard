"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Flame,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  AlertTriangle,
} from "@/components/icons/ph";
import { useHabits } from "@/lib/hooks/useHabits";
import { useToast } from "@/components/ToastProvider";
import { addDays, dateKey } from "@/components/ActivityHeatmap";
import { cn } from "@/lib/utils";

const HISTORY_DAYS = 14;
const EMOJI_CHOICES = ["🎯", "💪", "📚", "🧘", "💧", "🏃", "🥗", "😴", "✍️", "🎸"];

function HabitHistoryStrip({ history }: { history: Set<string> }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    const start = addDays(today, -(HISTORY_DAYS - 1));
    return Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(start, i));
  }, [today]);

  return (
    <div className="flex items-center gap-1">
      {days.map((day) => {
        const key = dateKey(day.toISOString());
        const done = history.has(key);
        return (
          <span
            key={key}
            title={day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            className={cn(
              "h-3 w-3 rounded-sm",
              done ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/[0.06] border border-[var(--text-primary)]/[0.08]"
            )}
          />
        );
      })}
    </div>
  );
}

export default function HabitsPage() {
  const { items, loading, error, create, remove, toggleToday, isDoneToday, getStreak, getHistory, reload } = useHabits();
  const { success, error: showError } = useToast();

  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState(EMOJI_CHOICES[0]);

  const activeHabits = useMemo(() => items.filter((h) => !h.archived), [items]);

  const stats = useMemo(() => {
    const total = activeHabits.length;
    const doneToday = activeHabits.filter((h) => isDoneToday(h.id)).length;
    const bestStreak = activeHabits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);
    return { total, doneToday, bestStreak };
  }, [activeHabits, isDoneToday, getStreak]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await create({ name: newName.trim(), emoji: newEmoji, description: null, color: null, target_per_week: 7 });
      setNewName("");
    } catch (err) {
      showError("Erreur lors de la création de l'habitude", err instanceof Error ? err.message : undefined);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await remove(id);
      success("Habitude supprimée", name);
    } catch (err) {
      showError("Erreur de suppression", err instanceof Error ? err.message : undefined);
    }
  };

  const KPIS = [
    { label: "Habitudes actives", value: stats.total, icon: Target },
    { label: "Faites aujourd'hui", value: `${stats.doneToday}/${stats.total}`, icon: CheckCircle2 },
    { label: "Meilleure série", value: `${stats.bestStreak}j`, icon: Flame },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Habitudes</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Suivez vos habitudes et vos séries au quotidien.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v8-panel grid shrink-0 grid-cols-3 divide-[var(--panel-border)] sm:divide-x">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="flex items-center gap-3 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
              <kpi.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{kpi.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick add */}
      <form onSubmit={handleAdd} className="v8-panel flex flex-col gap-2 p-2 sm:flex-row sm:items-center shrink-0">
        <select
          value={newEmoji}
          onChange={(e) => setNewEmoji(e.target.value)}
          className="cursor-pointer rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-transparent px-2.5 py-1.5 text-sm outline-none"
        >
          {EMOJI_CHOICES.map((emoji) => (
            <option key={emoji} value={emoji} className="bg-[var(--panel-bg)]">
              {emoji}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouvelle habitude (ex. Boire 2L d'eau)…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter</span>
        </button>
      </form>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="h-full space-y-2.5 overflow-hidden" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]/60" />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <div className="v8-panel flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Impossible de charger vos habitudes</h3>
            <button
              type="button"
              onClick={() => reload()}
              className="mt-4 flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        ) : activeHabits.length === 0 ? (
          <div className="v8-panel flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Aucune habitude pour l'instant</h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
              Ajoutez votre première habitude ci-dessus pour commencer à suivre vos séries.
            </p>
          </div>
        ) : (
          <div className="h-full min-h-0 overflow-y-auto os-scroll pr-1 space-y-2 pb-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {activeHabits.map((habit) => {
                const done = isDoneToday(habit.id);
                const streak = getStreak(habit.id);
                const history = getHistory(habit.id);
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="v8-panel flex items-center gap-3 p-3.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleToday(habit.id).catch((err) => showError("Impossible de mettre à jour l'habitude", err instanceof Error ? err.message : undefined))}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                        done ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                      title={done ? "Marquer comme non fait aujourd'hui" : "Marquer comme fait aujourd'hui"}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{habit.emoji}</span>
                        <span className="truncate text-sm font-medium text-[var(--text-primary)]">{habit.name}</span>
                        {streak > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-400">
                            <Flame className="h-3 w-3" />
                            {streak}j
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <HabitHistoryStrip history={history} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(habit.id, habit.name)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
