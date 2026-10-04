"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Search,
  Clock,
  AppWindow,
  Bell,
  Sliders,
  ChevronUp,
  Mail,
  EyeOff,
  X,
} from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { useWindowManager } from "@/components/WindowManagerProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import { Icon } from "@/lib/icons";
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
const AUTO_HIDE_ROUTES = ["/brain", "/focus", "/scratchpad", "/matches"];

type AppleDockItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: React.ReactNode;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean;
};

function AppleDockItem({
  icon: IconComp,
  label,
  onClick,
  active,
  badge,
  buttonRef,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-pressed": ariaPressed,
}: AppleDockItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, x: "-50%", scale: 0.92 }}
            animate={{ opacity: 1, y: -8, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 2, x: "-50%", scale: 0.94 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="pointer-events-none absolute -top-8 left-1/2 z-50 whitespace-nowrap rounded-lg border border-white/[0.1] bg-[#0c1017]/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl backdrop-blur-xl select-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => {
          hapticLightImpact();
          onClick();
        }}
        whileHover={{ scale: 1.16, y: -3 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        aria-label={ariaLabel || label}
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed}
        className={cn(
          "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors select-none",
          active
            ? "bg-white/[0.12] text-white"
            : "text-[var(--text-muted)] hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
        )}
      >
        <IconComp className="w-4.5 h-4.5 transition-transform" />
        {badge}
      </motion.button>

      {active && (
        <span
          className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_var(--accent-primary)]"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

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
  const [launcherSearch, setLauncherSearch] = useState("");
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

  const filteredApps = useMemo(() => {
    if (!launcherSearch.trim()) return allApps;
    const q = launcherSearch.toLowerCase();
    return allApps.filter(
      (app) => app.label.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)
    );
  }, [allApps, launcherSearch]);

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
    setControlCenterOpen(false);
    setLauncherOpen(false);
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
            {/* Launchpad Mini Flyout */}
            <AnimatePresence>
              {launcherOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 16, x: "-50%", scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                  exit={{ opacity: 0, y: 12, x: "-50%", scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }}
                  className="pointer-events-auto absolute bottom-full left-1/2 z-[var(--z-dock)] mb-4 w-[min(92vw,460px)]"
                >
                  <div className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0c1017]/92 dark:bg-[#070b13]/96 p-4.5 text-[var(--text-primary)] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-3xl">
                    {/* Subtle ambient aura */}
                    <div
                      className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/25 via-[var(--accent-primary)]/20 to-transparent blur-3xl opacity-70"
                      aria-hidden="true"
                    />

                    <div className="relative space-y-3.5">
                      {/* Top bar with title & search input */}
                      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-[0_0_10px_var(--glow-color)]">
                            <LayoutGrid className="h-4 w-4" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            {i18n("dockLauncher")}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          <div className="flex items-center gap-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--text-primary)] focus-within:border-[var(--accent-primary)]/50 focus-within:shadow-[0_0_10px_var(--glow-color)] transition-all">
                            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                            <input
                              type="text"
                              value={launcherSearch}
                              onChange={(e) => setLauncherSearch(e.target.value)}
                              placeholder={i18n("search") || "Rechercher…"}
                              className="w-full bg-transparent text-xs text-white placeholder-[var(--text-muted)] outline-none"
                              autoFocus
                            />
                            {launcherSearch && (
                              <button
                                type="button"
                                onClick={() => setLauncherSearch("")}
                                className="text-[var(--text-muted)] hover:text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          onClick={() => setLauncherOpen(false)}
                          whileHover={{ scale: 1.12, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label={i18n("close")}
                          className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                        >
                          <Icon name="close" className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>

                      {/* Apps Grid */}
                      <div className="grid max-h-[58vh] grid-cols-3 gap-2 overflow-y-auto no-scrollbar sm:grid-cols-4 p-0.5">
                        {filteredApps.map((app) => (
                          <motion.button
                            key={app.id}
                            type="button"
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.94 }}
                            transition={{ type: "spring", stiffness: 450, damping: 25 }}
                            onClick={() => {
                              hapticLightImpact();
                              router.push(app.href);
                              setLauncherOpen(false);
                            }}
                            className="group relative flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-[var(--text-primary)] cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-white/[0.18]"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] transition-all group-hover:scale-105 group-hover:bg-[var(--accent-primary)]/15 group-hover:border-[var(--accent-primary)]/40 shadow-sm">
                              <Icon
                                name={app.icon}
                                className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-white"
                              />
                            </div>
                            <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                              {app.label}
                            </span>
                          </motion.button>
                        ))}

                        {filteredApps.length === 0 && (
                          <div className="col-span-full py-8 text-center text-xs text-[var(--text-muted)]">
                            {i18n("noResults", "Aucune application trouvée")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Apple-grade Floating Glass Dock Bar */}
            <nav
              className="pointer-events-auto inline-flex items-center gap-1.5 overflow-x-auto no-scrollbar v8-dock px-3.5 py-1.5 select-none backdrop-blur-2xl border border-white/[0.09] bg-[#080c14]/85 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.14)] rounded-[22px]"
              aria-label={i18n("dock")}
            >
              <DockMediaFlyout
                nowPlaying={spotifyNow}
                clientId={settings.liveSpotifyClientId || OAUTH_APP_CLIENT_IDS.spotify}
              />

              {settings.dockItems.includes("weather") && <DockWeatherFlyout />}

              <AppleDockItem
                icon={LayoutGrid}
                label={i18n("dockLauncher")}
                active={launcherOpen}
                aria-expanded={launcherOpen}
                onClick={() => {
                  setLauncherOpen((v) => !v);
                  setControlCenterOpen(false);
                  setFocusOpen(false);
                }}
              />

              <div
                className="mx-0.5 h-5 w-[1px] shrink-0 bg-white/[0.1]"
                aria-hidden="true"
              />

              <AppleDockItem
                icon={Search}
                label={i18n("dockSpotlight")}
                onClick={() => setCommandOpen(true)}
              />

              <AppleDockItem
                buttonRef={setPomodoroEl}
                icon={Clock}
                label={i18n("dockPomodoro")}
                active={focusOpen}
                onClick={toggleFocus}
              />

              <AppleDockItem
                icon={AppWindow}
                label={i18n("dockMissionControl")}
                active={missionControl}
                aria-pressed={missionControl}
                onClick={() => {
                  toggleMissionControl();
                  setLauncherOpen(false);
                }}
              />

              <AppleDockItem
                icon={Bell}
                label={i18n("openNotifications")}
                badge={
                  unreadCount > 0 && (
                    <span
                      className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[var(--bg-surface)] shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                    </span>
                  )
                }
                onClick={() => {
                  handleOpenNotifications();
                  setLauncherOpen(false);
                }}
              />

              <AppleDockItem
                icon={Mail}
                label={i18n("openMail", "Ouvrir les mails")}
                onClick={() => {
                  router.push("/mail/");
                  setLauncherOpen(false);
                }}
              />

              <AppleDockItem
                buttonRef={setControlCenterEl}
                icon={Sliders}
                label={i18n("controlCenter")}
                active={controlCenterOpen}
                aria-expanded={controlCenterOpen}
                onClick={() => {
                  setControlCenterOpen((v) => !v);
                  setLauncherOpen(false);
                  setFocusOpen(false);
                }}
              />

              <AppleDockItem
                icon={ChevronUp}
                label={i18n("scrollToTop", "Remonter")}
                onClick={handleScrollTop}
              />

              <AppleDockItem
                icon={EyeOff}
                label={i18n("hideDock", "Masquer le dock")}
                onClick={handleHideDock}
              />
            </nav>

            <DockControlCenter
              open={controlCenterOpen}
              onClose={() => setControlCenterOpen(false)}
              referenceRef={controlCenterEl}
            />

            <FocusPopover
              open={focusOpen}
              onClose={closeFocus}
              referenceRef={pomodoroEl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Dock);
