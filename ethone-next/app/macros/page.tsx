"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useUserData } from "@/lib/hooks/useUserData";
import { Workflow, Plus, Trash2 } from "lucide-react";

const ACTIONS = [
  { id: "navigate", label: "Ouvrir page", defaults: { href: "/" } },
  { id: "toggle", label: "Basculer", defaults: { setting: "brainEnabled" } },
];

export default function MacrosPage() {
  const { items: macros, create, remove } = useUserData("macro");
  const [label, setLabel] = useState("");
  const [action, setAction] = useState("navigate");
  const [href, setHref] = useState("/");

  function add() {
    if (!label.trim()) return;
    const data = action === "navigate" ? { action, href } : { action, setting: "brainEnabled" };
    create(label, "", data);
    setLabel("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Macros</h1>

      <Card3D>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Créez des macros pour les lancer depuis le Command Center.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Nom de la macro..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
            >
              {ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            {action === "navigate" && (
              <input
                type="text"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="/page"
                className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            )}
            <button
              type="button"
              onClick={add}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card3D>

      <div className="space-y-3">
        {macros.map((m) => {
          const data = m.data as { action?: string; href?: string; setting?: string };
          return (
            <Card3D key={m.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Workflow className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-[var(--muted)]">{data.action} {data.href || data.setting}</p>
                  </div>
                </div>
                <button type="button" onClick={() => remove(m.id)} className="text-[var(--muted)] hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
