"use client";

import { useMemo } from "react";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData, type UserDataRecord } from "@/lib/hooks/useUserData";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useToast } from "@/components/ToastProvider";
import Link from "next/link";
import FlowAutomations from "@/components/FlowAutomations";

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
    flow: "Essentiel",
    icon: "user",
    accent: {
      badge: "bg-emerald-500/20 text-emerald-400",
      icon: "bg-emerald-500/10 text-emerald-400",
      ring: "ring-emerald-500/30",
    },
    steps: ["Capturer", "Organiser", "Exécuter"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
  {
    id: "focus",
    flow: "Deep Work",
    icon: "target",
    accent: {
      badge: "bg-sky-500/20 text-sky-400",
      icon: "bg-sky-500/10 text-sky-400",
      ring: "ring-sky-500/30",
    },
    steps: ["Choisir", "Concentrer", "Terminer"],
    widgets: ["tasks", "calendar", "brain", "notes"],
  },
  {
    id: "studio",
    flow: "Création",
    icon: "sparkles",
    accent: {
      badge: "bg-rose-500/20 text-rose-400",
      icon: "bg-rose-500/10 text-rose-400",
      ring: "ring-rose-500/30",
    },
    steps: ["Explorer", "Relier", "Publier"],
    widgets: ["notes", "files", "brain", "calendar"],
  },
  {
    id: "gaming",
    flow: "Gaming",
    icon: "gamepad-2",
    accent: {
      badge: "bg-amber-500/20 text-amber-400",
      icon: "bg-amber-500/10 text-amber-400",
      ring: "ring-amber-500/30",
    },
    steps: ["Lancer", "Jouer", "Terminer"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
];

function getWorkspaceId(item: UserDataRecord, i18n: (k: string) => string) {
  const data = (item.data || {}) as Record<string, unknown>;
  if (typeof data.workspaceId === "string") return data.workspaceId;
  if (typeof data.templateId === "string") return data.templateId;
  const match = WORKSPACES.find(
    (w) =>
      w.id === item.label.toLowerCase() ||
      i18n(w.id).toLowerCase() === item.label.toLowerCase()
  );
  return match?.id;
}

export default function SystemPage() {
  const i18n = useI18n();
  const { success } = useToast();
  const { items: spaces } = useUserData("space");
  const { items: flows, create: createFlow, update: updateFlow } = useUserData("flow");
  const [activeSpace, setActiveSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");

  const activeSpacesCount = spaces.filter((s) => s.count > 0).length;
  const activeFlowsCount = flows.filter((f) => f.count > 0).length;

  const recentSpaces = useMemo(
    () =>
      [...spaces]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3),
    [spaces]
  );

  const recentFlows = useMemo(
    () =>
      [...flows]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3),
    [flows]
  );

  async function runWorkspace(id: string) {
    setActiveSpace(id);
    const workspace = WORKSPACES.find((w) => w.id === id);
    if (!workspace) return;

    const existing = flows.find(
      (f) => (f.data as { templateId?: string })?.templateId === id
    );

    try {
      if (existing) {
        await updateFlow(existing.id, { count: existing.count + 1 });
      } else {
        await createFlow(i18n(id), "", { templateId: id, workspaceId: id }, 1);
      }
      success(i18n("started"));
    } catch {
      // toast handled by hook? no, useToast not in useUserData
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Mission Control</p>
        <h1 className="text-2xl font-bold">{i18n("systemTitle")}</h1>
        <p className="text-sm text-[var(--muted)]">{i18n("systemDescription")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
              <Icon name="layout-grid" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{spaces.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("spaces")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-emerald-500/10 text-emerald-400">
              <Icon name="activity" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{activeSpacesCount}</p>
              <p className="text-xs capitalize text-[var(--muted)]">{i18n("active")} {i18n("spaces")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-amber-500/10 text-amber-400">
              <Icon name="workflow" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{flows.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("flows")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-sky-500/10 text-sky-400">
              <Icon name="zap" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{activeFlowsCount}</p>
              <p className="text-xs capitalize text-[var(--muted)]">{i18n("active")} {i18n("flows")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WORKSPACES.map((w) => {
          const isActive = activeSpace === w.id;
          return (
            <Card3D key={w.id}>
              <div className={`rounded-[var(--panel-radius)] p-1 ${isActive ? `ring-1 ${w.accent.ring}` : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] ${w.accent.icon}`}>
                      <Icon name={w.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{i18n(w.id)}</p>
                      <p className="text-xs text-[var(--muted)]">{w.flow}</p>
                    </div>
                  </div>
                  {isActive ? (
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold capitalize ${w.accent.badge}`}>
                      {i18n("active")}
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                  {i18n(`${w.id}Desc`)}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {w.steps.map((step, i) => (
                    <span
                      key={i}
                      className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] text-[var(--foreground)]"
                    >
                      <b className="mr-1 text-[var(--accent)]">{i + 1}</b>
                      {step}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-[var(--panel-border)] pt-3">
                  {w.widgets.map((widgetId) => (
                    <span
                      key={widgetId}
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] text-[var(--muted)]"
                      title={widgetId}
                    >
                      <Icon name={WIDGET_ICONS[widgetId]} className="h-3.5 w-3.5" />
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => runWorkspace(w.id)}
                    className={`inline-flex items-center gap-2 rounded-[var(--panel-radius)] px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 ${
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--panel-bg)] text-[var(--foreground)] hover:text-[var(--accent)]"
                    } backdrop-blur-[var(--panel-blur)]`}
                  >
                    <Icon name={isActive ? "check" : "play"} className="h-3.5 w-3.5" />
                    {isActive ? i18n("active") : i18n("start")}
                  </button>
                  <Link
                    href={w.id === "gaming" ? "/flows" : "/spaces"}
                    className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
                  >
                    {i18n("openAction")}
                  </Link>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card3D>
          <h2 className="mb-3 text-sm font-semibold">{i18n("recentSpaces")}</h2>
          {recentSpaces.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{i18n("noSpaces")}</p>
          ) : (
            <div className="space-y-2">
              {recentSpaces.map((space) => {
                const wsId = getWorkspaceId(space, i18n);
                const isActive = wsId === activeSpace;
                const workspace = WORKSPACES.find((w) => w.id === wsId);
                return (
                  <div key={space.id} className="flex items-center justify-between rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] ${
                          workspace?.accent.icon ?? "bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        <Icon name={workspace?.icon ?? "layout-grid"} className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{space.label}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {new Date(space.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold capitalize ${workspace?.accent.badge ?? "bg-emerald-500/20 text-emerald-400"}`}>
                        {i18n("active")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card3D>

        <Card3D>
          <h2 className="mb-3 text-sm font-semibold">{i18n("recentFlows")}</h2>
          {recentFlows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{i18n("noFlows")}</p>
          ) : (
            <div className="space-y-2">
              {recentFlows.map((flow) => {
                const wsId = getWorkspaceId(flow, i18n);
                const isActive = wsId === activeSpace;
                const workspace = WORKSPACES.find((w) => w.id === wsId);
                return (
                  <div key={flow.id} className="flex items-center justify-between rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-[var(--panel-radius)] ${
                          workspace?.accent.icon ?? "bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        <Icon name={workspace?.icon ?? "workflow"} className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{flow.label}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {flow.count} {i18n("executions")}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold capitalize ${workspace?.accent.badge ?? "bg-emerald-500/20 text-emerald-400"}`}>
                        {i18n("active")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card3D>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card3D>
          <Link href="/spaces" className="flex items-center gap-3 text-[var(--foreground)] hover:text-[var(--accent)]">
            <Icon name="layout-grid" className="h-5 w-5" />
            <div>
              <p className="font-medium">{i18n("spacesTitle")}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("spacesDescription")}</p>
            </div>
          </Link>
        </Card3D>
        <Card3D>
          <Link href="/flows" className="flex items-center gap-3 text-[var(--foreground)] hover:text-[var(--accent)]">
            <Icon name="workflow" className="h-5 w-5" />
            <div>
              <p className="font-medium">{i18n("flowsTitle")}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("flowsDescription")}</p>
            </div>
          </Link>
        </Card3D>
      </div>

      <FlowAutomations activeFlow={activeSpace} />
    </div>
  );
}
