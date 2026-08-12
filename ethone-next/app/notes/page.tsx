"use client";

import { useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useSelection } from "@/lib/hooks/useSelection";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import BulkActionBar from "@/components/BulkActionBar";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import ContextMenu from "@/components/ContextMenu";
import RichTextEditor from "@/components/RichTextEditor";
import { wordCountFromHtml } from "@/lib/notes";

type Note = { id: string; title: string; body: string; createdAt?: string };

export default function NotesPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
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

  async function addNote() {
    if (!title.trim()) return;
    try {
      await create({ title, body });
      setTitle("");
      setBody("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteNote(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function duplicateNote(note: Note) {
    try {
      await create({ title: `${note.title} (${i18n("copy")})`, body: note.body });
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function bulkDelete() {
    try {
      await Promise.all(selectedItems.map((n) => remove(n.id)));
      clear();
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function bulkDuplicate() {
    try {
      await Promise.all(selectedItems.map((n) => create({ title: `${n.title} (${i18n("copy")})`, body: n.body })));
      clear();
      success(i18n("created"));
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
        onClick: () => navigator.clipboard.writeText(note.title).then(() => success(i18n("copied"))).catch(() => showError(i18n("error"))),
      },
      {
        id: "copy-body",
        label: i18n("copyBody"),
        icon: "copy",
        onClick: () => navigator.clipboard.writeText(note.body).then(() => success(i18n("copied"))).catch(() => showError(i18n("error"))),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("notesTitle")}</h1>
        <span className="text-sm text-[var(--muted)]">
          {stats.total} {i18n("notes")} · {stats.totalWords} {i18n("words")}
        </span>
      </div>

      <Card3D>
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={i18n("notesPlaceholder")}
            placeholder={i18n("notesPlaceholder")}
          />
          <RichTextEditor defaultValue={body} onChange={setBody} placeholder={i18n("description")} />
          <button
            type="button"
            onClick={addNote}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" /> {i18n("add")}
          </button>
        </div>
      </Card3D>

      {hasSelection && (
        <BulkActionBar
          count={selected.size}
          onDelete={bulkDelete}
          onClear={clear}
        >
          <button
            type="button"
            onClick={bulkDuplicate}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--surface)] px-3 py-1.5 text-xs hover:bg-[var(--accent)]/10"
          >
            <Icon name="copy-plus" className="h-3.5 w-3.5" /> {i18n("duplicate")}
          </button>
        </BulkActionBar>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={() => (isAllSelected ? clear() : selectAll())}
          className="accent-[var(--accent)]"
          aria-label={i18n("selectAll")}
        />
        <span className="text-sm text-[var(--muted)]">{i18n("selectAll")}</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={i18n("search")}
          icon="search"
          className="w-48"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
        >
          <option value="created">{i18n("sortByDate")}</option>
          <option value="title">{i18n("sortByTitle")}</option>
          <option value="words">{i18n("sortByWords")}</option>
        </select>
      </div>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading && items.length === 0 && (
          <Card3D>
            <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </Card3D>
        )}
        {filtered.map((note) => (
          <ContextMenu key={note.id} items={noteContextItems(note)}>
            <Card3D>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected(note.id)}
                      onChange={() => toggle(note.id)}
                      className="accent-[var(--accent)]"
                      aria-label={i18n("select")}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Icon name="notebook-pen" className="h-4 w-4 text-[var(--accent)]" />
                    <p className="font-medium">{note.title}</p>
                  </div>
                  <div
                    className="rich-text-content text-sm text-[var(--muted)]"
                    dangerouslySetInnerHTML={{ __html: note.body }}
                  />
                  <div className="mt-2 flex gap-3 text-[10px] text-[var(--muted)]">
                    {note.createdAt && <span>{new Date(note.createdAt).toLocaleDateString()}</span>}
                    <span>{wordCountFromHtml(note.body)} {i18n("words")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  disabled={loading}
                  data-tooltip={i18n("delete")}
                  data-haptic
                  className="shrink-0 text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
                >
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            </Card3D>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
}
