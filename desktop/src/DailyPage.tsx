import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePersisted } from "./qol";
import { motion } from "framer-motion";
import { CalendarDays, Check, FileText, Flame, ListChecks, NotebookPen, Pause, Play, Receipt, RotateCcw, Timer, Trash2, Zap } from "lucide-react";
import ProductivityPage from "./ProductivityPage";
import { apiData, itemsCreate, restCall } from "./api";
import { AMBIENT_IDS, BakedSound, fillAmbient, LOOP_SECONDS, SoundId } from "./sounds";
import { tasksCreate } from "./tasks";
import { errorText, tr, lang } from "./i18n";
import { Empty, ErrorBox, Field, PageHead, SideNav, Skeletons, Stat, useLoad } from "./kit";
import { EASE_SNAP, SPRING_PRESS } from "./motion";
import { readJson, write } from "./settings";
import { Button } from "./ui";

type Section = "capture" | "notes" | "tasks" | "events" | "habits" | "focus" | "bills" | "scratchpad" | "ambience";
export interface Habit { id: string; name: string; description: string | null; emoji: string | null; color: string | null; target_per_week: number; archived: boolean }
export interface Completion { id: string; habit_id: string; completed_on: string }
interface FocusEntry { completedAt: string; seconds: number }
interface BillData { amount?: number; currency?: string; dueDate?: string; paid?: boolean; category?: string; recurrence?: string }
interface Bill { id: string; label: string; data: BillData }

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const lastDays = (count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (count - 1 - index));
  return date;
});

export function habitStreak(days: Set<string>, today = new Date()): number {
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
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(lang, { weekday: "narrow" }), []);

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
                      <motion.button key={key} type="button" whileTap={{ scale: 0.86 }} transition={SPRING_PRESS} className={`${on ? "on" : ""} ${key === today ? "today" : ""}`} aria-pressed={on} aria-label={`${habit.name}, ${date.toLocaleDateString(lang)}`} onClick={() => void toggle(habit, key)}>
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
  const money = useMemo(() => new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }), []);
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
              <span><b>{bill.label}</b>{bill.data?.dueDate && <small>{new Date(bill.data.dueDate).toLocaleDateString(lang)}</small>}</span>
              <b>{money.format(bill.data?.amount ?? 0)}</b>
              <button type="button" className="icon-btn" disabled={busy} aria-label={tr(`Supprimer ${bill.label}`, `Delete ${bill.label}`)} onClick={() => void action(() => apiData("api/user-data/bills", "DELETE", { id: bill.id }))}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const SOUNDS: { id: SoundId; label: () => string; text: () => string }[] = [
  { id: "rain", label: () => tr("Pluie", "Rain"), text: () => tr("Pluie continue.", "Steady rain.") },
  { id: "storm", label: () => tr("Orage", "Storm"), text: () => tr("Pluie et tonnerre lointain.", "Rain and distant thunder.") },
  { id: "ocean", label: () => tr("Océan", "Ocean"), text: () => tr("Vagues lentes.", "Slow waves.") },
  { id: "wind", label: () => tr("Vent", "Wind"), text: () => tr("Rafales douces.", "Soft gusts.") },
  { id: "forest", label: () => tr("Forêt", "Forest"), text: () => tr("Feuillage et oiseaux.", "Leaves and birds.") },
  { id: "nature", label: () => "Nature", text: () => tr("Ruisseau et oiseaux.", "Stream and birds.") },
  { id: "fireplace", label: () => tr("Cheminée", "Fireplace"), text: () => tr("Feu de bois qui crépite.", "Crackling wood fire.") },
  { id: "cafe", label: () => tr("Café", "Café"), text: () => tr("Brouhaha et tasses.", "Murmur and cups.") },
  { id: "night", label: () => tr("Nuit", "Night"), text: () => tr("Grillons au calme.", "Quiet crickets.") },
  { id: "train", label: () => "Train", text: () => tr("Roulement régulier.", "Steady rolling.") },
  { id: "space", label: () => tr("Espace", "Space"), text: () => tr("Nappe grave et lente.", "Slow deep drone.") },
  { id: "brown", label: () => tr("Bruit brun", "Brown noise"), text: () => tr("Grave et enveloppant.", "Deep and enveloping.") },
  { id: "pink", label: () => tr("Bruit rose", "Pink noise"), text: () => tr("Doux et équilibré.", "Soft and balanced.") },
  { id: "binaural", label: () => tr("Ondes alpha", "Alpha waves"), text: () => tr("Battement binaural de 10 Hz, à écouter au casque.", "10 Hz binaural beat, best on headphones.") },
];

function ambientBuffer(context: AudioContext, id: BakedSound): AudioBuffer {
  const buffer = context.createBuffer(2, context.sampleRate * LOOP_SECONDS, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) fillAmbient(id, buffer.getChannelData(channel), context.sampleRate);
  return buffer;
}

