"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { NotebookPen, Plus, Trash2 } from "lucide-react";

export default function NotesPage() {
  const [notes, setNotes] = useState<{ id: number; title: string; body: string }[]>([
    { id: 1, title: "Idée rapide", body: "Ne pas oublier de tester le nouveau dashboard." },
  ]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function addNote() {
    if (!title.trim()) return;
    setNotes([{ id: Date.now(), title, body }, ...notes]);
    setTitle("");
    setBody("");
  }

  function removeNote(id: number) {
    setNotes(notes.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notes</h1>

      <Card3D>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la note"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={addNote}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4">
        {notes.map((note) => (
          <Card3D key={note.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-[var(--accent)]" />
                  <p className="font-medium">{note.title}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{note.body}</p>
              </div>
              <button
                type="button"
                onClick={() => removeNote(note.id)}
                className="shrink-0 text-[var(--muted)] hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
