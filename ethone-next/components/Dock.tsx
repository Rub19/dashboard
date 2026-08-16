"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Search,
  Clock,
  AppWindow,
  Bell,
  Sliders,
  ChevronUp,
} from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import DockControlCenter from "@/components/DockControlCenter";
import FocusPopover from "@/components/FocusPopover";
import DockMediaFlyout from "@/components/DockMediaFlyout";
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
  focus: "focus",
  team: "team",
  mail: "mail",
  settings: "settings",
};

export default function Dock() {
  const { settings } = useSettings();
  const router = useRouter();
  const { missionControl, toggleMissionControl } = useWindowManager();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const i18n = useI18n();
  const { nowPlaying, lanyard } = useLiveData(120_000);
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
      return { ...nowPlaying };
    }
    if (lanyard?.spotify?.playing) {
      return {
        source: "lanyard",
        title: lanyard.spotify.title || "",
        artist: lanyard.spotify.artist || "",
        album: lanyard.spotify.album || "",
        cover: lanyard.spotify.artworkUrl || lanyard.spotify.artwork,
        isPlaying: true,
        isSaved: false,
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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div
      className="v8-floating-dock fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hidden md:block pointer-events-none bg-transparent p-0 m-0 border-none shadow-none outline-none"
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
                  className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {allApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      router.push(app.href);
                      setLauncherOpen(false);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-zinc-300 transition-colors hover:border-white/15 hover:bg-white/[0.06]"
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
        className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 bg-zinc-950/90 border border-white/[0.12] backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] select-none"
        aria-label={i18n("dock")}
      >
        <DockMediaFlyout nowPlaying={spotifyNow} clientId={settings.liveSpotifyClientId} />

        <button
          type="button"
          onClick={() => {
            setLauncherOpen((v) => !v);
            setControlCenterOpen(false);
          }}
          aria-label={i18n("dockLauncher")}
          aria-expanded={launcherOpen}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label={i18n("dockSpotlight")}
          aria-pressed={false}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          ref={setPomodoroEl}
          type="button"
          onClick={toggleFocus}
          aria-label={i18n("dockPomodoro")}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
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
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
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
          className="relative w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-zinc-950" aria-hidden="true" />
          )}
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
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          <Sliders className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleScrollTop}
          aria-label={i18n("expand")}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
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
