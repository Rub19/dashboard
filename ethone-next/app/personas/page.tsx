"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import { useUserData } from "@/lib/hooks/useUserData";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import Select from "@/components/ui/Select";

const THEMES = ["default", "boreal", "cyberpunk", "eclipse", "emerald"] as const;

function themeLabel(theme: string, i18n: (k: string) => string) {
  const key = `theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
  return i18n(key);
}

export default function PersonasPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items: personas, create, update, remove } = useUserData("persona");
  const { update: updateSettings } = useSettings();
  const [label, setLabel] = useState("");
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("default");
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTheme, setEditTheme] = useState<(typeof THEMES)[number]>("default");

  async function add() {
    if (!label.trim()) return;
    try {
      await create(label, "", { theme });
      setLabel("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  function startEdit(p: (typeof personas)[0]) {
    setEditing(p.id);
    setEditLabel(p.label);
    setEditTheme((p.data as { theme?: (typeof THEMES)[number] }).theme || "default");
  }

  function cancelEdit() {
    setEditing(null);
    setEditLabel("");
  }

  async function saveEdit(id: string) {
    try {
      await update(id, { label: editLabel, data: { theme: editTheme } });
      setEditing(null);
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  function apply(persona: (typeof personas)[0]) {
    const data = persona.data as { theme?: (typeof THEMES)[number] };
    if (data.theme) {
      updateSettings({ theme: data.theme });
      success(i18n("applied"));
    }
  }

  async function deletePersona(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("personasTitle")}</h1>

      <Card3D>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{i18n("personasDescription")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              aria-label={i18n("create")}
              placeholder={i18n("create")}
              className="min-w-0 flex-1"
            />
            <Select
              value={theme}
              onChange={(value) => setTheme(value as (typeof THEMES)[number])}
              options={THEMES.map((t) => ({ id: t, label: themeLabel(t, i18n) }))}
              aria-label={i18n("theme")}
              className="min-w-0"
            />
            <button type="button" aria-label={i18n("add")} onClick={add} className="inline-flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => {
          const data = p.data as { theme?: string };
          const isEditing = editing === p.id;
          return (
            <Card3D key={p.id}>
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(p.id); if (e.key === "Escape") cancelEdit(); }}
                    aria-label={i18n("label")}
                  />
                  <Select
                    value={editTheme}
                    onChange={(value) => setEditTheme(value as (typeof THEMES)[number])}
                    options={THEMES.map((t) => ({ id: t, label: themeLabel(t, i18n) }))}
                    aria-label={i18n("theme")}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => saveEdit(p.id)} className="flex-1 rounded-[var(--panel-radius)] bg-[var(--accent)] py-2 text-sm font-semibold text-white">{i18n("save")}</button>
                    <button type="button" onClick={cancelEdit} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">{i18n("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
                      <Icon name="users" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs capitalize text-[var(--muted)]">{data.theme ? themeLabel(data.theme, i18n) : i18n("themeDefault")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={i18n("edit")} onClick={() => startEdit(p)} className="rounded p-1.5 text-[var(--muted)] hover:text-[var(--accent)]">
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={i18n("apply")} onClick={() => apply(p)} className="rounded p-1.5 text-emerald-400 hover:bg-emerald-500/10">
                      <Icon name="check" className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={i18n("delete")} onClick={() => deletePersona(p.id)} className="rounded p-1.5 text-[var(--muted)] hover:text-red-400">
                      <Icon name="trash-2" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
