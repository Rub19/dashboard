"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";

const TYPES = ["personal", "work", "development", "study", "gaming", "streaming", "creative"] as const;

export default function ProfileSelectionPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const { update: updateSettings } = useSettings();
  const { profiles, active, loaded, create, select, remove, duplicate } = useProfiles();
  const [name, setName] = useState("");
  const [type, setType] = useState<Profile["type"]>("personal");
  const [creating, setCreating] = useState(false);

  if (!loaded) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{i18n("profileSelectionTitle")}</h1>
        <Card3D><div className="h-8 w-1/3 animate-pulse rounded bg-[var(--border)]" /></Card3D>
      </div>
    );
  }

  function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const selectedType = type;
    const suggestedWidgets: Record<string, string[]> = {
      personal: ["today", "notes", "calendar"],
      work: ["tasks", "calendar", "focus"],
      development: ["github", "brain", "tasks"],
      study: ["notes", "planning", "focus"],
      gaming: ["spotify", "tasks", "brain"],
      streaming: ["today", "brain", "files"],
      creative: ["notes", "files", "brain"],
    };
    try {
      create({
        name: name.trim(),
        type: selectedType,
        accent: "violet",
        widgets: suggestedWidgets[selectedType] || ["today", "notes", "calendar"],
        integrations: [],
      });
      updateSettings({ dockItems: suggestedWidgets[selectedType] });
      success(i18n("created"));
      setName("");
    } catch (err) {
      showError(String(err));
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(id: string) {
    select(id);
    const p = profiles.find((x) => x.id === id);
    if (p) updateSettings({ dockItems: p.widgets, accentColor: p.accent as never });
    success(i18n("selected"));
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("profileSelectionTitle")}</h1>

      <Card3D>
        <div className="space-y-3">
          <label className="text-sm font-medium">{i18n("newProfile")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={i18n("profileNamePlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs ${type === t ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-raised)]"}`}
              >
                {i18n(t)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {i18n("create")}
          </button>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <Card3D key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-[var(--muted)]">{i18n(p.type)} • {p.widgets.length} widgets</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => duplicate(p.id)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]"><Icon name="copy" className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(p.id)} className="rounded p-1 text-red-400 hover:bg-[var(--surface-raised)]"><Icon name="trash-2" className="h-4 w-4" /></button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelect(p.id)}
              className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold text-white ${active === p.id ? "bg-emerald-500" : "bg-[var(--accent)]"}`}
            >
              {active === p.id ? i18n("active") : i18n("select")}
            </button>
          </Card3D>
        ))}
      </div>

      <Card3D>
        <p className="text-sm text-[var(--muted)]">{i18n("profileSelectionHint")}</p>
      </Card3D>
    </div>
  );
}
