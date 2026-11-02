import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ListChecks, NotebookPen, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { EthoneItem, EthoneItemInput, ItemKind, itemsCreate, itemsDelete, itemsList, itemsUpdate } from "./api";
import { errorText, lang, t } from "./i18n";
import { itemPreview, newestItemsFirst } from "./productivity";
import { Button } from "./ui";

type ProductivityKind = Extract<ItemKind, "notes" | "tasks">;

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
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(newestItemsFirst(await itemsList(kind)));
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
    setDraft({ title: "", body: "" });
    setEditor("new");
  };

  const openEdit = (item: EthoneItem) => {
    setDraft({ title: item.title, body: item.body });
    setEditor(item);
  };

  const inputFor = (item?: EthoneItem): EthoneItemInput => ({
    title: draft.title,
    body: draft.body,
    done: item?.done ?? false,
    startAt: item?.startAt ?? null,
    endAt: item?.endAt ?? null,
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

  const emptyText = kind === "notes" ? t("noNotes") : t("noTasks");

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("productivity")}</h1>
          <p className="muted">{t("productivityLine")}</p>
        </div>
        <div className="row">
          <Button disabled={loading || saving} onClick={load}><RefreshCw size={14} className={loading ? "spin" : ""} />{t("refresh")}</Button>
          <Button variant="primary" disabled={saving} onClick={openNew}><Plus size={14} />{kind === "notes" ? t("newNote") : t("newTask")}</Button>
        </div>
      </div>

      <div className="segmented productivity-tabs" role="tablist" aria-label={t("productivity")}>
        <button type="button" role="tab" aria-selected={kind === "notes"} className={kind === "notes" ? "on" : ""} onClick={() => chooseKind("notes")}><NotebookPen size={15} /><span>{t("notes")}</span></button>
        <button type="button" role="tab" aria-selected={kind === "tasks"} className={kind === "tasks" ? "on" : ""} onClick={() => chooseKind("tasks")}><ListChecks size={15} /><span>{t("tasks")}</span></button>
      </div>

      {error && <div className="home-error" role="alert"><span>{error}</span><Button onClick={load}>{t("retry")}</Button></div>}

      {editor && (
        <form className="item-editor" onSubmit={save}>
          <label><span>{t("title")}</span><input autoFocus required maxLength={200} value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} /></label>
          <label><span>{kind === "notes" ? t("content") : t("description")}</span><textarea maxLength={10000} rows={kind === "notes" ? 6 : 3} value={draft.body} onChange={(event) => setDraft((value) => ({ ...value, body: event.target.value }))} /></label>
          <div className="editor-actions"><Button disabled={saving} onClick={() => setEditor(null)}>{t("cancel")}</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? t("saving") : t("save")}</Button></div>
        </form>
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
                    {kind === "tasks" ? item.done ? <CheckCircle2 size={18} aria-label={t("completed")} /> : <Circle size={18} aria-label={t("pending")} /> : <NotebookPen size={18} />}
                  </span>
                  <span className="item-copy">
                    <b>{item.title}</b>
                    {kind === "notes" && preview && <small className="muted">{preview}</small>}
                  </span>
                  {confirmDelete === item.id ? (
                    <span className="delete-confirm"><span>{t("confirmDelete")}</span><Button disabled={saving} onClick={() => setConfirmDelete(null)}>{t("cancel")}</Button><Button disabled={saving} onClick={() => void remove(item.id)}><Trash2 size={14} />{t("delete")}</Button></span>
                  ) : (
                    <span className="item-actions">
                      {item.updatedAt && <time className="muted small" dateTime={item.updatedAt}>{itemDate(item.updatedAt)}</time>}
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
