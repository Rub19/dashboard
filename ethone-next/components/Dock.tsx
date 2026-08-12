"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import ContextMenu from "@/components/ContextMenu";
import Card3D from "@/components/Card3D";
import DockControlCenter from "@/components/DockControlCenter";

const ICONS: Record<string, string> = {
  home: "home",
  notes: "notes",
  tasks: "tasks",
  calendar: "calendar",
  files: "files",
  bills: "bills",
  activity: "activity",
  interactions: "interactions",
  connections: "connections",
  plugins: "plugins",
  spaces: "spaces",
  flows: "flows",
  brain: "brain",
  weather: "cloudSun",
  focus: "focus",
  team: "team",
  mail: "mail",
  settings: "settings",
};

export default function Dock() {
  const { settings, update } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const { openWindow } = useWindowManager();
  const i18n = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [controlCenterEl, setControlCenterEl] = useState<HTMLButtonElement | null>(null);

  const allApps = useMemo(
    () =>
      Object.keys(ICONS)
        .map((id) => ({
          id,
          href: id === "home" ? "/" : `/${id}/`,
          icon: ICONS[id],
          label: i18n(id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [i18n]
  );

  useEffect(() => {
    if (!launcherOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLauncherOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [launcherOpen]);

  if (!settings.dockVisible || settings.layoutPreset === "sidebar-only" || settings.layoutPreset === "minimal") return null;

  function visibleItems() {
    return settings.dockItems
      .filter((id) => ICONS[id])
      .map((id) => ({ id, href: id === "home" ? "/" : `/${id}/`, icon: ICONS[id], label: i18n(id) }));
  }

  function move(id: string, delta: number) {
    const order = [...settings.dockItems];
    const idx = order.indexOf(id);
    const to = Math.min(order.length - 1, Math.max(0, idx + delta));
    if (idx < 0 || idx === to) return;
    order.splice(to, 0, order.splice(idx, 1)[0]);
    update({ dockItems: order });
  }

  function moveTo(draggedId: string, targetId: string) {
    const order = [...settings.dockItems];
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = order.filter((id) => id !== draggedId);
    const insertAt = from < to ? to : to;
    next.splice(insertAt, 0, draggedId);
    update({ dockItems: next });
  }

  function toggleDockItem(id: string) {
    const next = settings.dockItems.includes(id)
      ? settings.dockItems.filter((x) => x !== id)
      : [...settings.dockItems, id];
    update({ dockItems: next });
  }

  const baseControlClass =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-[var(--foreground)] transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--surface)] hover:shadow-lg";

  return (
    <div
      className="v8-floating-dock fixed bottom-4 z-50"
      style={{ left: "calc(50% + var(--dock-offset))", transform: "translateX(-50%)" }}
      data-dock-magnify="true"
      data-dock-pulse="true"
    >
      {launcherOpen && (
        <div className="v8-dock-launcher absolute bottom-full left-1/2 z-50 mb-4 w-[min(90vw,420px)] -translate-x-1/2">
          <Card3D>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--foreground)]">{i18n("dockLauncher")}</h3>
                <button
                  type="button"
                  onClick={() => setLauncherOpen(false)}
                  aria-label={i18n("close")}
                  data-haptic
                  className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {allApps.map((app) => {
                  const active = settings.dockItems.includes(app.id);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => toggleDockItem(app.id)}
                      aria-label={active ? i18n("dockRemove") : i18n("dockAdd")}
                      data-haptic
                      className={`flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] p-2 text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--surface)] ${
                        active ? "border-[var(--accent)] text-[var(--accent)]" : ""
                      }`}
                    >
                      <Icon name={app.icon} className="h-5 w-5" />
                      <span className="w-full truncate text-center text-[10px] leading-tight">{app.label}</span>
                      <span className="rounded-full border border-[var(--border)] p-0.5">
                        <Icon name={active ? "minus" : "plus"} className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card3D>
        </div>
      )}

      <div
        data-dock
        className={`flex items-end gap-1 border border-[var(--border)] bg-[var(--surface-raised)]/95 p-2 shadow-2xl backdrop-blur-md transition-all ${
          expanded ? "min-w-[320px] flex-wrap justify-center" : ""
        }`}
        style={{ borderRadius: "var(--dock-radius)" }}
      >
        {visibleItems().map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          const contextItems = [
            { id: "open", label: i18n("openHere"), icon: "arrow-right", onClick: () => router.push(item.href) },
            { id: "window", label: i18n("openInWindow"), icon: "maximize", onClick: () => openWindow(item.label, item.href) },
          ];
          const link = (
            <Link
              href={item.href}
              onClick={(e) => {
                if (draggingId) e.preventDefault();
              }}
              aria-label={item.label}
              data-tooltip={item.label}
              data-haptic
              data-dock-item
              data-dock-item-active={active ? "true" : "false"}
              className={`${baseControlClass} ${active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : ""}`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
            </Link>
          );
          return (
            <ContextMenu key={item.id} items={contextItems}>
              <div
                className="group relative flex flex-col items-center"
                draggable={expanded}
                onDragStart={(e) => {
                  setDraggingId(item.id);
                  e.dataTransfer.setData("text/plain", item.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingId && draggingId !== item.id) {
                    e.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData("text/plain");
                  if (draggedId && draggedId !== item.id) {
                    moveTo(draggedId, item.id);
                  }
                  setDraggingId(null);
                }}
                onDragEnd={() => setDraggingId(null)}
              >
                {link}
                {expanded && (
                  <div className="mt-1 flex gap-0.5">
                    <button onClick={() => move(item.id, -1)} className="rounded p-0.5 text-[10px] text-[var(--muted)] hover:bg-[var(--surface)]">◀</button>
                    <button onClick={() => move(item.id, 1)} className="rounded p-0.5 text-[10px] text-[var(--muted)] hover:bg-[var(--surface)]">▶</button>
                  </div>
                )}
              </div>
            </ContextMenu>
          );
        })}

        <button
          type="button"
          onClick={() => setLauncherOpen((v) => !v)}
          aria-label={i18n("dockLauncher")}
          data-tooltip={i18n("dockLauncher")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${launcherOpen ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)]"}`}
        >
          <Icon name="layoutGrid" className="h-5 w-5" />
        </button>

        <button
          ref={setControlCenterEl}
          type="button"
          onClick={() => {
            setControlCenterOpen((v) => !v);
            setLauncherOpen(false);
          }}
          aria-label={i18n("controlCenter")}
          aria-expanded={controlCenterOpen}
          data-tooltip={i18n("controlCenter")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${controlCenterOpen ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)]"}`}
        >
          <Icon name="sliders" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={i18n("expand")}
          data-tooltip={i18n("expand")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${expanded ? "rotate-180" : ""}`}
        >
          <Icon name="chevronUp" className="h-5 w-5" />
        </button>

        {controlCenterOpen && controlCenterEl && (
          <DockControlCenter
            open={controlCenterOpen}
            onClose={() => setControlCenterOpen(false)}
            referenceRef={controlCenterEl}
          />
        )}
      </div>
    </div>
  );
}
