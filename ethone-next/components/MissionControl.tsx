"use client";

import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import Modal from "@/components/ui/Modal";
import { useI18n } from "@/lib/hooks/useI18n";
import { useWindowManager } from "./WindowManagerProvider";
import { useLayer } from "./LayerProvider";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useBrain } from "@/lib/hooks/useBrain";

const ROUTE_ICONS: Record<string, string> = {
  "/": "home",
  "/notes": "notes",
  "/tasks": "tasks",
  "/calendar": "calendar",
  "/files": "files",
  "/bills": "bills",
  "/mail": "mail",
  "/brain": "brain",
  "/focus": "focus",
  "/spaces": "spaces",
  "/flows": "flows",
  "/interactions": "interactions",
  "/connections": "connections",
  "/activity": "activity",
  "/settings": "settings",
  "/system": "system",
  "/team": "team",
  "/profile": "user",
  "/plugins": "plugins",
  "/drop": "drop",
  "/rss": "rss",
};

function routeIcon(route: string) {
  return ROUTE_ICONS[route] || "scan-search";
}

const APP_ROUTES = Object.entries(ROUTE_ICONS).map(([route, icon]) => ({
  id: route === "/" ? "home" : route.replace(/^\/+/, ""),
  route,
  icon,
}));

type Workspace = {
  id: "personal" | "focus" | "studio";
  icon: string;
  flow: string;
  description: string;
  steps: string[];
  widgets: string[];
};

