"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { LayoutGrid, Plus, Trash2, Layers, ArrowRight } from "lucide-react";

const PRESETS = [
  { id: "focus", label: "Focus", color: "bg-violet-500/20 text-violet-400" },
  { id: "studio", label: "Studio", color: "bg-emerald-500/20 text-emerald-400" },
  { id: "gaming", label: "Gaming", color: "bg-amber-500/20 text-amber-400" },
  { id: "personal", label: "Personnel", color: "bg-sky-500/20 text-sky-400" },
];

export default function SpacesPage() {
  const i18n = useI18n();
  const { items: spaces, loading, error, create, remove } = useUserData("space");
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    create(name, "", { color: "bg-zinc-500/20 text-zinc-400" });
    setName("");
  }

  function colorFor(label: string) {
    const preset = PRESETS.find((p) => p.label.toLowerCase() === label.toLowerCase());
    if (preset) return preset.color;
    const data = (spaces.find((s) => s.label === label)?.data || {}) as { color?: string };
    return data.color || "bg-zinc-500/20 text-zinc-400";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("spaces")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {spaces.length} actif{spaces.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <LayoutGrid className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{spaces.length}</p>
              <p className="text-xs text-[var(--muted)]">Espaces actifs</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{PRESETS.length}</p>
              <p className="text-xs text-[var(--muted)]">Modèles intégrés</p>
            </div>
          </div>
        </Card3D>
      </div>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">Environnements dédiés</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">Spaces regroupe vos contextes de travail personnalisés. Créez un espace, associez-y des widgets et des raccourcis.</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("space-input")?.focus()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("add")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      <Card3D>
        <div className="flex gap-2">
          <input
            id="space-input"
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
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorFor(space.label)}`}>
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <p className="font-medium">{space.label}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(space.id)}
                className="text-[var(--muted)] hover:text-red-400"
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
