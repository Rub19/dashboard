"use client";

import { useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useSelection } from "@/lib/hooks/useSelection";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import Select from "@/components/ui/Select";
import BulkActionBar from "@/components/BulkActionBar";
import ContextMenu from "@/components/ContextMenu";
import CustomCheckbox from "@/components/CustomCheckbox";
import RichTextEditor, { stripHtml } from "@/components/RichTextEditor";
import { wordCountFromHtml } from "@/lib/notes";

type Note = { id: string; title: string; body: string; createdAt?: string };

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
}

export default function NotesPage() {
  const i18n = useI18n();
  const { error: showError, notify } = useToast();
  const { items, loading, error, create, remove } = useItems("notes");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"title" | "words" | "created">("created");

  const { selected, selectedItems, hasSelection, isAllSelected, toggle, selectAll, clear, isSelected } = useSelection<Note>(items);

  const stats = useMemo(() => {
    const total = items.length;
    const totalWords = items.reduce((sum, n) => sum + wordCountFromHtml(n.body), 0);
    return { total, totalWords };
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "words") return wordCountFromHtml(b.body) - wordCountFromHtml(a.body);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return list;
  }, [items, query, sort]);

  const currentWords = wordCountFromHtml(body);
  const currentChars = stripHtml(body).length;

  async function addNote() {
    if (!title.trim()) return;
    try {
      await create({ title, body });
      setTitle("");
      setBody("");
      notify.noteCreated(title);
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteNote(id: string) {
    try {
      await remove(id);
      notify.noteDeleted(1);
    } catch {
      showError(i18n("error"));
    }
  }

  async function duplicateNote(note: Note) {
    try {
      await create({ title: `${note.title} (${i18n("copy")})`, body: note.body });
      notify.noteCreated(`${note.title} (${i18n("copy")})`);
    } catch {
      showError(i18n("error"));
    }
  }

  async function bulkDelete() {
    try {
      await Promise.all(selectedItems.map((n) => remove(n.id)));
      clear();
      notify.noteDeleted(selectedItems.length);
    } catch {
      showError(i18n("error"));
    }
  }

  async function bulkDuplicate() {
    try {
      await Promise.all(selectedItems.map((n) => create({ title: `${n.title} (${i18n("copy")})`, body: n.body })));
      clear();
      notify.noteCreated(`${i18n("copies", "Copies")} (${selectedItems.length})`);
    } catch {
      showError(i18n("error"));
    }
  }

  function noteContextItems(note: Note) {
    return [
      {
        id: "copy-title",
        label: i18n("copyTitle"),
        icon: "copy",
        onClick: () => navigator.clipboard.writeText(note.title).then(() => notify.clipboard()).catch(() => showError(i18n("error"))),
      },
      {
        id: "copy-body",
        label: i18n("copyBody"),
        icon: "copy",
        onClick: () => navigator.clipboard.writeText(note.body).then(() => notify.clipboard()).catch(() => showError(i18n("error"))),
      },
      {
        id: "duplicate",
        label: i18n("duplicate"),
        icon: "copy-plus",
        onClick: () => duplicateNote(note),
      },
      { id: "sep", label: "", separator: true },
      {
        id: "delete",
        label: i18n("delete"),
        icon: "trash-2",
        danger: true,
        onClick: () => deleteNote(note.id),
      },
    ];
  }

  return (
    <div className="h-full min-h-0 w-full grid grid-cols-12 gap-5 overflow-hidden p-4">
      {/* Left: List & Search */}
      <div className="col-span-12 flex h-full min-h-0 flex-col gap-3 overflow-hidden lg:col-span-4">
        <div className="shrink-0 rounded-2xl v8-panel p-4 backdrop-blur-2xl">
          <h1 className="text-2xl font-bold text-white">{i18n("notesTitle")}</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {stats.total} {i18n("notes")} · {stats.totalWords} {i18n("words")}
          </p>
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-2xl v8-panel p-3 backdrop-blur-2xl">
          <CustomCheckbox checked={isAllSelected} onChange={() => (isAllSelected ? clear() : selectAll())} label={i18n("selectAll")} />
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("search")}
              aria-label={i18n("search")}
              icon="search"
              className="w-40"
            />
            <Select
              value={sort}
              onChange={(value) => setSort(value as typeof sort)}
              options={[
                { id: "created", label: i18n("sortByDate") },
                { id: "title", label: i18n("sortByTitle") },
                { id: "words", label: i18n("sortByWords") },
              ]}
              aria-label={i18n("sortBy")}
              className="min-w-0 w-28"
            />
          </div>
        </div>

        {hasSelection && (
          <BulkActionBar count={selected.size} onDelete={bulkDelete} onClear={clear}>
            <button
              type="button"
              onClick={bulkDuplicate}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-white/[0.08]"
            >
              <Icon name="copy-plus" className="h-3.5 w-3.5" /> {i18n("duplicate")}
            </button>
          </BulkActionBar>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto os-scroll space-y-3 pr-1">
          {loading && items.length === 0 && (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl v8-panel p-4 backdrop-blur-2xl">
              <Icon name="loader-2" className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error.message}</div>
          )}

          {filtered.map((note) => (
            <ContextMenu key={note.id} items={noteContextItems(note)}>
              <div className="group rounded-2xl v8-panel p-3 backdrop-blur-2xl transition-colors hover:border-white/[0.12]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <CustomCheckbox checked={isSelected(note.id)} onChange={() => toggle(note.id)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{note.title}</p>
                      <p className="line-clamp-2 text-[11px] text-zinc-500" dangerouslySetInnerHTML={{ __html: note.body }} />
                      <div className="mt-1.5 flex gap-2 text-[10px] text-zinc-500">
                        {note.createdAt && <span>{formatDate(note.createdAt)}</span>}
                        <span>{wordCountFromHtml(note.body)} {i18n("words")}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    disabled={loading}
                    data-tooltip={i18n("delete")}
                    data-haptic
                    className="shrink-0 text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </ContextMenu>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl v8-panel p-4 text-zinc-500">
              <Icon name="notebook-pen" className="h-8 w-8" />
              <p className="text-sm">{i18n("noResults")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Editor */}
      <div className="col-span-12 flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl v8-panel p-6 backdrop-blur-2xl lg:col-span-8">
        <div className="shrink-0 mb-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={i18n("notesPlaceholder")}
            aria-label={i18n("notesPlaceholder")}
            data-testid="note-title-input"
            className="w-full rounded-lg border-none bg-transparent px-2 py-1 text-lg font-bold text-white outline-none transition-all duration-200 placeholder-zinc-500 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
          />
        </div>

        <RichTextEditor defaultValue={body} onChange={setBody} placeholder={i18n("description")} className="min-h-0 flex-1 overflow-hidden" />

        <div className="shrink-0 mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-zinc-500">
            {currentWords} {i18n("words")} · {currentChars} caractères
          </span>
          <button
            type="button"
            onClick={addNote}
            disabled={loading || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--accent-color, #10b981)", color: "#09090b" }}
          >
            <Icon name="save" className="h-3.5 w-3.5" />
            {i18n("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