const WORKSPACES: Workspace[] = [
  {
    id: "personal",
    icon: "user",
    flow: "v8FlowPersonal",
    description: "missionPersonalDescription",
    steps: ["Capturer", "Organiser", "Exécuter"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
  {
    id: "focus",
    icon: "focus",
    flow: "v8FlowFocus",
    description: "missionFocusDescription",
    steps: ["Choisir", "Concentrer", "Terminer"],
    widgets: ["tasks", "calendar", "brain", "notes"],
  },
  {
    id: "studio",
    icon: "sparkles",
    flow: "v8FlowStudio",
    description: "missionStudioDescription",
    steps: ["Explorer", "Relier", "Publier"],
    widgets: ["notes", "files", "brain", "calendar"],
  },
];

const STATUS_DOT: Record<string, string> = {
  connected: "bg-emerald-500",
  loading: "bg-zinc-500",
  empty: "bg-zinc-500",
  error: "bg-red-500",
};

function missionTargetIndex(key: string, index: number, count: number): number | null {
  if (!count) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const delta =
    key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  if (!delta) return null;
  const start = index < 0 ? (delta > 0 ? -1 : 0) : index;
  return ((start + delta) % count + count) % count;
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <span className="rounded-lg bg-[var(--panel-bg)] px-2 py-0.5 text-xs text-[var(--muted)]">{count}</span>
      </header>
      {children}
    </section>
  );
}

export function MissionControl() {
  const { missionControl } = useWindowManager();
  if (!missionControl) return null;
  return <MissionControlDialog />;
}

function MissionControlDialog() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();
  const { activeProfile } = useActiveProfile();
  const { windows, missionControl, setMissionControl, focusWindow, closeWindow, openWindow } = useWindowManager();
  const { records } = useLiveData();
  const brain = useBrain();
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useLayer(missionControl, () => setMissionControl(false), {
    boundary: dialogRef,
    kind: "dialog",
    modal: true,
    trapFocus: true,
    closeOnEscape: true,
    closeOnOutside: false,
    closeOnResize: false,
    closeOnScroll: false,
    initialFocus: false,
  });

  const activeWorkspace = useMemo(
    () => WORKSPACES.find((w) => w.id === (activeProfile?.workspace || "personal")) || WORKSPACES[0],
    [activeProfile]
  );

  const liveCards = useMemo(() => records.slice(0, 6), [records]);

  const brainActivity = useMemo(() => {
    const assistant = brain.messages.filter((msg) => msg.role === "assistant");
    if (assistant.length) {
      return assistant
        .slice(-4)
        .reverse()
        .map((msg) => ({
          id: `brain-msg-${msg.createdAt}`,
          title: i18n("brain"),
          description: msg.content.slice(0, 80),
          icon: "brain" as const,
        }));
    }
    return [];
  }, [brain.messages, i18n]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return windows;
    return windows.filter(
      (w) => w.title.toLowerCase().includes(term) || w.route.toLowerCase().includes(term)
    );
  }, [windows, query]);

  const maxZ = useMemo(() => Math.max(0, ...windows.map((w) => w.z)), [windows]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>("[data-mission-item]"));
    if (!items.length) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = missionTargetIndex(event.key, currentIndex, items.length);
    if (nextIndex == null) return;

    event.preventDefault();
    items[nextIndex].focus({ preventScroll: true });
  }

  function navigateAndClose(href: string) {
    setMissionControl(false);
    router.push(href);
  }

  return (
    <Modal
      isOpen={missionControl}
      onClose={() => setMissionControl(false)}
      title={i18n("missionControlTitle")}
      size="lg"
      hideFooter
      hideCloseButton
      fullScreen
      className="p-0"
      contentClassName="!m-0 overflow-hidden"
    >
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="flex h-full w-full flex-col items-center overflow-y-auto p-4 pt-12 sm:p-8 sm:pt-8"
      >
        <div className="mb-4 flex w-full items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {i18n("missionNavigationSystem")}
          </span>
          <h2 id="mission-title" className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {i18n("missionControlTitle")}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {i18n(activeWorkspace.flow)} / {windows.length} {i18n("missionWindows")} / {liveCards.length}{" "}
            {i18n("missionWidgets")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted)] backdrop-blur-[var(--panel-blur)]"
            aria-label={i18n("missionF2Open")}
          >
            F2
          </span>
          <button
            type="button"
            onClick={() => setMissionControl(false)}
            className="rounded-lg bg-[var(--panel-bg)] p-2 text-[var(--foreground)] transition-colors hover:bg-[var(--panel-bg)]"
            aria-label={i18n("close")}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-6 w-full">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("searchWindows")}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
            autoFocus
            aria-label={i18n("searchWindows")}
          />
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 pb-8 lg:grid-cols-[1fr_320px]">
        <main className="space-y-4">
          <Section title={i18n("missionSpaces")} count={WORKSPACES.length}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {WORKSPACES.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  data-mission-item={`space-${w.id}`}
                  data-mission-kind="space"
                  aria-current={w.id === activeWorkspace.id ? "true" : undefined}
                  aria-label={`${i18n(w.id)} · ${i18n(w.flow)}`}
                  onClick={() => navigateAndClose("/spaces")}
                  className={`group relative flex w-full items-center gap-3 rounded-[var(--panel-radius)] border p-3 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--panel-bg)] ${
                    w.id === activeWorkspace.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                  } backdrop-blur-[var(--panel-blur)]`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Icon name={w.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      {i18n(w.flow)}
                    </span>
                    <span className="block text-sm font-semibold text-[var(--foreground)]">{i18n(w.id)}</span>
                    <span className="block truncate text-xs text-[var(--muted)]">{i18n(w.description)}</span>
                  </span>
                  {w.id === activeWorkspace.id ? (
                    <span className="rounded-lg bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                      {i18n("missionActive")}
                    </span>
                  ) : (
                    <Icon
                      name="arrow-right"
                      className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </button>
              ))}
            </div>
          </Section>

          <Section title={i18n("missionFlows")} count={WORKSPACES.length}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {WORKSPACES.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  data-mission-item={`flow-${w.id}`}
                  data-mission-kind="flow"
                  aria-current={w.id === activeWorkspace.id ? "true" : undefined}
                  aria-label={`${i18n("flows")} · ${i18n(w.flow)}`}
                  onClick={() => navigateAndClose("/flows")}
                  className={`group flex w-full flex-col gap-2 rounded-[var(--panel-radius)] border p-3 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--panel-bg)] ${
                    w.id === activeWorkspace.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                  } backdrop-blur-[var(--panel-blur)]`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)]/10 text-[var(--accent)]">
                      <Icon name="workflow" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        {i18n(w.id)}
                      </span>
                      <span className="block text-sm font-semibold text-[var(--foreground)]">{i18n(w.flow)}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {w.steps.map((step, i) => (
                      <span
                        key={i}
                        className="rounded bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        {i + 1}. {step}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          <Section title={i18n("missionWindows")} count={windows.length}>
            {windows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center text-[var(--muted)] backdrop-blur-[var(--panel-blur)]">
                <Icon name="scan-search" className="h-10 w-10 opacity-50" />
                <p>{i18n("noOpenWindows")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 text-center text-[var(--muted)] backdrop-blur-[var(--panel-blur)]">
                <Icon name="scan-search" className="h-10 w-10 opacity-50" />
                <p>{i18n("noWindowsMatch")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((win) => (
                  <div key={win.id} className="group relative">
                    <motion.button
                      layoutId={`win-${win.id}`}
                      whileHover={{ scale: 1.02 }}
                      type="button"
                      data-mission-item={`win-${win.id}`}
                      data-mission-kind="window"
                      aria-current={win.z === maxZ ? "page" : undefined}
                      aria-label={win.title}
                      onClick={() => {
                        focusWindow(win.id);
                        setMissionControl(false);
                      }}
                      className="relative flex aspect-video w-full cursor-pointer flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-left shadow-2xl backdrop-blur-[var(--panel-blur)]"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)]/10 text-[var(--accent)]">
                          <Icon name={routeIcon(win.route)} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{win.title}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{win.route}</p>
                        </div>
                      </div>

                      <div className="mt-auto h-16 w-full overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 backdrop-blur-[var(--panel-blur)]">
                        <div className="flex h-full w-full flex-col gap-1.5 opacity-40">
                          <div className="h-2 w-3/4 rounded bg-[var(--accent)]/30" />
                          <div className="h-2 w-1/2 rounded bg-[var(--muted)]/20" />
                          <div className="h-2 w-full rounded bg-[var(--border)]" />
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--accent)]" />
                    </motion.button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeWindow(win.id);
                      }}
                      className="absolute right-2 top-2 z-10 rounded-lg bg-[var(--panel-bg)]/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={i18n("closeWindow")}
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {windows.length > 0 && (
              <p className="text-sm text-[var(--muted)]">
                {filtered.length} / {windows.length} {i18n("windows")}
              </p>
            )}
          </Section>
        </main>

        <aside className="space-y-4">
          <Section title={i18n("missionDashboards")} count={APP_ROUTES.length}>
            <div className="flex flex-col gap-2">
              {APP_ROUTES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  data-mission-item={`dash-${r.id}`}
                  data-mission-kind="dashboard"
                  aria-current={pathname === r.route ? "page" : undefined}
                  aria-label={i18n(r.id)}
                  onClick={() => {
                    setMissionControl(false);
                    openWindow(i18n(r.id), r.route);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-[var(--panel-radius)] border p-2.5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--panel-bg)] ${
                    pathname === r.route
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                  } backdrop-blur-[var(--panel-blur)]`}
                >
                  <Icon name={r.icon} className="h-5 w-5 text-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--foreground)]">{i18n(r.id)}</span>
                    <span className="block text-xs text-[var(--muted)]">{r.route}</span>
                  </span>
                  {pathname === r.route ? (
                    <Icon name="circle-check" className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <Icon
                      name="chevron-right"
                      className="h-4 w-4 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </button>
              ))}
            </div>
          </Section>

          <Section title={i18n("missionWidgets")} count={liveCards.length}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {liveCards.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  data-mission-item={`widget-${record.id}`}
                  data-mission-kind="widget"
                  aria-label={record.label}
                  onClick={() => {
                    setMissionControl(false);
                    openWindow(i18n("connections"), "/connections");
                  }}
                  className="group flex w-full items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2.5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[record.status] || "bg-zinc-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--foreground)]">
                      {record.title || record.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--muted)]">
                      {record.subtitle || record.meta || record.source}
                    </span>
                  </span>
                  <Icon
                    name="external-link"
                    className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </Section>

          {settings.brainEnabled && (
            <Section title={i18n("missionBrainActivity")} count={brainActivity.length}>
              {brainActivity.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 text-center text-[var(--muted)] backdrop-blur-[var(--panel-blur)]">
                  <Icon name="brain" className="h-8 w-8 opacity-50" />
                  <p>{i18n("missionNoBrainActivity")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMissionControl(false);
                      openWindow(i18n("brain"), "/brain");
                    }}
                    className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Icon name="brain" className="h-4 w-4" />
                    {i18n("missionOpenBrain")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {brainActivity.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      data-mission-item={`brain-${b.id}`}
                      data-mission-kind="brain"
                      aria-label={b.title}
                      onClick={() => {
                        setMissionControl(false);
                        openWindow(i18n("brain"), "/brain");
                      }}
                      className="group flex w-full items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2.5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
                    >
                      <Icon name={b.icon} className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--foreground)]">{b.title}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">{b.description}</span>
                      </span>
                      <Icon
                        name="external-link"
                        className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              )}
            </Section>
          )}
        </aside>
      </div>
      </div>
    </Modal>
  );
}
