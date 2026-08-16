"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData, type UserDataRecord } from "@/lib/hooks/useUserData";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

const WIDGET_ICONS: Record<string, string> = {
  notes: "notebook-pen",
  tasks: "circle-check",
  calendar: "calendar-days",
  files: "folder",
  brain: "brain",
};

const WORKSPACES = [
  {
    id: "personal",
    accent: {
      badge: "bg-emerald-500/20 text-emerald-400",
      icon: "bg-emerald-500/10 text-emerald-400",
      ring: "ring-emerald-500/30",
    },
    icon: "user",
    steps: ["Capturer", "Organiser", "Exécuter"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
  {
    id: "focus",
    accent: {
      badge: "bg-sky-500/20 text-sky-400",
      icon: "bg-sky-500/10 text-sky-400",
      ring: "ring-sky-500/30",
    },
    icon: "target",
    steps: ["Choisir", "Concentrer", "Terminer"],
    widgets: ["tasks", "calendar", "brain", "notes"],
  },
  {
    id: "studio",
    accent: {
      badge: "bg-rose-500/20 text-rose-400",
      icon: "bg-rose-500/10 text-rose-400",
      ring: "ring-rose-500/30",
    },
    icon: "sparkles",
    steps: ["Explorer", "Relier", "Publier"],
    widgets: ["notes", "files", "brain", "calendar"],
  },
  {
    id: "gaming",
    accent: {
      badge: "bg-amber-500/20 text-amber-400",
      icon: "bg-amber-500/10 text-amber-400",
      ring: "ring-amber-500/30",
    },
    icon: "gamepad-2",
    steps: ["Lancer", "Jouer", "Terminer"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
];

function getWorkspace(item: UserDataRecord, i18n: (k: string) => string) {
  const data = (item.data || {}) as Record<string, unknown>;
  if (typeof data.workspaceId === "string") {
    return WORKSPACES.find((w) => w.id === data.workspaceId);
  }
  return WORKSPACES.find(
    (w) =>
      w.id === item.label.toLowerCase() ||
      i18n(w.id).toLowerCase() === item.label.toLowerCase()
  );
}

export default function SpacesPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items: spaces, loading, error, create, remove } = useUserData("space");
  const [name, setName] = useState("");
  const [activeSpace, setActiveSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");

  const activeWorkspace = WORKSPACES.find((w) => w.id === activeSpace);

  async function add() {
    if (!name.trim()) return;
    try {
      await create(
        name,
        "",
        {
          workspaceId: activeSpace,
          color: activeWorkspace?.accent.badge,
        },
        0
      );
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

  function colorFor(item: UserDataRecord) {
    const data = (item.data || {}) as { color?: string; workspaceId?: string };
    if (data.color) return data.color;
    const workspace = getWorkspace(item, i18n);
    return workspace?.accent.badge ?? "bg-zinc-500/20 text-zinc-400";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("spacesTitle")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {spaces.length} {spaces.length > 1 ? i18n("opens") : i18n("open")}
        </span>
      </div>

      <Card3D>
        <h2 className="mb-3 text-sm font-semibold capitalize text-[var(--foreground)]">{i18n("active")} {i18n("spaces")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WORKSPACES.map((w) => {
            const isActive = activeSpace === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveSpace(w.id)}
                className={`relative rounded-[var(--panel-radius)] border p-3 text-left transition-colors duration-150 ${
                  isActive
                    ? `border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ${w.accent.ring}`
                    : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] ${w.accent.icon}`}>
                    <Icon name={w.icon} className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{i18n(w.id)}</span>
                </div>
                {isActive && (
                  <span className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ${w.accent.badge}`}>
                    {i18n("active")}
                  </span>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {w.steps.map((step, i) => (
                    <span key={i} className="text-[9px] text-[var(--muted)]">
                      {i + 1}. {step}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-emerald-500/10 text-emerald-400">
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
              <Icon name="layers" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{WORKSPACES.length}</p>
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
          <div className="flex gap-2">
            <input
              id="space-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              aria-label={i18n("create")}
              placeholder={i18n("create")}
              className="min-w-0 flex-1 rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              aria-label={i18n("add")}
              onClick={add}
              disabled={loading}
              className="flex shrink-0 items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {i18n("create")}: <span className="font-medium text-[var(--accent)]">{i18n(activeSpace)}</span>
          </p>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {spaces.map((space) => {
          const workspace = getWorkspace(space, i18n);
          const isActive = workspace?.id === activeSpace;
          return (
            <Card3D key={space.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] ${colorFor(space)}`}>
                      <Icon name={workspace?.icon ?? "layout-grid"} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{space.label}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {workspace ? i18n(workspace.id) : i18n("custom")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={i18n("delete")}
                    onClick={() => deleteSpace(space.id)}
                    className="text-[var(--muted)] hover:text-red-400"
                  >
                    <Icon name="trash-2" className="h-4 w-4" />
                  </button>
                </div>

                {workspace && (
                  <div className="flex flex-wrap gap-1.5">
                    {workspace.steps.map((step, i) => (
                      <span
                        key={i}
                        className="rounded-[var(--panel-radius)] bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] text-[var(--foreground)]"
                      >
                        <b className="mr-1 text-[var(--accent)]">{i + 1}</b>
                        {step}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-[var(--border)] pt-2">
                  {(workspace?.widgets ?? ["notes", "tasks", "calendar", "brain"]).map((widgetId) => (
                    <span
                      key={widgetId}
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--surface-raised)] text-[var(--muted)]"
                      title={widgetId}
                    >
                      <Icon name={WIDGET_ICONS[widgetId]} className="h-3.5 w-3.5" />
                    </span>
                  ))}
                </div>

                {isActive && (
                  <div className="flex items-center gap-2 text-xs font-semibold capitalize text-emerald-400">
                    <Icon name="check" className="h-3.5 w-3.5" />
                    {i18n("active")}
                  </div>
                )}
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
