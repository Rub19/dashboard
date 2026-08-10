"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";

const PRESETS = [
  { id: "focus", label: "Focus", color: "bg-violet-500/20 text-violet-400" },
  { id: "studio", label: "Studio", color: "bg-emerald-500/20 text-emerald-400" },
  { id: "gaming", label: "Gaming", color: "bg-amber-500/20 text-amber-400" },
  { id: "personal", label: "Personnel", color: "bg-sky-500/20 text-sky-400" },
];

export default function SpacesPage() {
  const [spaces, setSpaces] = useState(PRESETS);
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    setSpaces([...spaces, { id: String(Date.now()), label: name, color: "bg-zinc-500/20 text-zinc-400" }]);
    setName("");
  }

  function remove(id: string) {
    setSpaces(spaces.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Spaces</h1>

      <Card3D>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nouvel espace..."
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={add}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {spaces.map((space) => (
          <Card3D key={space.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${space.color}`}>
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <p className="font-medium">{space.label}</p>
              </div>
              {space.id.length > 10 && (
                <button
                  type="button"
                  onClick={() => remove(space.id)}
                  className="text-[var(--muted)] hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
