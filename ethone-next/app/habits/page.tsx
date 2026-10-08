"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Calendar, Flame, LayoutGrid, List as ListIcon, Pencil, Plus, RefreshCw, Search, Sparkles, Target, Trash2 } from "@/components/icons/ph";
import Modal from "@/components/ui/Modal";
import { useHabits, type Habit } from "@/lib/hooks/useHabits";
import { useToast } from "@/components/ToastProvider";
import { dateKey } from "@/components/ActivityHeatmap";
import { confirmDialog } from "@/lib/confirmDialog";
import { hapticLightImpact } from "@/lib/haptics";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { SPRING_LAYOUT, SPRING_PILL, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

/*
 * Habitudes — refonte. Mêmes données que l'ancienne page (useHabits : Supabase + temps réel), nouvelle interface :
 * un anneau du jour, trois indicateurs, puis les habitudes en grille, en semaine ou en liste. Toutes les animations
 * partent de l'état affiché (ressorts interruptibles) et se coupent si le mouvement réduit est demandé.
 */

type LayoutMode = "grid" | "week" | "list";
type FilterMode = "all" | "todo" | "done";

const EMOJIS = ["🎯", "💪", "📚", "🧘", "💧", "🏃", "🥗", "😴", "✍️", "💻", "🎸", "🚶"];
const PRESETS = [
  { name: "Boire 2 L d'eau", emoji: "💧", target: 7 },
  { name: "Méditer 10 minutes", emoji: "🧘", target: 5 },
  { name: "Lire 20 pages", emoji: "📚", target: 7 },
  { name: "Séance de sport", emoji: "💪", target: 4 },
  { name: "Dormir avant 23 h", emoji: "😴", target: 7 },
  { name: "Session de code", emoji: "💻", target: 5 },
];
const LAYOUT_KEY = "ethone:habits:layout";

type Day = { key: string; label: string; short: string; num: number; isToday: boolean; isFuture: boolean };

function currentWeek(): Day[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const today = dateKey(now.toISOString());
  const names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  return names.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d.toISOString());
    return { key, label, short: label.slice(0, 3), num: d.getDate(), isToday: key === today, isFuture: key > today };
  });
}

