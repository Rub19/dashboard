import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, FileText, Flame, Pause, Play, Receipt, RotateCcw, Timer, Trash2 } from "lucide-react";
import { apiData, restCall } from "./api";
import { errorText, tr } from "./i18n";
import { Empty, ErrorBox, Field, PageHead, SideNav, Skeletons, Stat, useLoad } from "./kit";
import { EASE_SNAP, SPRING_PRESS } from "./motion";
import { readJson, write } from "./settings";
import { Button } from "./ui";

type Section = "habits" | "focus" | "bills" | "scratchpad";
interface Habit { id: string; name: string; description: string | null; emoji: string | null; color: string | null; target_per_week: number; archived: boolean }
interface Completion { id: string; habit_id: string; completed_on: string }
interface FocusEntry { completedAt: string; seconds: number }
interface BillData { amount?: number; currency?: string; dueDate?: string; paid?: boolean; category?: string; recurrence?: string }
interface Bill { id: string; label: string; data: BillData }

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const lastDays = (count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (count - 1 - index));
  return date;
});

function habitStreak(days: Set<string>, today = new Date()): number {
  let streak = 0;
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function Habits() {
  const state = useLoad(async () => {
    const [habits, completions] = await Promise.all([
      restCall<Habit[]>("ethone_habits?select=*&archived=eq.false&order=created_at.desc"),
      restCall<Completion[]>("ethone_habit_completions?select=id,habit_id,completed_on&order=completed_on.desc&limit=10000"),
    ]);
    return { habits, completions };
  });
  const [name, setName] = useState("");
  const [target, setTarget] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = dayKey(new Date());
  const week = useMemo(() => lastDays(7), []);
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "narrow" }), []);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await restCall("ethone_habits", "POST", { name: name.trim(), target_per_week: target }, "return=minimal");
      setName("");
      state.reload();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (habit: Habit, day: string) => {
    const found = state.data?.completions.find((item) => item.habit_id === habit.id && item.completed_on === day);
    setError(null);
    try {
      if (found) await restCall(`ethone_habit_completions?id=eq.${found.id}`, "DELETE", undefined, "return=minimal");
      else await restCall("ethone_habit_completions", "POST", { habit_id: habit.id, completed_on: day }, "return=minimal");
      state.reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const remove = async (habit: Habit) => {
    setError(null);
    try {
      await restCall(`ethone_habits?id=eq.${habit.id}`, "PATCH", { archived: true }, "return=minimal");
      state.reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  return (
    <>
      <PageHead title={tr("Habitudes", "Habits")} text={tr("Synchronisées avec ton compte Ethone.", "Synced with your Ethone account.")} />
      <form className="daily-add" onSubmit={(event) => void add(event)}>
        <input value={name} maxLength={80} placeholder={tr("Nouvelle habitude", "New habit")} aria-label={tr("Nom de l'habitude", "Habit name")} onChange={(event) => setName(event.target.value)} />
        <label className="daily-target">{tr("Objectif", "Goal")}<select value={target} onChange={(event) => setTarget(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value}/{tr("sem.", "wk")}</option>)}</select></label>
        <Button type="submit" variant="primary" disabled={busy || !name.trim()}>{tr("Ajouter", "Add")}</Button>
      </form>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!state.data ? (state.loading ? <Skeletons /> : null) : state.data.habits.length === 0 ? <Empty title={tr("Aucune habitude", "No habits")} text={tr("Ajoute ta première habitude ci-dessus.", "Add your first habit above.")} /> : (
        <ul className="habit-list">
          {state.data.habits.map((habit) => {
            const days = new Set(state.data!.completions.filter((item) => item.habit_id === habit.id).map((item) => item.completed_on));
            const streak = habitStreak(days);
            const weekCount = week.filter((date) => days.has(dayKey(date))).length;
            return (
              <li key={habit.id}>
                <span className="habit-name"><b>{habit.emoji ? `${habit.emoji} ` : ""}{habit.name}</b><small>{weekCount}/{habit.target_per_week} {tr("cette semaine", "this week")}{streak > 0 && <i><Flame size={12} />{streak}</i>}</small></span>
                <span className="habit-week">
                  {week.map((date) => {
                    const key = dayKey(date);
                    const on = days.has(key);
                    return (
                      <motion.button key={key} type="button" whileTap={{ scale: 0.86 }} transition={SPRING_PRESS} className={`${on ? "on" : ""} ${key === today ? "today" : ""}`} aria-pressed={on} aria-label={`${habit.name}, ${date.toLocaleDateString()}`} onClick={() => void toggle(habit, key)}>
                        {on ? <Check size={14} /> : dayFormat.format(date)}
                      </motion.button>
                    );
                  })}
                </span>
                <button type="button" className="icon-btn" aria-label={tr(`Archiver ${habit.name}`, `Archive ${habit.name}`)} title={tr("Archiver", "Archive")} onClick={() => void remove(habit)}><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const FOCUS_KEY = "ethone-focus-history";
function Focus() {
  const [minutes, setMinutes] = useState(() => readJson<number>("ethone-focus-minutes") ?? 25);
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<FocusEntry[]>(() => readJson<FocusEntry[]>(FOCUS_KEY) ?? []);
  const end = useRef(0);

  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + left * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        setHistory((current) => {
          const next = [{ completedAt: new Date().toISOString(), seconds: minutes * 60 }, ...current].slice(0, 500);
          write(FOCUS_KEY, JSON.stringify(next));
          return next;
        });
      }
    }, 500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const choose = (value: number) => {
    setMinutes(value);
    write("ethone-focus-minutes", JSON.stringify(value));
    setRunning(false);
    setLeft(value * 60);
  };
  const reset = () => {
    setRunning(false);
    setLeft(minutes * 60);
  };
  const today = dayKey(new Date());
  const todayEntries = history.filter((entry) => dayKey(new Date(entry.completedAt)) === today);
  const todaySeconds = todayEntries.reduce((total, entry) => total + entry.seconds, 0);
  const progress = 1 - left / (minutes * 60);
  const radius = 118;
  return (
    <>
      <PageHead title={tr("Concentration", "Focus")} text={tr("Les séances terminées sont gardées sur ce PC.", "Finished sessions are kept on this PC.")} />
      <div className="focus">
        <div className="focus-ring">
          <svg viewBox="0 0 260 260" aria-hidden="true">
            <circle cx="130" cy="130" r={radius} className="focus-track" />
            <motion.circle cx="130" cy="130" r={radius} className="focus-fill" transform="rotate(-90 130 130)" animate={{ pathLength: progress }} transition={{ duration: 0.5, ease: EASE_SNAP }} />
          </svg>
          <span role="timer" aria-label={tr("Temps restant", "Time left")}>{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>
        </div>
        <div className="row focus-controls">
          <Button variant="primary" onClick={() => setRunning((value) => !value)} disabled={left === 0}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? tr("Pause", "Pause") : tr("Démarrer", "Start")}</Button>
          <Button onClick={reset}><RotateCcw size={15} />{tr("Recommencer", "Reset")}</Button>
          <span className="focus-presets">{[15, 25, 45, 60].map((value) => <button key={value} type="button" className={minutes === value ? "on" : ""} onClick={() => choose(value)}>{value} min</button>)}</span>
        </div>
        <div className="focus-stats">
          <Stat label={tr("Séances aujourd'hui", "Sessions today")} value={todayEntries.length} />
          <Stat label={tr("Temps aujourd'hui", "Time today")} value={`${Math.round(todaySeconds / 60)} min`} />
          <Stat label={tr("Total", "Total")} value={history.length} hint={tr("séances", "sessions")} />
        </div>
      </div>
    </>
  );
}

function Bills() {
  const state = useLoad(() => apiData<Bill[]>("api/user-data/bills"));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const money = useMemo(() => new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }), []);
  const action = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await run();
      state.reload();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!label.trim() || !Number.isFinite(value)) return;
    void action(async () => {
      await apiData("api/user-data/bills", "POST", { slug: `bill-${Date.now()}`, label: label.trim(), data: { amount: value, currency: "EUR", dueDate, paid: false, category: "other", recurrence: "none" } });
      setLabel("");
      setAmount("");
      setDueDate("");
    });
  };
  const bills = [...(state.data ?? [])].sort((left, right) => Number(left.data?.paid ?? false) - Number(right.data?.paid ?? false) || (left.data?.dueDate ?? "").localeCompare(right.data?.dueDate ?? ""));
  const due = bills.filter((bill) => !bill.data?.paid).reduce((total, bill) => total + (bill.data?.amount ?? 0), 0);
  return (
    <>
      <PageHead title={tr("Factures", "Bills")} text={tr("Synchronisées avec ton compte Ethone.", "Synced with your Ethone account.")} />
      <div className="focus-stats"><Stat label={tr("Reste à payer", "Left to pay")} value={money.format(due)} /><Stat label={tr("Factures", "Bills")} value={bills.length} /></div>
      <form className="daily-add" onSubmit={add}>
        <input value={label} placeholder={tr("Nom de la facture", "Bill name")} aria-label={tr("Nom de la facture", "Bill name")} onChange={(event) => setLabel(event.target.value)} />
        <input value={amount} inputMode="decimal" placeholder={tr("Montant", "Amount")} aria-label={tr("Montant", "Amount")} onChange={(event) => setAmount(event.target.value)} />
        <input type="date" value={dueDate} aria-label={tr("Échéance", "Due date")} onChange={(event) => setDueDate(event.target.value)} />
        <Button type="submit" variant="primary" disabled={busy || !label.trim() || !amount.trim()}>{tr("Ajouter", "Add")}</Button>
      </form>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!state.data ? (state.loading ? <Skeletons /> : null) : bills.length === 0 ? <Empty title={tr("Aucune facture", "No bills")} /> : (
        <ul className="bill-list">
          {bills.map((bill) => (
            <li key={bill.id} className={bill.data?.paid ? "paid" : ""}>
              <button type="button" className="bill-check" aria-pressed={Boolean(bill.data?.paid)} aria-label={tr(`Marquer ${bill.label} comme payée`, `Mark ${bill.label} as paid`)} disabled={busy} onClick={() => void action(() => apiData("api/user-data/bills", "PATCH", { id: bill.id, data: { ...bill.data, paid: !bill.data?.paid } }))}>{bill.data?.paid && <Check size={13} />}</button>
              <span><b>{bill.label}</b>{bill.data?.dueDate && <small>{new Date(bill.data.dueDate).toLocaleDateString()}</small>}</span>
              <b>{money.format(bill.data?.amount ?? 0)}</b>
              <button type="button" className="icon-btn" disabled={busy} aria-label={tr(`Supprimer ${bill.label}`, `Delete ${bill.label}`)} onClick={() => void action(() => apiData("api/user-data/bills", "DELETE", { id: bill.id }))}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Scratchpad() {
  const [text, setText] = useState(() => readJson<string>("ethone-scratchpad") ?? "");
  useEffect(() => {
    const timer = setTimeout(() => write("ethone-scratchpad", JSON.stringify(text)), 300);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <>
      <PageHead title={tr("Mémo", "Scratchpad")} text={tr("Gardé sur ce PC, enregistré pendant que tu écris.", "Kept on this PC, saved as you type.")} />
      <Field label={tr("Texte", "Text")}><textarea className="scratchpad" rows={22} value={text} onChange={(event) => setText(event.target.value)} /></Field>
    </>
  );
}

export default function DailyPage() {
  const [section, setSection] = useState<Section>("habits");
  const items = [
    { id: "habits", label: tr("Habitudes", "Habits"), icon: <Flame size={16} /> },
    { id: "focus", label: tr("Concentration", "Focus"), icon: <Timer size={16} /> },
    { id: "bills", label: tr("Factures", "Bills"), icon: <Receipt size={16} /> },
    { id: "scratchpad", label: tr("Mémo", "Scratchpad"), icon: <FileText size={16} /> },
  ] as const;
  return (
    <div className="kit-split">
      <SideNav items={items} value={section} onChange={setSection} id="daily" label={tr("Quotidien", "Daily")} />
      <div className="kit-split-body">
        {section === "habits" && <Habits />}
        {section === "focus" && <Focus />}
        {section === "bills" && <Bills />}
        {section === "scratchpad" && <Scratchpad />}
      </div>
    </div>
  );
}
