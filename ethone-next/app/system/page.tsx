"use client";

import { useMemo } from "react";
import BentoCard from "@/components/BentoCard";
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

function getWorkspaceId(item: UserDataRecord, i18n: (k: string, f?: string) => string) {
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

function WorkspaceCard({
  w,
  isActive,
  onStart,
}: {
  w: (typeof WORKSPACES)[0];
  isActive: boolean;
  onStart: () => void;
}) {
  const i18n = useI18n();

  return (
    <BentoCard noHeader className="h-full">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${w.accent.icon}`}
            >
              <Icon name={w.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{i18n(w.id)}</p>
              <p className="text-[11px] text-zinc-400">{w.flow}</p>
            </div>
          </div>
          {isActive && (
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${w.accent.badge}`}>
              {i18n("active")}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">{i18n(`${w.id}Desc`)}</p>

        <div className="flex flex-wrap gap-2">
          {w.steps.map((step, i) => (
            <span
              key={i}
              className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-300"
            >
              <b className="mr-1 text-[var(--accent)]">{i + 1}</b>
              {step}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1.5">
            {w.widgets.map((widgetId) => (
              <span
                key={widgetId}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400"
                title={widgetId}
              >
                <Icon name={WIDGET_ICONS[widgetId]} className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStart}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all active:scale-95 ${
                isActive
                  ? "bg-[var(--accent)] text-white hover:opacity-90"
                  : "bg-white/[0.06] text-white hover:bg-white/[0.10]"
              }`}
            >
              <Icon name={isActive ? "check" : "play"} className="h-3.5 w-3.5" />
              {isActive ? i18n("active") : i18n("start")}
            </button>
            <Link
              href={w.id === "gaming" ? "/flows" : "/spaces"}
              className="text-xs text-zinc-400 hover:text-[var(--accent)]"
            >
              {i18n("openAction")}
            </Link>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: string;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <BentoCard noHeader>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-400">{label}</p>
        </div>
      </div>
    </BentoCard>
  );
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
      success(i18n("started", "Démarré"));
    } catch {
      // toast handled by hook? no, useToast not in useUserData
    }
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Mission Control</p>
          <h1 className="text-2xl font-bold text-white">{i18n("systemTitle")}</h1>
          <p className="text-sm text-zinc-400">{i18n("systemDescription")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon="layout-grid"
            value={spaces.length}
            label={i18n("spaces")}
            tone="bg-violet-500/10 text-violet-400"
          />
          <StatCard
            icon="activity"
            value={activeSpacesCount}
            label={i18n("active")}
            tone="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            icon="workflow"
            value={flows.length}
            label={i18n("flows")}
            tone="bg-amber-500/10 text-amber-400"
          />
          <StatCard
            icon="zap"
            value={activeFlowsCount}
            label={i18n("flows")}
            tone="bg-sky-500/10 text-sky-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORKSPACES.map((w) => (
            <WorkspaceCard
              key={w.id}
              w={w}
              isActive={activeSpace === w.id}
              onStart={() => runWorkspace(w.id)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BentoCard
            title={i18n("recentSpaces", "Spaces récents")}
            icon="layout-grid"
          >
            {recentSpaces.length === 0 ? (
              <div className="flex h-full items-center text-sm text-zinc-400">
                {i18n("noSpaces")}
              </div>
            ) : (
              <div className="space-y-2">
                {recentSpaces.map((space) => {
                  const wsId = getWorkspaceId(space, i18n);
                  const isActive = wsId === activeSpace;
                  const workspace = WORKSPACES.find((w) => w.id === wsId);
                  return (
                    <div
                      key={space.id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.04] p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            workspace?.accent.icon ?? "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          <Icon name={workspace?.icon ?? "layout-grid"} className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{space.label}</p>
                          <p className="text-[10px] text-zinc-400">
                            {new Date(space.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${workspace?.accent.badge ?? "bg-emerald-500/20 text-emerald-400"}`}>
                          {i18n("active")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </BentoCard>

          <BentoCard
            title={i18n("recentFlows", "Flows récents")}
            icon="workflow"
          >
            {recentFlows.length === 0 ? (
              <div className="flex h-full items-center text-sm text-zinc-400">
                {i18n("noFlows")}
              </div>
            ) : (
              <div className="space-y-2">
                {recentFlows.map((flow) => {
                  const wsId = getWorkspaceId(flow, i18n);
                  const isActive = wsId === activeSpace;
                  const workspace = WORKSPACES.find((w) => w.id === wsId);
                  return (
                    <div
                      key={flow.id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.04] p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            workspace?.accent.icon ?? "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          <Icon name={workspace?.icon ?? "workflow"} className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{flow.label}</p>
                          <p className="text-[10px] text-zinc-400">
                            {flow.count} {i18n("executions")}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${workspace?.accent.badge ?? "bg-emerald-500/20 text-emerald-400"}`}>
                          {i18n("active")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </BentoCard>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BentoCard noHeader>
            <Link
              href="/spaces"
              className="flex h-full items-center gap-3 text-zinc-200 hover:text-[var(--accent)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Icon name="layout-grid" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{i18n("spacesTitle")}</p>
                <p className="text-xs text-zinc-400">{i18n("spacesDescription")}</p>
              </div>
            </Link>
          </BentoCard>

          <BentoCard noHeader>
            <Link
              href="/flows"
              className="flex h-full items-center gap-3 text-zinc-200 hover:text-[var(--accent)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Icon name="workflow" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{i18n("flowsTitle")}</p>
                <p className="text-xs text-zinc-400">{i18n("flowsDescription")}</p>
              </div>
            </Link>
          </BentoCard>
        </div>

        <FlowAutomations activeFlow={activeSpace} />
      </div>
    </main>
  );
}