function lastDays(count: number): string[] {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() - (count - 1 - i));
    return dateKey(x.toISOString());
  });
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export default function HabitsPage() {
  const { items, loading, error, create, update, remove, toggleDate, isDoneToday, isDoneOnDate, getStreak, getHistory, reload } = useHabits();
  const { success, error: showError } = useToast();
  const { reduced } = useMotionPref();

  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved === "grid" || saved === "week" || saved === "list") setLayout(saved);
    } catch {}
  }, []);
  const changeLayout = (mode: LayoutMode) => {
    hapticLightImpact();
    setLayout(mode);
    try {
      localStorage.setItem(LAYOUT_KEY, mode);
    } catch {}
  };

  const week = useMemo(() => currentWeek(), []);
  const habits = useMemo(() => items.filter((h) => !h.archived), [items]);
  const weekCount = useCallback((id: string) => week.filter((d) => isDoneOnDate(id, d.key)).length, [week, isDoneOnDate]);

  const stats = useMemo(() => {
    const total = habits.length;
    const doneToday = habits.filter((h) => isDoneToday(h.id)).length;
    const bestStreak = habits.reduce((m, h) => Math.max(m, getStreak(h.id)), 0);
    let target = 0;
    let done = 0;
    for (const h of habits) {
      target += Math.min(7, h.target_per_week || 7);
      done += Math.min(weekCount(h.id), h.target_per_week || 7);
    }
    const perDay = week.map((d) => (total ? habits.filter((h) => isDoneOnDate(h.id, d.key)).length / total : 0));
    return { total, doneToday, bestStreak, weeklyRate: target ? Math.round((done / target) * 100) : 0, perDay };
  }, [habits, isDoneToday, isDoneOnDate, getStreak, weekCount, week]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return habits.filter((h) => {
      if (q && !`${h.name} ${h.description ?? ""}`.toLowerCase().includes(q)) return false;
      const done = isDoneToday(h.id);
      return filter === "all" || (filter === "done" ? done : !done);
    });
  }, [habits, search, filter, isDoneToday]);

  const toggle = async (habitId: string, day?: string) => {
    hapticLightImpact();
    try {
      await toggleDate(habitId, day);
    } catch (err) {
      showError("Impossible d'enregistrer", err instanceof Error ? err.message : undefined);
    }
  };
  const del = async (h: Habit) => {
    if (!(await confirmDialog(`Supprimer « ${h.name} » et tout son historique ?`, { title: "Supprimer l'habitude", confirmLabel: "Supprimer" }))) return;
    try {
      await remove(h.id);
      success("Habitude supprimée", h.name);
    } catch (err) {
      showError("Erreur de suppression", err instanceof Error ? err.message : undefined);
    }
  };
  const save = async (input: { name: string; emoji: string; description: string | null; target_per_week: number }, habit: Habit | null) => {
    try {
      if (habit) {
        await update(habit.id, input);
        success("Habitude mise à jour", input.name);
      } else {
        await create({ ...input, color: null });
        success("Habitude créée", input.name);
      }
      setEditor({ open: false, habit: null });
    } catch (err) {
      showError("Erreur d'enregistrement", err instanceof Error ? err.message : undefined);
    }
  };

  const enter = reduced ? false : "hidden";
  const counts = { all: habits.length, todo: habits.length - stats.doneToday, done: stats.doneToday };

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto os-scroll">
      <motion.div
        initial={enter}
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8"
      >
        {/* En-tête */}
        <Rise className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.02em] text-[var(--text-primary)]">Habitudes</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {stats.total ? `${plural(stats.total, "habitude active", "habitudes actives")} · une routine qui se construit jour après jour.` : "Une routine qui se construit jour après jour."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              id="habits-layout"
              value={layout}
              onChange={changeLayout}
              label="Affichage"
              options={[
                ["grid", <LayoutGrid key="g" className="h-4 w-4" />, "Grille"],
                ["week", <Calendar key="w" className="h-4 w-4" />, "Semaine"],
                ["list", <ListIcon key="l" className="h-4 w-4" />, "Liste"],
              ]}
            />
            <motion.button
              type="button"
              whileTap={reduced ? undefined : { scale: 0.96 }}
              transition={SPRING_PRESS}
              onClick={() => {
                hapticLightImpact();
                setEditor({ open: true, habit: null });
              }}
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_6px_20px_-8px_var(--glow-color)] transition-[filter] hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle habitude</span>
            </motion.button>
          </div>
        </Rise>

        {/* Aujourd'hui + indicateurs */}
        <Rise className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <Tile className="flex items-center gap-5">
            <ProgressRing done={stats.doneToday} total={stats.total} reduced={reduced} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Aujourd&apos;hui</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                <CountUp value={stats.doneToday} reduced={reduced} />
                <span className="text-[var(--text-muted)]"> / {stats.total}</span>
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={stats.total > 0 && stats.doneToday === stats.total ? "done" : "todo"}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className={cn("mt-1 text-xs", stats.total > 0 && stats.doneToday === stats.total ? "font-semibold text-[var(--success)]" : "text-[var(--text-muted)]")}
                >
                  {stats.total === 0
                    ? "Aucune habitude pour l'instant."
                    : stats.doneToday === stats.total
                      ? "Objectif du jour atteint."
                      : `Encore ${plural(stats.total - stats.doneToday, "habitude", "habitudes")} à cocher.`}
                </motion.p>
              </AnimatePresence>
            </div>
          </Tile>
          <Tile>
            <Label icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}>Meilleure série</Label>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
              <CountUp value={stats.bestStreak} reduced={reduced} />
              <span className="ml-1.5 text-sm font-medium text-[var(--text-muted)]">{stats.bestStreak > 1 ? "jours" : "jour"}</span>
            </p>
          </Tile>
          <Tile>
            <Label icon={<Target className="h-3.5 w-3.5 text-sky-400" />}>Objectif de la semaine</Label>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
              <CountUp value={stats.weeklyRate} reduced={reduced} />
              <span className="text-sm font-medium text-[var(--text-muted)]">%</span>
            </p>
            <Bar value={stats.weeklyRate / 100} reduced={reduced} className="mt-2" />
          </Tile>
          <Tile>
            <Label icon={<Sparkles className="h-3.5 w-3.5 text-violet-400" />}>Cette semaine</Label>
            <div className="mt-3 flex h-14 items-end gap-1.5" role="img" aria-label="Part des habitudes faites chaque jour de la semaine">
              {week.map((d, i) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-10 w-full items-end overflow-hidden rounded-md bg-[var(--text-primary)]/[0.05]">
                    <motion.div
                      className={cn("w-full rounded-md", d.isToday ? "bg-[var(--accent-primary)]" : "bg-[var(--success)]/80")}
                      initial={reduced ? false : { height: 0 }}
                      animate={{ height: `${Math.round(stats.perDay[i] * 100)}%` }}
                      transition={{ ...SPRING_LAYOUT, delay: reduced ? 0 : 0.15 + i * 0.03 }}
                    />
                  </div>
                  <span className={cn("text-[10px]", d.isToday ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-muted)]", d.isFuture && "opacity-50")}>{d.short[0]}</span>
                </div>
              ))}
            </div>
          </Tile>
        </Rise>

        {/* Filtres */}
        <Rise className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            id="habits-filter"
            value={filter}
            onChange={setFilter}
            label="Filtrer"
            options={[
              ["all", null, `Toutes · ${counts.all}`],
              ["todo", null, `À faire · ${counts.todo}`],
              ["done", null, `Faites · ${counts.done}`],
            ]}
          />
          <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 transition-colors focus-within:border-[var(--accent-primary)]/60 sm:w-64">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" aria-label="Rechercher une habitude" className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
          </label>
        </Rise>

        {/* Contenu */}
        <Rise>
          {loading && habits.length === 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]" />
              ))}
            </div>
          ) : error && habits.length === 0 ? (
            <Tile className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-[var(--text-primary)]">Impossible de charger vos habitudes.</p>
              <button type="button" onClick={() => reload()} className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                <RefreshCw className="h-3.5 w-3.5" />
                Réessayer
              </button>
            </Tile>
          ) : habits.length === 0 ? (
            <EmptyState onPick={(p) => save({ name: p.name, emoji: p.emoji, description: null, target_per_week: p.target }, null)} onCreate={() => setEditor({ open: true, habit: null })} />
          ) : visible.length === 0 ? (
            <Tile className="py-10 text-center text-sm text-[var(--text-muted)]">Aucune habitude ne correspond.</Tile>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={layout} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.22 }}>
                {layout === "week" ? (
                  <WeekTable habits={visible} week={week} isDone={isDoneOnDate} onToggle={toggle} weekCount={weekCount} reduced={reduced} />
                ) : (
                  <LayoutGroup>
                    <motion.ul layout={!reduced} className={layout === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
                      <AnimatePresence initial={false} mode="popLayout">
                        {visible.map((h) => (
                          <motion.li
                            key={h.id}
                            layout={!reduced}
                            initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                            transition={SPRING_LAYOUT}
                          >
                            {layout === "grid" ? (
                              <HabitCard
                                habit={h}
                                week={week}
                                done={isDoneToday(h.id)}
                                isDone={isDoneOnDate}
                                streak={getStreak(h.id)}
                                weekDone={weekCount(h.id)}
                                onToggle={toggle}
                                onEdit={() => setEditor({ open: true, habit: h })}
                                onDelete={() => del(h)}
                                reduced={reduced}
                              />
                            ) : (
                              <HabitRow
                                habit={h}
                                done={isDoneToday(h.id)}
                                history={getHistory(h.id)}
                                streak={getStreak(h.id)}
                                weekDone={weekCount(h.id)}
                                onToggle={() => toggle(h.id)}
                                onEdit={() => setEditor({ open: true, habit: h })}
                                onDelete={() => del(h)}
                                reduced={reduced}
                              />
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </motion.ul>
                  </LayoutGroup>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </Rise>
      </motion.div>

      <HabitEditor
        open={editor.open}
        habit={editor.habit}
        onClose={() => setEditor({ open: false, habit: null })}
        onSave={(input) => save(input, editor.habit)}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------------------------------------------- */

function Rise({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.45 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Tile({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5", className)}>{children}</div>;
}

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
      {icon}
      {children}
    </p>
  );
}

/** Nombre qui compte jusqu'à sa valeur, depuis la valeur affichée (interruptible). */
function CountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const mv = useMotionValue(reduced ? value : 0);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { type: "spring", bounce: 0, duration: 0.8 });
    return () => c.stop();
  }, [mv, value, reduced]);
  return <motion.span>{text}</motion.span>;
}

function Bar({ value, reduced, className }: { value: number; reduced: boolean; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--text-primary)]/[0.06]", className)}>
      <motion.div
        className={cn("h-full rounded-full", value >= 1 ? "bg-[var(--success)]" : "bg-[var(--accent-primary)]")}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${Math.min(100, Math.round(value * 100))}%` }}
        transition={SPRING_LAYOUT}
      />
    </div>
  );
}

function ProgressRing({ done, total, reduced }: { done: number; total: number; reduced: boolean }) {
  const size = 84;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const complete = total > 0 && done === total;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${done} sur ${total} aujourd'hui`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-border)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct), stroke: complete ? "var(--success)" : "var(--accent-primary)" }}
          transition={{ type: "spring", bounce: 0, duration: 0.9 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {complete ? (
            <motion.span key="ok" initial={reduced ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}>
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--success)]" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <motion.path d="M5 12.5l4.2 4.2L19 7" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.15 }} />
              </svg>
            </motion.span>
          ) : (
            <motion.span key="pct" initial={false} exit={{ opacity: 0 }} className="text-base font-bold tabular-nums text-[var(--text-primary)]">
              {Math.round(pct * 100)}%
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Bouton « fait » : le cercle se remplit avec un ressort, la coche se trace, une onde part au moment où on coche. */
function CheckButton({ done, onClick, label, size = "lg", disabled, reduced }: { done: boolean; onClick: () => void; label: string; size?: "lg" | "sm"; disabled?: boolean; reduced: boolean }) {
  const [burst, setBurst] = useState(0);
  const prev = useRef(done);
  useEffect(() => {
    if (done && !prev.current) setBurst((b) => b + 1);
    prev.current = done;
  }, [done]);
  const dim = size === "lg" ? "h-11 w-11" : "h-8 w-8";
  return (
    <motion.button
      type="button"
      aria-pressed={done}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={reduced || disabled ? undefined : { scale: 0.88 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30",
        dim,
        done ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--text-primary)]/20 text-transparent hover:border-[var(--success)]/70"
      )}
    >
      {!reduced && burst > 0 && (
        <motion.span
          key={burst}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--success)]"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <svg viewBox="0 0 24 24" className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M5 12.5l4.2 4.2L19 7"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.4 }}
        />
      </svg>
    </motion.button>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (!streak) return null;
  return (
    <span className="flex items-center gap-1 rounded-full bg-orange-500/12 px-2 py-0.5 text-[11px] font-semibold text-orange-400">
      <Flame className="h-3 w-3" />
      {streak} j
    </span>
  );
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <button type="button" onClick={onEdit} aria-label="Modifier" className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onDelete} aria-label="Supprimer" className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function HabitCard({
  habit,
  week,
  done,
  isDone,
  streak,
  weekDone,
  onToggle,
  onEdit,
  onDelete,
  reduced,
}: {
  habit: Habit;
  week: Day[];
  done: boolean;
  isDone: (id: string, day: string) => boolean;
  streak: number;
  weekDone: number;
  onToggle: (id: string, day?: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  reduced: boolean;
}) {
  const target = habit.target_per_week || 7;
  return (
    <div
      className={cn(
        "group flex h-full flex-col gap-4 rounded-2xl border bg-[var(--surface-raised)] p-5 transition-colors duration-300",
        done ? "border-[var(--success)]/35" : "border-[var(--panel-border)] hover:border-[var(--text-primary)]/15"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--text-primary)]/[0.05] text-2xl">{habit.emoji || "🎯"}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{habit.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">{target === 7 ? "Tous les jours" : `${target} fois par semaine`}</span>
            <StreakBadge streak={streak} />
          </div>
        </div>
        <CheckButton done={done} onClick={() => onToggle(habit.id)} label={done ? "Décocher aujourd'hui" : "Fait aujourd'hui"} reduced={reduced} />
      </div>

      {habit.description && <p className="-mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{habit.description}</p>}

      <div className="mt-auto space-y-3">
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const on = isDone(habit.id, d.key);
            return (
              <button
                key={d.key}
                type="button"
                disabled={d.isFuture}
                onClick={() => onToggle(habit.id, d.key)}
                aria-pressed={on}
                aria-label={`${d.label} ${d.num}${on ? " : fait" : ""}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-35",
                  on ? "bg-[var(--success)]/15 text-[var(--success)]" : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.05]",
                  d.isToday && "ring-1 ring-inset ring-[var(--text-primary)]/20"
                )}
              >
                {d.short}
                <motion.span
                  className={cn("h-2 w-2 rounded-full", on ? "bg-[var(--success)]" : "bg-[var(--text-primary)]/15")}
                  initial={false}
                  animate={{ scale: on ? [1, 1.5, 1] : 1 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.35 }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Bar value={weekDone / target} reduced={reduced} className="flex-1" />
          <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
            {weekDone}/{target}
          </span>
          <Actions onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

function HabitRow({
  habit,
  done,
  history,
  streak,
  weekDone,
  onToggle,
  onEdit,
  onDelete,
  reduced,
}: {
  habit: Habit;
  done: boolean;
  history: Set<string>;
  streak: number;
  weekDone: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  reduced: boolean;
}) {
  const days = useMemo(() => lastDays(14), []);
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-4 py-3">
      <CheckButton done={done} onClick={onToggle} size="sm" label={done ? "Décocher aujourd'hui" : "Fait aujourd'hui"} reduced={reduced} />
      <span className="text-xl">{habit.emoji || "🎯"}</span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold transition-colors", done ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]")}>{habit.name}</p>
        <p className="text-[11px] text-[var(--text-muted)]">
          {weekDone}/{habit.target_per_week || 7} cette semaine
        </p>
      </div>
      <StreakBadge streak={streak} />
      <div className="hidden items-center gap-1 md:flex" aria-label="14 derniers jours">
        {days.map((k) => (
          <span key={k} title={k} className={cn("h-3 w-3 rounded-[4px]", history.has(k) ? "bg-[var(--success)]" : "bg-[var(--text-primary)]/[0.07]")} />
        ))}
      </div>
      <Actions onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function WeekTable({
  habits,
  week,
  isDone,
  onToggle,
  weekCount,
  reduced,
}: {
  habits: Habit[];
  week: Day[];
  isDone: (id: string, day: string) => boolean;
  onToggle: (id: string, day?: string) => void;
  weekCount: (id: string) => number;
  reduced: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--panel-border)]">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Habitude</th>
            {week.map((d) => (
              <th key={d.key} className={cn("px-1 py-3 text-center text-[11px] font-semibold", d.isToday ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                <span className="block">{d.short}</span>
                <span className={cn("mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", d.isToday && "bg-[var(--accent-primary)] text-[var(--accent-contrast)]")}>{d.num}</span>
              </th>
            ))}
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Semaine</th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => (
            <tr key={h.id} className="border-b border-[var(--panel-border)] last:border-0">
              <td className="px-4 py-3">
                <span className="flex items-center gap-2.5">
                  <span className="text-lg">{h.emoji || "🎯"}</span>
                  <span className="truncate font-medium text-[var(--text-primary)]">{h.name}</span>
                </span>
              </td>
              {week.map((d) => (
                <td key={d.key} className="px-1 py-2 text-center">
                  <span className="inline-flex">
                    <CheckButton
                      done={isDone(h.id, d.key)}
                      onClick={() => onToggle(h.id, d.key)}
                      disabled={d.isFuture}
                      size="sm"
                      label={`${h.name}, ${d.label}`}
                      reduced={reduced}
                    />
                  </span>
                </td>
              ))}
              <td className="px-4 py-3 text-right text-xs tabular-nums text-[var(--text-muted)]">
                {weekCount(h.id)}/{h.target_per_week || 7}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onPick, onCreate }: { onPick: (p: (typeof PRESETS)[number]) => void; onCreate: () => void }) {
  return (
    <Tile className="flex flex-col items-center gap-5 px-6 py-12 text-center">
      <motion.span className="text-5xl" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.35, duration: 0.6, delay: 0.1 }} aria-hidden>
        🌱
      </motion.span>
      <div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Commencez par une habitude</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Une idée en un clic, ou la vôtre.</p>
      </div>
      <div className="flex max-w-xl flex-wrap justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/10"
          >
            <span>{p.emoji}</span>
            {p.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCreate} className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110">
        <Plus className="h-4 w-4" />
        Créer la mienne
      </button>
    </Tile>
  );
}

function HabitEditor({
  open,
  habit,
  onClose,
  onSave,
}: {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSave: (input: { name: string; emoji: string; description: string | null; target_per_week: number }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [target, setTarget] = useState(7);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setEmoji(habit?.emoji || EMOJIS[0]);
    setTarget(habit?.target_per_week || 7);
    setDesc(habit?.description ?? "");
  }, [open, habit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onSave({ name: name.trim(), emoji, description: desc.trim() || null, target_per_week: target });
    setBusy(false);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={habit ? "Modifier l'habitude" : "Nouvelle habitude"} hideFooter size="md">
      <form onSubmit={submit} className="space-y-5">
        {!habit && (
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setName(p.name);
                  setEmoji(p.emoji);
                  setTarget(p.target);
                }}
                className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <motion.span key={emoji} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.4, duration: 0.4 }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--text-primary)]/[0.06] text-2xl">
            {emoji}
          </motion.span>
          <input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'habitude"
            aria-label="Nom de l'habitude"
            className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-main)] px-4 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
          />
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12" role="radiogroup" aria-label="Emoji">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              onClick={() => setEmoji(e)}
              className={cn("relative flex h-9 items-center justify-center rounded-lg text-lg transition-colors", emoji === e ? "" : "hover:bg-[var(--text-primary)]/[0.05]")}
            >
              {emoji === e && <motion.span layoutId="habit-emoji" transition={SPRING_PILL} className="absolute inset-0 rounded-lg bg-[var(--accent-primary)]/20 ring-1 ring-[var(--accent-primary)]/50" />}
              <span className="relative">{e}</span>
            </button>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Objectif : {target === 7 ? "tous les jours" : `${target} fois par semaine`}</p>
          <Segmented id="habit-target" value={target} onChange={setTarget} label="Objectif par semaine" options={[1, 2, 3, 4, 5, 6, 7].map((n) => [n, null, String(n)] as const)} stretch />
        </div>
        <textarea
          value={desc}
          maxLength={280}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Note (facultatif)"
          aria-label="Note"
          className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            Annuler
          </button>
          <button type="submit" disabled={!name.trim() || busy} className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition-[filter,opacity] hover:brightness-110 disabled:opacity-40">
            {habit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Choix exclusif avec pastille glissante (ressort interruptible). */
function Segmented<T extends string | number>({
  id,
  value,
  options,
  onChange,
  label,
  stretch,
}: {
  id: string;
  value: T;
  options: ReadonlyArray<readonly [T, ReactNode, string]>;
  onChange: (v: T) => void;
  label: string;
  stretch?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1", stretch ? "w-full" : "inline-flex")}>
      {options.map(([v, icon, text]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={icon ? text : undefined}
          title={icon ? text : undefined}
          onClick={() => value !== v && onChange(v)}
          className={cn(
            "relative flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
            stretch && "flex-1",
            value === v ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {value === v && <motion.span layoutId={`seg-${id}`} transition={SPRING_PILL} className="absolute inset-0 rounded-lg bg-[var(--text-primary)]/[0.09]" />}
          <span className="relative flex items-center gap-1.5">
            {icon}
            {(!icon || stretch) && text}
            {icon && <span className="hidden lg:inline">{text}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
