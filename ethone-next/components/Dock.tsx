"use client";

import { useMemo, useState, useEffect, useRef, type DragEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { Icon } from "@/lib/icons";
import ContextMenu from "@/components/ContextMenu";
import Card3D from "@/components/Card3D";
import DockControlCenter from "@/components/DockControlCenter";
import FocusPopover from "@/components/FocusPopover";

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
  const [controlCenterEl, setControlCenterEl] = useState<HTMLButtonElement | null>(null);

  const [focusPopover, setFocusPopover] = useState<{ open: boolean; anchor: HTMLElement | null }>({
    open: false,
    anchor: null,
  });
  const [pomodoroEl, setPomodoroEl] = useState<HTMLButtonElement | null>(null);
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

  const baseControlClass =
    "v8-icon-radius flex h-11 w-11 items-center justify-center border border-transparent text-[var(--foreground)] transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--surface)] hover:shadow-lg";

  const controlInactive = "text-[var(--muted)]";
  const controlActive = "bg-[var(--accent)]/10 text-[var(--accent)]";

  return (
    <div
      className="v8-floating-dock fixed bottom-4 z-50 hidden md:block"
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
        className={`flex items-end gap-1 overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]/95 p-2 shadow-2xl backdrop-blur-md transition-all ${
          expanded ? "min-w-[320px] flex-wrap justify-center" : ""
        }`}
        style={{ borderRadius: "var(--dock-radius)" }}
      >
        {visibleItems().map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
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

          const link = (
            <Link
              href={item.href}
              onClick={(e) => {
                if (draggingId) {
                  e.preventDefault();
                  return;
                }
                if (isFocus) {
                  if (focusSuppressRef.current) {
                    e.preventDefault();
                    focusSuppressRef.current = false;
                    return;
                  }
                  if (focusPopover.open && focusPopover.anchor === focusAppEl) {
                    e.preventDefault();
                    closeFocus();
                    return;
                  }
                }
              }}
              aria-label={item.label}
              data-tooltip={item.label}
              data-haptic
              data-dock-item
              data-dock-item-active={active ? "true" : "false"}
              className={`${baseControlClass} ${active ? controlActive : ""}`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
            </Link>
          );

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
          }

          return (
            <ContextMenu key={item.id} items={contextItems}>
              <div
                className="group relative flex flex-col items-center"
                draggable={expanded}
                {...dragHandlers}
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

        {spotifyNow && (
          <span
            role="img"
            aria-label={i18n("spotifyPlaying")}
            data-tooltip={`${spotifyNow.title} - ${spotifyNow.artist}`}
            data-dock-item
            className={`${baseControlClass} relative text-[#1DB954]`}
          >
            {spotifyNow.artwork ? (
              <span
                className="h-5 w-5 rounded bg-cover bg-center"
                style={{ backgroundImage: `url(${spotifyNow.artwork})` }}
                aria-hidden="true"
              />
            ) : (
              <Icon name="music" className="h-5 w-5" />
            )}
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#1DB954] ring-1 ring-[var(--surface-raised)]" />
            {spotifyNow.playing && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-px" aria-hidden="true">
                <span className="h-2 w-0.5 animate-pulse bg-[#1DB954]" />
                <span className="h-2 w-0.5 animate-pulse bg-[#1DB954]" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-0.5 animate-pulse bg-[#1DB954]" style={{ animationDelay: "240ms" }} />
              </span>
            )}
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setLauncherOpen((v) => !v);
            setControlCenterOpen(false);
          }}
          aria-label={i18n("dockLauncher")}
          aria-expanded={launcherOpen}
          data-tooltip={i18n("dockLauncher")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${launcherOpen ? controlActive : controlInactive}`}
        >
          <Icon name="layoutGrid" className="h-5 w-5" />
        </button>

        <span className="h-9 w-px self-center bg-[var(--border)]" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label={i18n("dockSpotlight")}
          aria-pressed={commandPaletteOpen}
          data-tooltip={i18n("dockSpotlight")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${commandPaletteOpen ? controlActive : controlInactive}`}
        >
          <Icon name="search" className="h-5 w-5" />
        </button>

        <button
          ref={setPomodoroEl}
          type="button"
          onClick={() => {
            if (focusPopover.open && focusPopover.anchor === pomodoroEl) {
              closeFocus();
            } else {
              openFocus(pomodoroEl);
            }
          }}
          aria-label={i18n("dockPomodoro")}
          aria-expanded={focusPopover.open && focusPopover.anchor === pomodoroEl}
          data-tooltip={i18n("dockPomodoro")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${focusPopover.open && focusPopover.anchor === pomodoroEl ? controlActive : controlInactive}`}
        >
          <Icon name="timer" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            toggleMissionControl();
            setLauncherOpen(false);
          }}
          aria-label={i18n("dockMissionControl")}
          aria-pressed={missionControl}
          data-tooltip={i18n("dockMissionControl")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} ${missionControl ? controlActive : controlInactive}`}
        >
          <Icon name="appWindow" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            handleOpenNotifications();
            setLauncherOpen(false);
          }}
          aria-label={`${i18n("openNotifications")}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          aria-live="polite"
          data-tooltip={i18n("openNotifications")}
          data-haptic
          data-dock-item
          className={`${baseControlClass} relative ${controlInactive}`}
        >
          <Icon name="bell" className="h-5 w-5" />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
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
          className={`${baseControlClass} ${controlCenterOpen ? controlActive : controlInactive}`}
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
          className={`${baseControlClass} ${expanded ? "rotate-180" : ""} ${controlInactive}`}
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

        <FocusPopover
          open={focusPopover.open}
          onClose={closeFocus}
          referenceRef={focusPopover.anchor}
        />
      </div>
    </div>
  );
}
