"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

const PRESETS = [
  { id: "focus", label: "Focus", color: "bg-violet-500/20 text-violet-400" },
  { id: "studio", label: "Studio", color: "bg-emerald-500/20 text-emerald-400" },
  { id: "gaming", label: "Gaming", color: "bg-amber-500/20 text-amber-400" },
  { id: "personal", label: "Personnel", color: "bg-sky-500/20 text-sky-400" },
];

export default function SpacesPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items: spaces, loading, error, create, remove } = useUserData("space");
  const [name, setName] = useState("");

  async function add() {
    if (!name.trim()) return;
    try {
      await create(name, "", { color: "bg-zinc-500/20 text-zinc-400" });
      setName("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteSpace(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  function colorFor(label: string) {
    const preset = PRESETS.find((p) => p.id.toLowerCase() === label.toLowerCase() || i18n(p.id).toLowerCase() === label.toLowerCase());
    if (preset) return preset.color;
    const data = (spaces.find((s) => s.label === label)?.data || {}) as { color?: string };
    return data.color || "bg-zinc-500/20 text-zinc-400";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("spacesTitle")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {spaces.length} {spaces.length > 1 ? i18n("opens") : i18n("open")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon name="layout-grid" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{spaces.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("dedicatedEnvironments")}</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Icon name="layers" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{PRESETS.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("integratedModels")}</p>
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
            <h2 className="font-semibold">{i18n("dedicatedEnvironments")}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{i18n("spacesAbout")}</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("space-input")?.focus()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("add")} <Icon name="arrow-right" className="h-4 w-4" />
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
            placeholder={i18n("create")}
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={add}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {spaces.map((space) => (
          <Card3D key={space.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorFor(space.label)}`}>
                  <Icon name="layout-grid" className="h-5 w-5" />
                </span>
                <p className="font-medium">{space.label}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteSpace(space.id)}
                className="text-[var(--muted)] hover:text-red-400"
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
