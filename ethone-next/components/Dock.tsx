"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search, Clock, AppWindow, Bell, Sliders, ChevronUp, Mail } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import DockControlCenter from "@/components/DockControlCenter";
import FocusPopover from "@/components/FocusPopover";
import DockMediaFlyout from "@/components/DockMediaFlyout";
import DockWeatherFlyout from "@/components/DockWeatherFlyout";
import type { NowPlaying } from "@/lib/hooks/useLiveData";

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
  rss: "rss",
  focus: "focus",
  team: "team",
  mail: "mail",
  settings: "settings",
};

function Dock() {
  const { settings } = useSettings();
  const router = useRouter();
  const { missionControl, toggleMissionControl } = useWindowManager();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const i18n = useI18n();
  const { nowPlaying } = useNowPlaying(15000);
  const { unreadCount } = useNotifications();

  const [launcherOpen, setLauncherOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [controlCenterEl, setControlCenterEl] = useState<HTMLButtonElement | null>(null);
  const [pomodoroEl, setPomodoroEl] = useState<HTMLButtonElement | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);

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

  const spotifyNow = useMemo<NowPlaying | null>(() => {
    if (nowPlaying?.source?.toLowerCase() === "spotify" && nowPlaying?.isPlaying) {
      return nowPlaying;
    }
    return null;
  }, [nowPlaying]);

  useEffect(() => {
    if (!launcherOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLauncherOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [launcherOpen]);

  if (!settings.dockVisible || settings.layoutPreset === "sidebar-only" || settings.layoutPreset === "minimal") {
    return null;
  }

  function openFocus() {
    if (!pomodoroEl) return;
    setFocusOpen(true);
  }

  function closeFocus() {
    setFocusOpen(false);
  }

  function toggleFocus() {
    if (focusOpen) {
      closeFocus();
    } else {
      openFocus();
    }
  }

  function handleOpenNotifications() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("v8:open-notifications"));
    }
  }

  function handleScrollTop() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const dockButton =
    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-all hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]";

  return (
    <div
      className="v8-floating-dock fixed bottom-12 inset-x-0 z-50 hidden md:flex pointer-events-none justify-center bg-transparent p-0 m-0 border-none shadow-none outline-none"
    >
      {launcherOpen && (
        <div className="pointer-events-auto absolute bottom-full left-1/2 z-50 mb-4 w-[min(90vw,420px)] -translate-x-1/2">
          <Card3D style={{ boxShadow: "none" }}>
            <div className="space-y-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">{i18n("dockLauncher")}</h3>
                <button
                  type="button"
                  onClick={() => setLauncherOpen(false)}
                  aria-label={i18n("close")}
                  className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto no-scrollbar sm:grid-cols-4">
                {allApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      router.push(app.href);
                      setLauncherOpen(false);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/80 p-2 text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/30 hover:bg-[var(--text-primary)]/[0.06]"
                  >
                    <Icon name={app.icon} className="h-5 w-5" />
                    <span className="w-full truncate text-center text-[10px] leading-tight">{app.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card3D>
        </div>
      )}

      <nav
        className="pointer-events-auto inline-flex items-center gap-2 overflow-x-auto no-scrollbar v8-dock px-3 py-2 select-none"
        aria-label={i18n("dock")}
      >
        <DockMediaFlyout nowPlaying={spotifyNow} clientId={settings.liveSpotifyClientId} />

        {settings.dockItems.includes("weather") && <DockWeatherFlyout />}

        <button
          type="button"
          onClick={() => {
            setLauncherOpen((v) => !v);
            setControlCenterOpen(false);
          }}
          aria-label={i18n("dockLauncher")}
          aria-expanded={launcherOpen}
          className={dockButton}
        >
          <LayoutGrid className="w-5 h-5" />
        </button>

        <div className="mx-1 h-6 w-[1px] shrink-0 bg-white/[0.08]" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label={i18n("dockSpotlight")}
          aria-pressed={false}
          className={dockButton}
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          ref={setPomodoroEl}
          type="button"
          onClick={toggleFocus}
          aria-label={i18n("dockPomodoro")}
          className={dockButton}
        >
          <Clock className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            toggleMissionControl();
            setLauncherOpen(false);
          }}
          aria-pressed={missionControl}
          aria-label={i18n("dockMissionControl")}
          className={dockButton}
        >
          <AppWindow className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            handleOpenNotifications();
            setLauncherOpen(false);
          }}
          aria-label={i18n("openNotifications")}
          className={`relative ${dockButton}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white/80"
              aria-hidden="true"
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            router.push("/mail/");
            setLauncherOpen(false);
          }}
          aria-label={i18n("openMail", "Ouvrir les mails")}
          className={dockButton}
        >
          <Mail className="w-5 h-5" />
        </button>

        <button
          ref={setControlCenterEl}
          type="button"
          onClick={() => {
            setControlCenterOpen((v) => !v);
            setLauncherOpen(false);
          }}
          aria-expanded={controlCenterOpen}
          aria-label={i18n("controlCenter")}
          className={dockButton}
        >
          <Sliders className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleScrollTop}
          aria-label={i18n("scrollToTop", "Remonter en haut")}
          className={dockButton}
        >
          <ChevronUp className="w-5 h-5" />
        </button>

      </nav>

      {controlCenterOpen && controlCenterEl && (
        <DockControlCenter
          open={controlCenterOpen}
          onClose={() => setControlCenterOpen(false)}
          referenceRef={controlCenterEl}
        />
      )}

      <FocusPopover open={focusOpen} onClose={closeFocus} referenceRef={pomodoroEl} />
    </div>
  );
}

export default memo(Dock);
