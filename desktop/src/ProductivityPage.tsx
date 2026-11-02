import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Circle, ListChecks, NotebookPen, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { EthoneItem, EthoneItemInput, ItemKind, itemsCreate, itemsDelete, itemsList, itemsUpdate } from "./api";
import { errorText, lang, t } from "./i18n";
import { dateTimeInputToIso, eventsByStart, itemPreview, newestItemsFirst, toDateTimeInput } from "./productivity";
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

export default function ProductivityPage() {
  const [kind, setKind] = useState<ProductivityKind>("notes");
  const [items, setItems] = useState<EthoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EthoneItem | "new" | null>(null);
  const [draft, setDraft] = useState<ProductivityDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  const chooseKind = (next: ProductivityKind) => {
    setKind(next);
    setEditor(null);
    setConfirmDelete(null);
  };

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

  const emptyText = kind === "notes" ? t("noNotes") : kind === "tasks" ? t("noTasks") : t("noEvents");
  const newLabel = kind === "notes" ? t("newNote") : kind === "tasks" ? t("newTask") : t("newEvent");

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("productivity")}</h1>
          <p className="muted">{t("productivityLine")}</p>
        </div>
        <div className="row">
          <Button disabled={loading || saving} onClick={load}><RefreshCw size={14} className={loading ? "spin" : ""} />{t("refresh")}</Button>
          <Button variant="primary" disabled={saving} onClick={openNew}><Plus size={14} />{newLabel}</Button>
        </div>
      </div>

      <div className="segmented productivity-tabs" role="tablist" aria-label={t("productivity")}>
        <button type="button" role="tab" aria-selected={kind === "notes"} className={kind === "notes" ? "on" : ""} onClick={() => chooseKind("notes")}><NotebookPen size={15} /><span>{t("notes")}</span></button>
        <button type="button" role="tab" aria-selected={kind === "tasks"} className={kind === "tasks" ? "on" : ""} onClick={() => chooseKind("tasks")}><ListChecks size={15} /><span>{t("tasks")}</span></button>
        <button type="button" role="tab" aria-selected={kind === "events"} className={kind === "events" ? "on" : ""} onClick={() => chooseKind("events")}><CalendarDays size={15} /><span>{t("calendar")}</span></button>
      </div>

      {error && <div className="home-error" role="alert"><span>{error}</span><Button onClick={load}>{t("retry")}</Button></div>}

      {editor && (
        <ProductivityEditor kind={kind} draft={draft} saving={saving} onChange={setDraft} onCancel={() => setEditor(null)} onSubmit={save} />
      )}

      <section className="productivity-panel" role="tabpanel" aria-busy={loading}>
        {loading && <div className="item-skeletons" aria-label={t("loading")}><span /><span /><span /></div>}
        {!loading && !error && items.length === 0 && <p className="muted empty">{emptyText}</p>}
        {!loading && !error && items.length > 0 && (
          <ul className="item-list">
            {items.map((item) => {
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
