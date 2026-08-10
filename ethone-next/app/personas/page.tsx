"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useUserData } from "@/lib/hooks/useUserData";
import { useSettings } from "@/components/SettingsProvider";
import { Users, Plus, Trash2, Check } from "lucide-react";

export default function PersonasPage() {
  const { items: personas, create, remove } = useUserData("persona");
  const { update } = useSettings();
  const [label, setLabel] = useState("");
  const [theme, setTheme] = useState<"default" | "boreal" | "cyberpunk" | "eclipse" | "emerald">("default");

  function add() {
    if (!label.trim()) return;
    create(label, "", { theme });
    setLabel("");
  }

  function apply(persona: typeof personas[0]) {
    const data = persona.data as { theme?: typeof theme };
    if (data.theme) update({ theme: data.theme });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Personas</h1>

      <Card3D>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Créez des personas avec des thèmes et basculez entre eux.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Nom du persona..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
            >
              <option value="default">Default</option>
              <option value="boreal">Boreal</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="eclipse">Eclipse</option>
              <option value="emerald">Emerald</option>
            </select>
            <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => {
          const data = p.data as { theme?: string };
          return (
            <Card3D key={p.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-xs capitalize text-[var(--muted)]">{data.theme || "default"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => apply(p)} className="rounded p-1.5 text-emerald-400 hover:bg-emerald-500/10">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(p.id)} className="rounded p-1.5 text-[var(--muted)] hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
