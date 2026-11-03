import { FormEvent, useState } from "react";
import Select from "./Select";
import { Check, ListChecks, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { apiCall, apiData, itemsList, restCall } from "./api";
import { dayKey } from "./DailyPage";
import { firstArray, Json } from "./generic";
import { errorText, lang, tr } from "./i18n";
import { Drawer, Empty, ErrorBox, PageHead, Status, useLoad } from "./kit";
import { GO_EVENT, MACRO_TARGETS, pageForHref } from "./navigation";
import { taskDue, taskLate } from "./productivity";
import { readJson } from "./settings";
import { tasksList } from "./tasks";
import { todayEvents } from "./home";
import { Button } from "./ui";

interface Briefing { events: string[]; late: string[]; today: string[]; open: number; habitsLeft: string[]; unread: number | null; focus: number }

async function loadBriefing(): Promise<Briefing> {
  const now = new Date();
  const today = dayKey(now);
  const [tasks, events, habits, done, unread] = await Promise.all([
    tasksList(),
    itemsList("events"),
    restCall<{ id: string; name: string }[]>("ethone_habits?select=id,name&archived=eq.false").catch(() => []),
    restCall<{ habit_id: string }[]>(`ethone_habit_completions?select=habit_id&completed_on=eq.${today}`).catch(() => []),
    apiCall<{ meta?: { unread?: number } }>("api/mail/inbox?folder=inbox&limit=1").then((answer) => answer.meta?.unread ?? 0).catch(() => null),
  ]);
  const open = tasks.filter((task) => !task.done);
  const focus = (readJson<{ completedAt: string; seconds: number }[]>("ethone-focus-history") ?? []).filter((entry) => new Date(entry.completedAt).toDateString() === now.toDateString()).reduce((total, entry) => total + entry.seconds, 0);
  return {
    events: todayEvents(events, now).map((event) => `${event.startAt ? new Date(event.startAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) : ""} ${event.title}`.trim()),
    late: open.filter((task) => taskLate(task, today)).map((task) => task.title),
    today: open.filter((task) => taskDue(task) === today).map((task) => task.title),
    open: open.length,
    habitsLeft: habits.filter((habit) => !done.some((item) => item.habit_id === habit.id)).map((habit) => habit.name),
    unread,
    focus: Math.round(focus / 60),
  };
}

function briefingText(data: Briefing): string {
  return [
    `Événements du jour : ${data.events.join(", ") || "aucun"}.`,
    `Tâches en retard : ${data.late.join(", ") || "aucune"}.`,
    `Tâches pour aujourd'hui : ${data.today.join(", ") || "aucune"}. Tâches ouvertes au total : ${data.open}.`,
    `Habitudes restantes aujourd'hui : ${data.habitsLeft.join(", ") || "aucune"}.`,
    data.unread === null ? "" : `Mails non lus : ${data.unread}.`,
    `Concentration aujourd'hui : ${data.focus} min.`,
  ].filter(Boolean).join("\n");
}

export function BriefingPage() {
  const state = useLoad(loadBriefing);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ask = async (data: Briefing) => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiData<{ content?: string; text?: string; message?: string; output?: string }>("api/brain/complete", "POST", { messages: [{ role: "user", content: `Voici ma journée. Fais-moi un résumé court et dis-moi par quoi commencer, sans rien inventer.\n${briefingText(data)}` }] });
      setSummary(result.content ?? result.text ?? result.message ?? result.output ?? "");
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const list = (title: string, rows: string[], empty: string) => <section className="briefing-block"><h2>{title}</h2>{rows.length ? <ul>{rows.map((row) => <li key={row}>{row}</li>)}</ul> : <p className="muted">{empty}</p>}</section>;
  return (
    <>
      <PageHead title={tr("Résumé du jour", "Daily briefing")} text={new Date().toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" })} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {(data) => (
          <>
            <div className="briefing-grid">
              {list(tr("Calendrier", "Calendar"), data.events, tr("Rien de prévu.", "Nothing planned."))}
              {list(tr("En retard", "Late"), data.late, tr("Aucune tâche en retard.", "No late tasks."))}
              {list(tr("Pour aujourd'hui", "For today"), data.today, tr(`${data.open} tâche(s) ouverte(s), aucune pour aujourd'hui.`, `${data.open} open task(s), none for today.`))}
              {list(tr("Habitudes restantes", "Habits left"), data.habitsLeft, tr("Tout est fait.", "All done."))}
            </div>
            <div className="row">
              {data.unread !== null && <span className="muted small">{tr(`${data.unread} mail(s) non lu(s)`, `${data.unread} unread email(s)`)}</span>}
              <span className="muted small">{tr(`${data.focus} min de concentration`, `${data.focus} min of focus`)}</span>
              <Button variant="primary" disabled={busy} onClick={() => void ask(data)}><Sparkles size={14} />{busy ? tr("Brain réfléchit…", "Brain is thinking…") : tr("Demander à Brain", "Ask Brain")}</Button>
            </div>
            {summary && <p className="briefing-summary">{summary}</p>}
            {error && <ErrorBox message={error} />}
          </>
        )}
      </Status>
    </>
  );
}