function Ambience() {
  const context = useRef<AudioContext | null>(null);
  const playing = useRef(new Map<SoundId, { gain: GainNode; stop: () => void }>());
  const [levels, setLevels] = useState<Record<SoundId, number>>(() => ({ ...Object.fromEntries(AMBIENT_IDS.map((id) => [id, 0.4])) as Record<SoundId, number>, ...readJson<Partial<Record<SoundId, number>>>("ethone-ambience") }));
  const [active, setActive] = useState<SoundId[]>([]);
  useEffect(() => {
    const sounds = playing.current;
    return () => {
      sounds.forEach((sound) => sound.stop());
      sounds.clear();
      void context.current?.close();
    };
  }, []);
  const start = (id: SoundId) => {
    const audio = (context.current ??= new AudioContext());
    void audio.resume();
    const gain = audio.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(levels[id], audio.currentTime + 0.6);
    gain.connect(audio.destination);
    if (id === "binaural") {
      const merger = audio.createChannelMerger(2);
      const left = audio.createOscillator();
      const right = audio.createOscillator();
      left.frequency.value = 200;
      right.frequency.value = 210;
      left.connect(merger, 0, 0);
      right.connect(merger, 0, 1);
      merger.connect(gain);
      left.start();
      right.start();
      playing.current.set(id, { gain, stop: () => { left.stop(); right.stop(); gain.disconnect(); } });
      return;
    }
    const source = audio.createBufferSource();
    source.buffer = ambientBuffer(audio, id);
    source.loop = true;
    source.connect(gain);
    source.start();
    playing.current.set(id, { gain, stop: () => { source.stop(); gain.disconnect(); } });
  };
  const toggle = (id: SoundId) => {
    const sound = playing.current.get(id);
    if (sound) {
      sound.stop();
      playing.current.delete(id);
      setActive((current) => current.filter((item) => item !== id));
    } else {
      start(id);
      setActive((current) => [...current, id]);
    }
  };
  const level = (id: SoundId, value: number) => {
    const next = { ...levels, [id]: value };
    setLevels(next);
    write("ethone-ambience", JSON.stringify(next));
    const sound = playing.current.get(id);
    if (sound && context.current) sound.gain.gain.linearRampToValueAtTime(value, context.current.currentTime + 0.1);
  };
  return (
    <>
      <PageHead title={tr("Ambiance", "Ambience")} text={tr("14 sons générés sur ce PC, que tu peux mélanger. Ils s'arrêtent quand tu quittes cette page.", "Sounds generated on this PC that you can mix. They stop when you leave this page.")} />
      <ul className="ambience-sounds">
        {SOUNDS.map((sound) => {
          const on = active.includes(sound.id);
          return (
            <li key={sound.id}>
              <div><b className={on ? "on" : ""}>{sound.label()}</b><button type="button" className="icon-btn" aria-pressed={on} aria-label={sound.label()} onClick={() => toggle(sound.id)}>{on ? <Pause size={16} /> : <Play size={16} />}</button></div>
              <small className="muted">{sound.text()}</small>
              <input type="range" min={0} max={1} step={0.01} value={levels[sound.id]} aria-label={tr(`Volume : ${sound.label()}`, `Volume: ${sound.label()}`)} onChange={(event) => level(sound.id, Number(event.target.value))} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Capture() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const save = async (kind: "notes" | "tasks") => {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const input = { title: title.trim() || body.trim().slice(0, 80), body: body.trim(), done: false, startAt: null, endAt: null, data: { source: "desktop-capture" } };
      await (kind === "tasks" ? tasksCreate(input) : itemsCreate(kind, input));
      setTitle("");
      setBody("");
      setMessage({ text: kind === "notes" ? tr("Note enregistrée.", "Note saved.") : tr("Tâche ajoutée.", "Task added."), ok: true });
    } catch (reason) {
      setMessage({ text: errorText(reason), ok: false });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title={tr("Capture rapide", "Quick capture")} text={tr("Colle un lien, un texte ou une idée, puis garde-le en note ou en tâche.", "Paste a link, text or idea, then keep it as a note or task.")} />
      <Field label={tr("Titre", "Title")}><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label={tr("Contenu", "Content")}><textarea rows={8} value={body} onChange={(event) => setBody(event.target.value)} /></Field>
      <div className="row">
        <Button variant="primary" disabled={busy || (!title.trim() && !body.trim())} onClick={() => void save("notes")}><NotebookPen size={15} />{tr("Garder en note", "Save as note")}</Button>
        <Button disabled={busy || (!title.trim() && !body.trim())} onClick={() => void save("tasks")}><ListChecks size={15} />{tr("Garder en tâche", "Save as task")}</Button>
      </div>
      {message && <p className={message.ok ? "ok" : "bad"} role="status">{message.text}</p>}
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

export default function WorkPage() {
  const [section, setSection] = usePersisted<Section>("ethone-section-productivity", "tasks");
  const items = [
    { id: "tasks", label: tr("Tâches", "Tasks"), icon: <ListChecks size={16} />, group: tr("Organisation", "Organize") },
    { id: "events", label: tr("Calendrier", "Calendar"), icon: <CalendarDays size={16} />, group: tr("Organisation", "Organize") },
    { id: "notes", label: tr("Notes", "Notes"), icon: <NotebookPen size={16} />, group: tr("Organisation", "Organize") },
    { id: "scratchpad", label: tr("Mémo", "Scratchpad"), icon: <FileText size={16} />, group: tr("Organisation", "Organize") },
    { id: "capture", label: tr("Capture rapide", "Quick capture"), icon: <Zap size={16} />, group: tr("Organisation", "Organize") },
    { id: "habits", label: tr("Habitudes", "Habits"), icon: <Flame size={16} />, group: tr("Quotidien", "Daily") },
    { id: "focus", label: tr("Concentration", "Focus"), icon: <Timer size={16} />, group: tr("Quotidien", "Daily") },
    { id: "bills", label: tr("Factures", "Bills"), icon: <Receipt size={16} />, group: tr("Quotidien", "Daily") },
  ] as const;
  return (
    <div className="kit-split">
      <SideNav items={items} value={section} onChange={setSection} id="work" label={tr("Productivité", "Productivity")} />
      <div className="kit-split-body">
        {(section === "notes" || section === "tasks" || section === "events") && <ProductivityPage kind={section} />}
        {section === "habits" && <Habits />}
        {(section === "focus" || section === "ambience") && <><Focus /><Ambience /></>}
        {section === "bills" && <Bills />}
        {section === "scratchpad" && <Scratchpad />}
        {section === "capture" && <Capture />}
      </div>
    </div>
  );
}
