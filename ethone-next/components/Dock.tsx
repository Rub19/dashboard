"use client";

import { useMemo, useState, useEffect, useRef, type DragEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isActiveRoute } from "@/lib/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useNotifications } from "@/lib/hooks/useNotifications";
import ContextMenu from "@/components/ContextMenu";
import Card3D from "@/components/Card3D";
import DockControlCenter from "@/components/DockControlCenter";
import FocusPopover from "@/components/FocusPopover";
import DockItem from "@/components/DockItem";
import MediaDockItem from "@/components/MediaDockItem";

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

type SpotifyNow = {
  playing: boolean;
  title: string;
  artist: string;
  artwork?: string;
};

export default function Dock() {
  const { settings, update } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const { openWindow, missionControl, toggleMissionControl } = useWindowManager();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const i18n = useI18n();
  const { nowPlaying, lanyard } = useLiveData(120_000);
  const { unreadCount } = useNotifications();

  const [expanded, setExpanded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [controlCenterEl, setControlCenterEl] = useState<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const [focusPopover, setFocusPopover] = useState<{ open: boolean; anchor: HTMLElement | null }>({
    open: false,
    anchor: null,
  });
  const [pomodoroEl, setPomodoroEl] = useState<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [focusAppEl, setFocusAppEl] = useState<HTMLDivElement | null>(null);
  const focusSuppressRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const spotifyNow = useMemo<SpotifyNow | null>(() => {
    if (nowPlaying?.source?.toLowerCase() === "spotify" && nowPlaying?.isPlaying) {
      return {
        playing: true,
        title: nowPlaying.title || "",
        artist: nowPlaying.artist || "",
        artwork: nowPlaying.cover || nowPlaying.artworkUrl,
      };
    }
    if (lanyard?.spotify?.playing) {
      return {
        playing: true,
        title: lanyard.spotify.title || "",
        artist: lanyard.spotify.artist || "",
        artwork: lanyard.spotify.artwork,
      };
    }
    return null;
  }, [nowPlaying, lanyard]);

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

  function openFocus(anchor: HTMLElement | null) {
    if (!anchor) return;
    setFocusPopover({ open: true, anchor });
  }

  function closeFocus() {
    setFocusPopover({ open: false, anchor: null });
  }

  function startFocusHold(anchor: HTMLElement | null) {
    if (expanded || !anchor) return;
    clearFocusHold();
    focusTimerRef.current = setTimeout(() => {
      focusSuppressRef.current = true;
      openFocus(anchor);
      focusTimerRef.current = null;
    }, 520);
  }

  function clearFocusHold() {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
  }

  function handleOpenNotifications() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("v8:open-notifications"));
    }
  }

  return (
    <div
      className="v8-floating-dock fixed bottom-14 left-1/2 -translate-x-1/2 z-50 hidden md:block pointer-events-none bg-transparent border-0 shadow-none"
    >
      {launcherOpen && (
        <div className="pointer-events-auto absolute bottom-full left-1/2 z-50 mb-4 w-[min(90vw,420px)] -translate-x-1/2">
          <Card3D>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{i18n("dockLauncher")}</h3>
                <button
                  type="button"
                  onClick={() => setLauncherOpen(false)}
                  aria-label={i18n("close")}
                  data-haptic
                  className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-white"
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
                      className={`flex flex-col items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-zinc-300 transition-colors hover:border-white/15 hover:bg-white/[0.06] ${
                        active ? "border-emerald-500/30 text-emerald-400" : ""
                      }`}
                    >
                      <Icon name={app.icon} className="h-5 w-5" />
                      <span className="w-full truncate text-center text-[10px] leading-tight">{app.label}</span>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
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
        className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/85 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.75)] backdrop-blur-2xl transition-all hover:border-white/15"
      >
        {visibleItems().map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const isFocus = item.id === "focus";

          const contextItems = [
            { id: "open", label: i18n("openHere"), icon: "arrow-right", onClick: () => router.push(item.href) },
            { id: "window", label: i18n("openInWindow"), icon: "maximize", onClick: () => openWindow(item.label, item.href) },
          ];

          if (isFocus && focusAppEl) {
            contextItems.push({
              id: "pomodoro",
              label: i18n("dockPomodoro"),
              icon: "timer",
              onClick: () => openFocus(focusAppEl),
            });
          }

          const dragHandlers = {
            onDragStart: (e: DragEvent<HTMLDivElement>) => {
              setDraggingId(item.id);
              e.dataTransfer.setData("text/plain", item.id);
              e.dataTransfer.effectAllowed = "move";
            },
            onDragOver: (e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              if (draggingId && draggingId !== item.id) {
                e.dataTransfer.dropEffect = "move";
              }
            },
            onDrop: (e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              const draggedId = e.dataTransfer.getData("text/plain");
              if (draggedId && draggedId !== item.id) {
                moveTo(draggedId, item.id);
              }
              setDraggingId(null);
            },
            onDragEnd: () => setDraggingId(null),
          };

          const itemNode = (
            <DockItem
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={active}
              onClick={(e) => {
                if (draggingId) {
                  e?.preventDefault();
                  return;
                }
                if (isFocus) {
                  if (focusSuppressRef.current) {
                    e?.preventDefault();
                    focusSuppressRef.current = false;
                    return;
                  }
                  if (focusPopover.open && focusPopover.anchor === focusAppEl) {
                    e?.preventDefault();
                    closeFocus();
                    return;
                  }
                }
              }}
            />
          );

          const body = (
            <>
              {itemNode}
              {expanded && (
                <div className="mt-1 flex gap-0.5">
                  <button
                    onClick={() => move(item.id, -1)}
                    className="rounded p-0.5 text-[10px] text-zinc-500 hover:bg-white/[0.06]"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => move(item.id, 1)}
                    className="rounded p-0.5 text-[10px] text-zinc-500 hover:bg-white/[0.06]"
                  >
                    ▶
                  </button>
                </div>
              )}
            </>
          );

          if (isFocus) {
            return (
              <ContextMenu key={item.id} items={contextItems}>
                <div
                  ref={setFocusAppEl}
                  className="group relative flex flex-col items-center"
                  draggable={expanded}
                  {...dragHandlers}
                  onPointerDown={(e) => {
                    if (e.button !== 0 || !e.isPrimary || expanded) return;
                    startFocusHold(focusAppEl);
                  }}
                  onPointerUp={clearFocusHold}
                  onPointerLeave={clearFocusHold}
                  onPointerCancel={clearFocusHold}
                >
                  {body}
                </div>
              </ContextMenu>
            );
          }

          return (
            <ContextMenu key={item.id} items={contextItems}>
              <div
                className="group relative flex flex-col items-center"
                draggable={expanded}
                {...dragHandlers}
              >
                {body}
              </div>
            </ContextMenu>
          );
        })}

        <MediaDockItem nowPlaying={spotifyNow} />

        <DockItem
          icon="layoutGrid"
          label={i18n("dockLauncher")}
          active={launcherOpen}
          onClick={() => {
            setLauncherOpen((v) => !v);
            setControlCenterOpen(false);
          }}
          aria-expanded={launcherOpen}
        />

        <span className="h-6 w-[1px] shrink-0 bg-white/10 mx-1.5" aria-hidden="true" />

        <DockItem
          icon="search"
          label={i18n("dockSpotlight")}
          active={commandPaletteOpen}
          onClick={() => setCommandPaletteOpen(true)}
          aria-pressed={commandPaletteOpen}
        />

        <DockItem
          ref={setPomodoroEl}
          icon="timer"
          label={i18n("dockPomodoro")}
          active={focusPopover.open && focusPopover.anchor === pomodoroEl}
          onClick={() => {
            if (focusPopover.open && focusPopover.anchor === pomodoroEl) {
              closeFocus();
            } else {
              openFocus(pomodoroEl);
            }
          }}
        />

        <DockItem
          icon="appWindow"
          label={i18n("dockMissionControl")}
          active={missionControl}
          onClick={() => {
            toggleMissionControl();
            setLauncherOpen(false);
          }}
          aria-pressed={missionControl}
        />

        <DockItem
          icon="bell"
          label={i18n("openNotifications")}
          onClick={() => {
            handleOpenNotifications();
            setLauncherOpen(false);
          }}
          badge={unreadCount}
        />

        <DockItem
          ref={setControlCenterEl}
          icon="sliders"
          label={i18n("controlCenter")}
          active={controlCenterOpen}
          onClick={() => {
            setControlCenterOpen((v) => !v);
            setLauncherOpen(false);
          }}
          aria-expanded={controlCenterOpen}
        />

        <DockItem
          icon="chevronUp"
          label={i18n("expand")}
          onClick={() => setExpanded((v) => !v)}
          className={expanded ? "rotate-180" : ""}
        />

        {controlCenterOpen && controlCenterEl && (
          <DockControlCenter
            open={controlCenterOpen}
            onClose={() => setControlCenterOpen(false)}
            referenceRef={controlCenterEl}
          />
        )}

        <FocusPopover
          open={focusPopover.open}
          onClose={closeFocus}
          referenceRef={focusPopover.anchor}
        />
      </div>
    </div>
  );
}