interface Row { id: string; label: string; count?: number; data?: { [key: string]: Json } }

export function FlowsPage() {
  const path = "api/user-data/flows";
  const state = useLoad(async () => firstArray(await apiCall<Json>(path)) as unknown as Row[]);
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      state.reload();
      return true;
    } catch (reason) {
      setError(errorText(reason));
      return false;
    }
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    void run(() => apiData(path, "POST", { slug: `flows-${Date.now()}`, label: label.trim(), data: { steps: [] } })).then((ok) => ok && setLabel(""));
  };
  const show = (row: Row, start: boolean) => {
    setOpen(row);
    setSteps(Array.isArray(row.data?.steps) ? (row.data.steps as string[]) : []);
    setRunning(start);
    setDone([]);
  };
  const save = () => {
    if (!open) return;
    void run(() => apiData(path, "PATCH", { id: open.id, label: open.label, data: { ...open.data, steps: steps.map((step) => step.trim()).filter(Boolean) } })).then((ok) => ok && setOpen(null));
  };
  const rows = state.data ?? [];
  return (
    <>
      <PageHead title="Flows" text={tr("Tes routines, étape par étape.", "Your routines, step by step.")} onRefresh={state.reload} refreshing={state.loading} />
      <form className="daily-add" onSubmit={add}><input value={label} placeholder={tr("Nom du flow", "Flow name")} aria-label={tr("Nom du flow", "Flow name")} onChange={(event) => setLabel(event.target.value)} /><Button type="submit" variant="primary" disabled={!label.trim()}>{tr("Créer", "Create")}</Button></form>
      {error && !open && <ErrorBox message={error} />}
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {state.data && rows.length === 0 && <Empty title={tr("Aucun flow", "No flows")} text={tr("Crée ta première routine ci-dessus.", "Create your first routine above.")} />}
      <ul className="settings settings-grid">
        {rows.map((row) => {
          const count = Array.isArray(row.data?.steps) ? (row.data.steps as string[]).length : 0;
          return (
            <li key={row.id}>
              <span className="stack"><b>{row.label}</b><small className="muted">{tr(`${count} étape(s)`, `${count} step(s)`)}</small></span>
              <div className="row">
                <Button disabled={count === 0} onClick={() => show(row, true)}><Play size={14} />{tr("Lancer", "Run")}</Button>
                <Button onClick={() => show(row, false)}><ListChecks size={14} />{tr("Modifier", "Edit")}</Button>
                <Button aria-label={tr(`Supprimer ${row.label}`, `Delete ${row.label}`)} className="danger" onClick={() => void run(() => apiData(path, "DELETE", { id: row.id }))}><Trash2 size={14} /></Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Drawer open={Boolean(open)} title={open?.label ?? ""} onClose={() => setOpen(null)} width={460}>
        {open && running && (
          <ul className="flow-run">
            {steps.map((step, index) => <li key={`${index}-${step}`}><button type="button" className={done.includes(index) ? "on" : ""} aria-pressed={done.includes(index)} onClick={() => setDone(done.includes(index) ? done.filter((item) => item !== index) : [...done, index])}><i>{done.includes(index) && <Check size={13} />}</i>{step}</button></li>)}
            {done.length === steps.length && <li className="ok">{tr("Routine terminée", "Routine finished")}</li>}
          </ul>
        )}
        {open && !running && (
          <div className="flow-edit">
            <label className="kit-field"><span>{tr("Nom", "Name")}</span><input value={open.label} onChange={(event) => setOpen({ ...open, label: event.target.value })} /></label>
            {steps.map((step, index) => (
              <div className="flow-step" key={index}>
                <input value={step} aria-label={tr(`Étape ${index + 1}`, `Step ${index + 1}`)} placeholder={tr(`Étape ${index + 1}`, `Step ${index + 1}`)} onChange={(event) => setSteps(steps.map((other, position) => (position === index ? event.target.value : other)))} />
                <Button aria-label={tr("Retirer l'étape", "Remove step")} onClick={() => setSteps(steps.filter((_, position) => position !== index))}><Trash2 size={14} /></Button>
              </div>
            ))}
            <div className="row">
              <Button onClick={() => setSteps([...steps, ""])}><Plus size={14} />{tr("Ajouter une étape", "Add a step")}</Button>
              <Button variant="primary" disabled={!open.label.trim()} onClick={save}>{tr("Enregistrer", "Save")}</Button>
            </div>
            {error && <ErrorBox message={error} />}
          </div>
        )}
      </Drawer>
    </>
  );
}

export function MacrosPage() {
  const path = "api/user-data/macros";
  const state = useLoad(async () => firstArray(await apiCall<Json>(path)) as unknown as Row[]);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("/tasks");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    action().then(() => {
      after?.();
      state.reload();
    }, (reason) => setError(errorText(reason)));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    const reset = () => {
      setLabel("");
      setEditing(null);
    };
    const data = { action: "navigate", href };
    run(() => (editing ? apiData(path, "PATCH", { id: editing, label: label.trim(), data }) : apiData(path, "POST", { slug: `macros-${Date.now()}`, label: label.trim(), data })), reset);
  };
  const go = (row: Row) => {
    const page = pageForHref(String(row.data?.href ?? ""));
    if (page) window.dispatchEvent(new CustomEvent(GO_EVENT, { detail: page }));
  };
  const rows = state.data ?? [];
  return (
    <>
      <PageHead title="Macros" text={tr("Un clic pour aller directement à une page.", "One click to jump to a page.")} onRefresh={state.reload} refreshing={state.loading} />
      <form className="daily-add" onSubmit={submit}>
        <input value={label} placeholder={tr("Nom de la macro", "Macro name")} aria-label={tr("Nom de la macro", "Macro name")} onChange={(event) => setLabel(event.target.value)} />
        <Select value={href} aria-label={tr("Page à ouvrir", "Page to open")} onChange={(event) => setHref(event.target.value)}>{MACRO_TARGETS.map(([target, name]) => <option key={target} value={target}>{name()}</option>)}</Select>
        <Button type="submit" variant="primary" disabled={!label.trim()}>{editing ? tr("Enregistrer", "Save") : tr("Créer", "Create")}</Button>
        {editing && <Button onClick={() => { setEditing(null); setLabel(""); }}>{tr("Annuler", "Cancel")}</Button>}
      </form>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {state.data && rows.length === 0 && <Empty title={tr("Aucune macro", "No macros")} text={tr("Crée ta première macro ci-dessus.", "Create your first macro above.")} />}
      <ul className="settings settings-grid">
        {rows.map((row) => {
          const page = pageForHref(String(row.data?.href ?? ""));
          const target = MACRO_TARGETS.find(([item]) => item === row.data?.href)?.[1]();
          return (
            <li key={row.id}>
              <span className="stack"><b>{row.label}</b><small className="muted">{target ?? tr("Action du site, non disponible ici", "Website action, not available here")}</small></span>
              <div className="row">
                <Button disabled={!page} onClick={() => go(row)}><Play size={14} />{tr("Lancer", "Run")}</Button>
                <Button disabled={!target} onClick={() => { setEditing(row.id); setLabel(row.label); setHref(String(row.data?.href)); }}>{tr("Modifier", "Edit")}</Button>
                <Button aria-label={tr(`Supprimer ${row.label}`, `Delete ${row.label}`)} className="danger" onClick={() => run(() => apiData(path, "DELETE", { id: row.id }))}><Trash2 size={14} /></Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
