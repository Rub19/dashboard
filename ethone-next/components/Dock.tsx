"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Search, Clock, AppWindow, Bell, Sliders, ChevronUp, Mail, EyeOff, Eye } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { Icon } from "@/lib/icons";
import FlatCard from "@/components/FlatCard";
import DockControlCenter from "@/components/DockControlCenter";
import FocusPopover from "@/components/FocusPopover";
import DockMediaFlyout from "@/components/DockMediaFlyout";
import DockWeatherFlyout from "@/components/DockWeatherFlyout";
import { hapticLightImpact } from "@/lib/haptics";
import type { NowPlaying } from "@/lib/hooks/useLiveData";
import { cn } from "@/lib/utils";

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

// Pages where the dock should auto-hide to avoid overlapping chat/focus/bottom input bars
const AUTO_HIDE_ROUTES = ["/brain", "/focus", "/scratchpad"];

function Dock() {
  const { settings, update } = useSettings();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
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

  // Per-page temporary override to reveal the dock on auto-hide pages
  const [pageOverrideShow, setPageOverrideShow] = useState(false);

  // Reset page override whenever route changes
  useEffect(() => {
    setPageOverrideShow(false);
  }, [pathname]);

  const isAutoHidePage = useMemo(() => {
    return AUTO_HIDE_ROUTES.some((route) => pathname.startsWith(route));
  }, [pathname]);

  // The dock is visible if:
  // 1. User has not manually disabled it (settings.dockVisible is true)
  // 2. Layout preset allows it
  // 3. Either it's a standard page, OR user explicitly requested override on an auto-hide page
  const isAllowedByPreset =
    settings.layoutPreset !== "sidebar-only" &&
    settings.layoutPreset !== "minimal";

  const isVisible =
    settings.dockVisible &&
    isAllowedByPreset &&
    (!isAutoHidePage || pageOverrideShow);

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
    hapticLightImpact();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("v8:open-notifications"));
      window.dispatchEvent(new CustomEvent("ethone:open-notifications"));
    }
  }

  function handleScrollTop() {
    if (typeof window === "undefined") return;
    hapticLightImpact();

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
      document.body?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}

    try {
      const scrollables = document.querySelectorAll<HTMLElement>(
        "#main-content, #main-content *, .overflow-y-auto, .overflow-y-scroll, .overflow-auto, [data-v8-scroll], .os-scroll, main, main *"
      );
      scrollables.forEach((el) => {
        if (el && el.scrollTop > 0) {
          el.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    } catch {}
  }

  function handleHideDock() {
    hapticLightImpact();
    if (isAutoHidePage && pageOverrideShow) {
      setPageOverrideShow(false);
    } else {
      update({ dockVisible: false });
    }
  }

  function handleRestoreDock() {
    hapticLightImpact();
    if (!settings.dockVisible) {
      update({ dockVisible: true });
    } else if (isAutoHidePage) {
      setPageOverrideShow(true);
    }
  }

  const dockButton =
    "group/dock-item relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-all duration-200 ease-out hover:bg-white/[0.08] hover:text-white hover:scale-115 active:scale-95";

  return (
    <>
      {/* Discreet bottom unhide trigger when dock is auto-hidden or manually hidden */}
      <AnimatePresence>
        {!isVisible && isAllowedByPreset && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-2 left-1/2 z-[var(--z-dock)] -translate-x-1/2 hidden md:block"
          >
            <button
              type="button"
              onClick={handleRestoreDock}
              title="Afficher le Dock"
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/80 px-3.5 py-1.5 text-[10px] font-bold text-zinc-300 backdrop-blur-2xl shadow-xl hover:border-purple-500/40 hover:bg-purple-500/15 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              <ChevronUp className="h-3 w-3 text-purple-400" />
              <span>Dock</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Dock */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="v8-floating-dock fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-0 z-[var(--z-dock)] hidden md:flex pointer-events-none justify-center bg-transparent p-0 m-0 border-none shadow-none outline-none"
          >
            {launcherOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-auto absolute bottom-full left-1/2 z-[var(--z-dock)] mb-4 w-[min(90vw,420px)] -translate-x-1/2"
              >
                <FlatCard style={{ boxShadow: "none" }}>
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
                </FlatCard>
              </motion.div>
            )}

            <nav
              className="pointer-events-auto inline-flex items-center gap-1.5 overflow-x-auto no-scrollbar v8-dock px-3.5 py-1.5 select-none backdrop-blur-2xl border border-white/10 bg-[#080c14]/85 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] rounded-2xl"
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
                <LayoutGrid className="w-4.5 h-4.5" />
              </button>

              <div className="mx-0.5 h-5 w-[1px] shrink-0 bg-white/10" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                aria-label={i18n("dockSpotlight")}
                aria-pressed={false}
                className={dockButton}
              >
                <Search className="w-4.5 h-4.5" />
              </button>

              <button
                ref={setPomodoroEl}
                type="button"
                onClick={toggleFocus}
                aria-label={i18n("dockPomodoro")}
                className={dockButton}
              >
                <Clock className="w-4.5 h-4.5" />
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
                <AppWindow className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenNotifications();
                  setLauncherOpen(false);
                }}
                aria-label={i18n("openNotifications")}
                className={dockButton}
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span
                    className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#080c14]" />
                  </span>
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
                <Mail className="w-4.5 h-4.5" />
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
                <Sliders className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                onClick={handleScrollTop}
                aria-label={i18n("scrollToTop", "Remonter en haut")}
                className={dockButton}
              >
                <ChevronUp className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                onClick={handleHideDock}
                aria-label={i18n("hideDock", "Cacher le dock")}
                title={i18n("hideDock", "Cacher le dock")}
                className={dockButton}
              >
                <EyeOff className="w-4.5 h-4.5" />
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Dock);
