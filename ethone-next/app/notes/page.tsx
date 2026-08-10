"use client";

import { useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";

export default function NotesPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items, loading, error, create, remove } = useItems("notes");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("notesTitle")}</h1>

      <Card3D>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={i18n("notesPlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={i18n("description")}
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
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
        {items.map((note) => (
          <Card3D key={note.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Icon name="notebook-pen" className="h-4 w-4 text-[var(--accent)]" />
                  <p className="font-medium">{note.title}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{note.body}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteNote(note.id)}
                disabled={loading}
                className="shrink-0 text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
              >
                <Icon name="trash-2" className="h-4 w-4" />
              </button>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
