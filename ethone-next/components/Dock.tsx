"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Search, Clock, AppWindow, Bell, Sliders, ChevronUp, Mail, EyeOff } from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import { Icon } from "@/lib/icons";
import FlatCard from "@/components/FlatCard";
import DockControlCenter from "@/components/DockControlCenter";
import FocusPopover from "@/components/FocusPopover";
import DockMediaFlyout from "@/components/DockMediaFlyout";
import DockWeatherFlyout from "@/components/DockWeatherFlyout";
import { hapticLightImpact } from "@/lib/haptics";
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

// Pages where the dock should auto-hide to avoid overlapping chat/focus/bottom input bars
const AUTO_HIDE_ROUTES = ["/brain", "/focus", "/scratchpad", "/matches"];

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

  const isSpotifyConnected =
    typeof window !== "undefined" &&
    (localStorage.getItem("ethone:connected:spotify") === "true" ||
      Boolean(localStorage.getItem("ethone:token:spotify")) ||
      Boolean(settings.liveSpotifyClientId) ||
      Boolean(localStorage.getItem("ethone:clientId:spotify")) ||
      settings.liveNowPlayingSource === "spotify");

  const spotifyNow = useMemo<NowPlaying | null>(() => {
    if (nowPlaying) {
      return nowPlaying;
    }
    return {
      source: "spotify",
      title: "Spotify",
      artist: isSpotifyConnected ? "Prêt pour la lecture" : "Non connecté",
      isPlaying: false,
    };
  }, [nowPlaying, isSpotifyConnected]);

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
        "#main-content, .overflow-y-auto, [data-v8-scroll], main, .os-scroll"
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
    "group/dock-item relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-all duration-150 ease-out hover:bg-white/[0.08] hover:text-[var(--text-primary)] hover:scale-110 active:scale-95 will-change-transform";

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
            data-chrome="dock"
            className="fixed bottom-2 left-1/2 z-[var(--z-dock)] -translate-x-1/2 hidden md:block"
          >
            <button
              type="button"
              onClick={handleRestoreDock}
              title="Afficher le Dock"
              className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-black/80 px-3.5 py-1.5 text-[10px] font-bold text-zinc-300 backdrop-blur-[var(--panel-blur)] shadow-xl hover:border-purple-500/40 hover:bg-purple-500/15 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              <ChevronUp className="h-3 w-3 text-[var(--accent-primary)]" />
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
            transition={{ type: "spring", stiffness: 350, damping: 38 }}
            data-chrome="dock"
            className="v8-floating-dock fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-0 z-[var(--z-dock)] hidden md:flex pointer-events-none justify-center bg-transparent p-0 m-0 border-none shadow-none outline-none"
          >
            {launcherOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }}
                className="pointer-events-auto absolute bottom-full left-1/2 z-[var(--z-dock)] mb-4 w-[min(90vw,440px)] -translate-x-1/2"
              >
                <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/92 dark:bg-[#090d16]/92 p-4 text-[var(--text-primary)] shadow-[0_24px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
                  {/* Subtle ambient aura */}
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-gradient-to-br from-violet-500/20 via-[var(--accent-primary)]/15 to-transparent blur-2xl opacity-60"
                    aria-hidden="true"
                  />
                  <div className="relative space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                          <LayoutGrid className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                          {i18n("dockLauncher")}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLauncherOpen(false)}
                        aria-label={i18n("close")}
                        className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                      >
                        <Icon name="close" className="h-3.5 w-3.5" />
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
                          className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] p-2.5 text-[var(--text-primary)] transition-all hover:bg-white/[0.08] hover:border-[var(--accent-primary)]/40 hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name={app.icon} className="h-5 w-5 text-zinc-300 transition-transform duration-150 group-hover:scale-110 group-hover:text-white" />
                          <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{app.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <nav
              className="pointer-events-auto inline-flex items-center gap-1.5 overflow-x-auto no-scrollbar v8-dock px-3.5 py-1.5 select-none backdrop-blur-[var(--panel-blur)] border border-[var(--panel-border)] bg-[#080c14]/85 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] rounded-[var(--panel-radius)]"
              aria-label={i18n("dock")}
            >
              <DockMediaFlyout
                nowPlaying={spotifyNow}
                clientId={settings.liveSpotifyClientId || OAUTH_APP_CLIENT_IDS.spotify}
              />

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

              <div className="mx-0.5 h-5 w-[1px] shrink-0 bg-[var(--text-primary)]/10" aria-hidden="true" />

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
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[var(--bg-surface)] shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
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
