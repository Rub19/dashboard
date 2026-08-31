"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { useItems } from "@/lib/hooks/useItems";
import { useSelection } from "@/lib/hooks/useSelection";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useListKeyboard } from "@/lib/hooks/useListKeyboard";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import Input from "@/components/Input";
import Select from "@/components/ui/Select";
import BulkActionBar from "@/components/BulkActionBar";
import CustomCheckbox from "@/components/CustomCheckbox";
import RichTextEditor, { stripHtml } from "@/components/RichTextEditor";
import { wordCountFromHtml } from "@/lib/notes";
import { nativeShare } from "@/lib/native";
import { hapticRigidImpact, hapticSuccess, hapticMediumImpact } from "@/lib/haptics";
import { indexSpotlightItems } from "@/lib/apple";

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
  const { items, loading, error, isOffline, create, remove } = useItems("notes");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"title" | "words" | "created">("created");

  const { selected, selectedItems, hasSelection, isAllSelected, toggle, selectAll, clear, isSelected } = useSelection<Note>(items);

  useEffect(() => {
    indexSpotlightItems(
      items.map((note) => ({
        id: `note-${note.id}`,
        title: note.title,
        description: stripHtml(note.body).slice(0, 200),
        contentType: "public.text",
        url: `ethone://notes/${note.id}`,
      }))
    );
  }, [items]);

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

  const { activeIndex, handleKeyDown } = useListKeyboard({
    items: filtered,
    onSelect: (note) => {
      setTitle(note.title);
      setBody(note.body);
    },
    onDelete: (note) => deleteNote(note.id),
    selectMessage: null,
    deleteMessage: null,
  });

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
    hapticRigidImpact();
    try {
      await remove(id);
      hapticSuccess();
      notify.noteDeleted(1);
    } catch {
      showError(i18n("error"));
    }
  }

  async function shareNote(note: Note) {
    hapticMediumImpact();
    const text = `${note.title}\n\n${stripHtml(note.body)}`;
    const { ok, error } = await nativeShare({
      title: note.title,
      text,
      url: `https://ethone.dev/notes/?selected=${note.id}`,
    });
    if (!ok && error) showError(i18n("shareFailed"));
  }

  function exportNoteAsFile(noteTitle: string, noteBody: string) {
    hapticMediumImpact();
    const cleanText = stripHtml(noteBody);
    const blob = new Blob([`# ${noteTitle || "Note"}\n\n${cleanText}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(noteTitle || "note").toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.noteCreated("Fichier .md téléchargé !");
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

  return (
    <div className="h-full min-h-0 w-full grid grid-cols-12 items-stretch gap-5 overflow-hidden p-4">
      {/* Left: List & Search */}
      <div className="col-span-12 flex h-full min-h-0 flex-col gap-3 overflow-hidden lg:col-span-4">
        <div className="shrink-0 rounded-2xl v8-panel p-4 backdrop-blur-2xl">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{i18n("notesTitle")}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
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
              className="min-w-[120px] w-36"
            />
          </div>
        </div>

        {hasSelection && (
          <BulkActionBar count={selected.size} onDelete={bulkDelete} onClear={clear}>
            <button
              type="button"
              onClick={bulkDuplicate}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08]"
            >
              <Icon name="copy-plus" className="h-3.5 w-3.5" /> {i18n("duplicate")}
            </button>
          </BulkActionBar>
        )}

        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="min-h-0 flex-1 overflow-y-auto os-scroll space-y-3 pr-1 outline-none"
        >
          {loading && items.length === 0 && (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl v8-panel p-4 backdrop-blur-2xl">
              <Icon name="loader-2" className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
            </div>
          )}

          {isOffline && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)] animate-pulse" />
              <span>Mode local actif. Vos notes sont sécurisées et synchronisées sur cet appareil.</span>
            </div>
          )}

          {filtered.map((note, index) => (
            <div
              key={note.id}
              data-context-menu="note"
              data-context-id={note.id}
              data-active={index === activeIndex}
              className={cn(
                "group rounded-2xl v8-panel p-3 backdrop-blur-2xl transition-colors hover:border-[var(--text-primary)]/[0.12]",
                index === activeIndex && "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <span className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                    <CustomCheckbox checked={isSelected(note.id)} onChange={() => toggle(note.id)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{note.title}</p>
                    <p className="line-clamp-2 text-[11px] text-[var(--text-muted)]" dangerouslySetInnerHTML={{ __html: note.body }} />
                    <div className="mt-1.5 flex gap-2 text-[10px] text-[var(--text-muted)]">
                      {note.createdAt && <span>{formatDate(note.createdAt)}</span>}
                      <span>{wordCountFromHtml(note.body)} {i18n("words")}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => exportNoteAsFile(note.title, note.body)}
                  disabled={loading}
                  data-tooltip="Exporter en .md"
                  className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--accent-primary)] disabled:opacity-50"
                  title="Télécharger en .md"
                >
                  <Icon name="hard-drive" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => shareNote(note)}
                  disabled={loading}
                  data-tooltip={i18n("share")}
                  className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--accent-primary)] disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  disabled={loading}
                  data-tooltip={i18n("delete")}
                  data-haptic
                  className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--danger)] disabled:opacity-50"
                >
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2.5 rounded-2xl v8-panel p-6 text-center text-[var(--text-muted)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--accent-primary)] shadow-sm">
                <Icon name="notebook-pen" className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{i18n("noNotes", "Aucune note")}</p>
              <p className="max-w-xs text-xs text-[var(--text-muted)]">{i18n("notesEmptyHint", "Commencez une nouvelle note pour garder une trace de vos idées.")}</p>
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="Titre"]') as HTMLInputElement | null;
                  input?.focus();
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 px-3.5 py-1.5 text-xs font-bold text-[var(--accent-primary)] shadow-sm transition-all hover:bg-[var(--accent-primary)]/25 active:scale-95 cursor-pointer"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                <span>{i18n("newNote", "Rédiger une note")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Editor */}
      <div className="col-span-12 flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl v8-panel p-6 backdrop-blur-2xl lg:col-span-8">
        <div className="shrink-0 mb-3">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={i18n("notesPlaceholder")}
            aria-label={i18n("notesPlaceholder")}
            data-testid="note-title-input"
            inputClassName="text-lg font-bold"
            className="w-full"
          />
        </div>

        <RichTextEditor defaultValue={body} onChange={setBody} placeholder={i18n("description")} className="min-h-0 flex-1 overflow-hidden" />

        <div className="shrink-0 mb-6 mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {currentWords} {i18n("words")} · {currentChars} caractères
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportNoteAsFile(title || "Nouvelle Note", body)}
              disabled={loading || (!title.trim() && !body.trim())}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)] active:scale-95 disabled:opacity-50"
            >
              <Icon name="hard-drive" className="h-3.5 w-3.5" />
              Exporter (.md)
            </button>
            <button
              type="button"
              onClick={addNote}
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "var(--accent-color, var(--accent-primary))", color: "var(--accent-contrast)" }}
            >
              <Icon name="save" className="h-3.5 w-3.5" />
              {i18n("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
