import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, NotebookPen, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHead } from "./kit";
import { EthoneItem, EthoneItemInput, ItemKind, itemsCreate, itemsDelete, itemsList, itemsUpdate } from "./api";
import { errorText, lang, t } from "./i18n";
import { dateTimeInputToIso, dayKey, eventsByStart, monthCells, itemPreview, newestItemsFirst, toDateTimeInput } from "./productivity";
import ProductivityEditor, { ProductivityDraft } from "./ProductivityEditor";
import { Button } from "./ui";

type ProductivityKind = ItemKind;

const EMPTY_DRAFT: ProductivityDraft = { title: "", body: "", startAt: "", endAt: "" };

function itemDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
}

const TITLES: Record<ProductivityKind, () => string> = { notes: () => t("notes"), tasks: () => t("tasks"), events: () => t("calendar") };

function MonthGrid({ items, selected, onSelect }: { items: EthoneItem[]; selected: string | null; onSelect: (day: string | null) => void }) {
  const [month, setMonth] = useState(() => new Date());
  const cells = monthCells(month);
  const today = dayKey(new Date());
  const byDay = new Map<string, EthoneItem[]>();
  for (const item of items) {
    if (!item.startAt) continue;
    const key = dayKey(new Date(item.startAt));
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const shift = (by: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + by, 1));
  return (
    <section className="month" aria-label={month.toLocaleDateString(lang, { month: "long", year: "numeric" })}>
      <header className="month-head">
        <h2>{month.toLocaleDateString(lang, { month: "long", year: "numeric" })}</h2>
        <Button aria-label={lang === "fr" ? "Mois précédent" : "Previous month"} onClick={() => shift(-1)}><ChevronLeft size={15} /></Button>
        <Button onClick={() => { setMonth(new Date()); onSelect(null); }}>{lang === "fr" ? "Aujourd'hui" : "Today"}</Button>
        <Button aria-label={lang === "fr" ? "Mois suivant" : "Next month"} onClick={() => shift(1)}><ChevronRight size={15} /></Button>
      </header>
      <div className="month-grid">
        {cells.slice(0, 7).map((cell) => <span key={cell.key}>{cell.date.toLocaleDateString(lang, { weekday: "short" })}</span>)}
        {cells.map((cell) => {
          const events = byDay.get(cell.key) ?? [];
          return (
            <button key={cell.key} type="button" className={`month-day ${cell.inMonth ? "" : "other"} ${cell.key === today ? "today" : ""} ${selected === cell.key ? "on" : ""}`} aria-pressed={selected === cell.key} onClick={() => onSelect(selected === cell.key ? null : cell.key)}>
              <b>{cell.date.getDate()}</b>
              {events.slice(0, 2).map((event) => <small key={event.id}>{event.title}</small>)}
              {events.length > 2 && <em>+{events.length - 2}</em>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductivityPage({ kind }: { kind: ProductivityKind }) {
  const [items, setItems] = useState<EthoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EthoneItem | "new" | null>(null);
  const [draft, setDraft] = useState<ProductivityDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await itemsList(kind);
      setItems(kind === "events" ? eventsByStart(loaded) : newestItemsFirst(loaded));
    } catch (reason) {
      setItems([]);
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditor(null);
    setConfirmDelete(null);
  }, [kind]);

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setEditor("new");
  };

  const openEdit = (item: EthoneItem) => {
    setDraft({ title: item.title, body: item.body, startAt: toDateTimeInput(item.startAt), endAt: toDateTimeInput(item.endAt) });
    setEditor(item);
  };

  const inputFor = (item?: EthoneItem): EthoneItemInput => ({
    title: draft.title,
    body: draft.body,
    done: item?.done ?? false,
    startAt: kind === "events" ? dateTimeInputToIso(draft.startAt) || null : item?.startAt ?? null,
    endAt: kind === "events" ? dateTimeInputToIso(draft.endAt) || null : item?.endAt ?? null,
    data: item?.data ?? {},
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError(null);
    try {
      if (editor === "new") await itemsCreate(kind, inputFor());
      else await itemsUpdate(kind, editor.id, inputFor(editor));
      setEditor(null);
      await load();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (item: EthoneItem) => {
    setSaving(true);
    setError(null);
    try {
      await itemsUpdate(kind, item.id, { title: item.title, body: item.body, done: !item.done, startAt: item.startAt, endAt: item.endAt, data: item.data });
      await load();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await itemsDelete(kind, id);
      setConfirmDelete(null);
      await load();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  const shown = kind === "events" && day ? items.filter((item) => item.startAt && dayKey(new Date(item.startAt)) === day) : items;
  const emptyText = kind === "notes" ? t("noNotes") : kind === "tasks" ? t("noTasks") : t("noEvents");
  const newLabel = kind === "notes" ? t("newNote") : kind === "tasks" ? t("newTask") : t("newEvent");

  return (
    <>
      <PageHead title={TITLES[kind]()} text={t("productivityLine")} onRefresh={load} refreshing={loading || saving}>
        <Button variant="primary" disabled={saving} onClick={openNew}><Plus size={14} />{newLabel}</Button>
      </PageHead>

      {error && <div className="home-error" role="alert"><span>{error}</span><Button onClick={load}>{t("retry")}</Button></div>}

      {editor && (
        <ProductivityEditor kind={kind} draft={draft} saving={saving} onChange={setDraft} onCancel={() => setEditor(null)} onSubmit={save} />
      )}

      {kind === "events" && !error && <MonthGrid items={items} selected={day} onSelect={setDay} />}
      <section className="productivity-panel" aria-busy={loading}>
        {loading && <div className="item-skeletons" aria-label={t("loading")}><span /><span /><span /></div>}
        {!loading && !error && shown.length === 0 && <p className="muted empty">{emptyText}</p>}
        {!loading && !error && shown.length > 0 && (
          <ul className="item-list">
            {shown.map((item) => {
              const preview = itemPreview(item.body);
              return (
                <li key={item.id}>
                  <span className={`item-kind ${item.done ? "done" : ""}`}>
                    {kind === "tasks" ? item.done ? <CheckCircle2 size={18} aria-label={t("completed")} /> : <Circle size={18} aria-label={t("pending")} /> : kind === "events" ? <CalendarDays size={18} /> : <NotebookPen size={18} />}
                  </span>
                  <span className="item-copy">
                    <b>{item.title}</b>
                    {preview && <small className="muted">{preview}</small>}
                  </span>
                  {confirmDelete === item.id ? (
                    <span className="delete-confirm"><span>{t("confirmDelete")}</span><Button disabled={saving} onClick={() => setConfirmDelete(null)}>{t("cancel")}</Button><Button disabled={saving} onClick={() => void remove(item.id)}><Trash2 size={14} />{t("delete")}</Button></span>
                  ) : (
                    <span className="item-actions">
                      {(kind === "events" ? item.startAt : item.updatedAt) && <time className="muted small" dateTime={(kind === "events" ? item.startAt : item.updatedAt) ?? undefined}>{itemDate(kind === "events" ? item.startAt : item.updatedAt)}</time>}
                      {kind === "tasks" && <Button disabled={saving} onClick={() => void toggleTask(item)}>{item.done ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}{item.done ? t("reopen") : t("markDone")}</Button>}
                      <Button disabled={saving} onClick={() => openEdit(item)}><Pencil size={14} />{t("edit")}</Button>
                      <Button disabled={saving} onClick={() => setConfirmDelete(item.id)}><Trash2 size={14} />{t("delete")}</Button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
